require.paths.unshift('./third_party/node_mdns/lib');

var sys = require('sys');
var mdns = require('mdns');

var browser = mdns.createBrowser('urbanode-web');
browser.on('serviceUp', function(info, flags) {
  sys.puts("Up: " + sys.inspect(info));
});
browser.on('serviceDown', function(info, flags) {
  sys.puts("Down: " + sys.inspect(info));
});
browser.start();

