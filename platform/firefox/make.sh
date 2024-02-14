#!/usr/bin/env bash

set -e
echo "HDrezka-Grabber.firefox: run build package"

DES=dist/build/HDrezka-Grabber.firefox
rm -rf $DES
mkdir -p $DES

echo "HDrezka-Grabber.firefox: copying common files"
cp -r src/* $DES
cp LICENSE.md $DES

echo "HDrezka-Grabber.firefox: copy firefox-specific files"
cp platform/firefox/manifest.json $DES

echo "HDrezka-Grabber.firefox: generate meta"
python3 dist/make-meta.py $DES

echo "HDrezka-Grabber.firefox: Creating package"
pushd $(dirname $DES/) > /dev/null
zip HDrezka-Grabber.firefox.xpi -qr $(basename $DES/)*
popd > /dev/null

echo "HDrezka-Grabber.firefox: Package done."
echo ""

