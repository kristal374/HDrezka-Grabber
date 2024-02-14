#!/usr/bin/env bash

set -e
echo "*** HDrezka-Grabber: run building packages ***"
echo ""

PLATFORM="platform"
for subdirectory in "$PLATFORM"/*; do
 bash "$subdirectory"/make.sh
done

echo "*** HDrezka-Grabber: building of all packages was successful ***"
