require.paths.unshift('./third_party/express/lib/')
require.paths.unshift('./third_party/node_mDNS/')
require.paths.unshift('./third_party/node_ws/')
require.paths.unshift('./lib')
require('express')
require('express/plugins')
var sys = require('sys')


var urb = require('urb')

// var Class imported by require('express')

/**
 * Each Urb has three main tasks:
 * 1. Connect up with all the Devices it has access to.
 * 2. Set up a web service to publish data about these Devices
 * 3. Announce itself on the local network
 */


configure(function(){
  set('root', __dirname),
  use(Static)
})

get('/', function () {
  this.render('index.html.ejs', {
    locals: {}
  })
});

var dev = new urb.ToggleDevice(0);

web = new urb.UrbWebSocket(new urb.Urb([dev]));
web.listen(8001);

setInterval(function () {
    sys.puts('toggle')
    dev.setState(!dev.state)
}, 1000);

run(8000)
