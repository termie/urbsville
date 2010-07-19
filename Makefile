jsl=jsl

build: third_party/node-unittest/README.rst third_party/node_mDNS/binding.node public/js/socket.io.js

third_party/node_mDNS/binding.node: 
	cd third_party/node_mDNS && node-waf configure build

public/js/socket.io.js: third_party/Socket.IO/socket.io.js
	ln -f third_party/Socket.IO/socket.io.js public/js

third_party/Socket.IO/socket.io.js:
	cd third_party/Socket.IO && node build.js

# this is just a target to make sure that we have checked out submodules
third_party/node-unittest/README.rst:
	git submodule update --init --recursive

test: build
	node run_tests.js

lint: test
	$(jsl) -process public/js/*.js -process lib/*.js
