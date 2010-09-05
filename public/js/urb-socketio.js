var SocketIoClientTransport = function (host, options) {
  ClientTransport.call(this);
  options['transports'] = ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling'];
  this._socket = new io.Socket(host, options);
};
inherit(SocketIoClientTransport, ClientTransport);
extend(SocketIoClientTransport.prototype, {
  connect: function (callbackObj) {
    ClientTransport.prototype.connect.call(this, callbackObj);
    this._socket.connect();
    this._socket.addEvent('connect', curry(this.onConnect, this));
    this._socket.addEvent('disconnect', curry(this.onDisconnect, this));
    this._socket.addEvent('message', curry(this.onMessage, this));
  },
  send: function (message) {
    this._socket.send(this.serializeMessage(message));
  }
});
