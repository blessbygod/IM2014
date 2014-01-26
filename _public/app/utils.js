"use strict";
var _ = require('underscore'),
    uuid = require('uuid');


var exports = exports || {};

exports.uuid = uuid.v1();

exports.in_array = function (item, array) {
    return (array.indexOf(item) != -1);
};

exports.sort_keys = function (obj) {
    return Object.keys(obj).sort();
};

exports.uniq = function (arr) {
    var out = [];
    var o = 0;
    for (var i=0,l=arr.length; i < l; i++) {
        if (out.length === 0) {
            out.push(arr[i]);
        }
        else if (out[o] != arr[i]) {
            out.push(arr[i]);
            o++;
        }
    }
    return out;
};


var _daynames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var _monnames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function _pad (num, n, p) {
    var s = '' + num;
    p = p || '0';
    while (s.length < n) s = p + s;
    return s;
}

exports.pad = _pad;

exports.date_to_str = function (d) {
    return _daynames[d.getDay()] + ', ' + _pad(d.getDate(),2) + ' ' +
           _monnames[d.getMonth()] + ' ' + d.getFullYear() + ' ' +
           _pad(d.getHours(),2) + ':' + _pad(d.getMinutes(),2) + ':' + _pad(d.getSeconds(),2) +
           ' ' + d.toString().match(/\sGMT([+-]\d+)/)[1];
};

exports.decode_qp = function (line) {
    if (! /=/.test(line)) {
        // this may be a pointless optimisation...
        return new Buffer(line);
    }
    line = line.replace(/=\n/mg, '');
    var buf = new Buffer(line.length);
    var pos = 0;
    for (var i=0,l=line.length; i < l; i++) {
        if (line[i] === '=') {
            i++;
            buf[pos] = parseInt(line[i] + line[i+1], 16);
            i++;
        }
        else {
            buf[pos] = line.charCodeAt(i);
        }
        pos++;
    }
    return buf.slice(0, pos);
};

function _char_to_qp (ch) {
    return "=" + _pad(ch.charCodeAt(0).toString(16).toUpperCase(), 2);
}
// Shameless attempt to copy from Perl's MIME::QuotedPrint::Perl code.
exports.encode_qp = function (str) {
    var broken_lines = '';
    str = str.replace(/([^\ \t\n!"#\$%&'()*+,\-.\/0-9:;<>?\@A-Z\[\\\]^_`a-z{|}~])/g, function (orig, p1) {
        return _char_to_qp(p1);
    }).replace(/([ \t]+)$/gm, function (orig, p1) {
        return p1.split('').map(_char_to_qp).join('');
    }).replace(/([\s\S]*?^[^\n]{73}(?:[^=\n]{2}(?![^=\n]{0,1}$)|[^=\n](?![^=\n]{0,2}$)|(?![^=\n]{0,3}$)))/gm,
        function (orig, p1) {
            broken_lines += p1 + "=\n";
            return '';
        });
    return broken_lines + str;
};

var versions   = process.version.split('.'),
    version    = Number(versions[0].substring(1)),
    subversion = Number(versions[1]);

exports.existsSync = require((version > 0 || subversion >= 8) ? 'fs' : 'path').existsSync;

exports.indexOfLF = function (buf) {
    for (var i=0; i<buf.length; i++) {
        if (buf[i] === 0x0a) return i;
    }
    return -1;
};
//分析传统数据库二维表存储的树节点数据。
//字典化数据库数据
var dictFlat = function(){
    var dict = {};
    var self = this;
    _.each(this.flat, function(item){
        var key = item[self.idKey],
        val = item[self.parentIdKey];
        dict[key] = val;
    });
    return dict;
};
//格式化数据
var formatFlat = function(){
    var self = this,
        format = {};
    _.each(this.flat, function(item){
        var key = item[self.parentIdKey];
        if(!format.hasOwnProperty(key)){
            format[key] = [];
        }
        format[key].push(item);
    });
    return format;
};
//按深度排序数据
var sortFlat = function(dict, format, nodeId, idKey, flatTree){
    if(!_.isArray(flatTree))return;
    if(_.isArray(format) && format.length === 0)return;
    if(format.hasOwnProperty(nodeId)){
        var tmp = format[nodeId].shift();
        flatTree.push(tmp);
        if(format[nodeId].length === 0){
            delete format[nodeId];
        }
        return sortFlat(dict, format, tmp[idKey], idKey, flatTree);
    }else{
        if(dict.hasOwnProperty(nodeId)){
            return sortFlat(dict, format, dict[nodeId], idKey, flatTree);
        }
    }
};

//只负责深度排序过后的有顺序的数组队列
/*
{
    "name": "root",
    "children": [
        {"name": "leaf1", children: []}
    ]
}
*/
exports.treeify = function(options){
    var flat = options.flat,
        labelKey = options.labelKey,
        parentIdKey = options.parentIdKey,
        idKey = options.idKey,
        rootPID = options.rootPID;
    var dict = dictFlat.apply(options);
    var format = formatFlat.apply(options);
    var flatTree = [];
    sortFlat(dict, format, rootPID, idKey, flatTree);
    return flatTree;
};

//生成id选择器
exports.getIdSelector = function(id){
    return '[id="' + id + '"]';
};
