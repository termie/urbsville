var SimpleDevice = function (name, properties) {
  this._properties = {'on': 0};
  Device.call(this, 'SimpleDevice', name, properties);
};
inherit(SimpleDevice, Device);

var ColoredLightDevice = function (name, properties) {
  this._properties = {'red': 0,
                      'green': 0,
                      'blue': 0,
                      'brightness': 0}
  Device.call(this, 'ColoredLightDevice', name, properties);
};
inherit(ColoredLightDevice, Device);
extend(ColoredLightDevice.prototype, {
  get_color: function () {
    return [this.get('red'),
            this.get('green'),
            this.get('blue'),
            this.get('brightness')];
  },
  set_color: function (color) {
    // TODO(termie): it would be great to make this atomic
    this.set('red', color[0]);
    this.set('green', color[1]);
    this.set('blue', color[2]);
    this.set('brightness', color[3]);
  }
});
