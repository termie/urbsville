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
// should import the one from third_party
var io = require('socket.io');

// var Class imported by require('express')

/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */


configure(function(){
  set('root', __dirname);
  use(Static);
});

get('/', function () {
  this.render('index.html.ejs', {
    locals: {}
  });
});
run(8000);

var dev = new urb.ExampleDevice('example1');
var hub = new urb.Urb('Urb', 'hub');
hub.addDevice(dev);

var socketioApiServer = new urb.ApiServer('ApiServer', 'socketio', hub);
var socketioTransport = new urb_node.SocketIoServerTransport(
    8001, {transports: ['websocket']});

var tcpApiServer = new urb.ApiServer('ApiServer', 'tcp', hub);
var tcpTransport = new urb_node.TcpServerTransport(9001, '127.0.0.1');

socketioApiServer.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('socketio ' + sys.inspect(event)); }));
tcpApiServer.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('tcp ' + sys.inspect(event)); }));
hub.addListener(new urb.Listener(/.*/, function (event) {
    sys.puts('hub ' + sys.inspect(event)); }));
dev.addListener(new urb.Listener(/.*/, function (event) {
    sys.puts('dev ' + sys.inspect(event)); }));

socketioApiServer.listen(socketioTransport);
tcpApiServer.listen(tcpTransport);

setInterval(function () {
    if (dev.getProperty('state')) {
      sys.puts('toggle -> 0');
      dev.setProperty('state', 0);
    } else {
      sys.puts('toggle -> 1');
      dev.setProperty('state', 1);
    }
}, 10000);
