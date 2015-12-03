#!/usr/bin/env bash

#postgres://postgres:postgres@192.168.59.103:5432/ua
#postgres://postgres:postgres@boot2docker:5432/ua

#set container name
POSTGRES=postgres

# create postgres database
function createDatabase() {
	docker exec $1 yum -y install postgresql-contrib
	docker exec $1 psql -U postgres -c "CREATE DATABASE $2" && echo "Database created!"
	docker exec $1 psql -d $2 -U postgres -c 'CREATE EXTENSION "uuid-ossp"' && echo "uuid-ossp installed in database!"
}

createDatabase $POSTGRES $1

for i in ${@:2} ; do


	#match the path and file name for yaml file (BASH_REMATCH array has regex results)
	[[ $i =~ (.*)/([^/]+)$ ]]

	MIGRATION_FILE=${BASH_REMATCH[2]}
	SQL_URL="jdbc:postgresql://postgresql:5432/$1"
	SQL_USER="postgres"
	SQL_PASS="postgres"

	SCHEMA_DIR=${BASH_REMATCH[1]}


	echo "Running $MIGRATION_FILE migration on $SQL_URL as user $SQL_USER"
	docker run --rm -ti -v $SCHEMA_DIR:/schema -w /schema \
			--link $POSTGRES:postgresql \
			docker-artifacts.ua-ecm.com/liquibase:latest \
			--driver=org.postgresql.Driver \
			--logLevel=info \
			--changeLogFile=$MIGRATION_FILE \
			--url=$SQL_URL \
			--username=$SQL_USER \
			--password=$SQL_PASS migrate
done
