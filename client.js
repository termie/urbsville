require.paths.unshift('./third_party/express/lib/');
require.paths.unshift('./third_party/node_mDNS/');
require.paths.unshift('./public/js');
require.paths.unshift('./third_party/Socket.IO-node/lib');
require.paths.unshift('./lib');
require('express');
require('express/plugins');


var http = require('http');
var sys = require('sys');
var urb = require('urb');
var urb_node = require('urb-node');
var io = require('socket.io');

var tcpApiClient = new urb.ApiClient('ApiClient', 'tcp');
var tcpTransport = new urb_node.TcpClientTransport(9001, '127.0.0.1');

tcpApiClient.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('tcp ' + sys.inspect(event)); }));
//hub.addListener(new urb.Listener(/.*/, function (event) {
//    sys.puts('hub ' + sys.inspect(event)); }));
//dev.addListener(new urb.Listener(/.*/, function (event) {
//    sys.puts('dev ' + sys.inspect(event)); }));

tcpApiClient.connect(tcpTransport);

//setInterval(function () {
//    if (dev.getProperty('state')) {
//      sys.puts('toggle -> 0');
//      dev.setProperty('state', 0);
//    } else {
//      sys.puts('toggle -> 1');
//      dev.setProperty('state', 1);
//    }
//}, 10000);
