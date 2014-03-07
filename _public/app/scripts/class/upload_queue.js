var Base = require('../base/base'),
_ = require('underscore'),
utils = require('../../utils'),
uuid = require('uuid'),
Crypto = require('crypto'),
EventHandler = require('../EventHandler');

var fs = require('fs');
var range = process.I_FILE_RANGE;

/*
 *  队列管理
 *  文件的上传队列管理
 *
 * */
//队列状态
//只关心一个文件的完成
//0  已发出请求
//1  请求被响应，可以上传了
//2  上传中
//3  该文件在上传队列中
var Queue = Base.extend({
    initialize: function(conferenceView, gui, files){
        this.type = "normal"; // offline, normal
        this.id = conferenceView.id;
        this.topic_id = conferenceView.topic_id;
        this.gui = gui;
        this.queue = [];
        this.queueKeys = {};
        this.pushFile(files);
    },
    //入队列
    pushFile: function(files){
        var queue = this;
        var render_view_files = [], send_message_files = [];
        var calc_num = 0;
        _.each(files, function(file){
            var file_data = {};
            file_data.status = 0;
            file_data.file_name = file.name;
            file_data.file_size = file.size;
            file_data.file_path = file.path;
            file_data.doctype = utils.isKnownFileType(file.name);
            //计算md5
            queue.calcFileMd5(file, function(fingerprint){
                calc_num++;
                file_data.fingerprint = fingerprint;
                if(queue.queueKeys.hasOwnProperty(fingerprint)){
                    file_data.status = 3;
                }else{
                    send_message_files.push(file_data);
                    queue.queue.push(file_data);
                    queue.queueKeys[fingerprint] = file_data;
                }
                render_view_files.push(file_data);
                if(calc_num === files.length){
                    //在文件传输管理窗口上即时显示状态
                    EventHandler.renderFileTransportWindowView(queue.gui, render_view_files, queue.id, 'upload');
                    queue.sendRequestTransferFileMessage(send_message_files);
                }
            });
        });
    },
    //发送 要求传送文件给其他用户的请求消息
    sendRequestTransferFileMessage: function(files){
        var queue = this;
        _.each(files, function(file){
            //发送的消息体
            var body =  {
                sender: process.user_id,
                topic_id: queue.topic_id,
                msg_type: process.I_FILE_REQUEST_TRANSPORT,
                uuid: uuid.v1(),
                msg_content: {
                    encryption: null,
                    name: file.file_name,
                    fingerprint: file.fingerprint,
                    total_size: file.file_size
                }
            };
            var messageBody = JSON.stringify(body);
            process.sockjs.send(messageBody);
        });
    },
    //主动离线下载或者是由接受文件用户响应来自动下载某文件
    uploadFile: function(fingerprint){
        //这里应该有id+'_' + fingerprint;
        var queue = this;
        _.each(this.queue, function(file){
            var _fingerprint = file.fingerprint;
            if(fingerprint === _fingerprint){
                file.startTime = Date.now();
                queue.readFileBuffer(file, 0, fingerprint);
            }
        });
    },
    //读取文件并准备上传
    readFileBuffer: function(file, index, fingerprint){
        var count = Math.ceil(file.file_size / range);
        if(index >= count)return;
        console.log('ready upload ' + (index + 1) + '/' + count);
        var readBufferFunc = function(err, num) {
            if(err){
                console.error(err.message);
                return;
            }
            //计算每块文件的md5
            var md5 = Crypto.createHash('md5');
            md5.update(this.buffer);
            var part_fingerprint = md5.digest('hex');
            console.log('part_md5:' + part_fingerprint);
            this.queue.uploadRangeFile(this.fd, this.file, this.index, this.buffer, this.fingerprint, part_fingerprint);
        };
        var readPathFunc = function(err, fd) {
            if (err) {
                console.error(err.message);
                return;
            }
            var _range = range;
            var start = index * range;
            //最后一块小于等于分块的长度
            if(index === count - 1){
                _range = file.file_size - start;
            }
            var buffer = new Buffer(_range);
            console.log('range:' + _range);
            fs.read(fd, buffer, 0, _range, start, _.bind(readBufferFunc, {
                fd: fd,
                fingerprint: this.fingerprint,
                index: this.index,
                buffer: buffer,
                file: this.file,
                queue: this.queue
            }));
        };
        //准备上传, 文件分块
        fs.open(file.file_path, 'r', _.bind(readPathFunc, {
            fingerprint: fingerprint,
            file: file,
            index: index,
            queue: this
        }));
    },
    uploadRangeFile: function(fd, file, index, buffer, fingerprint, part_fingerprint){
        try{
        var callback = function(){
            var fingerprint = this.fingerprint,
                part_fingerprint = this.part_fingerprint,
                index = this.index,
                queue = this.queue,
                file = this.file;
            //关掉文件，如果是非离线状态并发送403请求告诉用户需要下载
            if(this.type !== 'offline'){
                queue.sendCanDownloadRequest(part_fingerprint, index, file);
            }
            console.log('关闭文件');
            fs.close(this.fd, function(err){
                if(err){
                    console.error(err.message);
                    return;
                }
                queue.readFileBuffer(file, (index + 1), fingerprint);
            });
        };
        EventHandler.uploadFile({
            headers:{
                user_id : process.user_id,
                token: process.token,
                fingerprint: fingerprint,
                receiver: this.id,
                total_size: file.file_size,
                file_name: encodeURIComponent(file.file_name),
                split_size: range,
                part_fingerprint: part_fingerprint,
                index: index
            },
            body: buffer,
            retryTimes: 3,
            callback: _.bind(callback, {
                fd: fd,
                file: file,
                fingerprint: fingerprint,
                part_fingerprint: part_fingerprint,
                index: index,
                queue: this
            })
        });
        }catch(ex){
            console.log(ex.message);
        }
    },
    //送403请求告诉用户需要下载
    sendCanDownloadRequest: function(part_fingerprint, index, file){
        var fingerprint = file.fingerprint,
            file_name = file.file_name,
            total_size = file.file_size;
         var body =  {
                sender: process.user_id,
                topic_id: this.topic_id,
                msg_type: process.I_FILE_RANGE_CAN_DOWNLOAD,
                uuid: uuid.v1(),
                msg_content: {
                    encryption: null,
                    fingerprint: fingerprint,
                    part_fingerprint: part_fingerprint,
                    split_size: range,
                    index: index,
                    file_name: file_name,
                    total_size: total_size
                }
            };
            var messageBody = JSON.stringify(body);
            process.sockjs.send(messageBody);
            //目前计算按顺序上传
            this.drawProcessBar(file, index, Date.now());
    },
    drawProcessBar: function(file, index, cTime){
        var fingerprint = file.fingerprint,
            total_size = file.file_size,
            startTime = file.startTime;
        var count = Math.ceil(total_size / range);
        var loaded = index + 1;
        var loaded_size = loaded === count ? total_size : loaded * range,
            speed = 0,
            wasteTime = (cTime - startTime) / 1000;
        //计算下载速度，计算剩余时间
        speed = (loaded_size/1024/wasteTime ).toFixed(2);
        var left_size = total_size - loaded_size;
        var leftTime = this.calcShowLeftTime(speed, left_size);
        process.fileTransportWindow.view.renderProcessing(this.id, fingerprint, total_size, loaded_size, speed, leftTime);
    },
    //计算剩余时间
    calcShowLeftTime: function(speed, left_size){
        var unit = '秒';
        var show_time = [];
        return parseInt(left_size/1024/speed, 10) + unit;
    },
    //计算文件md5
    calcFileMd5: function(file, callback){
        var stream = fs.ReadStream(file.path);
        var md5 = Crypto.createHash('md5');
        stream.on('data', function(chunk){
            md5.update(chunk);
        });
        stream.on('end', function(){
            var fingerprint = md5.digest('hex');
            callback(fingerprint);
        });
    },
    destroy: function(){
    }
});

module.exports = Queue;
