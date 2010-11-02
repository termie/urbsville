==============================
Urbsville: An Urbanode Odyssey
==============================

Urbsville is the core implementation of the Urbanode project, its goal is world
domination by taking control over physical objects and handing the steering
wheel to web and system developers.

Designed around Node.js, Urbsville benefits from sharing nearly all of its
server-side code with the client-side, blurring the lines of reality itself.


Basic Usage
===========

For those of you who prefer to see code up front, this section is for you, else
skip on down to the Architecture heading.

------------------
The Default Server
------------------

If you were to look inside bin/urbsville you would see something that looks
similar to::

  // Our main container, it will be named "Hub/hub"
  var hub = new urb.Hub('hub');

  // Log all hub events to stdout
  hub.on('event', function (event) { console.log(event); });

  // Run an API Server named "ApiServer/sio" using the Socket-IO protocol
  var sioApiProtocol = new sioServer.SioServerProtocol(8001);
  var sioApiServer = new api.ApiServer('sio', sioApiProtocol, hub);

  // Run a Device Server named "DeviceServer/sio" using the Socket-IO protocol
  var sioDeviceProtocol = new sioServer.SioServerProtocol(8002);
  var sioDeviceServer = new device.DeviceServer('sio', sioDeviceProtocol, hub);

  // Announce our web server via mDNS
  // NOTE(termie): this currently expects nginx to serve the static content
  var ad = mdns.createAdvertisement('urbanode-web', 8000);

  sioApiServer.listen();
  sioDeviceServer.listen();
  ad.start();

Most of those lines are fairly self explanatory, running this leaves you with
an empty hub waiting for devices to connect to the Device Server at which point
they will be accessible via an API Server. It also announces its location on
the network.

------------------
A Basic API Client
------------------

The most common client of Urbsville is probably a Socket-IO API client being
accessed via a web page (one that shows a totally sweet interface for
exercising your dominance over the physical realm).

Urbsville makes significant use of Dojo Toolkit for Javascripty stuff, but if
you are a jQuery person you should be able to mostly ignore that as they play
together.

Using the directory structure in the project you'll end up with::

  <script src="/public/dojo/dojo.js"></script>
  <script src="/public/js/socket.io.js"></script>
  <script>io.setPath('/public/js/');</script>
  <script src="/public/js/urb.js"></script>
  <script>
  
  // "require" emulates the Node.js require function using Dojo  
  var sioClient = require('urb/protocol/sioClient');
  var api = require('urb/api');

  var hostname = window.location.hostname;

  var protocol = new sioClient.sioClient.SioClientProtocol(
    hostname, {port: 8001}
  );

  var client = new api.ApiClient('admin', protocol);

  function newDevice(device) {
    // do something cool with the device, hook it up to some ui
  }

  client.on('hubAdded', function (hub) {
    var devices = hub.devices();
    for (var d in devices) {
      newDevice(devices[d]);
    }
    hub.on('deviceAdded', function (device) {
      newDevice(device);
    });
  });

  // or $(document).ready(...) for jQuery types
  dojo.addOnLoad(function () { clent.connect() });
  </script>

This sets up an API client using the Socket-IO protocol and demonstrates the
basic events one should be handling to generate your UI.

-----------------------------
So I Have A Device, Now What?
-----------------------------

Devices have a very simple API, they act as EventEmitters in the Node.js sense
and they are basically just a set of modifiable properties.

Suppose you had a Device that represents a basic colored light and you wanted
to make the background of some element change whenever the light's color
changes::

  var light = new ColoredLightDevice('ambientRoom');

  function setBackgroundColor() { ... }

  // listen for changes to the rgb property  
  light.on('property/rgb', function (newRgb) {
    setBackgroundColor(newRgb);
  });
  
  // change the rgb property
  light.set('rgb', [255, 200, 100]);
  

Other types of devices might be event-only, like a sensor, but they operate the
same way::

  var reader = new RfidDevice('badgeReader');

  reader.on('rfidAdded', function (rfidObject) {
    // do something flashy
  });


And they can be easily hooked together to form all sorts of wonderful things::

  reader.on('rfidAdded', function (rfidObject) {
    light.set('rgb', [255, 0, 0]);
  });

  reader.on('rfidRemoved', function (rfidObject) {
    light.set('rgb', [0, 0, 0]);
  }


Architecture
============

Urbsville is designed to allow a few styles of interactions: self-contained,
device control and device publishing. While going through those we'll expand
the components of the system and how they relate to each style of interaction.


--------------------
Being Self-Contained
--------------------

With Devices and Hubs, Urbsville has enough to operate as a self-contained
device controller, meaning it doesn't provide any interfaces to interact with
the system it just listens for events from Devices and responds accordingly
allowing the developer to script their environment with Javascript.

For many simple art installations this is as far as you need go.


The Device
----------

It's why we're all here. A Device represents the basic abstract building block
for manipulating objects in Urbsville. Whichever path you go down to the actual
physical object, be it talking to a serial port, over a proprietary network 
protocol or even via http, the Device is the interface that physical object is
providing to the world through properties and events.

Devices, like pretty much everything else in Urbsville are EventEmitters,
normal interaction with them involves listening for named events and setting
properties that trigger changes that trigger events.

See "So I Have A Device, Now What?" above for an example.


The Hub
-------

A Hub is also an EventEmitter, its main purpose is to keep track of Devices.
Hubs also provide a way to interact with all the Devices tracked by it in
aggregate by forwarding events emitted by them to its own listeners.

Common practice is to have just one Hub to track all of your Devices.


-------------------------
Being A Device Controller
-------------------------

The goal of a device controller is to provide an interface to allow a remote
controller (usually a user) to actively manipulate the Devices tracked by a
Hub. Using the ApiServer on the server-side wrapping a Hub and the ApiClient
on the client-side providing a Proxy this is readily accomplished over any
given transport protocol.


The API Server
--------------

The ApiServer is the Hub's main face to the world, it provides an interface for
remotely interacting with the Devices tracked by a Hub via a transport
protocol, e.g. Socket-IO or TCP. 

Clients connecting to the ApiServer will initially be given the current state
of the system as a serialized dump of the Hub and its Devices, thereafter any
events from the Hub or its Devices will be passed along to the client.


The API Client
--------------

The ApiClient creates a local representation of a Hub and the Devices being
provided via the ApiServer over a transport protocol and allows them to be
interacted with via proxy instances.


The Proxy
---------

There are actually two types of Proxy, DeviceProxy and HubProxy, but they are
effectively the same, both are simply intended to act exactly like their
non-proxy counterpart but to forward write actions across a network boundary
and to replay events received over that boundary.

Proxies are built behind the scenes by, for example, the ApiClient once it
receives the information about a Hub and its Devices from the server. From
then on information originating from the Device or Hub being proxied will be
replayed for listeners on the client side and any properties being set on the
client side will result in an RPC to actually set it on the server side.


------------------------
Being A Device Publisher
------------------------

Here's where things twist around a bit. The goal of a device publisher is to
allow remote devices to publish themselves via a local Hub which may in turn
allow other activities to control them. This is accomplished by the DeviceServer
proxying devices provided by a DeviceClient.

Being both a Device Controller and Device Publisher presents many opportunities
for organic environment monitoring and control.


The Device Server
-----------------

The DeviceServer allows remote devices to be tracked by the local Hub via a
transport protocol.

Clients connecting to the DeviceServer are expected to provide a serialized
Device at which point a DeviceProxy will be built by the DeviceServer and added
to the Hub. As with all proxies, events generated by the original device (this
time on the client side) will be replayed by the local proxy and actions taken
will result in RPCs.


The Device Client
-----------------

The DeviceClient wraps a local Device and provides it to a server via a
transport protocol.


==================
Building / Running
==================

Urbsville relies on a decent number of external tools and libraries, some stuff
you will need:

 * Node 2.3+ http://nodejs.org/
 * a standard build environment (make, gcc, that sort of stuff)
 * To use the provided nginx config for the demo, you will need nginx http://nginx.org/
 * To use the DMX utilities you'll need OLAD http://www.opendmx.net/index.php/Open_Lighting_Architecture

If everything is in order, cloning the repo and running `make` should get you
set up.


====
TODO
====

There is a ton of stuff to do to make Urbsville fitter, happier and more
productive. Here's a short list:

 * Make it installable (maybe npm?)
 * Command-line arguments for the urbsville script.
 * mDNS-enabled DeviceClient example (to automatically provide a device to
   any DeviceServers on the network)
 * More services advertised over mDNS.
 * Static file serving with Node for simple demos and small projects.
 * More device types.
 * More specific device implementations.
 * Default html representations of devices.

