build:
	git submodule update --init --recursive
	cd third_party/node_mDNS && node-waf configure build

test:
	cd third_party/express && make test
