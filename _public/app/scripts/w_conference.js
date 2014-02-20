var Window = require('./scripts/class/window');
uuid = require('uuid'),
fs = require('fs'),
_crypto = require('crypto'),
gui = require('nw.gui');

var Logger = require('./logger');
var logger = new Logger(this.navigator.userAgent);

//1.0 定义会话窗口主体的View
var ConferenceWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        'click .send_message': 'sendMessages',  //发送消息
        'click .modify_members': 'openModifyConferenceWindow',   //修改会话成员
        'change .transport_file': 'transportFile'
    },
    //触发发送消息按钮
    sendMessages: function(e){
        var view = this;
        var content = this.getContent(),
        user_id = process.user_id,
        msg_type = this.type,
        token = process.token,
        topic_name = null,
        timestamp = new Date().getTime();

        //群聊天的id即为topic_id
        topic_id = this.topic_id;
        view.sendMessage({
            topic_id: topic_id,
            message: content,
            msg_type: msg_type,
            user_id: user_id,
            timestamp: timestamp
        });
        //即时发送让用户直接看到自己发送的信息
        this.appendToConversation(user_id, content, timestamp);
        this.setContent('');
    },
    openModifyConferenceWindow: function(e){
        if(process.createConferenceWindow){
            process.createConferenceWindow.appWindow.show();
            process.createConferenceWindow.appWindow.focus();
            return;
        }
        //目前规定一次只能打开一个修改会话成员的窗口，减少复杂性
        //定义创建会话窗口的参数
        process.createConferenceWindowOption = {
            type: 'modify',
            topic_name: this.name,
            topic_id: this.topic_id
        };
        gui.Window.open('w_create_conference.html', {
            width: 640,
            height: 640,
            position: 'left',
            frame: false,
            toolbar: false
        });
    },
    transportFile: function(e){
        console.log('drop on input or change input');
        this.transportFiles(e.target.files);
        e.target.value = '';
    },
    transportFiles: function(files){
        //console.log(this.transportFiles.caller.toString());
        //计算md5
        _.each(files, function(file){
            var s = fs.ReadStream(file.path);
            var md5 = _crypto.createHash('md5');
            s.on('data', function(data){
                md5.update(data);
            });
            s.on('end', function(){
                var d = md5.digest('hex');
                logger.info(d);
            });
        });
    },
    dropOnBody: function(e){
        console.log('drop on...');
        this.transportFiles(e.dataTransfer.files);
    },
    //会话聊天记录的实时显示
    appendToConversation: function(sender, content, timestamp){
        var message = this.getSendMessage(sender, _.escape(content), timestamp);
        var html = this.$conversation.html();
        var updateHtml = html + '<br/>' + message;
        this.$conversation.html(updateHtml);
        this.$conversation.scrollTop(999999);
    },
    sendMessage: function(params){
        var topic_id = params.topic_id,
        message = params.message,
        msg_type = params.msg_type,
        timestamp = params.timestamp,
        sender = params.user_id;
        //发送的消息体
        var body =  {
            sender: sender,
            msg_type: msg_type,
            uuid: uuid.v1(),
            topic_id : topic_id,
            timestamp: timestamp,
            msg_content: {
                encryption: null,
                chat_msg: message
            }
        };
        var messageBody = JSON.stringify(body);
        process.sockjs.send(messageBody);
        process.mainWindow.EventHandler.saveMessages(this.window, body, topic_id);
        var topic_ids = this.window.localCache.get('topic_ids');
        if(!_.isObject(topic_ids)){
            topic_ids = {};
        }
        topic_ids[this.id] = topic_id;
        this.window.localCache.set('topic_ids', topic_ids);
    },
    onChat: function(data){
        this.appendToConversation(data.sender, data.msg_content.chat_msg, data.timestamp);
    },
    //定义了发送消息的显示样式
    getSendMessage: function(sender, content, timestamp){
        var user =  process.contacts[sender];
        var nickName = user.nick_name,
            portrait = user.portrait;
        var msgClass = 'wraper_left';
        if(user.user_id === process.user_id){
            msgClass = 'wraper_right';
        }
        var localTime = new Date(timestamp).toLocaleTimeString();
        var template = this.window.DocumentTemplate.send_message_tpl.join('');
        var message = _.template(template, {
            localTime: localTime,
            nickName: nickName,
            portrait: portrait,
            msgClass: msgClass,
            content: content
        });
        return message;
    },
    //以后切换为编辑器
    getContent: function(){
        return this.$textarea.val().trim();
    },
    setContent: function(val){
        this.$textarea.val(val);
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        this.fileUpoladQueue = {}; //上传文件队列
        this.fileDownloadQueue = {}; // 下载文件队列
        this.contact = process.currentConversationContact;
        this.type = this.contact.type;
        if(this.type === process.I_PRIVATE_CHAT_MESSAGE){
            this.name = this.contact.nick_name;
        }else{
            this.name = this.contact.topic_name;
        }
        this.id = this.contact.id;
        this.topic_id = this.contact.topic_id;
        this.render();
    },
    initJQueryElement: function(){
        this.$textarea = this.$el.find('.editor');
        this.$conversation = this.$el.find('.conversation');
        this.$send = this.$el.find('.send_message');
        this.$members = this.$el.find('.conference_members');
        this.$file = this.$el.find('.transport_file');
    },
    initWYSIWYG: function(){
        //暂时使用纯文本的
    },
    initOfflineMessages: function(){
        var view = this;
        var messages = this.window.localCache.get('messages');
        if(!messages){
            return;
        }
        var curr_messages = messages[this.id];
        if(_.isObject(messages) && curr_messages){
            _.each(curr_messages, function(data){
               view.appendToConversation(data.sender, data.msg_content.chat_msg, data.timestamp);
            });
        }
    },
    //初始化会话成员
    initTopicMembers: function(){
        var view = this;
        this.window.EventHandler.getTopicMembers({
            body: {
                topic_id: this.topic_id
            },
            callback: function(data){
                var ids = data.members;
                var contacts = {};
                _.each(ids, function(id){
                    var contact = process.contacts[id];
                    contacts[id] = contact;
                    //处理缓存不存在的情况，需要更新整体的process.contacts,后续
                });
                template = view.window.EventHandler.getContactsTemplate(contacts);
                view.$members.html(template);
            }
        });
    },
    render: function(){
        var view = this;
        var template = view.window.DocumentTemplate.conference_tpl.join('');
        var _template = _.template(template, this);
        view.$el.html(_template);
        view.initJQueryElement();
        view.initWYSIWYG();
        view.$textarea.focus();
        view.initOfflineMessages();
        view.initTopicMembers();
    },
    destroy: function(){
    }
});

//2.1 定义会话窗口类
var ConferenceWindow = Window.extend({
    initialize: function(params){
        ConferenceWindow.superclass.initialize.call(this, params);
        this.appWindow.focus();
    },
    initBackBoneView: function(){
        ConferenceWindow.superclass.initBackBoneView.call(this);
        this.view = new ConferenceWindowView({
            window: this
        });
    },
    destroy: function(){
        ConferenceWindow.superclass.destroy.call(this);
    }
});

//2.2 实例化会话窗口对象，可以多个
if(!process.conferenceWindow){
    process.conferenceWindow = {};
}
if(!process.currentConversationContact){
    console.log('当前会话窗口无对象!!!!');
}else{
    var id = process.currentConversationContact.id;
    process.conferenceWindow[id] = new ConferenceWindow({
        name: 'conference',
        classType: 'window',
        Backbone: Backbone,
        localStorage: localStorage,
        gui: gui,
        conversation: process.currentConversationContact
    });
}


//aspect before, after 只能在事件执行前监听；
//通知其他窗口的事件订阅
document.body.onkeyup = function(e){
    if(e.keyCode === 13){
        if(!e.ctrlKey)
            process.conferenceWindow[id].view.$send.click();
    }
 };

process.windows.push(process.conferenceWindow[id]);

var dropOnBody = function(e){
    process.conferenceWindow[id].view.dropOnBody(e);
};
var preventDefault = function(e){
    e.preventDefault();
    e.stopPropagation();
};

document.body.addEventListener('dragover', function(e){
    preventDefault(e);
}, false);
document.body.addEventListener('drop', function(e){
    dropOnBody(e);
    preventDefault(e);
}, false);

//这里是坑，引用事件则失效，事件可以进入，但是禁止不了默认行为。
//document.body.addEventListener('drag', preventDefault, false);
//document.body.addEventListener('dragstart', preventDefault, false);
//document.body.addEventListener('dragend', preventDefault, false);
//document.body.addEventListener('dragenter', preventDefault, false);
//document.body.addEventListener('dragover', preventDefault, false);

