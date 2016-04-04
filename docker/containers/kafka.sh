#!/usr/bin/env bash

PKG="docker-artifacts.ua-ecm.com"
DOCKER_IP=$(docker-machine ip default)

KAFKA=$(docker run -d --name kafka -p 9092:9092 -p 2181:2181 -e KAFKA_ADVERTISED_HOST_NAME=$DOCKER_IP $PKG/kafka:0.9.0.1 | tail -n 1)
KAFKA_TRIES=10

function createTopic() {
	ENTRY="/usr/local/kafka/bin/kafka-topics.sh"

	docker run              \
		--rm                \
		--link $1:container \
		--entrypoint $ENTRY \
			"docker-artifacts.ua-ecm.com/kafka:latest" \
				--zookeeper container  \
				--create               \
				--replication-factor 1 \
				--partitions $2        \
				--topic $3
}

function isKafkaReady() {
	if [ $KAFKA_TRIES -ge 0 ]; then
		KAFKA_TRIES=$((KAFKA_TRIES-1))
		docker exec $KAFKA /is_ready.sh > /dev/null && echo "Kafka Ready!"
	fi
}

# Wait for Kafka to be ready
until isKafkaReady; do
	sleep 1
done

KAFKA_REST=$(docker run -d                         \
				--name kafka-rest				   \
				-p 8082:8082					   \
				--link $KAFKA:zookeeper            \
				-e ZOOKEEPER_CONNECT=zookeeper     \
				-e CONSUMER_REQUEST_TIMEOUT_MS=100 \
				docker-artifacts.ua-ecm.com/kafka-rest:latest | tail -n 1)
KAFKA_REST_TRIES=10

function isKafkaRestReady() {
	if [ $KAFKA_REST_TRIES -ge 0 ]; then
		KAFKA_REST_TRIES=$((KAFKA_REST_TRIES-1))
		docker exec $KAFKA_REST /is_ready.sh > /dev/null && echo "Kafka Rest Ready!"
	fi
}

# Wait for Kafka to be ready
until isKafkaRestReady; do
	sleep 1
done
createTopic $KAFKA 1 test-topic
createTopic $KAFKA 1 contentBatch

# service-search
createTopic $KAFKA 1 productStyleUpdate

# service-product-pricing
#createTopic $KAFKA 1 sapAtpList
#createTopic $KAFKA 1 productUpdate
#createTopic $KAFKA 1 inventoryUpdate
#createTopic $KAFKA 1 testTopicSapAtpList
#createTopic $KAFKA 1 testProductUpdateConsumer
#createTopic $KAFKA 1 testTopicInventoryUpdate
#createTopic $KAFKA 1 productPriceChange
