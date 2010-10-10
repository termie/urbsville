var dojo = require('dojo');
var net = require('urb/net');
var proxy = require('urb/proxy');

dojo.provide('urb.device');

var DeviceClient = dojo.declare('DeviceClient', net.Client, {
  constructor: function (name, protocol, device) {
    this.device = device;
    this.device.on('event', this.deviceListener());
  },
  /**
   * Event handler for connect events. Notifies listeners.
   */
  onConnect: function () {
    this.send({topic: 'deviceAdded',
               emitter: this.id(),
               data: this.device});
    this.emit('connected', this);
  },
  /**
   * Event handler for disconnect events. Notifies listeners.
   *
   */
  onDisconnect: function () {
    this.emit('disconnected', this);
  },
  /**
   * Handles receiving a new message from the remote DeviceServer.
   *
   * @param {object} message {@link Message}
   */
  onMessage: function (message) {
    if (message.topic == 'rpc') {
      this.onRpc(message.data);
    }
    this.inherited(arguments);
  },
  onRpc: function (rpc) {
    if (rpc.id == this.device.id()) {
      this.device[rpc.method].apply(this.device, rpc.args);
    }
  },
  deviceListener: function () {
    if (!this._deviceListener) {
      this._deviceListener = dojo.hitch(this, this.send)
    }
    return this._deviceListener;
  },
});


/**
 * @class Accepts connections from remote devices and publishes them locally
 * @param {Urb} An Urb instance through which to publish the devices
 */
var DeviceServer = dojo.declare('DeviceServer', net.Server, {
  constructor: function (name, protocol, urb) {
    this.urb = urb;
    this._clients = {};
  },
  onClientConnect: function (client) {
    this._clients[client.id()] = [];
    client.on('event', dojo.hitch(this, this.onClientMessage, client));
    this.emit('clientConnected', client);
  },
  onClientDisconnect: function (client) {
    for (var i in this._clients[client.id()]) {
      this.urb.removeDevice(this._clients[client.id()][i]);
    }
    delete this._clients[client.id()];
    this.emit('clientDisconnected', client);
  },
  onClientMessage: function (client, message) {
    if (message.topic == 'deviceAdded') {
      this.onDevice(message.data, client);
    }
    this.emit('event', message);
  },
  onDevice: function (device, client) {
    var dev = new proxy.DeviceProxy(device.name, 
                                    device.properties,
                                    device.kind,
                                    client);
    this._clients[client.id()].push(dev);
    this.urb.addDevice(dev);
  },
});

exports.DeviceClient = DeviceClient;
exports.DeviceServer = DeviceServer;
