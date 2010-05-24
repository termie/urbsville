describe 'Device'
  describe 'listeners'
    it 'should add and remove listeners'
      var dev = new urb.Device('test');
      var listener = new urb.TopicListener({}, 'some_topic')
      dev.addListener(listener);
      dev.listeners.length.should.equal 1
      dev.removeListener(listener)
      dev.listeners.length.should.equal 0
    end
    it 'should notify listeners on state change'
      var dev = new urb.Device('test');
      var listener = new urb.TopicListener({send: function() {}}, 'some_topic')
      dev.addListener(listener);
      listener.should.receive('send', 'once')
      dev.notifyStateChange('test')
    end
  end
  it 'should have an id that includes its name'
    var devname = 'test'
    var dev = new urb.Device(devname)
    dev.id().indexOf(devname).should.be_greater_than -1
  end
end

describe 'Urb'
  it 'should listen for device changes'
    var dev = new urb.ToggleDevice('test')
    var urber = new urb.Urb([])
    dev.should.receive('addListener', 'once')
    urber.addDevice(dev)
  end
  it 'should propagate data from devices'
    var dev = new urb.Device('test')
    var listener = new urb.TopicListener({send: function() {}}, '.*')
    var urber = new urb.Urb([dev])
    urber.addListener(listener)
    listener.should.receive('send', 'once')
    dev.notifyStateChange('test')
  end
end
