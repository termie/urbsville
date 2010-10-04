var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');
var urb_node = require('urb-node');

var TcpTransportCase = function () {
  unittest.TestCase.apply(this, arguments);
};
sys.inherits(TcpTransportCase, unittest.TestCase);
TcpTransportCase.prototype.extend({
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

    this.apiServerTransport = new urb_node.TcpServerTransport(10001,
                                                             'localhost');
    this.deviceServerTransport = new urb_node.TcpServerTransport(10002,
                                                                 'localhost');
    this.apiClientTransport = new urb_node.TcpClientTransport(10001,
                                                              'localhost');
    this.deviceClientTransport = new urb_node.TcpClientTransport(10002,
                                                                 'localhost');
  },
  tearDown: function () {
    this.mock.verify();
    this.apiServer.close();
    this.deviceServer.close();
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

    this.deviceClient.close();
    this.assertEqual(this.apiClient.urb.devices().length, 1);
  },
  testProperties: function () {
    this.apiServer.listen(this.apiServerTransport);
    this.urbber.addDevice(this.device1);
    
    this.apiClient.connect(this.apiClientTransport);
    var example1 = this.apiClient.urb.devices()[0];

    example1.set('state', 0);
    this.assertEqual(this.device1.get('state'), 0);
    this.assertEqual(example1.get('state'), 0);

    example1.set('state', 1);
    this.assertEqual(this.device1.get('state'), 1);
    this.assertEqual(example1.get('state'), 1);

    this.device1.set('state', 0);
    this.assertEqual(this.device1.get('state'), 0);
    this.assertEqual(example1.get('state'), 0);
  },
  testDeviceServerProperties: function () {
    this.apiServer.listen(this.apiServerTransport);
    this.apiClient.connect(this.apiClientTransport);
    this.deviceServer.listen(this.deviceServerTransport);
    this.deviceClient.connect(this.deviceClientTransport);
    var example2 = this.apiClient.urb.devices()[0];
    
    example2.set('state', 0);
    this.assertEqual(this.device2.get('state'), 0);
    this.assertEqual(example2.get('state'), 0);

    example2.set('state', 1);
    this.assertEqual(this.device2.get('state'), 1);
    this.assertEqual(example2.get('state'), 1);

    this.device2.set('state', 0);
    this.assertEqual(this.device2.get('state'), 0);
    this.assertEqual(example2.get('state'), 0);
  }
});
exports.TcpTransportCase = TcpTransportCase;
