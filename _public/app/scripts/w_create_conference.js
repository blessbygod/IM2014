//当前窗口依赖项
var Window = require('./scripts/class/window');
$ = require('jquery')(this),
_ = require('underscore'),
utils = require('./utils'),
gui = require('nw.gui'),
Backbone = require('backbone')(this),
require('./scripts/plugin/ztree')(this);


//定义当前窗口主体的View
var CreateConferenceWindowView = Backbone.View.extend({
    el: 'section',
    events:{
        'click .search': 'searchMemeber',
        'change .select_all': 'selectAllMembers',
        'click .confirm': 'createConference'
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        this.treeId= 'tree_view';
        this.treeSelector = utils.getIdSelector(this.treeId);
        this.render();
    },
    searchMember: function(e){
    },
    //全选当前节点所有成员
    selectAllMembers: function(e){
        var el = e.currentTarget;
        var checked = el.checked;
        var members = [];
        $(el).parent().find('.ck_member').each(function(){
            this.checked = checked;
            var $member = $(this).parent();
            var member = {};
            member.id = $member.data('id');
            member.name = $member.data('name');
            members.push(member);
        });
        this.addMemberInSelectedList(members);
    },
    //已选成员列表
    addMemberInSelectedList: function(members){
        var htmls = [];
        var view = this;
        _.each(members, function(member){
            var template = view.window.DocumentTemplate.member_tpl.join('');
            var html = _.template(template, {
                member: member
            });
            htmls.push(html);
        });
        this.$selectedMembers.append(htmls);
    },
    //创建会话
    createConference: function(e){
        var $members = this.$selectedMembers.find('li');
        var members = [],
            msg_type = process.I_GROUP_CHAT_MESSAGE,
            topic_name = $('.topic_name').val().trim() || null;
            var names = [];
            _.each($members, function(member){
                var id = $(member).data('id'); 
                var name = process.contacts[id].nick_name;
                members.push(id);
                names.push(name);
            });
            if(!topic_name){
                //使用昵称来作为会话名称
                topic_name = names.join();
            } 
            //创建会话
            this.window.EventHandler.createTopic({
                body: {
                    topic_name: topic_name,
                    topic_type: msg_type,
                    members: members
                },
                callback: function(){
                    process.mainWindow.view.switchList('conference');
                    process.createConferenceWindow.appWindow.close();
                }
            });
    },
    getDeptTreeDataCallback: function(ret) {
        var deptTree = utils.treeify({
            flat: ret.data,
            idKey: 'id',
            parentIdKey: 'parentid',
            labelKey: 'foldername',
            rootPID: null
        });
        _.each(deptTree, function(data){
            data.open = true;
        });
        $.fn.zTree.init(this.$treeView, {
            data:{
                key: {
                    name: "foldername"
                },
                simpleData: {
                    enable: true,
                    idKey: "id",
                    pIdKey: "parentid",
                    rootPID: null
                }
            }
        }, deptTree);
        this.zTreeObj = $.fn.zTree.getZTreeObj(this.treeId);
        console.log(this.zTreeObj);
        //设置节点点击事件
        this.zTreeObj.setting.callback.onClick = _.bind(this.clickSelectedNode, this);
    },
    getDeptMembersCallback: function(ret){
        var $members = [];
        var template = this.window.DocumentTemplate.checkbox_members_tpl.join('');
        var html = _.template(template, {
            members: ret.data,
            id: this.id
        });
        this.$checkboxMembers.append(html);
        $members = this.$el.find(this.currNodeSelector);
        $members.siblings().hide();
    },
    clickSelectedNode: function(e){
        var selectedNodes = this.zTreeObj.getSelectedNodes();
        var selectedNode = selectedNodes[0];
        this.id = selectedNode.id;
        this.currNodeSelector = utils.getIdSelector(this.id + '_members');
        var $members = this.$el.find(this.currNodeSelector);
        if($members.length){
            $members.show();
            $members.siblings().hide();
        }else{
            //获取成员列表
            this.window.EventHandler.getDeptMembers({
                body: {
                    branch_id: this.id
                },
                callback: _.bind(this.getDeptMembersCallback, this)
            });
        }
    },
    initJQueryElement: function(){
        this.$treeView = this.$el.find(this.treeSelector);//ztree 必须有id才能使用。。。
        this.$checkboxMembers = this.$el.find('.checkbox_members');
        this.$selectedMembers = this.$el.find('.selected_members');
    },
    render: function(){
        var template = this.window.DocumentTemplate.create_conference_tpl.join('');
        this.window.EventHandler.getDeptTreeData({
            callback: _.bind(this.getDeptTreeDataCallback, this)
        });
        this.$el.html(template);
        this.initJQueryElement();
    },
    destroy: function(){
    }
 });

//登录窗口类
var CreateConferenceWindow = Window.extend({
     initialize: function(params){
         CreateConferenceWindow.superclass.initialize.call(this, params);
     },
     initBackBoneView: function(){
         this.view = new CreateConferenceWindowView({
            window: this
         });
         CreateConferenceWindow.superclass.initBackBoneView.call(this);
     },
     render: function(){
         CreateConferenceWindow.superclass.render.call(this);
     },
     destroy: function(){
         CreateConferenceWindow.superclass.destroy.call(this);
     }
 });
 //实例化登录窗口
 process.createConferenceWindow = new CreateConferenceWindow({
     name: 'createConference',
     classType: 'window',
     localStorage: localStorage,
     Backbone: Backbone,
     gui: gui
 });

 process.windows.push(process.createConferenceWindow);

 document.body.onkeyup = function(e){
    if(e.keyCode === 13){
        process.createConfreneceWindow.view.$login.click();
    }
 };

 //aspect before, after 只能在事件执行前监听；
