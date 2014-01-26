var configloader = require('./configfile');
var path         = require('path');
var utils        = require('./utils');

var config = exports;

var config_path = path.join(__dirname, './config');

config.get = function(name, type, cb) {
    if (type === 'nolog') {
        type = arguments[2]; // deprecated - TODO: remove later
    }

    type = type || 'value';
    var full_path = path.resolve(config_path, name);
    if( utils.existsSync( full_path) === false ){
      console.log('config path not exists.......');
    }
    var results = configloader.read_config(full_path, type, cb); 
    
    // Pass arrays by value to prevent config being modified accidentally.
    if (Array.isArray(results)) {
        return results.slice();
    } 
    else {
        return results;
    }
};
