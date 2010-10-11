var dojo = require('dojo');
dojo.provide('urb.pipe');

var Pipe = dojo.declare('Pipe', null, {
  constructor: function (input, output) {
    /**
     * input = [Instance, 'property'],
     * output = [Instance, 'property']
     */
    this.input = input;
    this.output = output;
    this._propertyListener = null;
  },
  attach: function () {
    var listener = this.propertyListener();
    this.input[0].on(this.input[1], listener);
  },
  detach: function () {
    this.input[0].removeListener(this.input[1], this.propertyListener());
  },
  propertyListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = dojo.hitch(this, this._handle);
    }
    return this._propertyListener;
  },
  transformInput: function (input) {
    /**
     * overwrite me in subclasses
     */
    return input;
  },
  _handle: function (data) {
    this.set(null, data);
  },
  set: function (_ignored, data) {
    var transformed = this.transformInput(data);
    this.output[0].set(this.output[1], transformed);
  }
});
Pipe.newFactory = function () {
  return function (input, output) {
    return new Pipe(input, output);
  }
}

var ScalingPipe = dojo.declare('ScalingPipe', Pipe, {
  constructor: function (input, output, scale) {
    this.scale = scale;
  },
  transformInput: function (input) {
    var input = parseFloat(input);
    return parseInt(input * this.scale);
  },
});
ScalingPipe.newFactory = function (scale) {
  return function (input, output) {
    return new ScalingPipe(input, output, scale);
  };
};

exports.Pipe = Pipe;
exports.ScalingPipe = ScalingPipe;
