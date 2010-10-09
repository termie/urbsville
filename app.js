require.paths.unshift('./third_party/');
require.paths.unshift('./public/js');
require.paths.unshift('./third_party/node-static/lib/');
require.paths.unshift('./third_party/node.routes.js/');
require.paths.unshift('./third_party/node_mDNS/');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./lib');
var http = require('http');
var sys = require('sys');
var urb = require('urb');
var urb_node = require('urb-node');
// should import the one from third_party
var io = require('Socket.IO-node');
var static = require('node-static');
var routes = require('routes');
var dojo = require('dojo');


/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */

var fileServer = new static.Server('./public');
var viewServer = new static.Server('./views');

function render_admin(request, response) {
  viewServer.serveFile('admin.html', 200, {}, request, response);
}
function render_index(request, response) {
  viewServer.serveFile('index.html', 200, {}, request, response);
}
function render_device(request, response) {
  viewServer.serveFile('device.html', 200, {}, request, response);
}

function render_js3d(request, response) {
  viewServer.serveFile('js3d.html', 200, {}, request, response);
}

function render_static(request, response, file) {
  fileServer.serveFile(file, 200, {}, request, response);
}

var urls = [
  ['^/admin$', render_admin],
  ['^/30seconds$', render_device],
  ['^/js3d$', render_js3d],
  ['^/$', render_index],
  ['^/public/(.*)$', render_static]
];


var webServer = http.createServer(function (request, response) {
  routes.route(request, response, urls);
});

var hub = new urb.Urb('hub');

var sioProtocol = new urb_node.SioServerProtocol(
    8001, null, {transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'jsonp-polling']});
var sioApiServer = new urb.ApiServer('sio', sioProtocol, hub);

//var tcpProtocol = new urb_node.TcpServerProtocol(9001, '127.0.0.1');
//var tcpApiServer = new urb.ApiServer('tcp', tcpProtocol, hub);

var sioDeviceProtocol = new urb_node.SioServerProtocol(
    8000, webServer, {transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']});
var sioDeviceServer = new urb.DeviceServer('sio', sioDeviceProtocol, hub);

//sioApiServer.on('event', function (event) { 
//    sys.puts('sio ' + sys.inspect(event));
//});

sioDeviceServer.on('event', function (event) { 
  console.log('siod');
  console.log(event);
});
//tcpApiServer.on('event', function (event) { 
//    sys.puts('tcp ' + sys.inspect(event));
//});
//hub.on('event', function (event) {
//    sys.puts('hub ' + sys.inspect(event));
//});

sioApiServer.listen();
//tcpApiServer.listen();
sioDeviceServer.listen();

//setInterval(function () {
//    if (dev.getProperty('state')) {
//      sys.puts('toggle -> 0');
//      dev.setProperty('state', 0);
//    } else {
//      sys.puts('toggle -> 1');
//      dev.setProperty('state', 1);
//    }
//}, 10000);
