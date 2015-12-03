#!/usr/bin/env bash

PKG="docker-artifacts.ua-ecm.com"

MONGO=$(docker run --name mongod -p 27017:27017 -d -e AUTH=no $PKG/mongodb:latest | tail -n 1)
MONGO_TRIES=10

function isMongoReady() {
	if [ $MONGO_TRIES -ge 0 ]; then
		MONGO_TRIES=$((MONGO_TRIES-1))
		docker exec $MONGO /is_ready.sh > /dev/null && echo "Mongo Ready!"
	fi
}
# Wait for Mongo to be ready
until isMongoReady; do
	sleep 1
done