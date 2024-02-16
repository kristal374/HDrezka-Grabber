#!/usr/bin/env bash

set -e
echo "*** HDrezka-Grabber: run building packages $(date +"%Y-%m-%d %H:%M:%S") ***"
echo ""

echo "HDrezka-Grabber.build: npm run build"
npm run build # --silent

echo "HDrezka-Grabber.build: building done."
echo ""

PLATFORM="platform"
for subdirectory in "$PLATFORM"/*; do
 bash "$subdirectory"/make.sh
done

rm -rf dist/build/HDrezka-Grabber.build
echo "*** HDrezka-Grabber: building of all packages was successful $(date +"%Y-%m-%d %H:%M:%S") ***"
