
var gCanvas;
var gScene;


var kLightZ = 0;
var kLightT = 'O';
var kBeamT = 'o';

function initThirdDee() {
  gCanvas = new JS3D('canvas', -20);
  gCanvas.matrix = identity();
  gCanvas.matrix = gCanvas.translate(gCanvas.width / 2, gCanvas.height / 2, -300);
  gScene = new Scene();
  
  //for (var x = -2; x <= 2; x++) {
  //  for (var y = -2; y <= 2; y++) {
  //    gScene.addLight(new Light(x * 100, y * 100, null));
  //  }
  //}
  gCanvas.matrix = gCanvas.rotateX(1);
  gCanvas.matrix = gCanvas.rotateZ(1);
  gCanvas.matrix = gCanvas.rotateY(0.2);

  gCanvas.paint();
  loop();
}

function loop() {
  gCanvas.matrix = gCanvas.rotateZ(0.005);
  gCanvas.paint();
  setTimeout("loop();", 30);
}


var Scene = function () {
  this.lights = [];
};

Scene.prototype.addLight = function (light) {
  this.lights.push(light);
  gCanvas.addPointRaw(light.point);
  for (var i in light.beam.points) {
    gCanvas.addPointRaw(light.beam.points[i]);
  }
}


var Beam = function (light) {
  var x = light.x;
  var y = light.y;
  var z = light.z;
  this.points = [];
  for (var i = 1; i < 10; i++) {
    this.points.push(new Point(x, y, z - i * 10, kBeamT));
  }
  this.setBrightness(0.0);
};
Beam.prototype.setColor = function (color) {
  for (var i in this.points) {
    this.points[i].setColor(color);
  }
}
Beam.prototype.setBrightness = function (brightness) {
  for (var i in this.points) {
    this.points[i].setBrightness(brightness);
  }
}

var Light = function (x, y, device) {
  this.device = device;
  this.x = x;
  this.y = y;
  this.z = kLightZ;
  //var m = identity();
  //var v = multV(m, x, y, kLightZ, 1);
  this.point = new Point(this.x, this.y, this.z, kLightT);
  this.beam = new Beam(this);
};
Light.prototype.setColor = function (color) {
  this.beam.setColor(color);
};
Light.prototype.setBrightness = function (brightness) {
  this.beam.setBrightness(brightness);
}

Point.prototype.setColor = function (color) {
  this.div.style.color = color;
};

Point.prototype.setBrightness = function (brightness) {
  this.div.style.opacity = brightness;
};


JS3D.prototype.addPointRaw = function (point) {
  this.points[this.points.length] = point;
  this.rField.appendChild(point.div);
  return point;
};
