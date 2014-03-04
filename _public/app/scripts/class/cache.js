var Base = require('../base/base');

/*
 * 全局的缓存读取，Cache类
 * initCache(type)
 * get(key)
 * set(key, val)
 * ...
 * */

var Cache = Base.extend({
    initialize: function(storage, winname){
        this.storage = storage;
        if(!storage){
            throw new Error('storage is null!');
        }
        Cache.superclass.initialize.call(this);
        this.initCache();
        if(winname === 'main'){
            this.clear();
        }
    },
    //discard method, init login will clear storage-data
    initCache: function(){
        //topic_id 不再需要存储，离线消息，加入未读，从聊天记录里面获取
        this.cache = {};
        try{
        for(var i=0; i<this.storage.length; i++){
            var key = this.storage.key(i);
            var val = this.storage.getItem(key);
            //object,array,string,number,boolean
            if(val.indexOf('|') > -1 ){
                var _val = val.split(process.CACHE_SPLIT_FLAG);
                var dataType = _val[0];
                var value = val.substring(dataType.length + 1); //字符串中可能会和flag的，导致分割出问题
                switch(dataType.toLowerCase()){
                    case 'number':
                        value = parseFloat(value);
                    break;
                    case 'object':
                        value = JSON.parse(value);
                    break;
                    case 'boolean':
                        value = value === 'true' ? true:false;
                    break;
                    default:
                }
                this.cache[key] = value;
            }
        }
        }catch(e){
            console.log(e.message);
        }
    },
    get: function(key){
        return this.cache[key];
    },
    set: function(key, value){
        this.cache[key] = value;
        var _value = typeof value === 'object' ? JSON.stringify(value) : value;
        this.storage.setItem(key, [typeof value, '|', _value].join(''));
    },
    remove: function(key){
        delete this.cache[key];
        this.storage.removeItem(key);
    },
    clear: function(){
        this.cache = {};
        this.storage.clear();
    },
    destroy: function(){
        Cache.superclass.destroy.call(this);
    }
});

module.exports = Cache;
