#!/usr/bin/env bash

set -e
echo "*** HDreazka-Grabber: run bulding packages ***"
echo ""

PLATFORM="platform"
for subdirectory in "$PLATFORM"/*; do
 bash "$subdirectory"/make.sh
done

echo "*** HDrezka-Grabber: buiding of all packages was successful ***"
