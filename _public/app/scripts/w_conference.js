var Window = require('./scripts/class/window'),
uuid = require('uuid'),
fs = require('fs'),
_ = require('underscore'),
_crypto = require('crypto'),
gui = require('nw.gui'),
Queue = require('./scripts/class/upload_queue');

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
        var content = this.getContent(),
        user_id = process.user_id,
        msg_type = this.type,
        token = process.token,
        topic_name = null,
        timestamp = new Date().getTime();

        //群聊天的id即为topic_id
        topic_id = this.topic_id;
        this.sendMessage({
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
        var files = [];
        _.each(e.target.files, function(file){
            files.push(file);
        });
        //上传队列管理
        if(!process.uploadQueues.hasOwnProperty(this.id)){
            process.uploadQueues[this.id] = new Queue(this, gui, files);
        }else{
            process.uploadQueues[this.id].pushFile(files);
        }
        e.target.value = '';
    },
    dropOnBody: function(e){
        console.log('drop on...');
        //this.transportFiles(e.dataTransfer.files);
        var files = e.dataTransfer.files;
        if(!process.uploadQueues.hasOwnProperty(this.id)){
            process.uploadQueues[this.id] = new Queue(this, gui, files);
        }else{
            process.uploadQueues[this.id].pushFile(files);
        }
    },
    //会话聊天记录的实时显示
    appendToConversation: function(sender, content, timestamp){
        var message = this.getSendMessage(sender, content, timestamp);
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
        return this.$textarea.getContent();
    },
    setContent: function(val){
        this.$textarea.setContent(val);
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        this.upoladQueues = {}; //上传文件队列
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
    initSEditor: function(){
        //暂时使用纯文本的
        this.$textarea.SEditor({});
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
        var template = this.window.DocumentTemplate.conference_tpl.join('');
        var _template = _.template(template, this);
        this.$el.html(_template);
        this.initJQueryElement();
        this.initSEditor();
        this.$textarea.focus();
        this.initOfflineMessages();
        this.initTopicMembers();
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
    logger.log('当前会话窗口无对象!!!!');
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
document.body.onkeyup = process.conferenceWindow[id].view.$textarea.doc.body.onkeyup = function(e){
    if(e.keyCode === 13){
        if(!e.ctrlKey)
            process.conferenceWindow[id].view.$send.click();
    }
 };

process.windows.push(process.conferenceWindow[id]);

document.body.addEventListener('dragover', function(e){
    e.preventDefault();
    e.stopPropagation();
    return false;
}, false);
//
document.body.addEventListener('drop', function(e){
    process.conferenceWindow[id].view.dropOnBody(e);
    e.preventDefault();
    e.stopPropagation();
    return false;
}, false);

//这里是坑，事件句柄是引用的方式则失效，事件可以进入，但是禁止不了默认行为。
//document.body.addEventListener('drag', preventDefault, false);
//document.body.addEventListener('dragstart', preventDefault, false);
//document.body.addEventListener('dragend', preventDefault, false);
//document.body.addEventListener('dragenter', preventDefault, false);
//document.body.addEventListener('dragover', preventDefault, false);

