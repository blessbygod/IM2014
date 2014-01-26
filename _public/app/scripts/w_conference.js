var Window = require('./scripts/class/window');
$ = jQuery = require('jquery')(this),
_ = require('underscore'),
uuid = require('uuid'),
gui = require('nw.gui');

//载入编辑器
var Backbone = require('backbone')(this);

//1.0 定义会话窗口主体的View
var ConferenceWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        'dblclick .contact_nickname': function(event){
        },
        //发送消息
        'click .send_message': function(event){
            var view = this;
            var content = this.getContent(),
                user_id = process.user_id,
                msg_type = this.type,
                target = this.target,
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
        topic_ids[this.target] = topic_id;
        console.log(topic_ids);
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
        this.contact = process.currentConversationContact;
        this.type = this.contact.type;
        if(this.type === process.I_PRIVATE_CHAT_MESSAGE){
            this.target = this.contact.user_id;
            this.name = this.contact.nick_name;
        }else{
            this.target = this.contact.topic_id;
            this.name = this.contact.topic_name;
        }
        this.topic_id = this.contact.topic_id;
        document.title = '与' + this.name + '聊天';
        this.render();
    },
    initJQueryElement: function(){
        this.$textarea = this.$el.find('.editor');
        this.$conversation = this.$el.find('.conversation');
        this.$send = this.$el.find('.send_message');
    },
    initWYSIWYG: function(){
        //暂时使用纯文本的
    },
    initOfflineMessages: function(){
        var view = this;
        var messages = this.window.localCache.get('messages');
        if(!messages){
            return;
        }else{
            console.log(this.target);
            console.log(messages);
        }
        var curr_messages = messages[this.target];
        if(_.isObject(messages) && curr_messages){
            _.each(curr_messages, function(data){
               view.appendToConversation(data.sender, data.msg_content.chat_msg, data.timestamp);
            });
        }
    },
    render: function(){
        var view = this;
        var template = view.window.DocumentTemplate.conference_tpl.join('');
        view.$el.html(template);
        view.initJQueryElement();
        view.initWYSIWYG();
        view.$textarea.focus();
        view.initOfflineMessages();
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
       // ConferenceWindow.superclass.initBackBoneView.call(this);
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

