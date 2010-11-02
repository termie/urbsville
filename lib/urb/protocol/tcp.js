var net = require('net');

var dojo = require('dojo');
var urb_net = require('urb/net');


var TcpServerProtocol = dojo.declare(
    'TcpServerProtocol', urb_net.ServerProtocol, {
  constructor: function (port, host) {
    this._port = port;
    this._host = host || '0.0.0.0';
    this._clients = {};
    this._streams = {};
    this._server = null;
  },
  listen: function () {
    var self = this;
    this._server = net.createServer(function (stream) {
      var client = self.getClient(stream);
      stream.setEncoding('utf8');
      stream.on('data', function (data) {
        self.onClientMessage(data, client);
      });
      stream.on('close', function () {
        self.onClientDisconnect(client);
      });
      stream.on('error', function (e) {
        stream.destroy();
        self.onClientDisconnect(client);
      });
      self.onClientConnect(client);
    });
    this._server.listen(this._port, this._post);
  },
  getStreamId: function (stream) {
    for (var i in this._streams) {
      if (this._streams[i] === stream) return i;
    }
    var id = Math.random() * 100000000;
    this._streams[id] = stream;
    return id;
  },
  getClient: function (stream) {
    var streamId = this.getStreamId(stream);
    if (!this._clients[streamId]) {
      var protocol = new TcpServerClientProtocol(streamId, stream);
      this._clients[streamId] = new urb_net.Client(streamId, protocol);
    }
    return this._clients[streamId];
  },
  onClientConnect: function (client) {
    this.emit('clientConnect', client);
  },
  onClientDisconnect: function (client) {
    client.emit('disconnected', client);
    this.emit('clientDisconnected', client);
    delete this._clients[client.name()];
  },
  onClientMessage: function (data, client) {
    client.helper.onData(data);
  },
});


var TcpClientProtocol = dojo.declare(
    'TcpClientProtocol', urb_net.ClientProtocol, {
  constructor: function (port, host) {
    this._port = port;
    this._host = host;
    this.helper = new urb_net.StringProtocol(dojo.hitch(this, this.onData));
  },
  connect: function () {
    this._stream = net.createConnection(this._port, this._host);
    this._stream.setEncoding('utf-8');
    this._stream.on('connect', dojo.hitch(this, this.onConnect));
    this._stream.on('close', dojo.hitch(this, this.onDisconnect));
    this._stream.on('error', dojo.hitch(this, this.onError));
    this._stream.on('data', dojo.hitch(this.helper, this.helper.onData));
  },
  close: function () {
    this._stream.end();
  },
  onConnect: function () { this.emit('connect', this); },
  onError: function (e) { this.emit('error', e)},
  onDisconnect: function () { this.emit('disconnect', this); },
  onData: function (data) {
    this.emit('message', this.parseMessage(data));
  },
  send: function (obj) {
    if (this._stream.writable) {
      this._stream.write(this.serializeMessage(obj) + this.helper.delimiter);
    }
  },
});


var TcpServerClientProtocol = dojo.declare(
    'TcpServerClientProtocol', TcpClientProtocol, {
  constructor: function (name, stream) {
    this._stream = stream;
  },
  connect: function () {
    throw "Invalid";
  }
});

exports.TcpServerProtocol = TcpServerProtocol;
exports.TcpClientProtocol = TcpClientProtocol;
