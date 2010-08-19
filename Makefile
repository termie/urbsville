jsl=jsl
jsdoc=tools/jsdoc-toolkit

build: third_party/node-unittest/README.rst third_party/node_mDNS/binding.node public/js/socket.io.js public/js/jquery.js

third_party/node_mDNS/binding.node: 
	cd third_party/node_mDNS && node-waf configure build

public/js/socket.io.js: third_party/Socket.IO/socket.io.js
	ln -f third_party/Socket.IO/socket.io.js public/js

third_party/Socket.IO/socket.io.js:
	cd third_party/Socket.IO && node build.js

public/js/jquery.js: third_party/jquery/dist/jquery.js
	ln -f third_party/jquery/dist/jquery.js public/js

third_party/jquery/dist/jquery.js:
	cd third_party/jquery && make

# this is just a target to make sure that we have checked out submodules
third_party/node-unittest/README.rst:
	git submodule update --init --recursive

test: build
	node run_tests.js

lint:
	$(jsl) -process public/js/urb\*.js -process lib/\*.js -process tests/\*.js -nologo -nofilelisting

docs: $(jsdoc)
	java -Djsdoc.dir=$(jsdoc) -jar $(jsdoc)/jsrun.jar $(jsdoc)/app/run.js \
		-t=$(jsdoc)/templates/jsdoc ./lib public/js/urb*.js -d=jsdoc

$(jsdoc):
	svn checkout http://jsdoc-toolkit.googlecode.com/svn/tags/jsdoc_toolkit-2.4.0/jsdoc-toolkit $(jsdoc)
	
