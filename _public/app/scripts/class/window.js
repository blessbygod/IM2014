var Base = require('../base/base'),
 _ = require('underscore'),
 uuid = require('uuid'),
Cache = require('../class/cache'),
Logger = require('../../logger');

/*
 * 窗口的基础类，实现模板的初始化，渲染，销毁的接口
 * 
 * */
var logger =  new Logger(window.navigator.userAgent);
var Window = Base.extend({
    initialize: function(params){
        logger.info('window initializing....');
        try{
            this.params = params;
            //初始化全局变量
            this.initGlobalVar();
            this.initCache();
            //初始化客户端APP的菜单，菜单功能等
            this.initAppItems();
            //初始化公共DOM模板，页头，页脚
            this.initDocumentTemplate();
            //初始化全局配置
            this.initGlobalConfig();
            //渲染当前文档模板
            this.initBackBoneView();
            //更新localCache的storage对象
            Window.superclass.initialize.call(this, params);
        }catch(e){
            logger.error('当前窗口初始化碰到问题:' + e.message);
        }
    },
    initCache: function(){
        this.localCache = new Cache(this.params.localStorage);
        //不能跨窗口传递存储, 需要在初始化每个窗口的时候做更新
    },
    syncCache: function(storage){
        //同步被其他窗口改变的存储,localStoarge
        this.localCache.storage = storage; 
        this.localCache.initCache();
    },
    initAppItems: function(){
        var win = this;
        this.uuid = uuid.v1();
        this.appWindow = this.params.gui.Window.get();
        //只能绑定一次，不要多次绑定该事件
        this.appWindow.once('close', function(e){
            if(win.params.name === 'main'){
                //清除缓存
                win.localCache.remove('messages');
                win.EventHandler.closeWindows(process.windows);
            }else{
                win.EventHandler.closeWindows([win]);
            }
        });
    },
    initGlobalVar: function(){
        this.Backbone = this.params.Backbone;
        //初始化项目结构路径
        this.initProjectPath();
        //初始化图片集合，用户更换主题、图片管理
        this.initImage();
        //初始化CSS命名集合，用户更换主题、和CSS命名管理
        this.initCSS();
        //初始化事件action集合
        this.EventHandler = require('../EventHandler');
    },
    initProjectPath: function(){
        this.Path = {
            IMAGE: 'images/',
            SCRIPT: 'scripts/',
            STYLE: 'styles/',
            CONFIG: 'config/'
        };
    },
    initImage: function(){
        this.IMAGE = {
            TRAY_ICON: this.Path.IMAGE + 'mail.png',
            EMPTY: this.Path.IMAGE + 'empty.png'
        };
    },
    initCSS: function(){},
    initDocumentTemplate: function(){
        this.DocumentTemplate = require('../DocumentTemplate');
        this.headerTemplate = this.DocumentTemplate.header_tpl.join('');
        this.footerTemplate = this.DocumentTemplate.footer_tpl.join('');
    },
    initGlobalConfig: function(){},
    initBackBoneView: function(){
        var HeaderView = this.Backbone.View.extend({
            el: 'header',
            events: {
                'click .show_dev_tools': 'showDevTools',
                'click .window_minimize': 'minimizeWindow',
                'click .window_maximize': 'maximizeWindow',
                'click .window_close': 'closeWindow'
            },
            initialize: function(){
                this.window = this.options.window;
                this.$ = this.window.Backbone.$;
                this.appWindow = this.window.appWindow;
                this.template = this.window.headerTemplate;
                this.render();
            },
            render: function(){
                this.$el.html(this.template);
            },
            showDevTools: function(){
                this.appWindow.showDevTools();
            },
            minimizeWindow: function(){
                this.appWindow.minimize();
            },
            maximizeWindow: function(event){
                var $el = this.$(event.currentTarget);
                if($el.hasClass('maxed')){
                    this.appWindow.unmaximize();
                }else{
                    this.appWindow.maximize();
                }
                $el.toggleClass('maxed');
            },
            closeWindow: function(){
                this.appWindow.close();
            }
        });
        var FooterView = this.Backbone.View.extend({
            el: 'footer',
            initialize: function(){
                this.window = this.options.window;
                this.template = this.window.footerTemplate;
                this.render();
            },
            render: function(){
                this.$el.html(this.template);
            }
        });
        this.headerView = new HeaderView({
            window: this
        });
        this.footerView = new HeaderView({
            window: this
        });
    },
    destroy: function(){
        Window.superclass.destroy.call(this, params);
    }
});

module.exports = Window;
