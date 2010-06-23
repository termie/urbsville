var sys = require('sys');

var jsmock = require('jsmock');
var unittest = require('unittest');

var urb = require('urb');

var EventedTestCase = function () { unittest.TestCase.apply(this, arguments); };
sys.inherits(EventedTestCase, unittest.TestCase);
EventedTestCase.prototype.extend({
  setUp: function () {
    this.mock = new jsmock.MockControl();
  },
  tearDown: function () {
    this.mock.verify();
  },
  testBasic: function () {
    var evented = new urb.Evented('kind', 'name');
    this.assertEqual(evented.kind(), 'kind');
    this.assertEqual(evented.name(), 'name');
    this.assertEqual(evented.id(), 'kind/name');
  },
  testAddRemoveListener: function () {
    var listener = new urb.Listener();
    var listener2 = new urb.Listener();

    var evented = new urb.Evented();

    this.assertEqual(evented.listeners().length, 0);
    evented.addListener(listener);
    evented.addListener(listener2);
    this.assertEqual(evented.listeners().length, 2);

    evented.removeListener(listener);
    this.assertNotEqual(evented.listeners()[0], listener)
    this.assertStrictEqual(evented.listeners()[0], listener2)
    this.assertEqual(evented.listeners().length, 1);
  },
  testNotifyListeners: function () {
    var listener = this.mock.createMock(urb.Listener);
    var listener2 = this.mock.createMock(urb.Listener);
    var evented = new urb.Evented('kind', 'name');
      
    evented.addListener(listener);
    evented.addListener(listener2);

    listener.expects().match(['kind/name', 'some_topic']).andReturn(true);
    listener.expects().send(jsmock.isA(Object));

    listener2.expects().match(['kind/name', 'some_topic']).andReturn(false);
  
    evented.notifyListeners({topic: ['some_topic']});
  },
});
exports.EventedTestCase = EventedTestCase;
