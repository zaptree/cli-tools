#!/usr/bin/env bash

PKG="docker-artifacts.ua-ecm.com"

ELASTICSEARCH=$(docker run --name elasticsearch -p 9200:9200 -d $PKG/elasticsearch:1.7.1)
ELASTICSEARCH_TRIES=15

function isElasticSearchReady() {
	if [ $ELASTICSEARCH_TRIES -ge 0 ]; then
		ELASTICSEARCH_TRIES=$((ELASTICSEARCH_TRIES-1))
		docker exec $ELASTICSEARCH curl -s http://localhost:9200/ > /dev/null && echo "Elasticsearch Ready!"
	fi
}

until isElasticSearchReady; do
	sleep 1
done
