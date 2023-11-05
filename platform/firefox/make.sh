#!/usr/bin/env bash

set -e
echo "HDreazka-Grabber.firefox: run build package"

DES=dist/build/HDrezka-Grabber.firefox
rm -rf $DES
mkdir -p $DES

echo "HDreazka-Grabber.firefox: copying common files" 
cp -r src/* $DES
cp LICENSE.md $DES

echo "HDreazka-Grabber.firefox: copy firefox-specific files"
cp platform/firefox/manifest.json $DES

echo "HDreazka-Grabber.firefox: generate meta"
python3 dist/make-meta.py $DES

echo "HDreazka-Grabber.firefox: Creating package"
pushd $(dirname $DES/) > /dev/null
zip HDrezka-Grabber.firefox.xpi -qr $(basename $DES/)*
popd > /dev/null

echo "HDreazka-Grabber.firefox: Package done."
echo ""

