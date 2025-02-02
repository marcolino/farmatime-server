#!/usr/bin/env bash
# 
# Script to build .env.template: keep only keys, remove values

cat .env | sed 's/^\([^#][^=]*=\).*$/\1/' > .env.template || exit 1
exit 0