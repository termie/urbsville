dojo.registerModulePath('urb', '../urb')


// dojo namespace something something
urb = {};

// emulate commonJS require
function require(s) {
  console.log('requiring: ' + s);
  if (s == 'dojo') {
    return dojo;
  }

  var s = s.replace('/', '.');

  var parts = s.split('.').slice(1);
   
  
  if (parts.length == 1) {
    if (urb[parts[0]]) {
      console.log('returning ' + parts[0]);
      return urb[parts[0]];
    }
  } else if (parts.length == 2) {
    if (urb[parts[0]]) {
      if (urb[parts[0]][parts[1]]) {
        console.log('returning ' + parts[0] + '.' + parts[1]);
        return urb[parts[0]][parts[1]];
      }
    }
  }
  
  exports = {};
  dojo.require(s);
  
  if (parts.length == 1) {
    urb[parts[0]] = exports;
  } else if (parts.length == 2) {
    urb[parts[0]][parts[1]] = exports;
  }
  return exports;
}

var foo = require('urb.index');
console.log('index loaded');

