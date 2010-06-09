var sys = require('sys');
var unittest = require('unittest');
var jsmock = require('jsmock');

var urb = require('urb');

var DeviceTestCase = function () { unittest.TestCase.call(this); }
sys.inherits(DeviceTestCase, unittest.TestCase);
DeviceTestCase.prototype.extend({
  testAddRemoveListeners: function () {
    var dev = new urb.Device('test');
    var listener = new urb.TopicListener({}, 'some_topic');
    
    dev.addListener(listener);
    this.assertEqual(dev.listeners.length, 1);
    
    dev.removeListener(listener);
    this.assertEqual(dev.listeners.length, 0);
  },
  testNotifyListenerOnStateChange: function () {
    var dev = new urb.Device('test');
    var mock = new jsmock.MockControl();
    var mockListener = mock.createMock(urb.TopicListener);

    mockListener.expects().send(jsmock.isA(Object));

    dev.addListener(mockListener);
    dev.notifyStateChange('test');
    mock.verify();
  },
});

var UrbTestCase = function () { unittest.TestCase.call(this); }
sys.inherits(UrbTestCase, unittest.TestCase);
UrbTestCase.prototype.extend({
  testListenForDeviceChanges: function () {
    var mock = new jsmock.MockControl();
    var mockDev = mock.createMock(urb.ToggleDevice);
    var urber = new urb.Urb([]);

    mockDev.expects().id().andReturn('test');
    mockDev.expects().addListener(jsmock.isA(Object));
    urber.addDevice(mockDev);
    mock.verify();
  },
  testPropagateDataFromDevices: function () {
    var mock = new jsmock.MockControl();
    var mockListener = mock.createMock(urb.TopicListener);
    var dev = new urb.Device('test');
    var urber = new urb.Urb([dev]);

    urber.addListener(mockListener);
    mockListener.expects().send(jsmock.isA(Object));

    dev.notifyStateChange('test');
    mock.verify();

  },
});

exports.DeviceTestCase = DeviceTestCase;
exports.UrbTestCase = UrbTestCase;
