#!/bin/sh

cd ../../out/music-web

zip -r music-web.zip *

curl -H "Authorization: Bearer $NETLIFY_API_KEY" \
     -H "Content-Type: application/zip" \
     -X POST \
     --data-binary "@music-web.zip" \
     https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/builds
