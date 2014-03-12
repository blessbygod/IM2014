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
    initialize: function(gui){
        this.queue = [];
        this.pause = false; // 是否暂停
        this.abort = false;
        this.path = gui.App.dataPath;//默认存储文件路径
    },
    initFirstData: function(firstdata){
        this.sender = firstdata.sender;
        _.extend(this, firstdata.msg_content);
        this.id = this.sender + '_' + this.fingerprint;
        this.file_name = decodeURIComponent(this.file_name);
        this.count = Math.ceil(this.total_size / this.split_size);
        this.loadedPart = -1;
        this.startTime = Date.now();
        //this.pushPartFile(firstdata, true);
    },
    //主动拉取离线文件
    initOfflineQueue: function(file){
        var queue = this;
        var fingerprint = file.fingerprint;
        var count = Math.ceil(file.size / this.split_size);
        _.each(count, function(index){
            var part = {};
            part.index = index;
            queue.queue.push(part);
        });
        this.initTimer();
    },
    //推入队列
    pushPartFile: function(data){
        var part = {};
        part.status = 0;
        //part.part_fingerprint = data.msg_content.part_fingerprint;
        part.index = data.msg_content.index;
        //可能第一块后过来，这块还得再改更稳妥的方案
        if(part.index === 0){
            this.part = part;
        }
        this.queue.push(part);
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
        writeStream.write(buffer);
        writeStream.end(function(err){
            if(err){
                console.log(err);
                return;
            }
            console.log('part ' + (index) +' write ok!!!');
            part.status = 3;
            fs.close(fd);
        });
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
    //定时检查队列
    checkQueue: function(){
        var queue  = this;
        var path = queue.path;
        var loaded_part = 0;
        console.log(new Date().toLocaleTimeString());
        //校验队列文件块的状态, 发现已通知的文件，拉取
        this.leftParts = [];
        if(this.pause || this.abort){
            this.clearTimer();
            return;
        }
        if(process.I_HTTP_CONNECT_COUNT >= process.I_LIMIT_HTTP_CONNECT){
            console.log('连接数超限制');
            return;
        }
        _.each(this.queue, function(part){
            if(part.status === 0){
                //拉取文件
                console.log('检查到part:' + JSON.stringify(part));
                queue.downloadPartFile(path, part);
            }
            if(part.status === 3){
                loaded_part++;
            }else{
                queue.leftParts.push(part.index);
            }
        });
        console.log(queue.leftParts);
        //画进度条, 只划分块的进度
        if(this.loadedPart < loaded_part && loaded_part > 0){
            this.drawProcessBar(loaded_part, Date.now());
            this.loadedPart = loaded_part;
        }
        //取消定时器
        if(loaded_part === this.count){
            this.clearTimer();
            this.id = null;
            console.log('文件:' + this.fingerprint + '(下载完成)');
        }
    },
    drawProcessBar: function(loaded, cTime){
        var fingerprint = this.fingerprint,
            total_size = this.total_size;
        var loaded_size = loaded !== this.count ? loaded * this.split_size : total_size,
            speed = 0,
            wasteTime = (cTime - this.startTime) / 1000;
        //计算下载速度，计算剩余时间
        speed = (loaded_size/1024/wasteTime ).toFixed(2);
        var left_size = total_size - loaded_size;
        var leftTime = this.calcShowLeftTime(speed, left_size);
        process.fileTransportWindow.view.renderProcessing(this.sender, fingerprint, total_size, loaded_size, speed, leftTime);
    },
    calcShowLeftTime: function(speed, left_size){
        var unit = '秒';
        var show_time = [];
        return parseInt(left_size/1024/speed, 10) + unit;
    },
    initTimer: function(){
        this.timer = setInterval(_.bind(this.checkQueue, this), 1000);
    },
    clearTimer: function(){
        clearInterval(this.timer);
    },
    destroy: function(){
    }
});
module.exports = Queue;
