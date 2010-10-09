
Basic Usage
===========

::
  
  var transport = new SocketIoClientTransport('localhost', {port: 8001});
  var client = new ApiCLient('testClient', transport);

  client.on('urbAdded', function (urb) {
    urb.on('deviceAdded', function (device) {
      // notify about new devices
    });
  });

  client.connect();
