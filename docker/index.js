'use strict';

/*
	todo: need to be able to add kafka topic but re-add them when it recreates the kafka container


 #!/bin/bash
 # Delete all containers
 docker rm $(docker ps -a -q)
 # Delete all images
 docker rmi $(docker images -q)
 */

var colors = require('colors');
var _ = require('lodash');

var exec = function (command, streamOutput) {
	return require('child_process').execSync(command, streamOutput ? {stdio: [0, 1, 2]} : undefined);
};

var PATH = require('path');
var containers = {
	'redis': {},
	'elasticsearch': {
		start: './containers/elasticsearch.sh'
	},
	'kafka': {
		start: './containers/kafka.sh',
		containers: {
			'kafka': {},
			'kafka-rest': {}
		}
	},
	'mongod': {},
	'postgres': {
		start: './containers/postgres.sh'
	}
};

function isRunning(containerName) {
	if (!containerExists(containerName)) {
		return false;
	}
	var result = exec('docker inspect --format="{{ .State.Running }}" ' + containerName).toString().trim();
	return result === 'true';
}

function containerExists(containerName) {
	return getAllContainers().indexOf(containerName) > -1;
}

function getAllContainers() {
	var result = exec('docker ps -a').toString().trim();
	var rows = result.split(/\n/).slice(1);
	return _.map(rows, function (row) {
		return row.match(/([^\s]+)$/)[1];
	});
}

function getPostgresDbs(postgresContainer) {
	postgresContainer = postgresContainer || 'postgres';

	var result = exec('docker exec ' + postgresContainer + ' psql -U postgres -lqt').toString().trim();

	return result.split(/\n/).reduce(function (result, row) {
		row = row.trim();
		var match = row.match(/^[^\s|]+/);
		if (match) {
			result.push(match[0]);
		}
		return result;
	}, []);
}


module.exports = {
	kill: function (argv, containerName) {

		var containersToKill = [];

		if (!containerName && argv.all) {

			if (argv.force) {
				containersToKill = getAllContainers();
			} else {
				_.each(containers, function (options, key) {
					if (options.containers) {
						containersToKill = containersToKill.concat(_.keys(options.containers));
					} else {
						containersToKill.push(key);
					}
				});
			}

		} else if (containerName && (containers[containerName] || argv.force)) {
			let options = containers[containerName];
			if (options && options.containers) {
				containersToKill = containersToKill.concat(_.keys(options.containers));
			} else {
				containersToKill.push(containerName);
			}
		} else {
			console.error('Container '.red + containerName.yellow + ' is not a valid container'.red);
			return;
		}

		_.each(containersToKill, function (container) {

			if (containerExists(container)) {
				exec('docker rm -f ' + container, true);
				console.log('Container '.green + container.yellow + ' killed/removed'.green);
			} else if (containerName) {
				// we only show this error if a specific container was being killed
				console.error('Container '.red + containerName.yellow + ' does not exist'.red);
			}
		});


	},
	run: function (argv, configPath) {
		//process.cwd()

		if (!configPath) {
			configPath = PATH.resolve(process.cwd(), 'docker.local.json');
		}

		var config = require(configPath);


		_.each(config.containers, function (options, containerName) {
			// if we are using the array format, containerName will be in options.name
			if(options.name && _.isNumber(containerName)){
				containerName = options.name;
			}
			if (this['run_' + containerName]) {
				return this['run_' + containerName](options, config, containerName);
			}
			var options = {
				force: options.force || options.reload
			};
			this.start(options, containerName)
		}.bind(this));
		//console.log(config);
		//console.log('read json file and run whatever'.green);
	},
	run_liquibase: function (options, config, containerName) {

		var scriptPath = PATH.resolve(__dirname, './containers/liquibase.sh');

		var dbName = options.db || 'ua';
		var imports = options.imports || ['./schema/init-tables.yaml'];

		imports = _.map(imports, function (importYaml) {
			return PATH.resolve(process.cwd(), importYaml);
		});

		if (!options.reload) {
			var dbs = getPostgresDbs();
			if (dbs.indexOf(dbName) > -1) {
				console.log('Container '.red + 'postgres'.yellow + ' already has a db '.red + ' ' + dbName.yellow + '. Use reload:true to override'.red);
				return;
			}
		}
		exec('bash ' + ([scriptPath, dbName].concat(imports)).join(' '), true);
		console.log('Container '.green+'liquibase'.yellow + ' successfully created db '.green + dbName.yellow);

	},
	run_custom: function(options, config, containerName){
		_.each(options.containers, function(container){
			if (!isRunning(container.name) || container.reload) {
				if (containerExists(container.name)) {
					this.kill({force: true}, container.name);
				}
				var ports = _.reduce(container.ports, function(result, val, key){
					return result + '-p ' + key + ':' + val + ' ';
				} ,'');

				var links = _.reduce(container.links, function(result, val, key){
					return result + '--link ' + key + ':' + val + ' ';
				} ,'');

				var cmd = `docker run -d --name ${container.name} ${ports} ${links} ${container.image}`;
				console.log(cmd);
				exec(cmd, true);
				console.log(container.name.yellow + ' successfully started'.green);
			} else {
				console.log('Container '.red + container.name.yellow + ' is already running'.red);
			}


		}.bind(this));

		// docker run --name service-product-data -p 58000:58000 --link kafka-rest:kafka-rest --link  docker-artifacts.ua-ecm.com/service-product-data:latest
		//console.log('Container '.green+'liquibase'.yellow + ' successfully created db '.green + dbName.yellow);

	},
	start: function (argv, containerName) {
		//fixme: add ability to start/restart only subcontainer i.e. "cli-tools docker start kafka.kafka-rest --force"

		var options = containers[containerName];
		if (options) {
			if (!isRunning(containerName) || argv.force) {
				if (containerExists(containerName)) {
					this.kill({force: true}, containerName);
				}

				if (options.start) {
					var scriptPath = PATH.resolve(__dirname, options.start);

					exec('bash ' + scriptPath, true);

					console.log(containerName.yellow + ' successfully started'.green);
				}

			} else {
				console.log('Container '.red + containerName.yellow + ' is already running'.red);
			}
		} else {
			console.error('Container '.red + containerName.yellow + ' is not a valid container'.red)
		}
	},
	logs: function(argv){
		console.log('I need to add functionality to tail all the logs from the different containers that are running');
	},
	restart: function (argv, containerName) {
		this.kill.apply(this, arguments);
		this.start.apply(this, arguments);
	}
};
