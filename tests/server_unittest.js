var dojo = require('dojo');
var jsmock = require('jsmock');
var test = require('urb/test');
var unittest = require('unittest');

var urb = require('urb');


var ServerTestCase = dojo.declare('ServerTestCase', test.BaseTestCase, {
  testBasic: function () {
    var mockProto = this.mock.createMock(urb.ServerProtocol);
    mockProto.expects().on('clientConnect', jsmock.isA(Function))
    mockProto.expects().on('clientDisconnect', jsmock.isA(Function))
    mockProto.expects().listen();
    mockProto.expects().close();

    var s = urb.Server('name', mockProto);
    s.listen();
    s.close();
  },
  testEvents: function () {
    var proto = urb.ServerProtocol();
    var s = urb.Server('name', proto);
    var fakeClient = {};
    
    var expected = this.expectListener(fakeClient);
    var expected2 = this.expectListener(fakeClient);

    s.on('clientConnect', expected.f);
    s.on('clientDisconnect', expected2.f);

    proto.emit('clientConnect', fakeClient);
    proto.emit('clientDisconnect', fakeClient);
  }
});

exports.ServerTestCase = ServerTestCase;
