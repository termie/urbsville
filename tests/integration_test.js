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
    this.serverTransport = new urb.ServerTransport();
    this.clientTransport = new urb.DirectClientTransport(this.serverTransport);
  },
  tearDown: function () {
    this.mock.verify();
  },
  testBasic: function () {
    this.apiServer.listen(this.serverTransport);
    this.urbber.addDevice(this.device1);

    this.apiClient.connect(this.clientTransport);
    this.assertOk(this.apiClient.urb);
    this.assertEqual(this.apiClient.urb.name(), this.urbber.name());
    this.assertEqual(this.apiClient.urb.devices().length, 1);
    this.assertEqual(this.apiClient.urb.devices()[0].name(), 'example1');

    this.urbber.addDevice(this.device2);
    this.assertEqual(this.apiClient.urb.devices().length, 2);

    this.urbber.removeDevice(this.device2);
    this.assertEqual(this.apiClient.urb.devices().length, 1);
  },
  testProperties: function () {
    this.apiServer.listen(this.serverTransport);
    this.urbber.addDevice(this.device1);
    
    this.apiClient.connect(this.clientTransport);

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
});
exports.IntegrationTestCase = IntegrationTestCase;
