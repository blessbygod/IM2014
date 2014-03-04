var Window = require('./scripts/class/window'),
gui = require('nw.gui'),
utils = require('./utils'),
uuid = require('uuid'),
Logger = require('./logger');

var logger = new Logger(this.navigator.userAgent);

var FileTransportWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        'click .confirm': 'confirmAction',
        'click .cancel': 'cancelAction'
    },
    //确定按钮
    confirmAction: function(e){
        var el = e.currentTarget;
        var $el = $(el);
        var type = $el.data('type');
        var $li = $el.closest('li.file_transport_info');
        var fingerprint = $li.attr('id'),
            user_id = $li.data('userid');
        var topic_id = process.contacts[user_id].topic_id;
        var $actionImgs = this.getActionImgs(fingerprint);
        if(type === 'upload'){
        
        }else{
            //如果是下载, 发送接收文件的响应
            var body =  {
                sender: process.user_id,
                msg_type: process.I_FILE_RESPONSE_ACCEPT_TRANSPORT,
                topic_id: topic_id,
                uuid: uuid.v1(),
                msg_content: {
                    encryption: null,
                    fingerprint: fingerprint
                }
            };
            var messageBody = JSON.stringify(body);
            process.sockjs.send(messageBody);
        }
        $actionImgs.hide();
    },
    //取消按钮
    cancelAction: function(e){
        var el = e.currentTarget;
        var $el = $(el);
        var type = $el.data('type');
        var $li = $el.closest('li.file_transport_info');
        var fingerprint = $li.attr('id'),
        user_id = $li.data('userid');
        var topic_id = process.contacts[user_id].topic_id;
        if(type === 'upload'){

        }else{
            var body =  {
                sender: process.user_id,
                msg_type: process.I_FILE_RESPONSE_REFUSE_TRANSPORT,
                topic_id: topic_id,
                uuid: uuid.v1(),
                msg_content: {
                    encryption: null,
                    fingerprint: fingerprint
                }
            };
            console.log(body);
            var messageBody = JSON.stringify(body);
            process.sockjs.send(messageBody);
        }
        $li.remove();
    },
    initJQueryElement: function(){
        this.$fileList = this.$el.find('ul.file_list');
    },
    getActionImgs: function(fingerprint, selector){
        selector ||(selector = '.confirm, .cancel');
        return this.$el.find('#' + fingerprint).find(selector);
    },
    initialize: function(){
            this.window = this.options.window;
            this.render();
    },
    renderProcessBar: function(files, id, type){
        var view = this;
        var contact = process.contacts[id];
        var nick_name = contact.nick_name;
        var htmls = [];
        var template = this.window.DocumentTemplate.process_loading_tpl.join(''),
            confirm_png = 'offline_down.png';
        _.each(files, function(file){
            var $fingerprint = view.$el.find('#' + file.fingerprint);
            var $actionImgs = view.getActionImgs(file.fingerprint); 
            if(type === 'upload'){
                if(file.status === 3 && $fingerprint.length ){
                    memo = '文件' + file.file_name + '正在发送中，请不要重复发送';
                    $fingerprint.find('.transport_memo').text(memo);
                    $actionImgs.hide();
                    return true;
                }
                memo =  '等待' + nick_name + '接受文件';
            }else{
                confirm_png = 'receiver_down.png';
                memo =  nick_name + '向您发送文件，请您接收';
            }
            $actionImgs.show();
            var tplObj = _.extend(file,{
                portrait: contact.portrait,
                memo: memo,
                type: type,
                user_id: id,
                confirm_png: confirm_png
            });
            tplObj.file_size_show = utils.parseSpaceShow(tplObj.file_size);
            var html = _.template(template, tplObj);
            htmls.push(html);
        });
        this.$fileList.append(htmls.join(''));
    },
    render: function(){
        var template = this.window.DocumentTemplate.file_transport_tpl.join('');
        var _template = _.template(template, {
        });
        this.$el.html(_template);
        this.initJQueryElement();
        if(process.files && process.queue_id && process.queue_type){
            this.renderProcessBar(process.files, process.queue_id, process.queue_type);
        }
    }
});

//2.1 处理文件上传下载进度的窗口
var FileTransportWindow = Window.extend({
    initialize: function(params){
        FileTransportWindow.superclass.initialize.call(this, params);
        this.appWindow.focus();
    },
    initBackBoneView: function(){
        FileTransportWindow.superclass.initBackBoneView.call(this);
        this.view = new FileTransportWindowView({
            window: this
        });
    },
    destroy: function(){
        FileTransportWindow.superclass.destroy.call(this);
    }
});

process.fileTransportWindow = new FileTransportWindow({
     name: 'fileTransport',
     classType: 'window',
     localStorage: localStorage,
     Backbone: Backbone,
     gui: gui
});

process.windows.push(process.fileTransportWindow);



