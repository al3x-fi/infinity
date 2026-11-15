#!/bin/sh
# Post a team message that shows in every visitor's notification bell. Run this ON the server as root:
#   ./post-announcement.sh "Title" "Message text"
# To remove one, run:  ./post-announcement.sh --delete <id>   (ids come from https://infinity0.xyz/pf/announcements)
set -e
. /etc/infinity-profiles.env
if [ "$1" = "--delete" ]; then
  curl -s -X POST http://127.0.0.1:3101/internal/announcement-delete \
    -H 'content-type: application/json' -H "x-internal-token: $INTERNAL_TOKEN" \
    -d "{\"id\":\"$2\"}"
else
  node -e 'process.stdout.write(JSON.stringify({title:process.argv[1],body:process.argv[2]}))' "$1" "$2" |
  curl -s -X POST http://127.0.0.1:3101/internal/announcement \
    -H 'content-type: application/json' -H "x-internal-token: $INTERNAL_TOKEN" -d @-
fi
echo
