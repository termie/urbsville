var SioClientProtocol = dojo.declare('SioClientProtocol', ClientProtocol, {
  constructor: function (host, options) {
    options['transports'] = ['websocket', 'flashsocket', 'htmlfile',
                             'xhr-multipart', 'xhr-polling'];
    this._socket = new io.Socket(host, options);
    this._socket.addEvent('connect', dojo.hitch(this, this.emit, 'connect'));
    this._socket.addEvent('disconnect',
                          dojo.hitch(this, this.emit, 'disconnect'));
    this._socket.addEvent('message', dojo.hitch(this, this.onMessage));
  },
  onMessage: function (message) {
    this.emit('message', this.parseMessage(message));
  },
  connect: function () {
    this._socket.connect();
  },
  send: function (message) {
    this._socket.send(this.serializeMessage(message));
  }
});
