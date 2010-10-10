var dojo = require('dojo');

var core = require('urb/core');


var ServerProtocol = dojo.declare('ServerProtocol', core.EventEmitter, {
  listen: function () {
    // start listening
  },
  close: function () {
    // stop listening
  },
});


var ClientProtocol = dojo.declare('ClientProtocol', core.EventEmitter, {
  connect: function () { },
  close: function () { },
  send: function (message) {
    // pass
  },
  parseMessage: function (message) {
    return JSON.parse(message);
  },
  serializeMessage: function (message) {
    var dict = ToDict(message);
    return JSON.stringify(dict);
  }
});

var ToDict = function (obj) {
  var o = {};
  for (var k in obj) {
    if (obj[k].toDict) {
      o[k] = obj[k].toDict();
    } else {
      o[k] = obj[k];
    }
  }
  return o;
}

var Server = dojo.declare('Server', core.EventEmitter, {
  constructor: function (name, protocol) {
    this.protocol = protocol;
    this.protocol.on('clientConnect',
                     dojo.hitch(this, this.onClientConnect));
    this.protocol.on('clientDisconnect',
                     dojo.hitch(this, this.onClientDisconnect));
  },
  listen: function () {
    this.protocol.listen();
  },
  close: function () {
    this.protocol.close();
  },
  onClientConnect: function (client) {
    this.emit('clientConnect', client);
  },
  onClientDisconnect: function (client) { 
    this.emit('clientDisconnect', client);
  },
});

var Client = dojo.declare('Client', core.EventEmitter, {
  constructor: function (name, protocol) {
    this.protocol = protocol;
    this.protocol.on('connect', dojo.hitch(this, this.onConnect));
    this.protocol.on('disconnect', dojo.hitch(this, this.onDisconnect));
    this.protocol.on('message', dojo.hitch(this, this.onMessage));
  },
  connect: function () {
    this.protocol.connect();
  },
  close: function () {
    this.protocol.close();
  },
  send: function (data) {
    this.protocol.send(data);
  },
  onConnect: function (event) { this.emit('connected', this); },
  onDisconnect: function (event) { this.emit('disconnected', this); },
  onMessage: function (message) { this.emit('event', message); },
});


var StringProtocol = function (callback) {
  this._buffer = [];
  this._callback = callback;
  this.maxSize = 1024;
  this.delimiter = "\u0000";
}
StringProtocol.prototype = {
  onData: function (data) {
    var bufferLength = this._buffer.length;
    for (var i in data) {
      if (bufferLength >= this.maxSize) {
        throw "Buffer size limit reached";
      }
      if (data[i] == this.delimiter) {
        this.flush();
        bufferLength = 0;
      } else {
        bufferLength = this._buffer.push(data[i]);
      }
    }
  },
  flush: function () {
    this._callback(this._buffer.join(""));
    this._buffer = [];
  }
}

exports.ServerProtocol = ServerProtocol
exports.ClientProtocol = ClientProtocol
exports.StringProtocol = ClientProtocol
exports.Server = Server
exports.Client = Client
