
UrbEcho = function () { }
UrbEcho.prototype = new Hummingbird.WebSocket;
UrbEcho.prototype.webSocketURI = function () {
  wsServer = 'ws://' + document.location.hostname + ':8001';
  return wsServer;
}

UrbEcho.prototype.start = function () {
  if (!this.webSocketEnabled()) {
    console.log('heyaaa');
    return;
  }
  var wsServer = this.webSocketURI();
  var ws = new WebSocket(wsServer);
  this.ws = ws
  var self = this;

  ws.onmessage = function (evt) {
    console.log('evt.data' + evt.data);
    var data = JSON.parse(evt.data);
  }
  ws.onclose = function () { self.onclose(); }
  ws.onopen = function () { self.onopen(); }
}

UrbEcho.prototype.onopen = function () {
  this.setState("started");
  console.log("socket started");
  this.subscribe('.*');
};

UrbEcho.prototype.send = function (data) {
  this.ws.send(JSON.stringify(data));
}

UrbEcho.prototype.subscribe = function (topic) {
  var event = {'event': 'subscribe',
               'topic': topic}
  this.send(event)
}
