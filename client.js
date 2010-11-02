require.paths.unshift('./third_party/');
require.paths.unshift('./third_party/node_mdns/lib');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./lib');

var urb = require('urb');
var tcp = require('urb/protocol/tcp');
var api = require('urb/api');

var tcpApiProtocol = new tcp.TcpClientProtocol(9001, '127.0.0.1');
var tcpApiClient  = new api.ApiClient('tcp', tcpApiProtocol);

tcpApiClient.on('event', function (event) { console.log(event) });

tcpApiClient.connect();

//setInterval(function () {
//    if (dev.getProperty('state')) {
//      sys.puts('toggle -> 0');
//      dev.setProperty('state', 0);
//    } else {
//      sys.puts('toggle -> 1');
//      dev.setProperty('state', 1);
//    }
//}, 10000);
