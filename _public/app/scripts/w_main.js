var Window = require('./scripts/class/window'),
Queue = require('./scripts/class/download_queue'),
uuid = require('uuid'),
gui = require('nw.gui'),
detector = require('detector'),
utils = require('./utils'),
fs = require('fs'),
Buffer = require('buffer').Buffer,
Logger = require('./logger');

var logger = new Logger(this.navigator.userAgent);

//1.0 建立同服务器的唯一的长连接，用来收发消息
process.sockjs = new SockJS(process.MsgServerURL + '/sockjs');

//1.1 长连接打开
process.sockjs.onopen = function(e){
    logger.info('validate token for long connect!');
    //把从support服务器获取的token从长连接发往Msg服务器，校验token是否有效
    process.sockjs.send(JSON.stringify({
        uuid: uuid.v1(),
        sender: process.user_id,
        topic_id : null,
        msg_type: process.I_VALIDATE_CONNECTOR_TOKEN,
        msg_content :{
            token: process.token
        }
    }));
};
//1.2 消息触发
process.sockjs.onmessage = function(e){
    console.log('----服务器来的消息----:\r\n' + JSON.stringify(e.data));
    var data = {}, queue, fingerprint, file;
    try{
        data = JSON.parse(e.data);
    }catch(err){
        logger.error(err.message);
    }
    //获取会话窗口
    var conferenceWindow = process.conferenceWindow || {};
    var sender = data.sender;
    var $userList = process.mainWindow.view.$userList;
    var $conferenceList = process.mainWindow.view.$conferenceList;
    var id = data.topic_id;
    var contact = process.conferences[id];
    if(data.msg_type === process.I_PRIVATE_CHAT_MESSAGE){
        id = sender;
        contact = process.contacts[id];
    }
    switch(data.msg_type){
        //用户上线
        case process.I_USERS_ONLINE:
            process.mainWindow.view.changeUserStatus($userList, data, "online");
            process.mainWindow.view.changeUserStatus($conferenceList, data, "online");
        break;
        //用户离线
        case process.I_USERS_OFFLINE:
            process.mainWindow.view.changeUserStatus($userList, data);
            process.mainWindow.view.changeUserStatus($conferenceList, data);
        break;
        //聊天消息
        case process.I_PRIVATE_CHAT_MESSAGE:
        case process.I_GROUP_CHAT_MESSAGE:
            //1.2.1 通知会话窗口显示消息
            if(conferenceWindow.hasOwnProperty(id)){
            conferenceWindow[id].view.onChat(data);
        }else{
            //闪动
            //process.mainWindow.trayIconFlashOnMessage(contact);
            //process.mainWindow.view.userFlashOnMessage(contact);
            process.mainWindow.view.showUnreadMessage(contact, data.msg_type);
        }
        //1.2.2 把所有消息都保存到本地，客户端退出时清除
        process.mainWindow.EventHandler.saveMessages(process.mainWindow, data, id);
        break;
        //被邀请到群
        case process.I_GROUP_JOIN_INVITE:
            process.mainWindow.view.switchList('conference');
        break;
        //被群踢出
        case process.I_GROUP_KICK:
            alert('您已经退出了该会话(' + data.msg_content.topic_name + ')');
        process.mainWindow.view.switchList('conference');
        break;
        //服务器返回token已失效的信息
        case process.I_VALIDATE_TOKEN_ERR:
            break;
        //弹出对话框要求用户接受请求
        case process.I_FILE_REQUEST_TRANSPORT:
            file = {};
            file.file_name = data.msg_content.name;
            file.fingerprint = data.msg_content.fingerprint;
            file.file_size = data.msg_content.total_size;
            file.doctype = utils.isKnownFileType(file.file_name);
            process.mainWindow.EventHandler.renderFileTransportWindowView(gui, [file], data.sender, 'download');
        break;
        //接收到你准备发送文件的目标用户的响应
        case process.I_FILE_RESPONSE_ACCEPT_TRANSPORT:
            try{
            fingerprint = data.msg_content.fingerprint;
            queue = process.uploadQueues[sender];
            queue.uploadFile(fingerprint);
            process.fileTransportWindow.view.renderMemo(fingerprint, sender, data.msg_type);
            }catch(ex){
                console.log(ex.message);
            }
        break;
        case process.I_FILE_RESPONSE_REFUSE_TRANSPORT:
            break;
        //服务器通知其他用户发送的文件已接受，通知客户端拉取
        case process.I_FILE_RANGE_CAN_DOWNLOAD:
            fingerprint = data.msg_content.fingerprint;
            var sid = sender + '_' + fingerprint;
            //检查下载队列中队列的ID，如果为空, 删掉该队列
            _.each(process.downloadQueues, function(queue, key){
                if(queue.id === null){
                    queue.destroy();
                    delete process.downloadQueues[key];
                }
            });
            if(!process.downloadQueues.hasOwnProperty(sid)){
                process.downloadQueues[sid] = new Queue(gui);
                view.currentQueue = process.downloadQueues[sid];
            }else{
                queue = process.downloadQueues[sid];
                queue.pushPartFile(data);
            }
            break;
    }
};
//服务器connetor关闭事件
process.sockjs.onclose = function(e){
    logger.error(e);
};
//服务器connecotr错误事件
process.sockjs.onerror = function(){
};

//会话右键菜单
var contextmenu = new gui.Menu();
var menuItem = new gui.MenuItem({
    label: '退出该会话'
});
contextmenu.append(menuItem);

//2.0 定义当前窗口主体的View
var MainWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        'dblclick .user, .conference': 'openConferenceWindow',
        'click .create_conference': 'openCreateConferenceWindow',
        'click .toggle_list': 'toggleList',
        'contextmenu .conference': 'contextmenuConference',
        'change #file_saveas': 'fileSaveas',
        'click #file_saveas': 'addNameToFileSaveasInput'
    },
    addNameToFileSaveasInput: function(e){
        //当前传过来文件块的md5值
        var el = e.currentTarget;
        el.nwsaveas = this.currentFirstData.msg_content.file_name;
    },
    //用户点击另存窗口的保存按钮触发
    fileSaveas: function(e){
        var el, path;
        el = e.currentTarget;
        path = el.value;
        this.currentFirstData.msg_content.path = path;
        this.currentQueue.initFirstData(this.currentFirstData);
        this.currentQueue.initTimer();
        //如果是下载, 发送接收文件的响应
        var body =  {
            sender: process.user_id,
            msg_type: process.I_FILE_RESPONSE_ACCEPT_TRANSPORT,
            topic_id: this.currentFirstData.topic_id,
            uuid: uuid.v1(),
            msg_content: {
                encryption: null,
                fingerprint: this.currentFirstData.msg_content.fingerprint
            }
        };
        var messageBody = JSON.stringify(body);
        process.sockjs.send(messageBody);
        el.value = '';
    },
    contextmenuConference:function(e){
        var $el = $(e.currentTarget);
        var view = this;
        var type = $el.data('type');
        var topic_name = $el.data('name');
        var topic_id = $el.attr('id');
        menuItem.once('click', function(e){
            view.window.EventHandler.changeTopicMembers({
                body:{
                    topic_name: topic_name,
                    topic_id: topic_id,
                    rm_members: [process.user_id]
                },
                callback: function(){
                    process.mainWindow.view.switchList('conference');
                }
            });
        });
        contextmenu.popup(e.clientX, e.clientY);
        return false;
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        //this.flashTimerMap = {};
        this.unreadMessages = {};
        this.render();
    },
    openCreateConferenceWindow: function(e){
        if(process.createConferenceWindow){
            process.createConferenceWindow.appWindow.show();
            process.createConferenceWindow.appWindow.focus();
            return;
        }
        //目前规定一次只能打开一个修改会话成员的窗口，减少复杂性
        //定义创建会话窗口的参数
        _.each(process.contacts, function(contact){
            contact.checked = false;
        });
        process.createConferenceWindowOption = {
            type: 'create',
            topic_name: '',
            topic_members: []
        };
        gui.Window.open('w_create_conference.html', {
            width: 640,
            height: 540,
            position: 'left',
            frame: false,
            toolbar: false
        });
    },
    openConferenceWindow: function(e){
        var view = this;
        var $el = $(e.currentTarget);
        var id = $el.data('id'), //从集合查找的id属性
        type = $el.data('type');
        var contact = {};
        if(type === process.I_PRIVATE_CHAT_MESSAGE){
            //私聊
            contact = process.contacts[id];
            if(contact.user_id === process.user_id){
                return;
            }
        }else{
            contact = process.conferences[id];
        }
        contact.type = type;
        //清除闪动图标,清除消息计数
        if(process.conferenceWindow && process.conferenceWindow[id]){
            //打开或者切换到当前聊天对象的会话窗口
            process.conferenceWindow[id].appWindow.show();
            process.conferenceWindow[id].appWindow.focus();
            return;
        }
        var topic_ids = this.window.localCache.get('topic_ids');
        var topic_id = topic_ids && topic_ids[id];
        //获取topic再打开窗口
        var _openWindow = function(topic_id){
            if(view.unreadMessages.hasOwnProperty(id)){
                delete view.unreadMessages[id];
                var selector = 'li' + utils.getDataIdSelector(id);
                $(selector).find('.unread_messages_count').text('').removeClass('msg_tips');
            }
            if(topic_id){
                this.contact.topic_id = topic_id;
            }
            process.currentConversationContact = this.contact;
            gui.Window.open('w_conference.html', {
                width: 640,
                height: 440,
                position: 'left',
                frame: false,
                toolbar: false 
            });
        };
        if(!topic_id){
            if(type === process.I_PRIVATE_CHAT_MESSAGE){
                var members = [process.user_id, id];
                //从服务器获取topic_id
                this.window.EventHandler.createTopic({
                    body: {
                        topic_type: type,
                        topic_name: null,
                        members: members
                    },
                    callback: _.bind(_openWindow, {
                        contact : contact
                    })
                });
            }else{
                topic_ids[id] = contact.topic_id;
                this.window.localCache.set('topic_ids', topic_ids);
                _openWindow.apply({
                    contact: contact
                });
            }
        }else{
            _openWindow.apply({
                contact: contact
            });
        }
    },
    toggleList: function(){
        var $el = $(e.currentTarget);
        if($el.hasClass('collapse')){
            $el.text('---');
            $el.removeClass('collapse');
            this.$userList.show();
        }else{
            $el.text('+++');
            $el.addClass('collapse');
            this.$userList.hide();
        }
    },
    changeUserStatus: function($el, data, status){
        status || (status = 'offline');
        var statusCode = 0;
        switch(status){
            case 'offline':
                statusCode = 0;
            break;
            case 'online':
                statusCode = 1;
        }
        var selector = 'li' + utils.getDataIdSelector(data.sender);
        var $userId = $el.find(selector);
        var $parent = $userId.parent();
        $userId.remove();
        var $onlines = $parent.find('.nick_name:not(.offline)');
        var $lastOn = $onlines.last().closest('.user');
        //remove 仍然保留在jQuery对象当中，事件，绑定的data属性被移除，这点需要注意。
        //如果上线，放到联系人上线的最后面
        //如果下线，如果有上线列表，放到上线列表的最后面，否则放到联系人最前面
        if(status === 'offline'){
            if($lastOn.length){
                $lastOn.after($userId);
            }else{
                $parent.prepend($userId);
            }
        }else{
            $parent.prepend($userId);
        }
        var $nickName = $userId.find('.nick_name');
        $nickName.attr('class', 'nick_name ' + status);
        process.contacts[data.sender].status = statusCode;
    },
    showUnreadMessage: function(contact, type){
        if(!contact){
            console.log('没有联系人你show个啥!');
            return;
        }
        if(!type){
            console.log('服务器发来的联系人消息信息必须有类型');
            return;
        }
        var id = type === process.I_PRIVATE_CHAT_MESSAGE ? contact.user_id: contact.topic_id,
            view = this;
        //未读消息数目 
        var selector = 'li' + utils.getDataIdSelector(contact.id);
        var $userId = $(selector);
        if(!this.unreadMessages && !_.isObject(this.unreadMessages)){
            this.unreadMessages = {};
        }
        if(!this.unreadMessages.hasOwnProperty(id)){
            this.unreadMessages[id] = {
                count: 1
            };
        }else{
            this.unreadMessages[id].count += 1;
        }
        $userId.find('.unread_messages_count').text(this.unreadMessages[id].count).addClass('msg_tips');
    },
   /* userFlashOnMessage: function(contact){
        if(!contact){
            return;
        }
        var user_id = contact.user_id,
            view = this;
        //用户列表图标闪动
        var $userId = $('li[id="' + contact.user_id + '"]');
        var $avatar = $userId.find('.portrait img'),
            $nickName = $userId.find('.nick_name');
        if(!this.flashTimerMap && !_.isObject(this.flashTimerMap)){
            this.flashTimerMap = {};
        }
        if(!this.flashTimerMap.hasOwnProperty(user_id)){
            this.flashTimerMap[user_id] = {
                time: 0,
                timer: null
            };
        }
        var flashTimer = this.flashTimerMap[user_id];
        var timer = flashTimer.timer;
        if(timer){
            clearInterval(timer);
        }
        flashTimer.timer = setInterval(function(){
            if(flashTimer.time %2 === 0){
                $avatar.attr('src', view.window.IMAGE.EMPTY);
            }else{
                $avatar.attr('src', contact.portrait);
            }
            flashTimer.time++;
        }, 500);
    },
    */
    //切换会话和联系人窗口
    switchList: function(type){
        type || (type = 'contact');
        this.renderList(type);
        switch(type){
            case 'contact':
                break;
            case 'conference':
                break;
        }
    },
    renderList: function(type){
        type || (type = 'contact');
        switch(type){
            case 'contact':
                this.window.EventHandler.getContacts(_.bind(this.renderContactList, this));
                break;
            case 'conference':
                this.window.EventHandler.getTopics(_.bind(this.renderConferenceList, this));
                break;
        }
    },
    initJQueryElement: function(){
        this.$userDetail = this.$el.find('.user_detail');
        this.$userList = this.$el.find('.users');
        this.$conferenceList = this.$el.find('.conferences');
        this.$fileSaveas = this.$el.find('#file_saveas');
    },
    renderContactList: function(contacts){
        try{
        process.contacts = contacts;
        process.currentUser = contacts[process.user_id];
        var template = this.window.DocumentTemplate.main_user_detail_tpl.join('');
        var _template = _.template(template, process.currentUser);
        this.$userDetail.html(_template);
        template = this.window.EventHandler.getContactsTemplate(contacts);
        this.$userList.html(template);
        //第一次渲染列表
        if(this.isRenderConference){
            this.window.EventHandler.getTopics(_.bind(this.renderConferenceList, this));
            this.isRenderConference = false;
        }
        }catch(e){
            logger.error(e.message);
        }
    },
    renderConferenceList: function(conferences){
        var view = this;
        process.conferences = conferences;
        _.each(conferences, function(conference, topic_id){
            conference.topic_id = topic_id;
            if(conference.topic_type === process.I_PRIVATE_CHAT_MESSAGE){
                //前端处理私聊的会话显示名称
                var ids = conference.topic_id.split(process.CONFERENCE_SPLIT_FLAG);
                var targetId = '';
                _.each(ids, function(id){
                    if(id !== process.user_id){
                        targetId = id;
                    }
                });
                //获取私聊对象的昵称
                var contact  = process.contacts[targetId];
                //覆盖私聊会话名称
                conference.topic_name = contact.nick_name;
                conference.portrait =  contact.portrait;
                conference.status = contact.status;
                conference.class_name = contact.status === 0 ? 'nick_name offline': 'nick_name';
                conference.id = targetId;
            }else{
                conference.id = topic_id;
                conference.portrait = 'images/profile/group.png';
            }
        });
        var template = this.window.DocumentTemplate.main_conferences_tpl.join('');
        //渲染个人信息和推荐联系人信息
        var _template = _.template(template, {
            conferences: conferences,
            _: _
        });
        this.$conferenceList.html(_template);
    },
    render: function(){
        var template = this.window.DocumentTemplate.main_tpl.join('');
        this.$el.html(template);
        this.initJQueryElement();
        //请求推荐联系人列表, 然后获取会话列表
        this.isRenderConference = true;
        this.window.EventHandler.getContacts(_.bind(this.renderContactList, this));
    },
    destroy: function(){
    }
});

//2.1 定义主窗口类
var MainWindow = Window.extend({
    initialize: function(params){
        MainWindow.superclass.initialize.call(this, params);
        process.loginWindow.appWindow.close();
        //手动删除全局引用
        this.appWindow.focus();
        this.appWindow.moveTo(60, 80);
        this.initOSInfo();
    },
    initOSInfo: function(){
        this.osInfo = detector.parse(navigator.userAgent);
    },
    //主窗口加载菜单，菜单项，托盘等
    initAppItems: function(){
        MainWindow.superclass.initAppItems.call(this);
        //初始化托盘
        this.initMenuItem();
        this.initMenu();
        this.initTray();
        this.initRootMenu();
    },
    //初始化系统菜单
    initMenuItem: function(){
        var win = this;
        this.appMenuItem_quit = new gui.MenuItem({
            type: 'normal',
            label: '退出----IM',
            click: function(){
                win.EventHandler.closeWindows(process.windows);
            }
        });
        this.appMenuItem_front = new gui.MenuItem({
            type: 'checkbox',
            label: '窗口置顶',
            click: function(){
                process.mainWindow.appWindow.setAlwaysOnTop(this.checked);
            }
        });
    },
    initMenu: function(){
        this.appMenu = new gui.Menu();
        this.appMenu.append(this.appMenuItem_quit);     
        this.appMenu.append(this.appMenuItem_front);     
    },
    initTray: function(){
        this.appTray = new gui.Tray({
            title: 'Tray',
            icon: 'app/' + this.IMAGE.TRAY_ICON,
            tooltip: ''//在mac上就是在图标后面的文字
        });
        this.appTray.tooltip = 'mac 消息提醒';
        this.appTray.menu = this.appMenu;
    },
    initRootMenu: function(){
        this.appRootMenu = new gui.Menu({
            type: 'menubar'
        });
        this.initRootMenuItem();
        this.appRootMenu.append(this.appRootMenuItem);
        this.appWindow.menu = this.appRootMenu;
    },
    //初始化系统菜单项
    initRootMenuItem: function(){
        this.appRootMenuItem = new gui.MenuItem({
            label: '系统',
            submenu: this.appMenu
        });
    },
    //来消息时闪动
    /*
     trayIconFlashOnMessage: function(contact){
        if(!contact){
            throw new Error('没有联系人图标你闪啥！');
        }
        this.flashTime = 0;
        this.flashContact = contact;
        var proxy = _.bind(this.flashTrayIcon, this);
        if(this.flashTimer){
            clearInterval(this.flashTimer);
        }
        this.flashTimer = setInterval(proxy, 500);
    },
    //闪动托盘图标
    flashTrayIcon: function(){
        //Mac不能监听click 事
        //https://github.com/rogerwang/node-webkit/wiki/Tray
        if(this.osInfo.os.name !== 'macosx'){
            var icon = 'app/';
            if(this.flashTime % 2 === 1){
                icon += this.flashContact.portrait;
            }else{
                icon += this.IMAGE.EMPTY;
            }
            this.appTray.icon = icon;
            this.flashTime++;
        }else{
            //mac 只能出现tooltip, 并且在点击出菜单的时候切换消息图片
            this.appTray.icon = this.IMAGE.EMPTY;
        }
    },
    */
    initBackBoneView: function(){
        MainWindow.superclass.initBackBoneView.call(this);
        this.view = new MainWindowView({
            window: this
        });
    },
    destroy: function(){
        MainWindow.superclass.destroy.call(this);
    }
});

//2.2 实例化主窗口对象
process.mainWindow = new MainWindow({
    name: 'main',
    classType: 'window',
    Backbone: Backbone,
    localStorage: localStorage,
    gui: gui
});
process.windows.push(process.mainWindow);
//aspect before, after 只能在事件执行前监听；
