require.paths.unshift('./third_party/');
require.paths.unshift('./third_party/node-static/lib/');
require.paths.unshift('./third_party/node.routes.js/');
require.paths.unshift('./third_party/node_mdns/lib');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./lib');

var http = require('http');
var sys = require('sys');
var fs = require('fs');
var mdns = require('mdns');
var urb = require('urb');

var sioServer = require('urb/protocol/sioServer');
var api = require('urb/api');
var device = require('urb/device');
var colored = require('urb/devices/colored');
  

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
var urbServer = new static.Server('./lib/urb');
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

function render_raph(request, response) {
  viewServer.serveFile('raph.html', 200, {}, request, response);
}

function render_js3d(request, response) {
  viewServer.serveFile('js3d.html', 200, {}, request, response);
}

function render_urb(request, response, file) {
  try {
    fs.statSync('./lib/urb/' + file).isFile();
    var e = urbServer.serveFile(file, 200, {}, request, response);
  } catch (e) {
    response.writeHead('404');
    response.end();
  }
}

function render_static(request, response, file) {
  try {
    fs.statSync('./public/' + file).isFile();
    var e = fileServer.serveFile(file, 200, {}, request, response);
  } catch (e) {
    response.writeHead('404');
    response.end();
  }
}

var urls = [
  ['^/admin$', render_admin],
  ['^/30seconds$', render_device],
  ['^/js3d$', render_js3d],
  ['^/raph$', render_raph],
  ['^/$', render_index],
  ['^/public/urb/(.*)$', render_urb],
  ['^/public/(.*)$', render_static]
];


var webServer = http.createServer(function (request, response) {
  routes.route(request, response, urls);
});


var hub = new urb.Urb('hub');

// Let's add some colored devices
var c1 = colored.CmykDevice('c1');
var c2 = colored.CmykDevice('c2');


hub.addDevice(c1);
hub.addDevice(c2);

hub.on('event', function (event) { console.log(event); });

c1.set('magenta', 1.0);
c2.set('yellow', 1.0);

var sioProtocol = new sioServer.SioServerProtocol(
    8001, null, {transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'jsonp-polling']});
var sioApiServer = new api.ApiServer('sio', sioProtocol, hub);

//var tcpProtocol = new urb_node.TcpServerProtocol(9001, '127.0.0.1');
//var tcpApiServer = new urb.ApiServer('tcp', tcpProtocol, hub);

var sioDeviceProtocol = new sioServer.SioServerProtocol(
    8000, webServer, {transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']});
var sioDeviceServer = new device.DeviceServer('sio', sioDeviceProtocol, hub);

sioApiServer.on('event', function (event) {
  console.log('sioa');
  console.log(event);
});

sioDeviceServer.on('event', function (event) { 
  console.log('siod');
  console.log(event);
});

sioApiServer.listen();
//tcpApiServer.listen();
sioDeviceServer.listen();


// Advertise our service
var ad = mdns.createAdvertisement('urbanode-web', 8000);
ad.start()
