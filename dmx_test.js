require.paths.unshift('./third_party/');
require.paths.unshift('./third_party/node-static/lib/');
require.paths.unshift('./third_party/node.routes.js/');
require.paths.unshift('./third_party/node_mDNS/');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./lib');


var dojo = require('dojo');
var dmx = require('urb/dmx');
var urb = require('urb');
var olad = require('urb/protocol/olad');
var pipe = require('urb/pipe');

var proto = olad.OladClientProtocol();

process.on('uncaughtError', function (e) { console.log(e); });

// Set up some example devices


// These port values will just be sent through as is, use it to set the
// ports that don't change
var defaultPorts = {1: 40}

var univ = dmx.DmxUniverse(0, proto, defaultPorts);

var dimmer = new urb.Device('dimmer', {brightness: 0});

var colored = new urb.Device('colored', {cyan: 0.7, magenta: 0.6, yellow: 0.1});

var movable = new urb.Device('movable', {cyan: 0.5,
                                         magenta: 0.8,
                                         yellow: 0.5,
                                         pan: 0.5,
                                         tilt: 0.2,
                                         someRawDefault: 38,
                                         anotherRawDefault: 22,
                                         });

// Dimmer is set brightness control to port 1, default scaling is 255
univ.attachDevice(dimmer, [[1, 'brightness']]);

univ.attachDevice(colored, [[12, 'cyan'],
                            [14, 'magenta'],
                            [16, 'yellow']
                            ]);

univ.attachDevice(movable, [[22, 'cyan'],
                            [24, 'magenta'],
                            [26, 'yellow'],
                            [28, 'pan'],
                            [29, 'tilt'],
                            [30, 'someRawDefault', pipe.Pipe.newFactory()],
                            [31, 'anotherRawDefault', pipe.Pipe.newFactory()]
                            ]);

dimmer.set('brightness', 0.8);


//univ.set(0, 50);
univ.update();

// Loop 40 times a second
var loop = function () {
  univ.update()
  setTimeout(loop, 1000 / 40);
}

//loop();
