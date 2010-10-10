var dojo = require('dojo');


// Everything in core is in this namespace
var core = require('urb/core');

var net = require('urb/net');
var proxy = require('./proxy');
var api = require('./api');
var device = require('./device');

var modules = [core, net, proxy, api, device];
for (var i in modules) {
  for (var k in modules[i]) {
    exports[k] = modules[i][k];
  }
}
