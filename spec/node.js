require.paths.unshift('./third_party/express/lib/')
require.paths.unshift('./third_party/node_mDNS/')
require.paths.unshift('./third_party/node_ws/')
require.paths.unshift('spec', 'lib', 'spec/lib')
require("jspec")
require("express")
//require("express/spec")

urb = require("urb");

print = require('sys').puts
quit = process.exit
readFile = require('fs').readFileSync

function run(specs) {
  specs.forEach(function(spec){
    JSpec.exec('spec/spec.' + spec + '.js')
  })
}


specs = {
  independent: [
    'core',
    ]
}

switch (process.ARGV[2]) {
  case 'all':
    run(specs.independent)
    break
  default: 
    run([process.ARGV[2]])
}

JSpec.run({ reporter: JSpec.reporters.Terminal, failuresOnly: true }).report()
