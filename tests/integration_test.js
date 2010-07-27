var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');

var IntegrationTestCase = function () {
  unittest.TestCase.apply(this, arguments);
};
sys.inherits(IntegrationTestCase, unittest.TestCase);
IntegrationTestCase.prototype.extend({
  setUp: function () {
    this.mock = new jsmock.MockControl();
    this.urbber = new urb.Urb('urb', 'urb1');
    this.device1 = new urb.ExampleDevice('example1');
    this.device2 = new urb.ExampleDevice('example2');
    this.apiServer = new urb.ApiServer('apiserver', 'test', this.urbber);
    this.apiClient = new urb.ApiClient('apiclient', 'test');
    this.deviceServer = new urb.DeviceServer(
        'deviceserver', 'test', this.urbber);
    this.deviceClient = new urb.DeviceClient(
        'deviceclient', 'test', this.device2);

    this.apiServerTransport = new urb.ServerTransport();
    this.deviceServerTransport = new urb.ServerTransport();
    this.apiClientTransport = new urb.DirectClientTransport(
        this.apiServerTransport);
    this.deviceClientTransport = new urb.DirectClientTransport(
        this.deviceServerTransport);
  },
  tearDown: function () {
    this.mock.verify();
  },
  testBasic: function () {
    this.apiServer.listen(this.apiServerTransport);
    this.urbber.addDevice(this.device1);

    this.apiClient.connect(this.apiClientTransport);
    this.assertOk(this.apiClient.urb);
    this.assertEqual(this.apiClient.urb.name(), this.urbber.name());
    this.assertEqual(this.apiClient.urb.devices().length, 1);
    this.assertEqual(this.apiClient.urb.devices()[0].name(), 'example1');

    this.deviceServer.listen(this.deviceServerTransport);
    this.deviceClient.connect(this.deviceClientTransport);

    this.assertEqual(this.apiClient.urb.devices().length, 2);

    this.deviceClient.disconnect();
    this.assertEqual(this.apiClient.urb.devices().length, 1);
  },
  testProperties: function () {
    this.apiServer.listen(this.apiServerTransport);
    this.urbber.addDevice(this.device1);
    
    this.apiClient.connect(this.apiClientTransport);
    var example1 = this.apiClient.urb.devices()[0];

    example1.setProperty('state', 0);
    this.assertEqual(this.device1.getProperty('state'), 0);
    this.assertEqual(example1.getProperty('state'), 0);

    example1.setProperty('state', 1);
    this.assertEqual(this.device1.getProperty('state'), 1);
    this.assertEqual(example1.getProperty('state'), 1);

    this.device1.setProperty('state', 0);
    this.assertEqual(this.device1.getProperty('state'), 0);
    this.assertEqual(example1.getProperty('state'), 0);
  },
  testDeviceServerProperties: function () {
    this.apiServer.listen(this.apiServerTransport);
    this.apiClient.connect(this.apiClientTransport);
    this.deviceServer.listen(this.deviceServerTransport);
    this.deviceClient.connect(this.deviceClientTransport);
    var example2 = this.apiClient.urb.devices()[0];
    
    example2.setProperty('state', 0);
    this.assertEqual(this.device2.getProperty('state'), 0);
    this.assertEqual(example2.getProperty('state'), 0);

    example2.setProperty('state', 1);
    this.assertEqual(this.device2.getProperty('state'), 1);
    this.assertEqual(example2.getProperty('state'), 1);

    this.device2.setProperty('state', 0);
    this.assertEqual(this.device2.getProperty('state'), 0);
    this.assertEqual(example2.getProperty('state'), 0);
  }
});
exports.IntegrationTestCase = IntegrationTestCase;
