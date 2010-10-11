var dojo = require('dojo');

var urb_pipe = require('urb/pipe');
var net = require('urb/net');

dojo.provide('urb.dmx');

var DmxUniverse = dojo.declare('DmxUniverse', net.Client, {
  constructor: function (universe, protocol, defaults) {
    this.universe = universe;
    this.ports = new Array(512);
    this._pipes = new Array(512);
    for (var i = 0; i < 512; i++) {
      this.ports[i] = 0;
    }
    if (defaults) {
      for (var p in defaults) {
        this.ports[p] = defaults[p];
      }
    }
    this._defaultPipeFactory = urb_pipe.ScalingPipe.newFactory(255);
  },
  update: function () {
    this.send({'universe': this.universe,
               'ports': this.ports})
  },
  attachDevice: function (device, ports) {
    for (var i in ports) {
      var port = ports[i][0];
      var property = ports[i][1];
      var pipeFactory = ports[i][2];
      if (!pipeFactory) {
        pipeFactory = this._defaultPipeFactory
      }

      if (this._pipes[port]) {
        throw Error('Two properties cannot be connected to the same port');
      }
      

      var pipe = pipeFactory.call(null,
                                  [device, 'property/' + property],
                                  [this, port]);
      // set the current values
      pipe.set(property, device.get(property));

      this._pipes[port] = pipe;
      pipe.attach();
      
      

    }
  },
  set: function (port, value) {
    this.ports[port] = value;
  }
});

exports.DmxUniverse = DmxUniverse;
