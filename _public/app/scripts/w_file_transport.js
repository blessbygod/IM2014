var Window = require('./scripts/class/window'),
gui = require('nw.gui'),
utils = require('./utils'),
uuid = require('uuid'),
Queue = require('./scripts/class/download_queue'),
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
            user_id = $li.data('userid'),
            file_name = $li.data('name'),
            file_size = parseInt($li.data('size'), 10);
        var topic_id = process.contacts[user_id].topic_id;
        var split_size = process.I_FILE_RANGE;
        var $actionImgs = this.getActionImgs(fingerprint);
        if(type === 'upload'){
        
        }else{
            //触发保存按钮，增强用户体验
            var sid = user_id + '_' + fingerprint;
            if(!process.downloadQueues.hasOwnProperty(sid)){
                process.downloadQueues[sid] = new Queue(gui);
                process.mainWindow.view.currentFirstData = {
                    sender: user_id,
                    topic_id: topic_id,
                    msg_content: {
                        fingerprint: fingerprint,
                        file_name: file_name,
                        index: 0,
                        total_size: file_size,
                        split_size: split_size
                    }
                };
                process.mainWindow.view.currentQueue =  process.downloadQueues[sid];
                process.mainWindow.view.$fileSaveas.click();
            }
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
    renderProcessing: function(fingerprint,total_size, loaded_size, speed, leftTime){
         var $fingerprint = this.$el.find('#' + fingerprint);
         var $actionImgs = this.getActionImgs(fingerprint); 
         var $info = $fingerprint.find('.info');
         var $loading = $fingerprint.find('.process_loading');
         var $rate = $fingerprint.find('.process_rate');
         var $speed = $fingerprint.find('.speed');
         var $leftTime = $fingerprint.find('.left_time');
         var process = ((loaded_size / total_size) * 100).toFixed(2) + '%';
         $rate.html(process);
         $loading.width(process);
         $speed.html(speed);
         $leftTime.html(leftTime);
         if(process === 100){
             $info.html('文件已经下载完成');
             $actionImgs.hide();
         }
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



