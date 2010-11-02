var dojo = require('dojo');
var jsmock = require('jsmock');
var test = require('urb/test');
var unittest = require('unittest');

var urb = require('urb');

var ApiServerTestCase = dojo.declare(test.BaseTestCase, {
  testBasic: function () {
    var hub = new urb.Hub('urb1');
    var protocol = new urb.ServerProtocol();
    var server = new urb.ApiServer('example', protocol, hub);

    var device = new urb.Device('example1', {state: 0});
    var device2 = new urb.Device('example2', {state: 0});

    var clientProto = new urb.ClientProtocol();
    var client = new urb.Client('name', clientProto);
    
    hub.addDevice(device);
  
    var expecter = this.mock.createMock();
    expecter.addMockMethod('send');
    expecter.expects().send(jsmock.isA(Object)).andStub(
      this.matchObject({topic: 'hubAdded',
                        emitter: client.id(),
                        data: hub})
    );
    expecter.expects().send(jsmock.isA(Object)).andStub(
      this.matchObject({topic: 'property/state',
                        emitter: device.id(),
                        data: 1})

    );
    expecter.expects().send(jsmock.isA(Object)).andStub(
      this.matchObject({topic: 'propertyChanged',
                        emitter: device.id(),
                        data: {properties: {state: 1}}})

    );
    clientProto.send = expecter.send

    protocol.emit('clientConnect', client);
    this.assertEqual(hub.device(device.id()).get('state'), 0);
    client.emit('event', {topic: 'rpc',
                          emitter: device.id(),
                          data: {id: device.id(),
                                 method: 'set',
                                 args: ['state', 1]}});
    this.assertEqual(hub.device(device.id()).get('state'), 1);

    protocol.emit('clientDisconnect', client);
  },
});
exports.ApiServerTestCase = ApiServerTestCase;
