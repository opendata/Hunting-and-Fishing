#!/bin/sh

# Validate that the JSON is well-formed.
find schemas -type f -exec jsonlint -q '{}' +
find hunting -type f -exec jsonlint -q '{}' +
find fishing -type f -exec jsonlint -q '{}' +

# Validate all hunting and fishing JSON against their respective schemas.
find hunting -type f -exec jsonlint -q -V=schemas/1.0a/hunting.json '{}' +
find fishing -type f -exec jsonlint -q -V=schemas/1.0a/fishing.json '{}' +
