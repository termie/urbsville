var dojo = require('dojo');
dojo.provide('urb.index');

// Everything in core is in this namespace
var core = require('urb/core');

var net = require('urb/net');
var proxy = require('urb/proxy');
var api = require('urb/api');
var device = require('urb/device');

var modules = [core, net, proxy, api, device];
for (var i in modules) {
  for (var k in modules[i]) {
    exports[k] = modules[i][k];
  }
}
