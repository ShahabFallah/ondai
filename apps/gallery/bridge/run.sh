#!/bin/sh
# Builds and starts the Ondai Mac bridge (Apple's on-device model for the iOS simulator). See main.swift.
set -e
cd "$(dirname "$0")"
mkdir -p .build
if [ ! -x .build/ondai-bridge ] || [ main.swift -nt .build/ondai-bridge ]; then
  echo "Building the Mac bridge…"
  swiftc -O main.swift -o .build/ondai-bridge
fi
exec ./.build/ondai-bridge
