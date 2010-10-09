var dojo = require('./_base/_loader/bootstrap')
dojo = dojo.mixin(dojo, require('./_base/lang'));
dojo = dojo.mixin(dojo, require('./_base/array'));
dojo = dojo.mixin(dojo, require('./_base/declare'));
dojo = dojo.mixin(dojo, require('./_base/Deferred'));

for (var k in dojo) {
  exports[k] = dojo[k];
}
