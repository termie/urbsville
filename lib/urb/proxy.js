var dojo = require('dojo');
var core = require('urb/core');

dojo.provide('urb.proxy');

var Proxy = dojo.declare('Proxy', core.EventEmitter, {
  constructor: function (name, filterId) {
    this.filterId = filterId;
    this.client = null;
  },
  attach: function (client) {
    this.client = client;
    this.client.on('event', this.eventListener());
  },
  eventListener: function () {
    if (!this._eventListener) {
      this._eventListener = dojo.hitch(this, this.onEvent);
    }
    return this._eventListener;
  },
  onEvent: function (event) {
    if (event.emitter != this.filterId) return;
    this.emit(event.topic, event.data);
  },
  rpc: function (method, args) {
    var id = this.filterId;
    this.client.send({topic: 'rpc',
                          data: {id: id,
                                 method: method,
                                 args: args}
                           });
  }
});


/**
 * @class DeviceProxy for a Device being accessed remotely.
 * Uses something of a hacked up mixin pattern to add Proxy methods.
 *
 * Instances of this class are used Client-side to represent Devices on a
 * remote ApiServer.
 * 
 * Instances of this class are also used Server-side to represent Devices
 * being provided to a DeviceServer by a remote DeviceClient.
 *
 * @param {String} kind {@link Evented}
 * @param {String} name {@link Evented}
 * @param {String} properties {@link Device}
 * @param {implements Connection} connection {@link Proxy}
 *
 * @extends Device
 */
var DeviceProxy = dojo.declare('DeviceProxy', core.Device, {
  constructor: function (name, defaults, kind, client) {
    this.client = client;
    this._kind = kind;
    this.proxy = Proxy(this.name(), this.id());
    this.proxy.on('propertyChanged', this.propertyListener());
    this.proxy.on('metaChanged', this.metaListener());
    this.proxy.attach(client);
  },
  propertyListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = dojo.hitch(this, this.onPropertyChanged);
    }
    return this._propertyListener;
  },
  metaListener: function () {
    if (!this._metaListener) {
      this._metaListener = dojo.hitch(this, this.onMetaChanged);
    }
    return this._metaListener;
  },
  /**
   * Update internal state and notify listeners when receiving remote state.
   * @param {Object} event A simple event object.
   */
  onPropertyChanged: function (event) {
    for (var i in event.properties) {
      this._set(i, event.properties[i]);
    }
  },
  onMetaChanged: function (event) {
    for (var i in event.meta) {
      this._setMeta(i, event.meta[i]);
    }
  },
  /**
   * Actually change the internal represenation and notify listeners
   * @see Device#set
   * @private
   */
  _set: function (property, value) {
    core.Device.prototype.set.call(this, property, value);
  },
  /**
   * Sends a set RPC to the remote device.
   *
   * Note that the property will not actually be set until the remote
   * device has acknowledged the RPC and set its own property.
   *
   * @see Device#set
   */
  set: function (property, value) {
    this.proxy.rpc('set', [property, value]);
  },
  _setMeta: function () {
    this.inherited('setMeta', arguments);
  },
  setMeta: function (key, value) {
    this.proxy.rpc('setMeta', [key, value]);
  },
});


/**
 * @class HubProxy for an Hub being accessed remotely.
 * Uses something of a hacked up mixin pattern to add Proxy methods.
 *
 * Instances of this class are used Client-side to represent an Hub on a remote
 * ApiServer.
 *
 * @param {String} kind {@link Evented#}
 * @param {String} name {@link Evented#}
 * @param {implements Connection} connection {@link Proxy#}
 * @extends Hub
 * @borrows Proxy#rpc as this.rpc
 */
var HubProxy = dojo.declare('HubProxy', core.Hub, {
  constructor: function (name, kind, client) {
    this.client = client;
    this._kind = kind;
    this.proxy = Proxy(this.name(), this.id());
    this.proxy.on('deviceAdded', this.deviceAddedListener());
    this.proxy.on('deviceRemoved', this.deviceRemovedListener());
    this.proxy.on('metaChanged', this.metaListener());
    this.proxy.attach(client);
  },
  deviceAddedListener: function () {
    if (!this._deviceAddedListener) {
      this._deviceAddedListener = dojo.hitch(this, this.onDeviceAdded);
    }
    return this._deviceAddedListener;
  },
  deviceRemovedListener: function () {
    if (!this._deviceRemovedListener) {
      this._deviceRemovedListener = dojo.hitch(this, this.onDeviceRemoved);
    }
    return this._deviceRemovedListener;
  },
  metaListener: function () {
    if (!this._metaListener) {
      this._metaListener = dojo.hitch(this, this.onMetaChanged);
    }
    return this._metaListener;
  },
  /**
   * Event handler for Device events. Builds a DeviceProxy, notifies listeners.
   * 
   * Also makes sure that further events from the remote client are
   * forwarded to the DeviceProxy.
   *  
   * @param {Object} device A serialized Device. {@link Device#toDict}
   */
  onDeviceAdded: function (data) {
    var device = new DeviceProxy(data.name,
                                 data.properties,
                                 data.kind,
                                 this.client);
    this.addDevice(device);
  },
  onDeviceRemoved: function (data) {
    var device = new DeviceProxy(data.name,
                                 data.properties,
                                 data.kind,
                                 this.client);
    this.removeDevice(device);
  },
  onMetaChanged: function (event) {
    for (var i in event.data) {
      this._setMeta(i, event.data[i]);
    }
  },
  _setMeta: function () {
    this.inherited('setMeta', arguments);
  },
  setMeta: function (key, value) {
    this.proxy.rpc(this.id(), 'setMeta', [key, value]);
  },
});

exports.Proxy = Proxy;
exports.DeviceProxy = DeviceProxy;
exports.HubProxy = HubProxy;
