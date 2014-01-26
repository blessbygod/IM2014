var config = require('../config'),
_ = require('underscore'),
request = require('request');


var g_urlRouter = config.get('url_router.json');
var EventHandler = {
    request: function(params){
        var url = params.url,
        body = params.body || {},
        callback = params.callback;
        body = _.extend({
            token: process.token,
            user_id: process.user_id
        }, body);
        request.post({
            url: url,
            body: JSON.stringify(body)
        }, function(err, res){
            if(err){
                console.log(err);
                return;
            }
            try{
                ret = JSON.parse(res.body);
            }catch(e){
                console.log('[' + url + ']body parse error:' + res.body);
                return;
            }
            if(ret.err_code !== 0){
                console.log('err_code ' + ret.err_code + ':' + ret.msg);
                return;
            }
            if(params.callback){
                params.callback(ret);
            }
        });
    },
    //用户登录事件
    loginAction: function(event, callback){
        var handler = EventHandler;
        var user_name = this.user_name,
        password = this.password,
        domain = this.domain,
        user_id = this.user_id;

        var v_username = user_name.length === 0,
        v_password = password.length === 0;
        if(v_username || v_password){
            this.$error.html('用户名或密码不能为空!');
            return;
        }
        //服务器的ip和端口
        var url = process.SupportServerURL + g_urlRouter.LOGIN_AUTH;
        handler.request({
            url: url,
            body: {
                user_id: user_id,
                pwd: password
            },
            callback: function(ret){
                process.token = ret.data.token;
                process.user_id = user_id;
                if(callback){
                    callback();
                }
            }
        });
    },
    setUserStatus: function(callback){
        var url = process.SupportServerURL + g_urlRouter.USER_SET_STATUS;
        var body = {
            status: 1 //默认为1，以后会有其他的状态定义
        };
        this.request({
            url: url,
            body: body,
            callback: function(ret){
                if(callback)callback(ret.data);
            }
        });
    },
    getDetails: function(ids, callback){
        var url = process.SupportServerURL + g_urlRouter.USER_GET_DETAILS;
        var body = {
            contact_ids: ids
        };
        this.request({
            url: url,
            body: body,
            callback: function(ret){
                process.users_detail = ret.data;
                if(callback){
                    callback(ret.data);
                }
            }
        });
    },
    getContacts: function(callback){
        var handler = this;
        var url = process.SupportServerURL + g_urlRouter.USER_GET_CONTACTS;
        this.request({
            url: url,
            callback: function(ret){
                if(callback){
                    handler.getDetails(ret.data.contacts, callback);
                }
            }
        });
    },
    //获取会话列表
    getTopics: function(callback){
        var url = process.SupportServerURL + g_urlRouter.TOPIC_GET_TOPICS;
        this.request({
            url: url,
            callback: function(ret){
                if(callback){
                   callback(ret);
                }
            }
        });
    },
    //创建会话，并返回会话ID
    createTopic: function(params){
        var handler = EventHandler;
        var url = process.SupportServerURL + g_urlRouter.TOPIC_CREATE;
        var body = params.body;
        console.log(body);
        handler.request({
            url: url,
            body: body,
            callback: function(ret){
                var topic_id = ret.data.topic_id;
                if(params.callback){
                    params.callback({
                        topic_id: topic_id,
                        message: params.message,
                        msg_type: body.topic_type,
                        user_id: body.user_id,
                        timestamp: body.timestamp
                    });
                }
           }
        });
    },
    //获取部门树结构，用来创建临时会话
    getDeptTreeData: function(params){
        var url = process.SupportServerURL + g_urlRouter.DEPARTMENT_TREE;
        var body = params.body;
        this.request({
            url: url,
            body: body,
            callback: function(ret){
                if(params.callback){
                    params.callback(ret);
                }
            }
        });
    },
    getDeptMembers: function(params){
        var url = process.SupportServerURL + g_urlRouter.DEPARTMENT_MEMBERS;
        var body = params.body;
        this.request({
            url: url,
            body: body,
            callback: function(ret){
                if(params.callback){
                    params.callback(ret);
                }
            }
        });
    },
    saveMessages: function(win, data){
        var sender = data.sender;
        var messages = win.localCache.get('messages');
        if(!messages){
            messages = {};
        }
        //所有的消息存储
        if(!messages.hasOwnProperty(sender)){
            messages[sender] = [];
        }
        messages[sender].push(data);
        win.localCache.set('messages', messages);
    },
    closeWindow: function(windows){
        if(_.isArray(windows)){
            //倒向删除法
            for(var index=windows.length-1; index>= 0; index--){
                var win = windows[index];
                //倒着删除，避免出错
                if(win.params.name !== 'main'){
                    for(var _index=process.windows.length-1; _index>= 0; _index--){
                        var _win = process.windows[_index];
                        if(win.uuid === _win.uuid){
                            //从总窗口集合windows移除
                            process.windows.unshift();
                        }
                    }
                    if(win.params.name === 'conference'){
                        delete process.conferenceWindow[win.view.target];
                    }else{
                        delete process[win.params.name + 'Window'];
                    }
                }else{
                     process.windows.unshift();
                }
               win.appWindow.close(true);
            }
        }else{
            throw new Error('windows is not Array');
        }
    }
};


module.exports = EventHandler;