var http = require('http');
var urb = require('urb');
var io = require('socket.io');

var curry = urb.curry;
var extend = urb.extend;
var inherit = urb.inherit;

var SocketIoServer = function (name) {
  urb.Server.apply(this, ['SocketIoServer', name]);
  this._server = null;
  this._clientsByIndex = {};
};
inherit(SocketIoServer, urb.Server);
extend(SocketIoServer.prototype, {
  listen: function (port, options) {
    this._server = http.createServer(function () {});
    this._server.listen(port);
    this._socket = io.listen(this._server, options);
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
    //for (var idx in this._socket.clientsIndex) {
    //  if (this._socket.clientsIndex[idx] == client) {
    //    return idx;
    //  }
    //}
    //return null;
  },
  onClientConnect: function (client) {
    var idx = this._getClientIndex(client);
    var myClient = new SocketIoClient(idx, client);
    this._clientsByIndex[idx] = myClient;
    urb.Server.prototype.onClientConnect.call(this, myClient);
  },
  onClientMessage: function (message, client) {
    var idx = this._getClientIndex(client);
    urb.Server.prototype.onClientMessage.call(
        this, message, this._clientsByIndex[idx]);
  },
  onClientDisconnect: function (client) {
    var idx = this._getClientIndex(client);
    urb.Server.prototype.onClientDisconnect.call(
        this, this._clientsByIndex[idx]);
    delete this._clientsByIndex[idx];
  }
});
exports.SocketIoServer = SocketIoServer;


var SocketIoClient = function (name, client) {
  urb.Client.apply(this, ['SocketIoClient', name]);
  this._client = client;
};
inherit(SocketIoClient, urb.Client);
extend(SocketIoClient.prototype, {
  send: function (message) {
    this._client.send(JSON.stringify(message));
  }
});
exports.SocketIoClient = SocketIoClient;
