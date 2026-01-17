#!/bin/sh

while :
do
  yarn start

  # 再起動前に10分間待機
  echo "再起動前に10分間待機中..."
  sleep 600
done
