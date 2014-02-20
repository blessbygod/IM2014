/*
 *  用来分类日志，定义控制台显示
 *  分类: info, warn, error, fetal
 *  显示: nodejs 控制台， chrome控制台, 后台日志记录
 *  监控： cpujs， 需要重新整理代码；
 *  异常：error，记录
 * */

var _ = require('underscore');
var detector = require('detector');

//获取本机IP
var os = require('os');
function getLocalIP() {
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family == 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses;
}
var localIP = getLocalIP();
var Logger = function(agent){
    var info = detector.parse(agent);
    var date = new Date();
    var os = info.os,
        browser = info.browser,
        device = info.device,
        engine = info.engine;
    var browserInfo = browser.name + '(' + browser.fullVersion + ')',
    deviceInfo = device.name,
    osInfo = os.name + '(' + os.fullVersion + ')';
    this.messages = [deviceInfo, osInfo, browserInfo, localIP[0]];
};

//先区分颜色信息， 级别内容信息未定
//  机器|系统(版本)|浏览器(版本)|IP|信息类型| message
_.each(['info', 'warn', 'error'], function(method){
    Logger.prototype[method] = function(msg){
        //根据级别不同打印不同的日志
        var messages = this.messages.slice(0);
        var callerStr = '\r\n(caller)' + Logger.prototype[method].caller.toString()+ '\r\n';
        messages.push(callerStr);
        messages.push(msg);
        var _messages = messages.join('|');
        switch(method){
            case 'warn':
                console.warn(_messages);
            break;
            case 'error':
                console.error(_messages);
            break;
            default:
                console.log(_messages);
        }
    };
});

module.exports = Logger;
