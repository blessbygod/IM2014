//客户端全局变量
var config = require('./config');

//1.1 读取服务器配置，
//服务器环境 develop | product
//服务器类型 message | support
//process.AppServerMode = 'develop';
process.AppServerMode = 'test';
process.AppServerProtocal = 'http://';
//从配置文件获取服务器配置
var g_conf_server = config.get('server.json', 'json')[process.AppServerMode];
//support server
process.SupportServerURL = process.AppServerProtocal;
process.SupportServerURL += g_conf_server.support.ip;
process.SupportServerURL += ":";
process.SupportServerURL += g_conf_server.support.port;
//file transport server
process.FileTransportServerURL = process.AppServerProtocal;
process.FileTransportServerURL += g_conf_server.file_transport.ip;
process.FileTransportServerURL += ":";
process.FileTransportServerURL += g_conf_server.file_transport.port;
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
process.I_FILE_RANGE = 512 * 1024  ; //512k
process.I_FILE_REQUEST_TRANSPORT = 400; //用户请求传输文件
process.I_FILE_RESPONSE_ACCEPT_TRANSPORT = 401; //用户接受传输文件请求
process.I_FILE_RESPONSE_REFUSE_TRANSPORT = 402; //用户拒绝传输文件请求
process.I_FILE_RANGE_CAN_DOWNLOAD = 403; //某文件块可以下载，用户主动拉取
process.I_FILE_PROCESS_SYNC = 404; //在线文件部分下载完毕，进度同步
process.I_FILE_TRANSPORT_OVER = 405; //在线文件传输完毕
process.I_FILE_OFFLINE_TRANSPORT = 406; //离线文件传输通知


//分割定义
process.CONFERENCE_SPLIT_FLAG = '|';
process.CACHE_SPLIT_FLAG = '|';

//上下载队列
process.downloadQueues = {};
process.uploadQueues = {};

//整体http连接数控制
process.I_LIMIT_HTTP_CONNECT = 6; //chrome 允许同时进行的http连接数为6
process.I_HTTP_CONNECT_COUNT = 0; //实际连接数

