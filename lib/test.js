var dojo = require('dojo');
var jsmock = require('jsmock');
var sys = require('sys');
var unittest = require('unittest');

var BaseTestCase = dojo.declare('BaseTestCase', unittest.TestCase, {
  setUp: function () {
    this.mock = new jsmock.MockControl();
  },
  tearDown: function () {
    this.mock.verify();
  },
  expectListener: function (expected) {
    var expecter = this.mock.createMock();
    expecter.addMockMethod('f');
    expecter.expects().f(expected);
    return expecter;
  },
  matchObject: function (expected) {
    var self = this;
    return function (obj) {
      for (var key in expected) {
        if (typeof expected[key] == 'object') {
          self.matchObject(expected[key])(obj[key]);
        } else {
          self.assertEqual(
            expected[key],
            obj[key],
            ('expected[' + key + ']: ' + expected[key] + ' != ' + obj[key] + 
             '\n' + sys.inspect(obj))
          );
        }
      }
    };
  },
});

exports.BaseTestCase = BaseTestCase;
