if (require) {
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
  if (type != 'event') {
    var data = {topic: type,
                emitter: this.id,
                data: Array.prototype.slice.call(arguments, 1)
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
    if (arguments.length < 3) {
      // fast case
      this._events[type].call( this
                             , arguments[1]
                             , arguments[2]
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


/**
 * @class Proxy is currently used as a mixin to provide an interface to RPCs
 */
var Proxy = function (connection) {
  this._connection = connection;
  this._proxyListeners = [];
};
Proxy.prototype = {
  proxyListeners: function () { return this._proxyListeners; },
  /**
   * Add to this instance's list of listeners.
   * @param {implements Listener} listener
   */
  addProxyListener: function (listener) {
    this._proxyListeners.push(listener);
  },
  /**
   * Remove a listener from this instance's list of listeners.
   * @param {implements Listener} listener
   */
  removeProxyListener: function (listener) {
    for (var i in this._proxyListeners) {
      if (this._proxyListeners[i] == listener) {
        this._proxyListeners.splice(i, 1);
        break;
      }
    }
  },
  /**
   * Notify interested listeners about an event
   * @param {Object} An object with a list of topics and some data
   */
  notifyProxyListeners: function (event) {
    //sys.puts(this.id() + ' 1event.data: ' + sys.inspect(event.data));
    for (var i in this._proxyListeners) {
      var newEvent = clone(event);
      //sys.puts(this.id() + ' 2event.data: ' + newEvent.data);
      if (this._proxyListeners[i].match(newEvent.topic)) {
        //sys.puts(sys.inspect(newEvent));
        this._proxyListeners[i].send(newEvent);
      }
    }
  },
  /**
   * Executes an RPC
   * @param {String} id Target object of the RPC
   * @param {String} method Target method of the RPC
   * @param {Array} args Arguments for the RPC
   */
  rpc: function (id, method, args) {
    this._connection.send({kind: 'rpc',
                           data: {id: id,
                                  method: method,
                                  args: args}
                           });
  }
};


/**
 * @class Connection knows how to send.
 */
var Connection = function (id, transport) {
  this._id = id
  this.transport = transport;
};
Connection.prototype = {
  id: function () {
    return this._id;
  },
  /**
   * Send an object over the wire.
   * @param {Object} obj A simple event or rpc object.
   */
  send: function (obj) {
    this.transport.send(this.serializeMessage(obj));
  },
  serializeMessage: function (obj) {
    return JSON.stringify(obj);
  }
}


/**
 * @class ClientTransport is a base class for Client-side transports.
 *
 * It will usually be passed to a Client's connect method.
 */
var ClientTransport = function () {
  this._callbackObj = null;
}
ClientTransport.prototype = {
  connect: function (callbackObj) {
    this._callbackObj = callbackObj;
  },
  close: function () {
    // not implemented
  },
  onConnect: function () {
    this._callbackObj.onConnect.call(this._callbackObj, this);
  },
  onDisconnect: function () {
    this._callbackObj.onDisconnect.call(this._callbackObj, this);
  },
  onMessage: function (message) {
    var parsed = this.parseMessage(message);
    this._callbackObj.onMessage.call(this._callbackObj, parsed, this);
  },
  send: function (message) {
    // pass
  },
  parseMessage: function (message) {
    return JSON.parse(message);
  },
  serializeMessage: function (message) {
    return JSON.stringify(message);
  }
};


/**
 * @class ServerTransport is an interface class for Server-side transports.
 *
 * It will usually be passed to a Server's listen method.
 */
var ServerTransport = function () {
  this._callbackObj = null;
}
ServerTransport.prototype = {
  listen: function (callbackObj) {
    this._callbackObj = callbackObj;
  },
  close: function () {
    // not implemented
  },
  onClientConnect: function (client) {
    var client = this.getClient(client);
    this._callbackObj.onClientConnect.call(this._callbackObj, client, this);
  },
  onClientDisconnect: function (client) {
    var client = this.getClient(client);
    this._callbackObj.onClientDisconnect.call(this._callbackObj, client, this);
  },
  onClientMessage: function (message, client) {
    var client = this.getClient(client);
    var parsed = this.parseMessage(message);
    this._callbackObj.onClientMessage.call(
        this._callbackObj, parsed, client, this);
  },
  parseMessage: function (message) {
    return JSON.parse(message);
  },
  serializeMessage: function (message) {
    return JSON.stringify(message);
  },
  getClient: function (obj) {
    return obj;
  },
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

var Server = dojo.declare('Server', null, {
  constructor: function () {
    this.transport = null;
  },
  listen: function (transport) {
    this.transport = transport;
    this.transport.listen(this);
  },
  close: function () {
    this.transport.close();
    this.transport = null;
  },

});


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
        this.device.removeListener('event', this.bubble());
        this.emit('deviceRemoved', device);
        break;
      }
    }
  },
});

/** Proxies */

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
var DeviceProxy = function (kind, name, properties, connection) {
  Device.call(this, kind, name, properties);
  Proxy.call(this, connection);
  this.connectionId = connection.id();
  this.addProxyListener(this.propertyListener());
};
inherit(DeviceProxy, Device);
extend(DeviceProxy.prototype, Proxy.prototype);
/** @lends DeviceProxy.prototype */
extend(DeviceProxy.prototype, {
  propertyListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = new Listener(
        new RegExp('device/propertyChanged'),
        curry(this.onPropertyChanged, this));
    }
    return this._propertyListener;
  },
  metaListener: function () {
    if (!this._metaListener) {
      this._metaListener = new Listener(
        new RegExp('device/metaChanged'),
        curry(this.onMetaChanged, this));
    }
    return this._metaListener;
  },
  /**
   * Update internal state and notify listeners when receiving remote state.
   * @param {Object} event A simple event object.
   */
  onEvent: function (event) {
    this.notifyProxyListeners(event);
  },
  onPropertyChanged: function (event) {
    for (var i in event.data) {
      this._set(i, event.data[i]);
    }
  },
  onMetaChanged: function (event) {
    for (var i in event.data) {
      this._setMeta(i, event.data[i]);
    }
  },
  /**
   * Actually change the internal represenation and notify listeners
   * @see Device#set
   * @private
   */
  _set: function () {
    Device.prototype.set.apply(this, arguments);
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
    this.rpc(this.id(), 'set', [property, value]);
  },
  _setMeta: function () {
    Device.prototype.setMeta.apply(this, arguments);
  },
  setMeta: function (key, value) {
    this.rpc(this.id(), 'setMeta', [key, value]);
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
var UrbProxy = function (kind, name, connection) {
  Urb.call(this, kind, name);
  Proxy.call(this, connection);
  this._deviceProxyListeners = {};
  this.addProxyListener(this.deviceAddedListener());
  this.addProxyListener(this.deviceRemovedListener());
  this.addProxyListener(this.metaListener());
};
inherit(UrbProxy, Urb);
extend(UrbProxy.prototype, Proxy.prototype);
/** @lends UrbProxy.prototype */
extend(UrbProxy.prototype, {
  /**
   * Check whether we need to do 
   *
   * @params {Object} event {@link Event}
   */
  onEvent: function (event) {
    this.notifyProxyListeners(event);
  },
  deviceAddedListener: function () {
    if (!this._deviceAddedListener) {
      this._deviceAddedListener = new Listener(
        'urb/deviceAdded', curry(this.onDeviceAdded, this));
    }
    return this._deviceAddedListener;
  },
  deviceRemovedListener: function () {
    if (!this._deviceRemovedListener) {
      this._deviceRemovedListener = new Listener(
        'urb/deviceRemoved', curry(this.onDeviceRemoved, this));
    }
    return this._deviceRemovedListener;
  },
  deviceProxyListener: function (device) {
    if (!this._deviceProxyListeners[device.id()]) {
      this._deviceProxyListeners[device.id()] = new Listener(
          new RegExp(device.id()), curry(device.onEvent, device));
    }
    return this._deviceProxyListeners[device.id()]
  },
  metaListener: function () {
    if (!this._metaListener) {
      this._metaListener = new Listener(
        new RegExp('urb/metaChanged'),
        curry(this.onMetaChanged, this));
    }
    return this._metaListener;
  },
  /**
   * Event handler for Device events. Builds a DeviceProxy, notifies listeners.
   * 
   * Also makes sure that further events from the remote connection are
   * forwarded to the DeviceProxy.
   *  
   * @param {Object} device A serialized Device. {@link Device#toDict}
   */
  onDeviceAdded: function (event) {
    var device = event.data;
    var proxy = new DeviceProxy(device.kind, 
                                device.name,
                                device.properties,
                                this._connection);
    this.addDevice(proxy);
    this.addProxyListener(this.deviceProxyListener(proxy));
  },
  onDeviceRemoved: function (event) {
    var device = event.data;
    var proxy = new DeviceProxy(device.kind, 
                                device.name,
                                device.properties,
                                this);
    this.removeProxyListener(this.deviceProxyListener(proxy));
    this.removeDevice(proxy);
  },
  onMetaChanged: function (event) {
    for (var i in event.data) {
      this._setMeta(i, event.data[i]);
    }
  },
  _setMeta: function () {
    Device.prototype.setMeta.apply(this, arguments);
  },
  setMeta: function (key, value) {
    this.rpc(this.id(), 'setMeta', [key, value]);
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
var ApiClient = function () {
  Evented.apply(this, arguments);
  this.urb = null;
  this.transport = null;
};
inherit(ApiClient, Evented);
/** @lends ApiClient.prototype */
extend(ApiClient.prototype, {
  /**
   * Initiate a connection using the given transport.
   *
   * TODO(termie): Should probably clear current state if any exists.
   *
   * @param {implements Transport} transport {@link Transport} 
   */
  connect: function (transport) {
    this.transport = transport;
    this.transport.connect(this)
  },
  close: function () {
    this.transport.close();
    this.transport = null;
  },
  /**
   * Event handler for connect events. Notifies listeners.
   */
  onConnect: function () {
    this.notifyListeners({topic: ['client/connect'],
                          data: this.id()});
  },
  /**
   * Event handler for disconnect events. Notifies listeners.
   *
   * TODO(termie): clean up urbs and devices
   */
  onDisconnect: function () {
    this.notifyListeners({topic: ['client/disconnect'],
                          data: this.id()});
  },
  /**
   * Event handler for Urb events. Builds an UrbProxy, notifies listeners.
   * 
   * Also makes sure that further events from the remote ApiServer are
   * forwarded to the UrbProxy.
   *
   * @param {Object} urb A serialized Urb. {@link Urb#toDict}
   */
  onUrb: function (urb) {
    var proxy = new UrbProxy(urb.kind, urb.name, this);
    this.urb = proxy;
    this.addListener(this.urbListener(proxy));
    this.notifyListeners({topic: ['client/urb'],
                          data: proxy.id()});
  },
  /**
   * Generic event handler. Notify listeners.
   *
   * In many cases the event will be a state change event for a remote Urb
   * or Device.
   *
   * @param {Object} event {@link Event}
   */
  onEvent: function (event) {
    this.notifyListeners(event);
  },
  /**
   * Handles receiving a new message from the remote ApiServer and routing it.
   *
   * @param {object} message {@link Message}
   */
  onMessage: function (message) {
    if (message.kind == 'urb') {
      this.onUrb(message.data);
    } else if (message.kind == 'device') {
      this.onDevice(message.data);
    } else if (message.kind == 'event') {
      this.onEvent(message.data);
    }
  },
  urbListener: function (urb) {
    if (!this._urbListener) {
      this._urbListener = new Listener(
          new RegExp(urb.id()), curry(urb.onEvent, urb));
    }
    return this._urbListener;
  },
  send: function (message) {
    this.transport.send(message);
  }
});

var DeviceClient = function (kind, name, device) {
  Evented.call(this, kind, name);
  this.transport = null;
  this.device = device;
  this.device.addListener(this.deviceListener());
};
inherit(DeviceClient, Evented);
/** @lends DeviceClient.prototype */
extend(DeviceClient.prototype, {
  /**
   * Initiate a connection using the given transport.
   *
   * TODO(termie): Should probably clear current state if any exists.
   *
   * @param {implements Transport} transport {@link Transport} 
   */
  connect: function (transport) {
    this.transport = transport;
    this.transport.connect(this)
  },
  close: function () {
    this.transport.close();
    this.transport = null;
  },
  /**
   * Event handler for connect events. Notifies listeners.
   */
  onConnect: function () {
    this.send({kind: 'device',
               data: this.device.toDict()});
    this.notifyListeners({topic: ['deviceclient/connect'],
                          data: this.id()});
  },
  /**
   * Event handler for disconnect events. Notifies listeners.
   *
   */
  onDisconnect: function () {
    this.notifyListeners({topic: ['deviceclient/disconnect'],
                          data: this.id()});
  },
  /**
   * Generic event handler. Notify listeners.
   *
   * In many cases the event will be a state change event for a remote Device.
   *
   * @param {Object} event {@link Event}
   */
  onEvent: function (event) {
    this.send({kind: 'event', data: event});
  },
  /**
   * Handles receiving a new message from the remote DeviceServer.
   *
   * @param {object} message {@link Message}
   */
  onMessage: function (message) {
    if (message.kind == 'rpc') {
      this.notifyListeners({topic: ['deviceclient/rpc'],
                            data: message.data});
      this.onRpc(message.data);
    }
  },
  onRpc: function (rpc) {
    if (rpc.id == this.device.id()) {
      this.device[rpc.method].apply(this.device, rpc.args);
    }
  },
  deviceListener: function () {
    if (!this._deviceListener) {
      this._deviceListener = new Listener(/.*/, curry(this.onEvent, this));
    }
    return this._deviceListener;
  },
  send: function (message) {
    this.transport.send(message);
  }
});


/** Server-side */

/**
 * @class ApiServer provides access to Urbs and their Devices
 * @extends Evented
 */

var ApiServer = dojo.declare('ApiServer', [EventEmitter, Server], {
  constructor: function (name, urb) {
    this._clients = [];
    this.urb = urb;
    this.urb.on('event', this.urbListener());
  },
  urbListener: function () {
    if (this._urbListener === undefined) {
      var self = this;
      this._urbListener = dojo.hitch(this, this.notifyClients);
    }
    return this._urbListener; 
  },
  notifyClients: function (event) {
    for (var i in this._clients) {
      this._clients[i].send(event);
    }
  },
});

var ApiServer = function (kind, name, urb) {
  Evented.call(this, kind, name);
};
inherit(ApiServer, Evented);
/** @lends ApiServer.prototype */
extend(ApiServer.prototype, {
  /**
   * Initiate listening by the ApiServer using given Transport.
   *
   * @param {implements Transport} transport {@link Transport}
   */
  listen: function(transport) {
    this.transport = transport;
    this.transport.listen(this);
  },
  close: function () {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  },
  /**
   * Notifies listeners of the ApiServer on events from Urbs.
   * @return {Listener} A listener singleton for events from Urbs 
   */
  urbListener: function () {
    if (this._urbListener === undefined) {
      var self = this;
      this._urbListener = new Listener(/.*/, curry(this.onEvent, this));
    }
    return this._urbListener; 
  },
  /**
   * Notify connected clients
   *
   * @param {Object} message {@link Message}
   */
  notifyClients: function (message) {
    for (var i in this._clients) {
      this._clients[i].send(message);
    }
  },
  /**
   * When a remote client connects keep track of it and notify listeners.
   *
   * @param {ApiClientProxy} client A Proxy for the remote ApiClient
   */
  onClientConnect: function (client) {
    // Send over current state
    client.send({kind: 'urb',
                 data: this.urb.toDict()});
    var devices = this.urb.devices()
    for (var d in devices) {
      client.send({kind: 'event',
                   data: {topic: [this.urb.id(),
                                  'urb/deviceAdded'],
                          data: devices[d].toDict()}
                   });
    }
    this._clients.push(client);
    client.send({kind: 'event',
                 data: {topic: ['server/clientReady'],
                        data: ''}});
    this.notifyListeners({topic: ['server/clientConnect'],
                          data: client.id()});
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
    if (message.kind == 'rpc') {
      this.notifyListeners({topic: ['server/rpc'], data: message.data});
      this.onRpc(message.data, client);
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
        this.notifyListeners({topic: ['server/clientDisconnect'],
                              data: client.id()});
        break;
      }
    }
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
    var devices = this.urb.devices();
    for (var d in devices) {
      if (rpc.id == devices[d].id()) {
        devices[d][rpc.method].apply(devices[d], rpc.args);
      }
    }
  },
  /**
   * Forwards Events from the Urbs and Devices to remote ApiClients
   *
   * @param {Object} event {@link Event}
   */ 
  onEvent: function (event) {
    this.notifyClients({kind: 'event', data: event});
  }
});


/**
 * @class Accepts connections from remote devices and publishes them locally
 * @param {Urb} An Urb instance through which to publish the devices
 */
var DeviceServer = function (kind, name, urb) {
  Evented.call(this, kind, name);
  this.urb = urb;
  this._clients = {};
  this.transport = null;
};
inherit(DeviceServer, Evented);
/** @lends DeviceServer */
extend(DeviceServer.prototype, {
  listen: function(transport) {
    this.transport = transport;
    this.transport.listen(this);
  },
  close: function () {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  },
  onClientConnect: function (client) {
    this._clients[client.id()] = [];
    this.notifyListeners({topic: ['deviceserver/clientConnect'],
                          data: client.id()});
  },
  onClientDisconnect: function (client) {
    for (var i in this._clients[client.id()]) {
      this.urb.removeDevice(this._clients[client.id()][i]);
    }
    delete this._clients[client.id()];
    this.notifyListeners({topic: ['deviceserver/clientDisconnect'],
                          data: client.id()});
  },
  onClientMessage: function (message, client) {
    if (message.kind == 'device') {
      this.onDevice(message.data, client);
    } else if (message.kind == 'event') {
      this.onEvent(message.data);
    }
  },
  onDevice: function (device, client) {
    //sys.puts(sys.inspect(device));
    var proxy = new DeviceProxy(device.kind, 
                                device.name,
                                device.properties,
                                client);
    this.addListener(new Listener(new RegExp(proxy.id()),
                                  curry(proxy.onEvent, proxy)));
    this._clients[client.id()].push(proxy);
    this.urb.addDevice(proxy);
    this.notifyListeners({topic: ['deviceserver/deviceAdded'],
                          data: proxy.id()});
  },
  onEvent: function (event) {
    this.notifyListeners(event);
  }
});


/** Device implementations */

/**
 * @constructor
 */
var ExampleDevice = function (name, properties) {
  this._properties = {'state': 0};
  Device.call(this, 'ExampleDevice', name, properties);
};
inherit(ExampleDevice, Device);

/** Transport implementations */

var DirectClientTransport = function (serverTransport) {
  ClientTransport.call(this)
  this.serverTransport = serverTransport;
  this._client = null;
}
inherit(DirectClientTransport, ClientTransport);
extend(DirectClientTransport.prototype, {
  connect: function (callbackObj) {
    ClientTransport.prototype.connect.call(this, callbackObj);
    this.serverTransport.onClientConnect(this._transportClient());
    this.onConnect();
  },
  close: function () {
    this.serverTransport.onClientDisconnect(this._transportClient());
    this.onDisconnect();
  },
  send: function (message) {
    this.serverTransport.onClientMessage(this.serializeMessage(message),
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




/**
 * @constructor
 */
var Client = function () {
  Evented.apply(this, arguments);
};
inherit(Client, Evented);
extend(Client.prototype, {
  send: function (message) {
    // Not Implemented
  }
});




if (typeof exports === 'undefined') {
  /** @namespace Holds exports */
  exports = {};
}

exports.curry = curry;
exports.extend = extend;
exports.inherit = inherit;
exports.clone = clone;

exports.Evented = Evented;
exports.Listener = Listener;
exports.Connection = Connection;
exports.ClientTransport = ClientTransport;
exports.ServerTransport = ServerTransport;
exports.StringProtocol = StringProtocol;

exports.Device = Device;
exports.Urb = Urb;

exports.ExampleDevice = ExampleDevice;
exports.DirectClientTransport = DirectClientTransport;

exports.ApiServer = ApiServer;
//exports.WebServer = WebServer;
exports.DeviceServer = DeviceServer;

exports.ApiClient = ApiClient;
exports.DeviceClient = DeviceClient;

exports.DeviceProxy = DeviceProxy;
exports.UrbProxy = UrbProxy;
//exports.ApiClientProxy = ApiClientProxy;
