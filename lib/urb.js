var sys = require('sys')
var mDNS = require('mDNS')
var ws = require('ws')

function update(array, args) {
  var arrayLength = array.length, length = args.length;
  while (length--) array[arrayLength + length] = args[length];
  return array;
}

function merge(array, args) {
  return update(array, args);
}
function curry(fn, scope) {
  var __method = fn;
  var scope = scope || window;
  var args = [];
  for (var i=2, len = arguments.length; i < len; ++i) {
      args.push(arguments[i]);
  };
  return function() {
    var a = update(args, arguments);
    return __method.apply(scope, a);
  }
}


var Device = new Class({
  kind: 'Device',
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
    return this.kind + '/' + this.name
  },
  notifyStateChange: function (change) {
    event = {'event': 'stateChange',
             'change': change,
             'topic': this.id() + '/' + change}
    for (x in this.listeners) {
      listener = this.listeners[x]
      listener.send(event)
    }
  } 
});

exports.Device = Device;

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

exports.ToggleDevice = ToggleDevice;


var Urb = new Class({
  constructor: function (devices) {
    this.devices = {}
    this.listeners = new Array();
    for (i in devices) {
      this.addDevice(devices[i])
    }
  },
  addDevice: function (device) {
    this.devices[device.id()] = device
    device.addListener({send: curry(this.onDeviceData, this, device)})
  },
  addListener: function (listener) {
    this.listeners.push(listener)
  },
  onDeviceData: function (device, data) {
    if (data['event'] == 'stateChange' || data['event'] == 'heartbeat') {
      for (i in this.listeners) {
        listener = this.listeners[i];
        if (data.topic.match(listener)) {
          listener.send(data);
        }
      }
    }
  },
});

exports.Urb = Urb

var UrbWebSocket = new Class({
  constructor: function (urb) {
    this.urb = urb
    this.clients = new Array()
    this.ws = ws.createServer(curry(function (websocket) {
      websocket.addListener('connect', curry(this.onWsConnect, this, websocket))
      websocket.addListener('close', curry(this.onWsClose, this, websocket))
    }, 
    this));
    this.listeners = new Array()
  },
  onWsConnect: function (websocket, resource) {
    // TODO(termie): check resource
    this.addClient(websocket)
  },
  onWsClose: function (websocket) {
    // pass
  },
  onClientData: function (client, data) {
    if (data['event'] == 'subscribe') {
      listener = new TopicListener(client, data['topic'])
      this.listeners.push(listener)
    } 
  },
  addClient: function (websocket) {
    client = new Client(websocket)
    this.clients.push(client)
    client.addListener(curry(this.onClientData, this, client))
  },
  removeClient: function (client) {
    //
  },
  listen: function (port) {
    this.ws.listen(port)
  },
});

exports.UrbWebSocket = UrbWebSocket


var TopicListener = new Class({
  constructor: function (client, topic) {
    this.client = client
    this.topic = new RegExp(topic)
  },
  match: function (topic) {
    if (this.topic.match(topic)) {
      return TRUE;
    }
  },
  send: function (event) {
    sys.puts('sending ' + event);
    this.client.send(event)
  }
});

exports.TopicListener = TopicListener;

var Client = new Class({
  constructor: function (websocket) {
    this.websocket = websocket
  },
  addListener: function (callback) {
    this.websocket.addListener('data', curry(this.onWsData, this, callback))
  },
  onWsData: function (callback, data) {
    sys.puts('onWsData: ' + data);
    parsed = JSON.parse(data)
    callback(data)
  },
  send: function (data) {
    self.websocket.write(JSON.stringify(data))
  }
});

exports.Client = Client;
