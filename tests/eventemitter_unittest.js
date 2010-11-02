var sys = require('sys');
var dojo = require('dojo');
var jsmock = require('jsmock');
var test = require('urb/test');

var urb = require('urb');

var EventEmitterTestCase = dojo.declare(test.BaseTestCase, {
  testBasic: function () {
    var evented = new urb.EventEmitter('name');
    this.assertEqual(evented.kind(), 'EventEmitter');
    this.assertEqual(evented.name(), 'name');
    this.assertEqual(evented.id(), 'EventEmitter/name');
  },
  testAddRemoveListener: function () {
    var evented = new urb.EventEmitter('name');
    var listener = function () {};
    var listener2 = function () {};

    this.assertEqual(evented.listeners('foo').length, 0);
    evented.on('foo', listener);
    evented.on('foo', listener2);
    this.assertEqual(evented.listeners('foo').length, 2);

    evented.removeListener('foo', listener);
    this.assertEqual(evented.listeners('foo').length, 1);
    this.assertNotEqual(evented.listeners('foo')[0], listener)
    this.assertStrictEqual(evented.listeners('foo')[0], listener2)
  },
  testNotifyListeners: function () {
    var evented = new urb.EventEmitter('name');

    var expected = this.expectListener(jsmock.isA(Object));
    var expected2 = this.expectListener('bar');
    var listener3 = this.matchObject({topic: 'foo',
                                      emitter: evented.id(),
                                      data: 'bar'});
    
    evented.on('event', expected.f);
    evented.on('foo', expected2.f);
    evented.on('event', listener3);
    evented.emit('foo', 'bar');
  },
});
exports.EventEmitterTestCase = EventEmitterTestCase;
