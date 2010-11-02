var dojo = require('dojo');
var net = require('urb/net');

dojo.provide('urb.protocol.sioClient');

// NOTE(termie): browser-only, expects socket.io to be loaded 

var SioClientProtocol = dojo.declare('SioClientProtocol', net.ClientProtocol, {
  constructor: function (host, options) {
    this._socket = new io.Socket(host, options);
    this._socket.addEvent('connect', dojo.hitch(this, this.emit, 'connect'));
    this._socket.addEvent('disconnect',
                          dojo.hitch(this, this.emit, 'disconnect'));
    this._socket.addEvent('message', dojo.hitch(this, this.onMessage));
  },
  onMessage: function (message) {
    this.emit('message', this.parseMessage(message));
  },
  connect: function () {
    this._socket.connect();
  },
  send: function (message) {
    this._socket.send(this.serializeMessage(message));
  }
});

exports.SioClientProtocol = SioClientProtocol;
