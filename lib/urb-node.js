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
  this._streams = {};
  this._protoHelpers = {};
};
inherit(TcpServerTransport, urb.ServerTransport);
extend(TcpServerTransport.prototype, {
  listen: function (callbackObj) {
    urb.ServerTransport.prototype.listen.call(this, callbackObj);
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
    urb.ServerTransport.prototype.listen.call(this);
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
        urb.ServerTransport.prototype.onClientMessage.call(self, data, stream);
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
    urb.ServerTransport.prototype.onClientDisconnect.call(this, stream)
    delete this._clients[clientId];
  }
});

var TcpClientTransport = function (port, host) {
  urb.ClientTransport.call(this);
  this._port = port;
  this._host = host;
  this._helper = null;
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
    this._stream.addListener('error', curry(this.onError, this));
  },
  close: function () {
    urb.ClientTransport.prototype.close.call(this);
    this._stream.end();
  },
  getProtocolHelper: function () {
    if (!this._helper) {
      var self = this;
      this._helper = new urb.StringProtocol(function (data) {
        urb.ClientTransport.prototype.onMessage.call(self, data);
      });
    }
    return this._helper;
  },
  onMessage: function (data) {
    var helper = this.getProtocolHelper();
    helper.onData(data);
  },
  onError: function () {
    urb.ClientTransport.prototype.onDisconnect.call(this);
  },
  send: function (message) {
    var helper = this.getProtocolHelper()
    this._stream.write(this.serializeMessage(message) + helper.delimiter);
  }
});

exports.SocketIoServerTransport = SocketIoServerTransport;
exports.TcpServerTransport = TcpServerTransport;
exports.TcpClientTransport = TcpClientTransport;
