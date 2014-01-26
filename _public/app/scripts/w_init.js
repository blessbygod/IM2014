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

//静态变量
process.I_VALIDATE_CONNECTOR_TOKEN = 0,
process.I_VALIDATE_TOKEN_ERR = 1,
process.I_USERS_ONLINE = 201;
process.I_USERS_OFFLINE = 200;
process.I_PRIVATE_CHAT_MESSAGE = 100;
process.I_GROUP_CHAT_MESSAGE = 110;


//分割定义
process.CONFERENCE_SPLIT_FLAG = '|';
process.CACHE_SPLIT_FLAG = '|';
