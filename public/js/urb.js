if (typeof require !== 'undefined') {
  dojo = require('dojo');
}

function curry(fn, scope) {
  var __method = fn;
  var self = scope || window;
  var args = [];
  for (var i=2, len = arguments.length; i < len; ++i) {
    args.push(arguments[i]);
  }
  return function() {
    var a = [];
    for (var i = 0, len = arguments.length; i<len; i++) {
      a.push(arguments[i]);
    }
    for (var j in args) {
      a.push(args[j]);
    }
    return __method.apply(self, a);
  };
}


function extend(obj1, obj2) {
  for (var k in obj2) {
    obj1[k] = obj2[k];
  }
}


function inherit(ctor, superCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = superCtor.prototype;
  ctor.prototype = new tempCtor();
  ctor.prototype.constructor = ctor;
}


function clone(obj) {
  var newObj = (obj instanceof Array) ? [] : {};
  for (i in obj) {
    if (i == 'clone') continue;
    if (obj[i] && typeof obj[i] == "object") {
      newObj[i] = clone(obj[i]);
    } else {
      newObj[i] = obj[i];
    }
  }
  return newObj;
}


var isArray = Array.isArray;


/** Interfaces */


var EventEmitter = dojo.declare('EventEmitter', null, {
  constructor: function (name) {
    this._name = name;
    this._kind = this.declaredClass;
    this._events = {};
    this._bubble = null;
  },
  name: function () { return this._name; },
  kind: function () { return this._kind; },
  id: function () {
    return this.kind() + '/' + this.name();
  },
  toDict: function () {
    return {kind: this.kind(), name: this.name(), id: this.id()};
  },
  bubble: function () {
    if (!this._bubble) {
      this._bubble = dojo.hitch(this, this.emit, 'event');
    }
    return this._bubble;
  }
});

/** Methods copied directly from Node's EventEmitter class
 *  with minor modifications */
EventEmitter.prototype.emit = function (type) {
  // TODO(termie): I'd like this second emit to happen _after_ this code
  if (type != 'event' && type != 'newListener') {
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length == 1) args = args[0];
    var data = {topic: type,
                emitter: this.id(),
                data: args,
                };
    this.emit('event', data);
  }

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1];
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  if (!this._events[type]) return false;

  if (typeof this._events[type] == 'function') {
    if (arguments.length < 2) {
      // fast case
      this._events[type].call( this
                             , arguments[1]
                             //, arguments[2]
                             );
    } else {
      // slower
      var args = Array.prototype.slice.call(arguments, 1);
      this._events[type].apply(this, args);
    }
    return true;

  } else if (isArray(this._events[type])) {
    var args = Array.prototype.slice.call(arguments, 1);


    var listeners = this._events[type].slice(0);
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};
EventEmitter.prototype.addListener = function (type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit("newListener", type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {
    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.removeListener = function (type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};
EventEmitter.prototype.removeAllListeners = function (type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};
EventEmitter.prototype.listeners = function (type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};


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


var Pipe = function (input, output) {
  /**
   * input = [Instance, 'property'],
   * output = [Instance, 'property']
   */
  this.input = input;
  this.output = output;
  this._propertyListener = null;
};
extend(Pipe.prototype, {
  attach: function () {
    var listener = this.propertyListener();
    this.input[0].addListener(listener);
  },
  detach: function () {
    this.input[0].removeListener(this.propertyListener(this.input[1]));
  },
  propertyListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = new Listener(new RegExp('property/' + this.input[1] + '$'), curry(this._handle, this));
    }
    return this._propertyListener;
  },
  transformInput: function (input) {
    /**
     * overwrite me in subclasses
     */
    return input;
  },
  _handle: function (event) {
    var data = event.data;
    this.set(null, data);
  },
  set: function (_ignored, data) {
    var transformed = this.transformInput(data);
    this.output[0].set(this.output[1], transformed);
  }
});


var ScalingPipe = function (input, output, scale) {
  this.scale = scale;
  Pipe.call(this, input, output);
};
inherit(ScalingPipe, Pipe);
extend(ScalingPipe.prototype, {
  transformInput: function (input) {
    return parseInt(input * scale);
  },
});
ScalingPipe.newFactory = function (scale) {
  return function (input, output) {
    return new ScalingPipe(input, output, scale);
  };
};

/** Data types */

/**
 * @class Event data type. **For documentation purposes only.**
 *
 * Do not instantiate this interface.
 *
 * Events mostly consist of state changes and notifications about connections.
 */
var Event = function () { };
Event.prototype = {
  /**
   * A list of topics relevant to this Event.
   */
  topic: [],
  /**
   * Free-form data object for this event.
   */
  data: {}
}


/**
 * @class Rpc data type. **For documentation purposes only.**
 *
 * Do not instantiate this interface.
 *
 * RPCs mostly consist setting properties on remote devices.
 */
var Rpc = function () { };
Rpc.prototype = {
  /**
   * The identifier of the object being targetted.
   */
  id: "",
  /**
   * The method on the object being targetted.
   */
  method: "",
  /**
   * List of arguments to call the method with.
   */
  args: []
}


/**
 * @class Message interface. **For documentation purposes only.**
 *
 * Do not instantiate this interface.
 *
 * Message is basically an envelope for passing serialized data over a
 * Connection.
 */
var Message = function () { };
Message.prototype = {
  /**
   * The kind of message this is.
   *
   * Will be one of: "rpc", "urb", "device", "event"
   * @see Rpc
   * @see Urb
   * @see Device
   * @see Event
   */
  kind: "",
  /**
   * Serialized object of the class defined by this.kind
   */
  data: {}
}

/** Mixins */

var Meta = dojo.declare('Meta', null, {
  constructor: function () {
    this._meta = {};
  },
  meta: function () { return this._meta; },
  getMeta: function (key) {
    return this._meta[key];
  },
  setMeta: function (key, value) {
    // TODO(termie): at some point in the future this should probably have some
    //               sort of namespacing
    this._meta[key] = value;

    var data = {meta: {}}
    data.meta[key] = value;

    this.emit('metaChanged', data);
    this.emit('meta/' + key, value);
  }
});

/** SomethingSomething */
var Server = dojo.declare('Server', EventEmitter, {
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

var Client = dojo.declare('Client', EventEmitter, {
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


var ServerProtocol = dojo.declare('ServerProtocol', EventEmitter, {
  listen: function () {
    // start listening
  },
  close: function () {
    // stop listening
  },
});


var ClientProtocol = dojo.declare('ClientProtocol', EventEmitter, {
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


/** Basic classes */

var Device = dojo.declare('Device', [EventEmitter, Meta], {
  constructor: function (name, defaults) {
    if (!this._properties) this._properties = {};
    if (!this._meta) this._meta = {};
    if (defaults) dojo.mixin(this._properties, defaults);
  },
  properties: function () { return this._properties; },
  toDict: function () {
    var dict = this.inherited(arguments);
    dict.properties = this.properties();
    dict.meta = this.meta();
    return dict;
  },
  get: function (property) {
    if (this._properties[property] === undefined) {
      if (this['get_' + property]) {
        return this['get_' + property].call(this);
      }
      this.emit('error', 'not a valid property: ' + property);
    }
    return this._properties[property];
  },
  set: function (property, value) {
    if (this._properties[property] === undefined) {
      if (this['set_' + property]) {
        return this['set_' + property].call(this, value);
      }
      this.emit('error', 'not a valid property: ' + property);
    }
    this._properties[property] = value;

    data = {properties: {}};
    data['properties'][property] = value;
    this.emit('propertyChanged', data);
    this.emit('property/' + property, value);
  }
});


var Urb = dojo.declare('Urb', [EventEmitter, Meta], {
  constructor: function (name) {
    this._devices = [];
  },
  devices: function () { return this._devices; },
  device: function (id) {
    var devices = this.devices();
    for (var i in devices) {
      if (devices[i].id() == id) {
        return devices[i];
      } 
    }
  }, 
  addDevice: function (device) {
    this._devices.push(device);
    device.on('event', this.bubble());
    this.emit('deviceAdded', device);
  },
  removeDevice: function (device) {
    for (var i in this._devices) {
      if (this._devices[i].id() == device.id()) {
        this._devices.splice(i, 1);
        device.removeListener('event', this.bubble());
        this.emit('deviceRemoved', device);
        break;
      }
    }
  },
  toDict: function () {
    var dict = this.inherited(arguments);
    var deviceDicts = [];
    var devices = this.devices();
    for (var d in devices) {
      deviceDicts.push(devices[d].toDict())
    }
    dict.devices = deviceDicts;
    return dict;
  },
});

/** Proxies */

var Proxy = dojo.declare('Proxy', EventEmitter, {
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
var DeviceProxy = dojo.declare('DeviceProxy', Device, {
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
    Device.prototype.set.call(this, property, value);
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
 * @class UrbProxy for an Urb being accessed remotely.
 * Uses something of a hacked up mixin pattern to add Proxy methods.
 *
 * Instances of this class are used Client-side to represent an Urb on a remote
 * ApiServer.
 *
 * @param {String} kind {@link Evented#}
 * @param {String} name {@link Evented#}
 * @param {implements Connection} connection {@link Proxy#}
 * @extends Urb
 * @borrows Proxy#rpc as this.rpc
 */
var UrbProxy = dojo.declare('UrbProxy', Urb, {
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

/** Client-side */

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
var ApiClient = dojo.declare('ApiClient', Client, {
  constructor: function (name, protocol) {
    this.urb = null;
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
    var proxy = new UrbProxy(data.name, data.kind, this);
    for (var d in data.devices) {
      var device = new DeviceProxy(data.devices[d].name,
                                   data.devices[d].properties,
                                   data.devices[d].kind,
                                   this);
      proxy.addDevice(device);
    }
    this.urb = proxy;
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


var DeviceClient = dojo.declare('DeviceClient', Client, {
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


/** Server-side */

/**
 * @class ApiServer provides access to Urbs and their Devices
 * @extends Evented
 */
var ApiServer = dojo.declare('ApiServer', Server, {
  constructor: function (name, protocol, urb) {
    this._clients = [];
    this.urb = urb;
    this.urb.on('event', this.urbListener());
  },
  urbListener: function () {
    if (!this._urbListener) {
      this._urbListener = dojo.hitch(this, this.notifyClients);
    }
    return this._urbListener; 
  },
  notifyClients: function (event) {
    for (var i in this._clients) {
      this._clients[i].send(event);
    }
  },
  onClientConnect: function (client) {
    // Send over current state
    client.send({topic: 'urbAdded',
                 emitter: client.id(),
                 data: this.urb});
    this._clients.push(client);
    client.on('message', dojo.hitch(this, this.onClientMessage, client));
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
  onClientMessage: function (message, client) {
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
    if (rpc.id == this.urb.id()) {
      this.urb[rpc.method].apply(this.urb, rpc.args);
      return;
    }
    var devices = this.urb.devices();
    for (var d in devices) {
      if (rpc.id == devices[d].id()) {
        devices[d][rpc.method].apply(devices[d], rpc.args);
        return;
      }
    }
  },
});


/**
 * @class Accepts connections from remote devices and publishes them locally
 * @param {Urb} An Urb instance through which to publish the devices
 */
var DeviceServer = dojo.declare('DeviceServer', Server, {
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
    var proxy = new DeviceProxy(device.name, 
                                device.properties,
                                device.kind,
                                client);
    this._clients[client.id()].push(proxy);
    this.urb.addDevice(proxy);
  },
});


/** Device implementations */

/**
 * @constructor
 */
var ExampleDevice = dojo.declare('ExampleDevice', Device, {
  _properties: {'state': 0},
});

/** Transport implementations */

var DirectClientProtocol = function (serverProtocol) {
  ClientProtocol.call(this)
  this.serverProtocol = serverProtocol;
  this._client = null;
}
inherit(DirectClientProtocol, ClientProtocol);
extend(DirectClientProtocol.prototype, {
  connect: function (callbackObj) {
    ClientProtocol.prototype.connect.call(this, callbackObj);
    this.serverProtocol.onClientConnect(this._transportClient());
    this.onConnect();
  },
  close: function () {
    this.serverProtocol.onClientDisconnect(this._transportClient());
    this.onDisconnect();
  },
  send: function (message) {
    this.serverProtocol.onClientMessage(this.serializeMessage(message),
                                         this._transportClient());
  },
  _transportClient: function () {
    if (!this._client) {
      this._client = {id: function () { return 'client/direct'; },
                      send: curry(this.onMessage, this)};
    }
    return this._client
  },
  parseMessage: function (message) { return message; },
});



if (typeof exports === 'undefined') {
  /** @namespace Holds exports */
  exports = {};
}

exports.curry = curry;
exports.extend = extend;
exports.inherit = inherit;
exports.clone = clone;

exports.EventEmitter = EventEmitter;
exports.ClientProtocol = ClientProtocol;
exports.ServerProtocol = ServerProtocol;
exports.StringProtocol = StringProtocol;

exports.Device = Device;
exports.Urb = Urb;

exports.ExampleDevice = ExampleDevice;
exports.DirectClientProtocol = DirectClientProtocol;

exports.Client = Client;
exports.Server = Server;

exports.ApiServer = ApiServer;
//exports.WebServer = WebServer;
exports.DeviceServer = DeviceServer;

exports.ApiClient = ApiClient;
exports.DeviceClient = DeviceClient;

exports.DeviceProxy = DeviceProxy;
exports.UrbProxy = UrbProxy;
//exports.ApiClientProxy = ApiClientProxy;
