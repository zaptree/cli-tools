#!/usr/bin/env bash

PKG="docker-artifacts.ua-ecm.com"

POSTGRES=$(docker run -d -p 5432:5432 --name postgres docker-artifacts.ua-ecm.com/postgres | tail -n 1)
POSTGRES_TRIES=10

function isPostgresReady() {
	# shouldn't this conditional be in the until loop to prevent an endless loop
	if [ $POSTGRES_TRIES -ge 0 ]; then
		POSTGRES_TRIES=$((POSTGRES_TRIES-1))
		docker exec $POSTGRES /is_ready.sh > /dev/null && echo "Postgres Ready!"
	fi
}

#echo $(isPostgresReady)

## Wait for Postgres to be ready
until isPostgresReady; do
	sleep 1
done
