//客户端全局变量
var config = require('./config');

//1.1 读取服务器配置，
//服务器环境 develop | product
//服务器类型 message | support
process.AppServerMode = 'develop';
process.AppServerProtocal = 'http://';
//从配置文件获取服务器配置
var g_conf_server = config.get('server.json', 'json')[process.AppServerMode];
//support server
process.SupportServerURL = process.AppServerProtocal;
process.SupportServerURL += g_conf_server.support.ip;
process.SupportServerURL += ":";
process.SupportServerURL += g_conf_server.support.port;
//message server
process.MsgServerURL = process.AppServerProtocal;
process.MsgServerURL += g_conf_server.message.ip;
process.MsgServerURL += ":";
process.MsgServerURL += g_conf_server.message.port;

//消息静态变量定义
//1. 登录连接， CHAT相关
process.I_VALIDATE_CONNECTOR_TOKEN = 0;  //ws token校验
process.I_VALIDATE_TOKEN_ERR = 1; //校验失败
process.I_USERS_ONLINE = 201;  //用户上线
process.I_USERS_OFFLINE = 200; //用户离线
process.I_PRIVATE_CHAT_MESSAGE = 100; //私聊
process.I_GROUP_CHAT_MESSAGE = 110; //群聊
process.I_GROUP_JOIN_INVITE = 300; //邀请加入群
process.I_GROUP_KICK = 320; //从群里踢出去

//2. 文件传输
process.I_FILE_REQUEST_TRANSPORT = 400; //用户请求传输文件
process.I_FILE_RESPONSE_TRANSPORT = 401; //用户接受传输文件请求
process.I_FILE_RANGE_CAN_DOWNLOAD = 402; //某文件块可以下载，用户主动拉取
process.I_FILE_TRANSPORT_OVER = 403; //文件传输完毕通知
process.I_FILE_OFFLINE_TRANSPORT = 404; //离线文件传输通知


//分割定义
process.CONFERENCE_SPLIT_FLAG = '|';
process.CACHE_SPLIT_FLAG = '|';
