

var SocketIoClientTransport = function (host, options) {
  this._socket = new io.Socket(host, options);
  this._callbacks = null;
};
SocketIoClientTransport.prototype = {
  connect: function (callbacks) {
    this._socket.connect();
    this._callbacks = callbacks;
    this._socket.addEvent('connect', curry(this.onConnect, this));
    this._socket.addEvent('disconnect', curry(this.onDisconnect, this));
    //this._socket.addEvent('close', curry(this.onClose, this));
    this._socket.addEvent('message', curry(this.onMessage, this));
  },
  onConnect: function () {
    this._callbacks.onConnect.call(this._callbacks, this);
  },
  onDisconnect: function () {
    this._callbacks.onDisconnect.call(this._callbacks, this);
  },
  onMessage: function (message) {
    this._callbacks.onMessage.call(this._callbacks, JSON.parse(message), this);
  },
  send: function (message) {
    this._socket.send(JSON.stringify(message));
  }
}
