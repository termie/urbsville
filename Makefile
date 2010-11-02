jsl=jsl
jsdoc=tools/jsdoc-toolkit

build: third_party/node-unittest/README.rst \
       third_party/node_mdns/lib/binding.node \
       public/Socket.IO/socket.io.js \
       public/js/jquery.js \
       public/js/dojo.js \
       public/farbtastic/farbtastic.js

third_party/node_mdns/lib/binding.node: 
	cd third_party/node_mdns && node-waf configure build

public/Socket.IO/socket.io.js: third_party/Socket.IO/socket.io.js
	ln -sF $(PWD)/third_party/Socket.IO public/Socket.IO

public/js/jquery.js:
	ln -sf $(PWD)/third_party/jquery-1.4.3.min.js public/js/jquery.js

public/js/dojo.js:
	ln -sf $(PWD)/third_party/dojo.js public/js/dojo.js

public/farbtastic/farbtastic.js: third_party/farbtastic/farbtastic.js
	ln -sF $(PWD)/third_party/farbtastic public/farbtastic

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
	
