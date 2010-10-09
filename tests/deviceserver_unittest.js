var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');

var DeviceServerTestCase = function () {
  unittest.TestCase.apply(this, arguments);
};
sys.inherits(DeviceServerTestCase, unittest.TestCase);
DeviceServerTestCase.prototype.extend({
  setUp: function () {
    this.mock = new jsmock.MockControl();
    this.fakeClient = {id: function () { return 'client/what'; }};
    this.urbber = new urb.Urb('urb', 'urb1');
    this.device = new urb.ExampleDevice('example1');
  },
  tearDown: function () {
    this.mock.verify();
  },
  testBasic: function () {
    var server = new urb.DeviceServer('example', this.urbber);

    this.assertEqual(this.urbber.devices().length, 0);
    server.onClientConnect(this.fakeClient);
    server.onDevice(this.device.toDict(), this.fakeClient);
    this.assertEqual(this.urbber.devices().length, 1);
    
    this.assertEqual(this.urbber.devices()[0].get('state'), 0);
    server.onClientMessage({kind: 'event',
                            data: {topic: [this.device.id(),
                                           'device/propertyChanged'],
                                   data: {'state': 1}
                                   }
                            }, this.fakeClient);
    this.assertEqual(this.urbber.devices()[0].get('state'), 1);

    server.onClientDisconnect(this.fakeClient);
    this.assertEqual(this.urbber.devices().length, 0);
  },
});
exports.DeviceServerTestCase = DeviceServerTestCase;
