var http = require('http');
var net = require('net');
var sys = require('sys');

var urb = require('urb');
var io = require('socket.io');

var curry = urb.curry;
var extend = urb.extend;
var inherit = urb.inherit;


var SocketIoServerTransport = function (port, options) {
  urb.ServerTransport.call(this);
  this._port = port;
  this._options = options;
  this._server = null;
  this._clients = {};
};
inherit(SocketIoServerTransport, urb.ServerTransport);
extend(SocketIoServerTransport.prototype, {
  listen: function (callbackObj) {
    urb.ServerTransport.prototype.listen.call(this, callbackObj);

    this._server = http.createServer(function () { });
    this._server.listen(this._port);
    this._socket = io.listen(this._server, this._options);

    // NOTE(termie): SocketIO's addListener has a different signature from ours
    this._socket.addListener('clientConnect',
                             curry(this.onClientConnect, this));
    this._socket.addListener('clientMessage',
                             curry(this.onClientMessage, this));
    this._socket.addListener('clientDisconnect',
                             curry(this.onClientDisconnect, this));
  },
  getClientId: function (socketIoClient) {
    return socketIoClient.sessionId;
  },
  getClient: function (socketIoClient) {
    var clientId = this.getClientId(socketIoClient);
    if (!this._clients[clientId]) {
      this._clients[clientId] = new urb.Connection(
          'client/' + clientId, socketIoClient);
    }
    return this._clients[clientId];
  },
  onClientDisconnect: function (client) {
    var clientId = this.getClientId(socketIoClient);
    urb.ServerTransport.prototype.onClientDisconnect.call(this, client)
    delete this._clients[clientId];
  }
});


var TcpServerTransport = function (port, host) {
  urb.ServerTransport.call(this);
  this._port = port;
  this._host = host;
  this._server = null;
  this._clients = {};
};
inherit(TcpServerTransport, urb.ServerTransport);
extend(TcpServerTransport.prototype, {
  listen: function (callbackObj) {
    urb.ServerTransport.prototype.listen.call(this, callbackObj);
    var self = this;
    this._server = net.createServer(function (stream) {
      sys.puts('AHAHAA');
      var client = self.getClient(stream);
      stream.setEncoding('utf8');
      stream.addListener('data', function (data) {
        self.onClientMessage(data, client);
      });
      stream.addListener('end', function () {
        self.onClientDisconnect(client);
      });
      self.onClientConnect(stream)
    });
    this._server.listen(this._port, this._host);
    sys.puts('TCP LISTENING');
  },
  getClientId: function (stream) {
    return stream.remoteAddress;
  },
  getClient: function (stream) {
    var clientId = this.getClientId(stream);
    if (!this._clients[clientId]) {
      this._clients[clientId] = {
        id: function () {
          return 'client/' + clientId;
        },
        send: function (obj) {
          if (stream.writable) {
            stream.write(JSON.stringify(obj));         
          }
        }
      };
    }
    return this._clients[clientId];
  },
  onClientDisconnect: function (stream) {
    var clientId = this.getClientId(stream);
    urb.ServerTransport.prototype.onClientDisconnect.call(this, stream)
    delete this._clients[clientId];
  }
});

var TcpClientTransport = function (port, host) {
  urb.ClientTransport.call(this);
  this._port = port;
  this._host = host;
};
inherit(TcpClientTransport, urb.ClientTransport);
extend(TcpClientTransport.prototype, {
  connect: function (callbackObj, connectCallback) {
    urb.ClientTransport.prototype.connect.call(this, callbackObj);
    this._stream = net.createConnection(this._port, this._host);
    this._stream.setEncoding('utf-8');
    this._stream.addListener('connect', curry(this.onConnect, this));
    this._stream.addListener('close', curry(this.onDisconnect, this));
    this._stream.addListener('data', curry(this.onMessage, this));
  },
  send: function (message) {
    this._stream.write(this.serializeMessage(message));
  }
});

exports.SocketIoServerTransport = SocketIoServerTransport;
exports.TcpServerTransport = TcpServerTransport;
exports.TcpClientTransport = TcpClientTransport;
