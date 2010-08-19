
var BrowserDevice = function (name, properties) {
  this._properties = {'bgcolor': '#FFFFFF'};
  Device.call(this, 'BrowserDevice', name, properties);
  this.addListener(this.bgcolorListener());
};
inherit(BrowserDevice, Device);
extend(BrowserDevice.prototype, {
  bgcolorListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = new Listener(
        new RegExp('property/bgcolor'),
        curry(this.onBgcolorChanged, this));
    }
    return this._propertyListener;
  },
  onBgcolorChanged: function (event) {
    var newColor = event.data.bgcolor;
    document.body.style.backgroundColor = newColor;
  }
});
