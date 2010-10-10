require.paths.unshift('./third_party/');
require.paths.unshift('./public/js');
require.paths.unshift('./third_party/node-dojo/');
require.paths.unshift('./third_party/node_mDNS/')
require.paths.unshift('./third_party/node-unittest/lib')
require.paths.unshift('./third_party/node-jsmock/lib')
require.paths.unshift('./lib')
require.paths.unshift('./tests')

var unittest = require('unittest');

//var core_unittest = require('core_unittest');
var device_unittest = require('device_unittest');
var deviceserver_unittest = require('deviceserver_unittest');
var evented_unittest = require('evented_unittest');
//var integration_test = require('integration_test');
var server_unittest = require('server_unittest');
//var tcptransport_test = require('tcptransport_test');

unittest.run([
  //core_unittest,
  device_unittest,
  deviceserver_unittest,
  evented_unittest,
  //integration_test,
  server_unittest,
  //tcptransport_test,
]);
