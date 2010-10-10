var sys = require('sys');
var dojo = require('dojo');
var jsmock = require('jsmock');
var test = require('urb/test');

var urb = require('urb');


var DeviceTestCase = dojo.declare(test.BaseTestCase, {
  testBasic: function () {
    var dev = new urb.Device('name', {foo: 'bar'});
    this.assertEqual(dev.kind(), 'Device');
    this.assertEqual(dev.name(), 'name');
    this.assertEqual(dev.id(), 'Device/name');
    this.assertDeepEqual(dev.properties(), {foo: 'bar'});
  },
  testProperties: function () {
    var dev = new urb.Device('name', {foo: 'bar', baz: 'baq'});
    
    this.assertEqual(dev.get('foo'), 'bar');
    this.assertEqual(dev.get('baz'), 'baq');
    this.assertThrows(function () { dev.set('not_there', 'foo')});
   
    
    var expected = this.expectListener(jsmock.isA(Object));
    var expected2 = this.expectListener('bla');
    var listener3 = this.matchObject({properties: {foo: 'bla'}})

    dev.on('propertyChanged', expected.f);
    dev.on('propertyChanged', listener3);
    dev.on('property/foo', expected2.f);

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
