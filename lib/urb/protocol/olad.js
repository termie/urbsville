var dojo = require('dojo');

var http = require('http');
var net = require('urb/net');

dojo.provide('urb.protocol.olad');

var OladClientProtocol = dojo.declare('OladClientProtocol', net.ClientProtocol, {
  constructor: function (host, port) {
    this.host = host || 'localhost';
    this.port = port || 9090;
  },
  send: function (message) {
    if (typeof message.universe == undefined || !message.ports) {
      throw 'OladClientProtocol only speaks DMXish stuff'
    }
    postData = 'u=' + message.universe + '&' + 'd=' + message.ports.join(',');
    console.log(postData);
    var self = this;
    var olad = http.createClient(this.port, this.host);
    var request = olad.request('POST',
                               '/set_dmx',
                               {'host': this.host,
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Content-Length': postData.length,
                                });
    request.on('response', function (response) {
      console.log('STATUS: ' + response.statusCode);
      console.log('HEADERS: ' + JSON.stringify(response.headers));
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
        self.emit('message', chunk);
      });
    });

    request.end(postData);
  }    

});
exports.OladClientProtocol = OladClientProtocol;

