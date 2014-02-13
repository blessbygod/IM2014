
//当前窗口依赖项
var Window = require('./scripts/class/window');
$ = require('jquery')(window),
_ = require('underscore'),
gui = require('nw.gui'),
Backbone = require('backbone')(window);

//1.2 确认可用服务器

//定义当前窗口主体的View
var LoginWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        "click .login_button":function(event){
            var view = this;
            this.user_name = this.$user.val().trim();
            this.password = this.$password.val().trim();
            this.domain = this.$domain.val().trim();
            this.user_id = this.user_name + '@' + this.domain;
            this.window.EventHandler.loginAction.call(this, event, function(){
                view.window.EventHandler.setUserStatus(function(){
                    gui.Window.open('w_main.html', {
                        width: 280,
                        height: 600,
                        position: 'left',
                        toolbar: false,
                        frame: false
                    });
                });
            });
        }
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        this.render();
    },
    initJQueryElement: function(){
        this.$user = this.$el.find('.login_user');
        this.$password = this.$el.find('.login_password');
        this.$domain = this.$el.find('.login_domain');
        this.$error = this.$el.find('.login.error');
        this.$login = this.$el.find('.login_button');
        this.$user.focus();
    },
    render: function(){
        this.template = this.window.DocumentTemplate.login_tpl.join('');
        this.$el.html(this.template);
        this.initJQueryElement();
    },
    destroy: function(){
    }
 });

//登录窗口类
var LoginWindow = Window.extend({
     initialize: function(params){
         LoginWindow.superclass.initialize.call(this, params);
     },
     initBackBoneView: function(){
         this.view = new LoginWindowView({
            window: this
         });
         LoginWindow.superclass.initBackBoneView.call(this);
     },
     render: function(){
         LoginWindow.superclass.render.call(this);
     },
     destroy: function(){
         LoginWindow.superclass.destroy.call(this);
     }
 });
 //实例化登录窗口
 process.loginWindow = new LoginWindow({
     name: 'login',
     classType: 'window',
     localStorage: localStorage,
     Backbone: Backbone,
     gui: gui
 });

 document.body.onkeyup = function(e){
    if(e.keyCode === 13){
        process.loginWindow.view.$login.click();
    }
 };

 process.windows = [];
 process.windows.push(process.loginWindow);

 //aspect before, after 只能在事件执行前监听；
