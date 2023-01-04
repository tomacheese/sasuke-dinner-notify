#!/bin/sh

while :
do
  yarn start || true

  echo "Waiting 10 minutes before restarting..."
  sleep 600
done