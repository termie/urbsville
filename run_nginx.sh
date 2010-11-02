#!/bin/sh
echo "Starting nginx. You won't see any output, just CTRL-C to exit."
nginx -c $PWD/etc/nginx/nginx.conf -p $PWD/
