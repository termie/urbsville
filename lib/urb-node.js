var http = require('http');
var net = require('net');
var sys = require('sys');

var urb = require('urb');
var io = require('Socket.IO-node');

var curry = urb.curry;
var extend = urb.extend;
var inherit = urb.inherit;

/**
 * NOTE(termie): Going crazy typing SocketIo so shortening to Sio
 */

var SioServerProtocol = dojo.declare('SioServerProtocol', urb.ServerProtocol, {
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
    this.emit('clientConnected', client);
  },
  onClientDisconnect: function (sioClient) {
    var client = this.getClient(sioClient);
    client.emit('disconnected', client);
    this.emit('clientDisconnected', client);
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
      this._clients[sessionId] = new urb.Client(sessionId, protocol);
    }
    return this._clients[sessionId];
  }
});

var SioServerClientProtocol = dojo.declare(
    'SioServerClientProtocol', urb.ClientProtocol, {
  constructor: function (name, sioClient) {
    this.transport = sioClient;
  },
  send: function (obj) {
    this.transport.send(this.serializeMessage(obj))
  }
});



var TcpServerProtocol = function (port, host) {
  urb.ServerProtocol.call(this);
  this._port = port;
  this._host = host;
  this._server = null;
  this._clients = {};
  this._streams = {};
  this._protoHelpers = {};
};
inherit(TcpServerProtocol, urb.ServerProtocol);
extend(TcpServerProtocol.prototype, {
  listen: function (callbackObj) {
    urb.ServerProtocol.prototype.listen.call(this, callbackObj);
    var self = this;
    this._server = net.createServer(function (stream) {
      var client = self.getClient(stream);
      stream.setEncoding('utf8');
      stream.addListener('data', function (data) {
        self.onClientMessage(data, client);
      });
      stream.addListener('close', function () {
        self.onClientDisconnect(client);
      });
      stream.addListener('error', function (e) {
        stream.destroy()
        self.onClientDisconnect(client);
      });
      self.onClientConnect(stream)
    });
    this._server.listen(this._port, this._host);
  },
  close: function () {
    urb.ServerProtocol.prototype.listen.call(this);
    this._server.close();
  },
  getClientId: function (stream) {
    for (var i in this._streams) {
      if (this._streams[i] === stream) {
        return i
      }
    }
    var id = Math.random() * 100000000;
    this._streams[id] = stream;
    return id;
  },
  getClient: function (stream) {
    var clientId = this.getClientId(stream);
    if (!this._clients[clientId]) {
      var helper = this.getProtocolHelper(stream);
      this._clients[clientId] = {
        id: function () {
          return 'client/' + clientId;
        },
        send: function (obj) {
          //if (stream.readyState == 'open'
          //    || stream.streadyState == 'writeOnly') {
          if (stream.writable) {
            stream.write(JSON.stringify(obj) + helper.delimiter);         
          }
        }
      };
    }
    return this._clients[clientId];
  },
  getProtocolHelper: function (stream) {
    var clientId = this.getClientId(stream);
    if (!this._protoHelpers[clientId]) {
      var self = this;
      this._protoHelpers[clientId] = new urb.StringProtocol(function (data) {
        urb.ServerProtocol.prototype.onClientMessage.call(self, data, stream);
      });
    }
    return this._protoHelpers[clientId];
  },
  onClientMessage: function (data, stream) {
    var helper = this.getProtocolHelper(stream);
    helper.onData(data);
  },
  onClientDisconnect: function (stream) {
    var clientId = this.getClientId(stream);
    urb.ServerProtocol.prototype.onClientDisconnect.call(this, stream)
    delete this._clients[clientId];
  }
});

var TcpClientProtocol = function (port, host) {
  urb.ClientProtocol.call(this);
  this._port = port;
  this._host = host;
  this._helper = null;
};
inherit(TcpClientProtocol, urb.ClientProtocol);
extend(TcpClientProtocol.prototype, {
  connect: function (callbackObj, connectCallback) {
    urb.ClientProtocol.prototype.connect.call(this, callbackObj);
    this._stream = net.createConnection(this._port, this._host);
    this._stream.setEncoding('utf-8');
    this._stream.addListener('connect', curry(this.onConnect, this));
    this._stream.addListener('close', curry(this.onDisconnect, this));
    this._stream.addListener('data', curry(this.onMessage, this));
    this._stream.addListener('error', curry(this.onError, this));
  },
  close: function () {
    urb.ClientProtocol.prototype.close.call(this);
    this._stream.end();
  },
  getProtocolHelper: function () {
    if (!this._helper) {
      var self = this;
      this._helper = new urb.StringProtocol(function (data) {
        urb.ClientProtocol.prototype.onMessage.call(self, data);
      });
    }
    return this._helper;
  },
  onMessage: function (data) {
    var helper = this.getProtocolHelper();
    helper.onData(data);
  },
  onError: function () {
    urb.ClientProtocol.prototype.onDisconnect.call(this);
  },
  send: function (message) {
    var helper = this.getProtocolHelper()
    this._stream.write(this.serializeMessage(message) + helper.delimiter);
  }
});

exports.SioServerProtocol = SioServerProtocol;
exports.TcpServerProtocol = TcpServerProtocol;
exports.TcpClientProtocol = TcpClientProtocol;
