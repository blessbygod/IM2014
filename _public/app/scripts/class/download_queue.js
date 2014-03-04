var Base = require('../base/base'),
_ = require('underscore'),
EventHandler = require('../EventHandler');

var fs = require('fs');

/*
 *  队列管理
 *  文件的下载队列管理
 *
 * */

//队列状态
//只关心一个文件的完成
//0 服务器已通知
//1 客户端正在下载
//2 客户端已下载
//3 客户端已存入文件
// 定时器
var Queue = Base.extend({
    initialize: function(gui, firstdata){
        this.queue = [];
        this.sender = firstdata.sender;
        _.extend(this, firstdata.msg_content);
        this.id = this.sender + '_' + this.fingerprint;
        this.file_name = decodeURIComponent(this.file_name);
        this.path = gui.App.dataPath;//默认存储文件路径
        this.count = Math.ceil(this.total_size / this.split_size);
        this.pushPartFile(firstdata, true);
        this.initTimer();
    },
    //写入文件块到文件里
    writePartFile: function(buffer, part){
        var index = part.index;
        var fd = fs.openSync(this.path, 'a+');
        var start = index * this.split_size;
        var writeStream = fs.createWriteStream(this.path, {
            flags: 'r+',
            mode: 0777,
            start: start
        });
        //用流写入文件
        writeStream.write(buffer, function(err){
            console.log('part ' + (index) +' write ok!!!');
            console.log(part);
            console.log(fd);
            part.status = 3;
            fs.closeSync(fd);
        });
        /*fs.write(fd, buffer, 0, buffer.length, position, function(err, buffer){
            console.log('part ' + (index) +' write ok!!!');
            part.status = 3;
            fs.closeSync(fd);
        });
        */
    },
    //拉取服务器已经下载好的文件
    downloadPartFile: function(path, part){
        var queue = this;
        part = _.isUndefined(part) ? this.part : part;
        path = _.isUndefined(path) ? this.path : path;
        if(part.status !== 0)return;
        part.status = 1;
        var buffer_size = this.split_size;
        if(part.index === (this.count - 1)){
            buffer_size = this.total_size - (part.index * this.split_size);
        }
        var headers = {
            user_id: process.user_id,
            token: process.token,
            fingerprint: this.fingerprint,
            index: part.index,
            split_size: this.split_size
        };
        EventHandler.downloadFile({
            headers: headers,
            buffer_size: buffer_size,
            body: '',
            callback: function(chunk){
                part.status = 2;
                queue.path = path;
                queue.writePartFile(chunk, part);
            }
        });
    },
    //推入队列
    pushPartFile: function(data, isFirst){
        var part = {};
        part.status = 0;
        part.fingerprint = data.msg_content.part_fingerprint;
        part.index = data.msg_content.index;
        if(isFirst){
            this.part = part;
        }
        this.queue.push(part);
    },
    //定时检查队列
    checkQueue: function(){
        var queue  = this;
        var path = queue.path;
        var complete_part = 0;
        console.log(new Date().toLocaleTimeString());
        //校验队列文件块的状态, 发现已通知的文件，拉取
        try{
        _.each(this.queue, function(part){
            if(part.status === 0){
                //拉取文件
                console.log('检查到part:' + JSON.stringify(part));
                queue.downloadPartFile(path, part);
            }
            if(part.status === 3){
                complete_part++;
            }
        });
        }catch(ex){
            console.log(ex.message);
        }
        //取消定时器
        if(complete_part === this.count){
            clearInterval(this.timer);
            this.id = null;
            console.log('文件:' + this.fingerprint + '(下载完成)');
        }
    },
    initTimer: function(){
        this.timer = setInterval(_.bind(this.checkQueue, this), 5000);
    },
    destroy: function(){
    
    }
});


module.exports = Queue;
