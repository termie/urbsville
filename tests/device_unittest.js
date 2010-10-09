var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');

var Tester = {f: function () {}};

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
    var dev = new urb.Device('name', {foo: 'bar'});
    this.assertEqual(dev.kind(), 'Device');
    this.assertEqual(dev.name(), 'name');
    this.assertEqual(dev.id(), 'Device/name');
    this.assertDeepEqual(dev.properties(), {foo: 'bar'});
  },
  testProperties: function () {
    var dev = new urb.Device('name', {foo: 'bar', baz: 'baq'});
    var tester = this.mock.createMock(Tester);
    
    this.assertEqual(dev.get('foo'), 'bar');
    this.assertEqual(dev.get('baz'), 'baq');
    this.assertThrows(function () { dev.set('not_there', 'foo')});
   
    tester.expects().f(1);
    tester.expects().f(2);
    dev.on('propertyChanged', function () { tester.f(1) });
    dev.on('property/foo', function () { tester.f(2) });

    dev.set('foo', 'bla');
    this.assertEqual(dev.get('foo'), 'bla');
  },
  testDynamicProperties: function () {
    var dev = new urb.Device('name', {baz: 'baq'});
    dev.get_foo = function () {
      return this.get('baz');
    }
    dev.set_foo = function (value) {
      return this.set('baz', value);
    }
    
    this.assertEqual(dev.get('foo'), 'baq');
    dev.set('foo', 'bar');
    this.assertEqual(dev.get('foo'), 'bar');
    this.assertEqual(dev.get('baz'), 'bar');
  }
});
exports.DeviceTestCase = DeviceTestCase;
