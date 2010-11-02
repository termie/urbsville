var dojo = require('dojo');
var net = require('urb/net');
var proxy = require('urb/proxy');

dojo.provide('urb.api');

/**
 * @class ApiClient Client-side API client, connects to an ApiServer.
 *
 * Builds a local representation with UrbProxy and DeviceProxy objects.
 * 
 * Provides a Connection interface for Proxy objects.
 *
 * @extends Evented
 * @borrows Connection#send as this.send
 */
var ApiClient = dojo.declare('ApiClient', net.Client, {
  constructor: function (name, protocol) {
    this.hub = null;
  },
  /**
   * Event handler for connect events. Notifies listeners.
   */
  onConnect: function () {
    this.emit('connected', this);
  },
  /**
   * Event handler for disconnect events. Notifies listeners.
   *
   * TODO(termie): clean up urbs and devices
   */
  onDisconnect: function () {
    this.emit('disconnected', this);
  },
  /**
   * Event handler for Urb events. Builds an UrbProxy, notifies listeners.
   * 
   * Also makes sure that further events from the remote ApiServer are
   * forwarded to the UrbProxy.
   *
   * @param {Object} urb A serialized Urb. {@link Urb#toDict}
   */
  onUrbAdded: function (data) {
    var hub = new proxy.UrbProxy(data.name, data.kind, this);
    for (var d in data.devices) {
      var device = new proxy.DeviceProxy(data.devices[d].name,
                                         data.devices[d].properties,
                                         data.devices[d].kind,
                                         this);
      hub.addDevice(device);
    }
    this.hub = hub;
    //this.urb.on('event', this.bubble());
    this.emit('urbAdded', this.urb);
  },
  /**
   * Handles receiving a new message from the remote ApiServer and routing it.
   *
   * @param {object} message {@link Message}
   */
  onMessage: function (message) {
    if (message.topic == 'urbAdded') {
      this.onUrbAdded(message.data);
    }
    this.inherited(arguments);
  },
});

/**
 * @class ApiServer provides access to Urbs and their Devices
 * @extends Evented
 */
var ApiServer = dojo.declare('ApiServer', net.Server, {
  constructor: function (name, protocol, hub) {
    this._clients = [];
    this.hub = hub;
    this.hub.on('event', this.hubListener());
  },
  hubListener: function () {
    if (!this._hubListener) {
      this._hubListener = dojo.hitch(this, this.notifyClients);
    }
    return this._hubListener; 
  },
  notifyClients: function (event) {
    for (var i in this._clients) {
      this._clients[i].send(event);
    }
  },
  onClientConnect: function (client) {
    // Send over current state
    client.send({topic: 'hubAdded',
                 emitter: client.id(),
                 data: this.hub});
    this._clients.push(client);
    client.on('event', dojo.hitch(this, this.onClientMessage, client));
    this.inherited(arguments);
  },
  /**
   * Handle messages from the remote client.
   * 
   * At the moment the only handled Message kind is rpc.
   *
   * @param {Object} message {@link Message}
   * @param {ApiClientProxy} client A Proxy for the remote ApiClient
   */
  onClientMessage: function (client, message) {
    if (message.topic == 'rpc') {
      this.onRpc(message.data, client);
    } else {
      this.emit('event', message);
    }
  },
  /**
   * When a remote client disconnects remove them and notify listeners.
   *
   * @param {ApiClientProxy} client A Proxy for a remote ApiClient.
   */
  onClientDisconnect: function (client) {
    for (var i in this._clients) {
      if (this._clients[i] === client) {
        this._clients.splice(i, 1);
        break;
      }
    }
    this.inherited(arguments);
  },
  /**
   * Handle an RPC call from an ApiClient.
   *
   * TODO(termie): this can probably be done a little more elegantly.
   * TODO(termie): this can result in multiple calls if multiple devices
   *               have the same id, not sure if that is desirable yet.
   *
   * @param {Object} rpc {@link Rpc}
   * @param {ApiClientProxy} client A Proxy for a remote ApiClient.
   */
  onRpc: function (rpc, client) {
    if (rpc.id == this.hub.id()) {
      this.hub[rpc.method].apply(this.hub, rpc.args);
      return;
    }
    var devices = this.hub.devices();
    for (var d in devices) {
      if (rpc.id == devices[d].id()) {
        devices[d][rpc.method].apply(devices[d], rpc.args);
        return;
      }
    }
  },
});

exports.ApiClient = ApiClient;
exports.ApiServer = ApiServer;
