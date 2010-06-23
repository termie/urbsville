if (typeof exports === 'undefined') {
  exports = {};
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
    for (var i in arguments) {
      a.push(arguments[i]);
    }
    for (var j in args) {
      a.push(args[j]);
    }
    return __method.apply(self, a);
  };
}
exports.curry = curry;


function extend(obj1, obj2) {
  for (var k in obj2) {
    obj1[k] = obj2[k];
  }
}
exports.extend = extend;


function inherit(ctor, superCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = superCtor.prototype;
  ctor.prototype = new tempCtor();
  ctor.prototype.constructor = ctor;
}
exports.inherit = inherit;


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
exports.clone = clone;


/**
 * Base class for objects that send or receive events.
 * @param {String} kind Like a class identifier
 * @param {String} name A unique identifier for this object within its class
 * @constructor
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
        //sys.puts(this.id() + ' 3event.data: ' + newEvent.data);
        this._listeners[i].send(newEvent);
      }
    }
  }
};
exports.Evented = Evented;


var Device = function(kind, name, properties) {
  Evented.apply(this, arguments);
  if (!this._properties) {
    this._properties = {};
  }
  if (properties) {
    extend(this._properties, properties);
  }
};
inherit(Device, Evented);
extend(Device.prototype, {
  properties: function () { return this._properties; },
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
exports.Device = Device;


var DeviceProxy = function () {
  Device_.apply(this, arguments);
};
inherit(DeviceProxy, Device);
extend(DeviceProxy.prototype, {
  /* update internal state and notify listeners */
  onEvent: function (event) {
    var matcher = /property\/(.*)/;
    for (var i in event) {
      var match = matcher.exec(event[i]);
      if (match) {
        this._setProperty(match[1], event.data);
      }
    }
  },
  _setProperty: function () {
    Device.prototype.setProperty.apply(this, arguments);
  },
  /* tell the remote device to setProperty */
  setProperty: function () {
    this._connection.send({kind: 'rpc',
                           topic: this.id(),
                           method: 'setProperty',
                           arguments: arguments});
  }
});
exports.DeviceProxy = DeviceProxy;


var ExampleDevice = function (name, properties) {
  Device.apply(this, ['ExampleDevice', name, properties]);
};
inherit(ExampleDevice, Device);
extend(ExampleDevice.prototype, {
  _properties: {'state': 0}
});
exports.ExampleDevice = ExampleDevice;


var Urb = function (kind, name) {
  Evented.apply(this, arguments);
  this._devices = [];
};
inherit(Urb, Evented);
extend(Urb.prototype, {
  devices: function () { return this._devices; },
  addDevice: function (device) {
    this._devices.push(device);
    
    // by default we're going to listen to all updates from the device
    device.addListener(this.deviceListener());
  },
  removeDevice: function (device) {
    for (var i in this._devices) {
      if (this._devices[i] == device) {
        device.removeListener(this.deviceListener());
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
exports.Urb = Urb;


var UrbProxy = function (kind, name, connection) {
  Urb.apply(this, arguments);
  this._connection = connection;
};
inherit(UrbProxy, Urb);
extend(UrbProxy.prototype, {
  onEvent: function (event) {
    // pass
  }
});
exports.UrbProxy = UrbProxy;


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
exports.Listener = Listener;


var ClientProxy = function () {
  Evented.apply(this, arguments);
  this._urbs = {};
};
inherit(ClientProxy, Evented);
extend(ClientProxy.prototype, {
  connect: function () {
  },
  onConnect: function () {
    this.notifyListeners({topic: ['client/connect'],
                          data: this.id()});
  },
  onDisconnect: function () {
    this.notifyListeners({topic: ['client/disconnect'],
                          data: this.id()});
  },
  onUrb: function (urb) {
    var proxy = new UrbProxy(urb.kind, urb.name, this);
    this._urbs[proxy.id()] = proxy;
    this.addListener(new Listener(new RegExp(proxy.id()),
                                  curry(proxy.onEvent, proxy)));
    this.notifyListeners({topic: ['client/urb'],
                          data: proxy.id()});
  },
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
  onEvent: function (event) {
    this.notifyListeners(event);
  },
  onMessage: function (message) {
    var msg = JSON.parse(message);
    if (msg.kind == 'urb') {
      this.onUrb(msg.data);
    } else if (msg.kind == 'device') {
      this.onDevice(msg.data);
    } else if (msg.kind == 'event') {
      this.onEvent(msg.data);
    }
  }
});
exports.ClientProxy = ClientProxy;


var Server = function () {
  Evented.apply(this, arguments);
  this._clients = [];
  this._urbs = [];
  this.addListener(this.serverListener());
};
inherit(Server, Evented);
extend(Server.prototype, {
  addUrb: function (urb) {
    urb.addListener(this.urbListener());
    this._urbs.push(urb);
    this.notifyClients({kind: 'urb',
                        data: urb.toDict()});
  },
  /* returns the urb listener singleton */
  urbListener: function () {
    if (this._urbListener === undefined) {
      var self = this;
      this._urbListener = new Listener(/.*/, curry(this.notifyListeners, this));
    }
    return this._urbListener; 
  },
  serverListener: function () {
    if (this._serverListener === undefined) {
      var self = this;
      this._serverListener = new Listener(/.*/, curry(this.onEvent, this));
    }
    return this._serverListener; 
  },
  notifyClients: function (message) {
    for (var i in this._clients) {
      this._clients[i].send(message);
    }
  },
  listen: function(port, options) {
    // Not Implemented
  },
  onClientConnect: function (client) {
    this._clients.push(client);
    this.notifyListeners({topic: ['server/clientConnect'],
                          data: client.id()});
  },
  onClientMessage: function (message, client) {
    var msg = JSON.parse(message);
    // at the moment only one kind of message is supported, rpc
    if (msg.kind == 'rpc') {
      this.notifyListeners({topic: ['server/rpc'], data: msg.data});
    }
  },
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
  onEvent: function (event) {
    this.notifyClients({kind: 'event', data: event});
  }
});
exports.Server = Server;



var DeviceServer = function () {
  
}


var Client = function () {
  Evented.apply(this, arguments);
};
inherit(Client, Evented);
extend(Client.prototype, {
  send: function (message) {
    // Not Implemented
  }
});
exports.Client = Client;
