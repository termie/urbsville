

var BrowserDevice = dojo.declare('BrowserDevice', Device, {
  constructor: function (name, defaults) {
    this.on('property/bgcolor', this.bgcolorListener());
  },
  _properties: {'bgcolor': '#000000'},
  bgcolorListener: function () {
    if (!this._propertyListener) {
      this._propertyListener = dojo.hitch(this, this.onBgcolorChanged);
    }
    return this._propertyListener;
  },
  onBgcolorChanged: function (bgcolor) {
    document.body.style.backgroundColor = bgcolor;
  }
});
