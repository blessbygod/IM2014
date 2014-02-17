
var DocumentTemplate = {
    header_tpl: [
        '<div class="pull-left win_action">',
            '<button class="btn window_minimize"> -- </button>',
            //'<button class="btn window_maximize"> 口 </button>',
            '<button class="btn window_close"> X </button>',
        '</div>',
        '<div class="btn show_dev_tools pull-left">nw版本:',
        '</div>',
        '<div class="drag_bar">',
        '</div>'
    ],
    footer_tpl: [
        '<footer>',
        '</footer>'
    ],
    login_tpl: [
        '<form action="/">',
            '<p>',
                '<span class="login error"></span>',
            '</p>',
            '<p>',
                '<input class="input-small login_user" placeholder="用户名" />',
                '@',
                '<select class="login_domain" class="input-medium">',
                    '<option value="test95.topmai.com">test95.topmai.com</option>',
                '</select>',
            '</p>',
            '<p>',
                '<input class="login_password" type="password" maxlength="16" placeholder="密码" value="1111aaaa" />',
            '</p>',
            '<p>',
                '<input class="login_button pull-right" type="button" value="登录" />',
            '</p>',
        '</form>'
    ],
    main_tpl: [
        '<div class="main">',
            '<div class="user_detail">',
            '</div>',
            '<div class="list_panel">',
                '<div class="search">',
                    '<input class="input-max" placeholder="搜索联系人" />',
                '</div>',
                '<div class="contact_list">',
                    '<div class="title">',
                        '<span class="toggle_list">',
                            '---',
                        '</span>',
                        '<span>推荐联系人:</span>',
                    '</div>',
                    '<div class="users">',
                    '</div>',
                '</div>',
                '<div class="conference_list">',
                    '<div class="title">',
                        '<span class="toggle_list">',
                            '---',
                        '</span>',
                        '<span>会话列表:</span>',
                    '</div>',
                    '<div class="conferences">',
                    '</div>',
                '</div>',
            '</div>',
        '</div>'
    ],
    main_user_detail_tpl: [
        '<span class="portrait">',
            '<img src="<%= portrait %>" />',
        '</span>',
        '<span class="nick_name"><%= nick_name %></span>',
        '<span class="user_status"></span>',
        '<button class="create_conference btn">创建会话</button>'
    ],
    main_contacts_tpl: [
        '<ul class="list">',
            '<% _.each(contacts, function(contact){ %>',
                '<li id="<%= contact.user_id %>" class="user clearfix" data-type="100" data-id="<%= contact.user_id %>">',
                    '<span class="portrait">',
                        '<img src="<%= contact.portrait %>" />',
                    '</span>',
                    '<span class="<%= contact.class_name %>"><%= contact.nick_name %></span>',
                    '<span class="unread_messages_count pull-right"></span>',
                '</li>',
            '<% }); %>',
        '</ul>'
    ],
    main_conferences_tpl: [
        '<ul class="list">',
            '<% _.each(conferences, function(conference){ %>',
                '<li id="<%= conference.topic_id %>" class="conference clearfix" data-type="<%= conference.topic_type %>" data-id="<%= conference.id %>">',
                    '<span class="portrait">',
                        '<img src="<%= conference.portrait %>" />',
                    '</span>',
                    '<span class="<%= conference.class_name %>"><%= conference.topic_name %></span>',
                    '<span class="unread_messages_count pull-right"></span>',
                '</li>',
            '<% }); %>',
        '</ul>'
    ],
    conference_tpl: [
        '<div class="conference_toolbar">',
            '<div class="user_detail">',
                '<span class="portrait">',
                    '<img src="<%= contact.portrait %>" />',
                '</span>',
                '<span class="nick_name"><%= name %></span>',
//用户的状态    '<span class="user_status"></span>',
            '</div>',
            '<div class="pull-right">',
                '<% if(type === process.I_GROUP_CHAT_MESSAGE){ %>',
                    '<button class="modify_members" data-topic="<%= topic_id %>">',
                        '修改成员',
                    '</button>',
                '<% } %>',
            '</div>',
        '</div>',
        '<div>',
            '<div class="chat_panel pull-left">',
                '<div class="conversation">',
                '</div>',
                '<div class="editor_panel">',
                    '<textarea class="editor"></textarea>',
                '</div>',
                '<div class="action_panel">',
                    '<button class="send_message input-mini pull-right">',
                        '发送',
                    '</button>',
                    '<span class="tip_message">',
                        '默认Enter发送消息，Ctrl+Enter回车',
                    '</span>',
                '</div>',
            '</div>',
            '<div class="conference_members">',
            '</div>',
        '</div>'
    ],
    send_message_tpl: [
        '<div class="clearfix">',
            '<div class="local_time">',
                '<%= localTime %>',
            '</div>',
            '<div class="<%= msgClass %>">',
                '<span class="portrait">',
                    '<img src="<%= portrait %>" />',
                '</span>',
                '<span class="nick_name">',
                    '<%= nickName %>',
                '</span>',
                '<div class="bubble">',
                    '<div class="content"><%= content %></div>',
                '</div>',
            '</div>',
        '</div>'
    ],
    create_conference_tpl: [
        '<div class="topic_name clearfix">',
            '<input class="input-max" placeholder="临时会话名称" value="<%= topic_name %>" />',
        '</div>',
        '<div class="search">',
            '<input class="input-max" placeholder="搜索成员" />',
        '</div>',
        '<div class="members_panel">',
            '<div class="select_members" >',
                '<div id="tree_view" class="ztree pull-left">',
                '</div>',
                '<div class="checkbox_members">',
                '</div>',
            '</div>',
            '<div class="selected_members clearfix">',
            '</div>',
        '</div>',
        '<div class="action_panel clearfix">',
            '<button class="pull-right input-mini confirm">确定</button>',
        '</div>'
    ],
    checkbox_members_tpl: [
        '<div id="<%= id %>_members" class="members">',
            '<input type="checkbox" class="select_all" />',
            '<span>全选</span>',
            '<ul>',
                '<% _.each(members, function(member){ %>',
                    '<li class="member" id="<%= member.id %>_member" data-id="<%= member.id %>" data-name="<%= member.nick_name %>">',
                        '<input type="checkbox" class="ck_member" <%= member.checked ? "checked": "" %> />',
                        '<span class="portrait">',
                            '<img src="<%= member.portrait %>" />',
                        '</span>',
                        '<span class="nick_name"><%= member.nick_name %></span>',
                    '</li>',
                '<% }); %>',
            '</ul>',
        '</div>'
    ]
};

module.exports = DocumentTemplate;
