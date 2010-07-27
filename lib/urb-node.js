var http = require('http');
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
  _getClientIndex: function (client) {
    return client.sessionId;
  },
  onClientConnect: function (client) {
    var idx = this._getClientIndex(client);
    var myClient = new SocketIoServerTransportClient(idx, client);
    this._clients[idx] = myClient;
    this._callbackObj.onClientConnect.call(this._callbackObj, myClient);
  },
  onClientMessage: function (message, client) {
    var idx = this._getClientIndex(client);
    var myClient = this._clients[idx];
    this._callbackObj.onClientMessage.call(
        this._callbackObj, message, myClient);
  },
  onClientDisconnect: function (client) {
    var idx = this._getClientIndex(client);
    var myClient = this._clients[idx];
    this._callbackObj.onClientDisconnect.call(this._callbackObj, myClient);
    delete this._clients[idx];
  }
});

SocketIoServerTransportClient = function (name, client) {
  urb.Evented.call(this, 'SocketIoServerTransportClient', name);
  this._client = client;
}
inherit(SocketIoServerTransportClient, urb.Evented);
extend(SocketIoServerTransportClient.prototype, {
  send: function (message) { this._client.send(JSON.stringify(message)); }
});

exports.SocketIoServerTransport = SocketIoServerTransport;
