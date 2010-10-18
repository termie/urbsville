var dojo = require('dojo');
dojo.provide('urb.core');

var isArray = Array.isArray;

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
    if (this['get_' + property]) {
      return this['get_' + property].call(this);
    } else if (this._properties[property] === undefined) {
      this.emit('error', 'not a valid property: ' + property);
    }
    return this._properties[property];
  },
  set: function (property, value) {
    if (this['set_' + property]) {
      return this['set_' + property].call(this, value);
    } else if (this._properties[property] === undefined) {
      this.emit('error', 'not a valid property: ' + property);
    }
    var props = {};
    props[property] = value;
    this._setProperties(props);
  },
  _setProperties: function (props) {
    data = {properties: {}};
    for (var property in props) {
      var value = props[property];
      this._properties[property] = value;
      data['properties'][property] = value;
      this.emit('property/' + property, value);
    }
    this.emit('propertyChanged', data);
  },
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


exports.EventEmitter = EventEmitter;
exports.Meta = Meta;
exports.Device = Device;
exports.Urb = Urb;
