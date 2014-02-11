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
        'change .ck_member': 'selectAMember',
        'click .selected_members_panel .member': 'rmSelectedMember',
        'click .confirm': 'createConference'
    },
    initialize: function(){
        //当前窗口的实例
        this.window = this.options.window;
        this.treeId= 'tree_view';
        this.treeSelector = utils.getIdSelector(this.treeId);
        this.selectedMembers = {};
        this.render();
    },
    searchMember: function(e){
    },
    //全选当前节点所有成员
    selectAllMembers: function(e){
        var view = this;
        var el = e.currentTarget;
        var checked = el.checked;
        var members = [], ids= [];
        $(el).parent().find('.ck_member').each(function(){
            this.checked = checked;
            var $member = $(this).parent();
            var member = {};
            var id = $member.data('id'),
                name =  $member.data('name');
            member.id =  id;
            member.name = name;
            members.push(member);
            ids.push(id);
        });
        if(checked){
            this.addMembersToSelectedList(members);   
        }else{
            this.rmMembersFromSelectedList(ids);
        }
    },
    //选择一个成员
    selectAMember: function(e){
        var el = e.currentTarget;
        var checked = el.checked;
        var $el = $(el).parent();
        var id = $el.data('id'),
            name = $el.data('name');
        var member = {
            id: id,
            name: name
        };
        if(checked){
            this.addMembersToSelectedList([member]);
        }else{
            this.rmMembersFromSelectedList([id]);
        }
    },
    //单击已选列表移除
    rmSelectedMember: function(e){
        var el = e.currentTarget;
        var $el = $(el);
        var id = $el.data('id');
        this.rmMembersFromSelectedList([id]);
        this.currNodeSelector = utils.getIdSelector(this.id + '_members');
        var $members = this.$el.find(this.currNodeSelector);
        this.renderMembersStatus($members);
    },
    //添加成员到已选成员列表
    addMembersToSelectedList: function(members){
        var view = this;
        _.each(members, function(member){
            var id = member.id;
            if(view.selectedMembers.hasOwnProperty(id) === false){
                view.selectedMembers[id] = member;
            }
        });
        this.renderMembers(this.selectedMembers);
    },
    //从已选成员列表移除成员
    rmMembersFromSelectedList: function(ids){
        var view = this;
        _.each(ids, function(id){
            if(view.selectedMembers.hasOwnProperty(id)){
                delete view.selectedMembers[id];
            }
        });
        this.renderMembers(this.selectedMembers);
    },
    renderMembers: function(members){
        var htmls = [];
        var template = this.window.DocumentTemplate.member_tpl.join('');
        var html = _.template(template, {
            _: _,
            members: members
        });
        htmls.push(html);
        this.$selectedMembers.html(htmls);
    },
    //创建会话
    createConference: function(e){
        var $members = this.$selectedMembers.find('li');
        var members = [],
            msg_type = process.I_GROUP_CHAT_MESSAGE,
            topic_name = $('.topic_name input').val().trim() || null;
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
    //获取树数据
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
    //渲染选择列表
    getDeptMembersCallback: function(ret){
        var $members = [];
        var template = this.window.DocumentTemplate.checkbox_members_tpl.join('');
        var members = ret.data;
        var view = this;
        _.each(members, function(member){
            var id = member.id;
            if(view.selectedMembers.hasOwnProperty(id)){
                member.checked = true;
            }
        });
        var html = _.template(template, {
            members: members,
            id: this.id
        });
        this.$checkboxMembers.append(html);
        $members = this.$el.find(this.currNodeSelector);
        $members.siblings().hide();
    },
    renderMembersStatus: function($members){
        //切换members的成员选择状态
        var view = this;
        $members.find('li.member').each(function(e){
            var $member = $(this);
            var id = $member.data('id');
            var $checkbox = $member.find('input[type=checkbox]');
            if(view.selectedMembers.hasOwnProperty(id)){
                $checkbox[0].checked = true;
            }else{
                $checkbox[0].checked = false;
            }
        });
    },
    //获取当前节点（部门）的员工
    clickSelectedNode: function(e){
        var view = this;
        var selectedNodes = this.zTreeObj.getSelectedNodes();
        var selectedNode = selectedNodes[0];
        this.id = selectedNode.id;
        this.currNodeSelector = utils.getIdSelector(this.id + '_members');
        var $members = this.$el.find(this.currNodeSelector);
        if($members.length){
            $members.show();
            this.renderMembersStatus($members);
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
