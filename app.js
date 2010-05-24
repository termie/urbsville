require.paths.unshift('./third_party/express/lib/')
require.paths.unshift('./third_party/node_mDNS/')
require.paths.unshift('./third_party/node_ws/')
require('express')
var sys = require('sys')
var mDNS = require('mDNS')
var ws = require('ws')

// var Class imported by require('express')

/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */


var Device = new Class({
  constructor: function (name) {
    this.listeners = new Array();
    this.name = name;
  },
  addListener: function (listener) {
    this.listeners.push(listener)
  },
  removeListener: function (listener) {
    for (i in this.listeners) {
      if (this.listeners[i] == listener) {
        this.listeners.splice(i, 1)
        return
      }
    }
  },
  toString: function () {
    return '[' + this.kind + ' ' + this.name + ']'
  },
  id: function() {
    return this.kind + '.' + this.name
  },
  notifyStateChange: function (change) {
    event = {'event': 'stateChange',
             'change': change}
    for (x in this.listeners) {
      listener = this.listeners[x]
      listener.send({'event': 'stateChange',
                     'change': change})
    }
  } 
});


var ToggleDevice = Device.extend({
  kind: 'ToggleDevice',
  state: 0,
  setState: function (state) {
    if (state != 0 && state != 1) {
      throw 'Invalid state: ' + String(state)
    }
    this.state = state
    this.notifyStateChange({state: state})
  },
  toggle: function () {
    if (this.state == 1) {
      this.setState(0)
    } else {
      this.setState(1)
    }
  }
});

sys.puts(new ToggleDevice('0'));


var Urb = new Class({
  constructor: function (devices) {
    this.devices = {}
    for (i in devices) {
      this.addDevice(devices[i])
    }
  },
  addDevice: function (device) {
    this.devices[device.id()] = device
  },
  addListenerForDevice: function (deviceId, listener) {
    this.devices[deviceId].addListener(listener)
  }
});

var UrbWeb = new Class({
  constructor: function (urb) {
    this.urb = urb;
  },
  


});

