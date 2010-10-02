#!/bin/sh
BUILD=tmp
CHECKOUT=urbsville
rm -rf $BUILD
mkdir $BUILD
cd $BUILD
git clone git://github.com/termie/urbsville.git $CHECKOUT
cd $CHECKOUT
make test
