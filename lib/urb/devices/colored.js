
var dojo = require('dojo');
var core = require('urb/core');

dojo.provide('urb.devices.colored');

var CmykDevice = dojo.declare('CmykDevice', core.Device, {
  constructor: function (name, defaults) {
    var basicProps = {'cyan': 0,
                      'magenta': 0,
                      'yellow': 0,
                      'key': 0,
                      'rgb': [0, 0, 0],
                      'cmyk': [0, 0, 0, 0],
                      'rgbhex': '#000000'
                      }
    dojo.mixin(this._properties, basicProps, defaults);
  },
  set_cyan: function (value) { this._setAndNotify('cyan', value); },
  set_magenta: function (value) { this._setAndNotify('magenta', value); },
  set_yellow: function (value) { this._setAndNotify('yellow', value); },
  set_key: function (value) { this._setAndNotify('key', value); },
  _setAndNotify: function (key, value) {
    var props = {};
    props[key] = value;
    this._setProperties(props);
    try {
    this._notifyColors();
    } catch (e) { 
      console.log(e);
    }
  },
  _notifyColors: function () {
    var combined = {};
    combined['rgb'] = this.get('rgb');
    combined['cmyk'] = this.get('cmyk');
    combined['rgbhex'] = this.get('rgbhex');
    this._setProperties(combined);
  },
  get_rgb: function () {
    // calculate cmyk to rgb
    // this is notoriously inaccurate
    var c = this.get('cyan');
    var m = this.get('magenta');
    var y = this.get('yellow');
    var k = this.get('key');
    var r = 1 - ((c + k) / 1);
    var g = 1 - ((m + k) / 1);
    var b = 1 - ((y + k) / 1);
    if (r < 0) r = 0;
    if (g < 0) g = 0;
    if (b < 0) b = 0;
    return [r, g, b];
  },
  set_rgb: function (value) {
    var c = 1 - value[0];
    var m = 1 - value[1];
    var y = 1 - value[2];

    var k = Math.min(c, m, y);

    var props = {};
    props['key'] = k;
    props['cyan'] = c - k;
    props['magenta'] = m - k;
    props['yellow'] = y - k;
    this._setProperties(props);
    this._notifyColors();
  },
  set_rgbhex: function (value) {
    var r = parseInt(value.substr(1, 2), 16) / 255;
    var g = parseInt(value.substr(3, 2), 16) / 255;
    var b = parseInt(value.substr(5, 2), 16) / 255;
    this.set('rgb', [r, g, b]);
  },
  get_rgbhex: function () {
    var rgb = this.get('rgb');
    var r = Math.floor(rgb[0] * 255).toString(16);
    var g = Math.floor(rgb[1] * 255).toString(16);
    var b = Math.floor(rgb[2] * 255).toString(16);

    if (r.length < 2) r = '0' + r;
    if (g.length < 2) g = '0' + g;
    if (b.length < 2) b = '0' + b;
    return '#' + r + g + b
  },
  get_cmyk: function () {
    return [this.get('cyan'),
            this.get('magenta'),
            this.get('yellow'),
            this.get('key')];
  }
});

exports.CmykDevice = CmykDevice;
