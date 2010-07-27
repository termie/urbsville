var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');

var DeviceTestCase = function () { unittest.TestCase.apply(this, arguments); };
sys.inherits(DeviceTestCase, unittest.TestCase);
DeviceTestCase.prototype.extend({
  setUp: function () {
    this.mock = new jsmock.MockControl();
  },
  tearDown: function () {
    this.mock.verify();
  },
  testBasic: function () {
    var dev = new urb.Device('kind', 'name', {foo: 'bar'});
    this.assertEqual(dev.kind(), 'kind');
    this.assertEqual(dev.name(), 'name');
    this.assertEqual(dev.id(), 'kind/name');
    this.assertDeepEqual(dev.properties(), {foo: 'bar'});
  },
  testProperties: function () {
    var dev = new urb.Device('kind', 'name', {foo: 'bar', baz: 'baq'});
    var listener = this.mock.createMock(urb.Listener);
    
    this.assertEqual(dev.getProperty('foo'), 'bar');
    this.assertEqual(dev.getProperty('baz'), 'baq');
    

    this.assertThrows(function () { dev.setProperty('not_there', 'foo')});

    dev.addListener(listener);
    
    
    listener.expects().match(['kind/name', 'property/changed']).andReturn(true);
    listener.expects().send(jsmock.isA(Object));

    dev.setProperty('foo', 'bla');
    
    this.assertEqual(dev.getProperty('foo'), 'bla');
  }
});
exports.DeviceTestCase = DeviceTestCase;
