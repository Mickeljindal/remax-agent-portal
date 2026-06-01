#!/usr/bin/env bash
for p in \
  "promos/flagship-agency-16x9.html" \
  "promos/social-leadgen-9x16.html" \
  "promos/social-leadgen-1x1.html" \
  "promos/social-leadgen-16x9.html" \
  "shared/brand.css" \
  "shared/engine.css" \
  "shared/engine.js"
do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8765/${p}")
  echo "${code}  ${p}"
done
