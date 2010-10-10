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

var proto = olad.OladClientProtocol();
var univ = dmx.DmxUniverse(0, proto);

process.on('uncaughtError', function (e) { console.log(e); });

univ.set(2, 60);
univ.update();
