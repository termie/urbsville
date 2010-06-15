
var SocketIoClientProxy = function (host, options) {
  ClientProxy.apply(this, ['SocketIoClientProxy', host]);
  this._socket = new io.Socket(host, options);
  this._initCallbacks();
};
inherit(SocketIoClientProxy, ClientProxy);
extend(SocketIoClientProxy.prototype, {
  _initCallbacks: function () {
    this._socket.addEvent('connect', curry(this.onConnect, this));
    this._socket.addEvent('disconnect', curry(this.onDisconnect, this));
    //this._socket.addEvent('close', curry(this.onClose, this));
    this._socket.addEvent('message', curry(this.onMessage, this));
  },
  connect: function () {
    this._socket.connect();
  }
});

