var sys = require('sys');
var unittest = require('unittest');
var jsmock = require('jsmock');

var urb = require('urb');

var DeviceTestCase = function () { unittest.TestCase.call(this); }
sys.inherits(DeviceTestCase, unittest.TestCase);
DeviceTestCase.prototype.extend({
  testAddRemoveListeners: function () {
    var dev = new urb.Device('Device', 'test');
    var listener = new urb.Listener();
    
    dev.addListener(listener);
    this.assertEqual(dev.listeners().length, 1);
    
    dev.removeListener(listener);
    this.assertEqual(dev.listeners().length, 0);
  },
  testNotifyListenerOnPropertyChange: function () {
    var dev = new urb.Device('Device', 'test', {foo: 'bar'});

    var mock = new jsmock.MockControl();

    var mockListener = mock.createMock(urb.Listener);
    
    mockListener.expects().match(jsmock.isA(Array)).andReturn(true);
    mockListener.expects().send(jsmock.isA(Object));

    dev.addListener(mockListener);
    dev.set('foo', 'baz');
    mock.verify();
  },
});

var UrbTestCase = function () { unittest.TestCase.call(this); }
sys.inherits(UrbTestCase, unittest.TestCase);
UrbTestCase.prototype.extend({
  testListenForDeviceChanges: function () {
    var mock = new jsmock.MockControl();
    var mockDev = mock.createMock(urb.Device);
    var urber = new urb.Urb('Urb', 'test');

    mockDev.expects().addListener(jsmock.isA(Object));
    urber.addDevice(mockDev);
    mock.verify();
  },
  testPropagateDataFromDevices: function () {
    var mock = new jsmock.MockControl();
    var mockListener = mock.createMock(urb.Listener);
    var dev = new urb.Device('Device', 'test', {foo: 'bar'});
    var urber = new urb.Urb('Urb', 'test');

    urber.addListener(mockListener);
    urber.addDevice(dev);
    mockListener.expects().match(jsmock.isA(Array)).andReturn(true);
    mockListener.expects().send(jsmock.isA(Object));

    dev.notifyListeners({topic: ['foo'], data: 'bar'});
    mock.verify();

  },
});

exports.DeviceTestCase = DeviceTestCase;
exports.UrbTestCase = UrbTestCase;
