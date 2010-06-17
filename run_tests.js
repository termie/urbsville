require.paths.unshift('./third_party/express/lib/')
require.paths.unshift('./third_party/node_mDNS/')
require.paths.unshift('./third_party/node-unittest/lib')
require.paths.unshift('./third_party/node-jsmock/lib')
require.paths.unshift('./public/js');
require.paths.unshift('./lib')
require.paths.unshift('./tests')

var core_unittest = require('core_unittest');

for (k in core_unittest) {
  new core_unittest[k]().run();
}
