var gui = require('nw.gui');
var win = gui.Window.get();

$(document).ready(function(){
    $('#show_dev_tools').click(function(){
        win.showDevTools();
    });
    $('#win_min').click(function(){
        win.minimize(); 
    });
    $('#win_max').click(function(e){
        var $el = $(this);
        if($el.hasClass('maxed')){
            win.unmaximize();
            $el.removeClass('maxed');
        }else{
            win.maximize();
            $el.addClass('maxed');
        }
    });
    $('#win_close').click(function(){
        win.close(); 
    });
    var util = require('util');
    var events = require('events');
    util.inherits(Man, events.EventEmitter);
    function Man(){}
    Man.prototype.say = function(data){
        this.emit('say',data);
    };
    Man.prototype.error = function(err){
        this.emit('error', err);
    };
    process.man = new Man();
    process.man.on('say', function(data){
        console.log( 'I say:' + data);
        alert('I say:' + data);
    });
    //触发错误的回调函数
    process.man.on('error', function(err){
        console.log('catch error:' + err);
    });
});
