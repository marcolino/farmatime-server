#!/usr/bin/env bash
#
# Upload new local secrets to github

GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' .env | cut -d= -f2- | xargs)

echo -ne "$GITHUB_TOKEN" | gh auth login --with-token --git-protocol https
grep -v '^#' .env | grep -v '^$' | grep -v '^GITHUB_' | while IFS='=' read -r key value; do gh secret set "$key" <<< "$value"; done