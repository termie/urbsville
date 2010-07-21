
function curry(fn, scope) {
  var __method = fn;
  var self = scope || window;
  var args = [];
  for (var i=2, len = arguments.length; i < len; ++i) {
    args.push(arguments[i]);
  }
  return function() {
    var a = [];
    for (var i in arguments) {
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


/** Interfaces */

/**
 * @class Base class for objects that send or receive events.
 * @param {String} kind Like a class identifier
 * @param {String} name A unique identifier for this object within its class
 */
var Evented = function (kind, name) {
  this._listeners = [];
  this._name = name;
  this._kind = kind;
};
Evented.prototype = {
  kind: function () { return this._kind; },
  name: function () { return this._name; },
  /**
   * Return what we hope is a unique identifier for this instance.
   *
   * Defaults to be kind + / + name.
   * @returns {String} Unique identifier for this instance
   */
  id: function () { return this.kind() + '/' + this.name(); },
  /**
   * Serialize this instance, usually for sending over the wire.
   * @returns {Object} A simple object of strings
   */
  toDict: function () {
    return {kind: this.kind(), name: this.name(), id: this.id()};
  },                        
  listeners: function () { return this._listeners; },
  /**
   * Add to this instance's list of listeners.
   * @param {implements Listener} listener
   */
  addListener: function (listener) {
    this._listeners.push(listener);
  },
  /**
   * Remove a listener from this instance's list of listeners.
   * @param {implements Listener} listener
   */
  removeListener: function (listener) {
    for (var i in this._listeners) {
      if (this._listeners[i] == listener) {
        this._listeners.splice(i, 1);
        break;
      }
    }
  },
  /**
   * Notify interested listeners about an event
   * @param {Object} An object with a list of topics and some data
   */
  notifyListeners: function (event) {
    if (event.topic.indexOf(this.id()) === -1) {
      event.topic.unshift(this.id());
    }
    //sys.puts(this.id() + ' 1event.data: ' + event.data);
    for (var i in this._listeners) {
      var newEvent = clone(event);
      //sys.puts(this.id() + ' 2event.data: ' + newEvent.data);
      if (this._listeners[i].match(newEvent.topic)) {
        //sys.puts(sys.inspect(newEvent));
        this._listeners[i].send(newEvent);
      }
    }
  }
};


var Listener = function (matcher, callback) {
  this.matcher = matcher;
  this.callback = callback;
};
Listener.prototype = {
  match: function (topic) {
    for (var i in topic) {
      if (topic[i].match(this.matcher)) {
        return true;
      }
    }
    return false;
  },
  send: function (event) {
    this.callback(event);
  }
};


/**
 * @class Proxy is currently used as a mixin to provide an interface to RPCs
 */
var Proxy = function (connection) {
  this._connection = connection;
};
Proxy.prototype = {
  /**
   * Executes an RPC
   * @param {String} id Target object of the RPC
   * @param {String} method Target method of the RPC
   * @param {Array} args Arguments for the RPC
   */
  rpc: function (id, method, args) {
    this._connection.send({kind: 'rpc',
                           data: {topic: id,
                                  method: method,
                                  arguments: args}
                           });
  }
};


/**
 * @class Connection interface. **For documentation purposes only.**
 *
 * Do not instantiate this interface.
 */
var Connection = function () { };
Connection.prototype = {
  /**
   * Send an object over the wire.
   * @param {Object} obj A simple event or rpc object.
   */
  send: function (obj) { }
}


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
  arguments: []
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


/** Basic classes */

/**
 * @constructor
 */
var Device = function(kind, name, properties) {
  Evented.call(this, kind, name);
  if (!this._properties) {
    this._properties = {};
  }
  if (properties) {
    extend(this._properties, properties);
  }
};
inherit(Device, Evented);
/** @lends Device.prototype */
extend(Device.prototype, {
  properties: function () { return this._properties; },
  toDict: function () {
    var dict = Evented.prototype.toDict.call(this);
    dict.properties = this.properties();
    return dict;
  },
  getProperty: function (property) {
    if (this._properties[property] === undefined) {
      throw 'not a valid property: ' + property;
    }
    return this._properties[property];
  },
  setProperty: function (property, value) {
    if (this._properties[property] === undefined) {
      throw 'not a valid property: ' + property;
    }
    this._properties[property] = value;
    var event = {topic: ['property/' + property],
                 data: value};
    this.notifyListeners(event);
  }
});


/**
 * @constructor
 */
var Urb = function (kind, name) {
  Evented.apply(this, arguments);
  this._devices = [];
};
inherit(Urb, Evented);
/** @lends Urb.prototype */
extend(Urb.prototype, {
  devices: function () { return this._devices; },
  addDevice: function (device) {
    this._devices.push(device);
    
    // by default we're going to listen to all updates from the device
    device.addListener(this.deviceListener());
    this.notifyListeners({topic: ['urb/deviceAdded'],
                          data: device.toDict()});
  },
  removeDevice: function (device) {
    for (var i in this._devices) {
      if (this._devices[i] == device) {
        device.removeListener(this.deviceListener());
        this.notifyListeners({topic: ['urb/deviceRemoved'],
                              data: device.toDict()});
        this._devices.splice(i, 1);
        break;
      }
    }
  },
  /* returns the device listener singleton */
  deviceListener: function () {
    if (this._deviceListener === undefined) {
      var self = this;
      this._deviceListener = new Listener(/.*/,
                                          curry(this.notifyListeners, this));
    }
    return this._deviceListener; 
  }
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
};
inherit(DeviceProxy, Device);
extend(DeviceProxy.prototype, Proxy.prototype);
/** @lends DeviceProxy.prototype */
extend(DeviceProxy.prototype, {
  /**
   * Update internal state and notify listeners when receiving remote state.
   * @param {Object} event A simple event object.
   */
  onEvent: function (event) {
    var matcher = /property\/(.*)/;
    for (var i in event.topic) {
      var match = matcher.exec(event.topic[i]);
      if (match) {
        this._setProperty(match[1], event.data[match[1]]);
      }
    }
  },
  /**
   * Actually change the internal represenation and notify listeners
   * @see Device#setProperty
   * @private
   */
  _setProperty: function () {
    Device.prototype.setProperty.apply(this, arguments);
  },
  /**
   * Sends a setProperty RPC to the remote device.
   *
   * Note that the property will not actually be set until the remote
   * device has acknowledged the RPC and set its own property.
   *
   * @see Device#setProperty
   */
  setProperty: function () {
    this.rpc(this.id(), 'setProperty', arguments);
  }
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
};
inherit(UrbProxy, Urb);
extend(UrbProxy.prototype, Proxy.prototype);
/** @lends UrbProxy.prototype */
extend(UrbProxy.prototype, {
  /**
   * @params {Object} event {@link Event}
   */
  onEvent: function (event) {
    // pass
  }
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
  this._urb = null;
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
    this._urbs[proxy.id()] = proxy;
    this.addListener(new Listener(new RegExp(proxy.id()),
                                  curry(proxy.onEvent, proxy)));
    this.notifyListeners({topic: ['client/urb'],
                          data: proxy.id()});
  },
  /**
   * Event handler for Device events. Builds a DeviceProxy, notifies listeners.
   * 
   * Also makes sure that further events from the remote ApiServer are
   * forwarded to the DeviceProxy.
   *  
   * TODO(termie): I'd prefer for us to figure out the urb from somewhere
   *               that isn't in the device because in other circumstances
   *               there is no reason why the device would know which urb is
   *               holding on to it. This is easily remedied if we make things
   *               one urb per client but I am expecting to do access control
   *               at the urb level rather than the client level.
   *
   * @param {Object} device A serialized Device. {@link Device#toDict}
   */
  onDevice: function (device) {
    var proxy = new DeviceProxy(device.kind, 
                                device.name,
                                device.properties,
                                this);
    this._urbs[device.urb].addDevice(DeviceProxy);
    this.addListener(new Listener(new RegExp(proxy.id()),
                                  curry(proxy.onEvent, proxy)));
    this.notifyListeners({topic: ['client/device'],
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
  }
});


/** Server-side */

/**
 * @class ApiServer provides access to Urbs and their Devices
 * @extends Evented
 */
var ApiServer = function () {
  Evented.apply(this, arguments);
  this._clients = [];
  this._urbs = [];
  this.transport = null;
  this.addListener(this.serverListener());
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
  /**
   * Add an Urb to the list of Urbs brokered by the ApiServer.
   *
   * Notify existing clients of the new Urb and all of its Devices.
   *
   * @param {Urb} urb An Urb.
   */
  addUrb: function (urb) {
    urb.addListener(this.urbListener());
    this._urbs.push(urb);
    this.notifyClients({kind: 'urb',
                        data: urb.toDict()});
    
    var devices = urb.devices();
    for (var i in devices) {
      this.notifyClients({kind: 'device',
                          data: devices[i].toDict()});
    }
  },
  /**
   * Notifies listeners of the ApiServer on events from Urbs.
   * @return {Listener} A listener singleton for events from Urbs 
   */
  urbListener: function () {
    if (this._urbListener === undefined) {
      var self = this;
      this._urbListener = new Listener(/.*/, curry(this.notifyListeners, this));
    }
    return this._urbListener; 
  },
  /**
   * Notifies clients on events from the ApiServer.
   * @return {Listener} A listener singleton for events from the ApiServer 
   */
  serverListener: function () {
    if (this._serverListener === undefined) {
      var self = this;
      this._serverListener = new Listener(/.*/, curry(this.onEvent, this));
    }
    return this._serverListener; 
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
    this._clients.push(client);
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
      this.onRpc(message.data, client);
      this.notifyListeners({topic: ['server/rpc'], data: message.data});
    }
  },
  /**
   * When a remote client disconnects remove them and notify listeners.
   *
   * @param {ApiClientProxy} client A Proxy for a remote ApiClient.
   */
  onClientDisconnect: function (client) {
    for (var i in this._clients) {
      if (this._clients[i] == client) {
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
    for (var u in this._urbs) {
      var devices = this._urbs[u].devices();
      for (var d in devices) {
        if (rpc.id == devices[d].id()) {
          devices[d][rpc.method].apply(devices[d], rpc.arguments);
        }
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
};
inherit(DeviceServer, Evented);
/** @lends DeviceServer */
extend(DeviceServer.prototype, {
  /**
   * Initiate listening by the DeviceServer. To be implemented by subclasses.
   */
  listen: function(port, options) {
    // Not Implemented
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
                                this);
    this.addListener(new Listener(new RegExp(proxy.id()),
                                  curry(proxy.onEvent, proxy)));
    this._clients[client.id()].push(proxy);
    this.urb.addDevice(proxy);
    this.notifyListeners({topic: ['deviceserver/device'],
                          data: proxy.id()});
  },
  onEvent: function (event) {
    this.notifyListeners(event);
  },
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

exports.Device = Device;
exports.Urb = Urb;

exports.ExampleDevice = ExampleDevice;

exports.ApiServer = ApiServer;
//exports.WebServer = WebServer;
exports.DeviceServer = DeviceServer;

exports.ApiClient = ApiClient;
//exports.DeviceClient = DeviceClient;

exports.DeviceProxy = DeviceProxy;
exports.UrbProxy = UrbProxy;
//exports.ApiClientProxy = ApiClientProxy;
