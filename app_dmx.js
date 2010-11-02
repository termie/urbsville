require.paths.unshift('./third_party/');
require.paths.unshift('./third_party/node_mdns/lib');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./lib');

var mdns = require('mdns');
var urb = require('urb');

var sioServer = require('urb/protocol/sioServer');
var api = require('urb/api');
var device = require('urb/device');
var colored = require('urb/devices/colored');
  

var io = require('Socket.IO-node');
var dojo = require('dojo');
var dmx = require('urb/dmx');
var olad = require('urb/protocol/olad');
var pipe = require('urb/pipe');


/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */


var hub = new urb.Hub('hub');

// Let's add some colored devices
var c1 = new colored.CmykDevice('c1', { /* settings here for default ports */ });
var c2 = new colored.CmykDevice('c2');


hub.addDevice(c1);
hub.addDevice(c2);

hub.on('event', function (event) { console.log(event); });

c1.set('magenta', 1.0);
c2.set('yellow', 1.0);


// These port values will just be sent through as is, use it to set the
// ports that don't change
var defaultPorts = {1: 40}

var proto = new olad.OladClientProtocol();
var univ = new dmx.DmxUniverse(0, proto, defaultPorts);


univ.attachDevice(c1, [[12, 'cyan'],
                            [14, 'magenta'],
                            [16, 'yellow'],
                            ]);



// Loop 40 times a second
var loop = function () {
  univ.update()
  setTimeout(loop, 1000 / 40);
}

loop();

var sioProtocol = new sioServer.SioServerProtocol(8001, null);
var sioApiServer = new api.ApiServer('sio', sioProtocol, hub);

//var tcpProtocol = new urb_node.TcpServerProtocol(9001, '127.0.0.1');
//var tcpApiServer = new urb.ApiServer('tcp', tcpProtocol, hub);

var sioDeviceProtocol = new sioServer.SioServerProtocol(
    8002, null);
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
