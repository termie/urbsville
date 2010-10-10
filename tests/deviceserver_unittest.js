var dojo = require('dojo');
var jsmock = require('jsmock');
var test = require('urb/test');
var unittest = require('unittest');

var urb = require('urb');

var DeviceServerTestCase = dojo.declare(test.BaseTestCase, {
  testBasic: function () {
    var hub = new urb.Urb('urb1');
    var protocol = new urb.ServerProtocol();
    var server = new urb.DeviceServer('example', protocol, hub);
    var client = new urb.Client('name', new urb.ClientProtocol());

    var device = new urb.Device('example1', {state: 0});
    this.assertEqual(hub.devices().length, 0);
    protocol.emit('clientConnect', client);
    client.emit('deviceAdded', device.toDict());
    this.assertEqual(hub.devices().length, 1);
    this.assertEqual(hub.device(device.id()).get('state'), 0);
  
    // simulate the client receiving device events
    device.on('event', dojo.hitch(client, client.emit, 'event'));
    device.set('state', 1);

    this.assertEqual(hub.device(device.id()).get('state'), 1);
  
    protocol.emit('clientDisconnect', client);
    this.assertEqual(hub.devices().length, 0);
  },
});
exports.DeviceServerTestCase = DeviceServerTestCase;
