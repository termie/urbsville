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
var hub = new urb.Urb('Urb', 'example2');
hub.addDevice(dev);

var ws = new urb.ApiServer('ApiServer', 'example3', hub);

var transport = new urb_node.SocketIoServerTransport(8001, {transports: ['websocket']});

ws.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('ws ' + event.data); }));
hub.addListener(new urb.Listener(/.*/, function (event) {
    sys.puts('hub ' + event.data); }));
dev.addListener(new urb.Listener(/.*/, function (event) {
    sys.puts('dev ' + event.data); }));

ws.listen(transport);

setInterval(function () {
    if (dev.getProperty('state')) {
      sys.puts('toggle -> 0');
      dev.setProperty('state', 0);
    } else {
      sys.puts('toggle -> 1');
      dev.setProperty('state', 1);
    }
}, 2000);
