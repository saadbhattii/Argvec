#!/bin/sh
# Builds the website into dist/: runs the tests, then copies only the files the
# site needs. Cloudflare Pages runs this before every deploy, so a failing test
# stops the deploy. Run it locally with: sh scripts/build.sh
set -e
cd "$(dirname "$0")/.."

node tests/run.js

rm -rf dist
mkdir dist
cp index.html dist/
cp -R assets dist/
echo "Built dist/:"
find dist -type f | sort
