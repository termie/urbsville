var dojo = require('dojo');

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

exports.Pipe = Pipe;
exports.ScalingPipe = ScalingPipe;
