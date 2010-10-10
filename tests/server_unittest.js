var dojo = require('dojo');
var test = require('test');
var unittest = require('unittest');

var ServerTestCase = dojo.declare('ServerTestCase', test.BaseTestCase, {
  testBasic: function () {
    //this.assertEqual(1, 2);
  },
});

exports.ServerTestCase = ServerTestCase;
