#!/usr/bin/env bash

set -e
echo "HDreazka-Grabber.chromium: run build package"

DES=dist/build/HDrezka-Grabber.chromium
rm -rf $DES
mkdir -p $DES

echo "HDreazka-Grabber.chromium: copying common files" 
cp -r src/* $DES
cp LICENSE.md $DES

echo "HDreazka-Grabber.chromium: copy chromium-specific files"
cp platform/chromium/manifest.json $DES

echo "HDreazka-Grabber.chromium: generate meta"
python3 dist/make-meta.py $DES

echo "HDreazka-Grabber.chromium: Creating package"
pushd $(dirname $DES/) > /dev/null
zip HDrezka-Grabber.chromium.zip -qr $(basename $DES/)*
popd > /dev/null

echo "HDreazka-Grabber.chromium: Package done."
echo ""