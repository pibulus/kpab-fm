#!/bin/bash
# Deploy KPAB.FM to Pi
# Usage: ./deploy.sh
#
# Requires: SSH key auth or sshpass configured externally
# Set PI_HOST to override the default target
# Canonical production path lives inside pibulus-os.

PI="${PI_HOST:-pibulus@pibulus.local}"
DEST="/home/pibulus/pibulus-os/www/html/kpab"

echo "Deploying to $PI:$DEST..."

ssh $PI "mkdir -p $DEST/css $DEST/js" 2>/dev/null

scp index.html $PI:$DEST/ &&
scp sw.js $PI:$DEST/ &&
scp manifest.json $PI:$DEST/ &&
scp offline.html $PI:$DEST/ &&
scp css/style.css $PI:$DEST/css/ &&
scp js/*.js $PI:$DEST/js/ &&
scp assets/icon-192.png $PI:$DEST/ &&
scp assets/icon-512.png $PI:$DEST/

if [ $? -eq 0 ]; then
  echo "Deployed!"
else
  echo "Deploy failed!"
  exit 1
fi
