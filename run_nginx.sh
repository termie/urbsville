#!/bin/sh
echo "Starting nginx. You won't see any output, just CTRL-C to exit."
nginx -c $PWD/nginx.conf -p $PWD/
