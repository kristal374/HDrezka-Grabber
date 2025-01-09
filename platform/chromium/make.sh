#!/usr/bin/env bash

set -e
echo "HDrezka-Grabber.chromium: run build package"

DES=dist/build/HDrezka-Grabber.chromium
rm -rf $DES
mkdir -p $DES

echo "HDrezka-Grabber.chromium: copying common files"
cp -r dist/build/HDrezka-Grabber.build/* $DES

all_requirements=(img _locales)
for path in ${all_requirements[*]}; do
  cp -r src/"$path" $DES
done
cp LICENSE.md $DES

echo "HDrezka-Grabber.chromium: copy chromium-specific files"
cp platform/chromium/manifest.json $DES

echo "HDrezka-Grabber.chromium: generate meta"
python dist/make-meta.py $DES

echo "HDrezka-Grabber.chromium: Creating package"
pushd "$(dirname $DES/)" > /dev/null
zip HDrezka-Grabber.chromium.zip -qr "$(basename $DES/)"*
popd > /dev/null

echo "HDrezka-Grabber.chromium: Package done."
echo ""
