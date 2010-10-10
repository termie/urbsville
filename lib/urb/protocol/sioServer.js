var http = require('http');
var net = require('net');
var sys = require('sys');

var urb = require('urb');
var io = require('Socket.IO-node');

var curry = urb.curry;
var extend = urb.extend;
var inherit = urb.inherit;

var dojo = require('dojo');
var core = require('urb/core');
var urb_net = require('urb/net');

/**
 * NOTE(termie): Going crazy typing SocketIo so shortening to Sio
 */

var SioServerProtocol = dojo.declare('SioServerProtocol', urb_net.ServerProtocol, {
  constructor: function (port, server, options) {
    this._port = port;
    this._server = server;
    this._options = options;
    this._socket = null;
    this._clients = {};
  },
  listen: function () {
    if (!this._server) {
      this._server = http.createServer(function () {});
    }

    this._server.listen(this._port);
    this._socket = io.listen(this._server, this._options);
    this._socket.on('clientConnect', dojo.hitch(this, this.onClientConnect));
    this._socket.on('clientDisconnect',
                    dojo.hitch(this, this.onClientDisconnect));
    this._socket.on('clientMessage',
                    dojo.hitch(this, this.onClientMessage));
    
  },
  onClientConnect: function (sioClient) {
    var client = this.getClient(sioClient);
    this.emit('clientConnect', client);
  },
  onClientDisconnect: function (sioClient) {
    var client = this.getClient(sioClient);
    client.emit('disconnected', client);
    this.emit('clientDisconnect', client);
    delete this._clients[client.id()];
  },
  onClientMessage: function (message, sioClient) {
    var client = this.getClient(sioClient);
    client.protocol.emit('message', JSON.parse(message));
  },
  getClient: function (sioClient) {
    var sessionId = sioClient.sessionId;
    if (!this._clients[sessionId]) {
      var protocol = new SioServerClientProtocol(sessionId, sioClient);
      this._clients[sessionId] = new urb_net.Client(sessionId, protocol);
    }
    return this._clients[sessionId];
  }
});

var SioServerClientProtocol = dojo.declare(
    'SioServerClientProtocol', urb_net.ClientProtocol, {
  constructor: function (name, sioClient) {
    this.transport = sioClient;
  },
  send: function (obj) {
    this.transport.send(this.serializeMessage(obj))
  }
});

exports.SioServerProtocol = SioServerProtocol;
