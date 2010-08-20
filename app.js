require.paths.unshift('./third_party/node-static/lib/');
require.paths.unshift('./third_party/node.routes.js/');
require.paths.unshift('./third_party/node_mDNS/');
require.paths.unshift('./third_party/');
require.paths.unshift('./public/js');
require.paths.unshift('./lib');
var http = require('http');
var sys = require('sys');
var urb = require('urb');
var urb_node = require('urb-node');
// should import the one from third_party
var io = require('Socket.IO-node');
var static = require('node-static');
var routes = require('routes');

// var Class imported by require('express')

/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */

var fileServer = static.Server('./public');
var viewServer = static.Server('./views');

function render_admin(request, response) {
  viewServer.serveFile('admin.html', request, response);
}
function render_device(request, response) {
  viewServer.serveFile('device.html', request, response);
}

function render_static(request, response, file) {
  fileServer.serveFile(file, request, response);
}

var urls = [
  ['^/admin$', render_admin],
  ['^/$', render_device],
  ['^/public/(.*)$', render_static]
];


var webServer = http.createServer(function (request, response) {
  request.addListener('end', function () {
    routes.route(request, response, urls);
  });
}).listen(8000);

var hub = new urb.Urb('Urb', 'hub');

var socketioApiServer = new urb.ApiServer('ApiServer', 'socketio', hub);
var socketioTransport = new urb_node.SocketIoServerTransport(
    8001, {transports: ['websocket']});

var tcpApiServer = new urb.ApiServer('ApiServer', 'tcp', hub);
var tcpTransport = new urb_node.TcpServerTransport(9001, '127.0.0.1');

var socketioDeviceServer = new urb.DeviceServer('DeviceServer',
                                                'socketio',
                                                hub);
var socketioDeviceTransport = new urb_node.SocketIoServerTransport(
    8002, {transports: ['websocket']});



socketioApiServer.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('socketio ' + sys.inspect(event)); }));
tcpApiServer.addListener(new urb.Listener(/.*/, function (event) { 
    sys.puts('tcp ' + sys.inspect(event)); }));
hub.addListener(new urb.Listener(/.*/, function (event) {
    sys.puts('hub ' + sys.inspect(event)); }));

socketioApiServer.listen(socketioTransport);
tcpApiServer.listen(tcpTransport);
socketioDeviceServer.listen(socketioDeviceTransport);

//setInterval(function () {
//    if (dev.getProperty('state')) {
//      sys.puts('toggle -> 0');
//      dev.setProperty('state', 0);
//    } else {
//      sys.puts('toggle -> 1');
//      dev.setProperty('state', 1);
//    }
//}, 10000);
