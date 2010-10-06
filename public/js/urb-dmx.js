var DmxUniverse = function (universe, defaults) {
  this.universe = universe;
  this.transport = null;
  this.ports = new Array(512);
  this._pipes = new Array(512);
  if (defaults) {
    for (var p in defaults) {
      this.ports[p] = defaults[p];
    }
  }
  this._defaultPipeFactory = ScalingPipe.newFactory(255);
}
DmxUniverse.prototype = {
  connect: function (transport) {
    this.transport = transport;
    this.transport.connect(this);
  },
  close: function () {
    this.transport.close();
    this.transport = null;
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
        throw 'Two properties cannot be connected to the same port';
      }

      var pipe = pipeFactory.call(null, [device, property], [this, port]);
      this._pipes[port] = pipe;
      pipe.attach();
    }
  },
  set: function (port, value) {
    this.ports[port] = value;
  }
};
