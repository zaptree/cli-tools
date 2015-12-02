'use strict';

var colors = require('colors');
var _ = require('lodash');

var exec = require('child_process').execSync;

var containers = {
	'redis': {},
	'elasticsearch': {},
	'kafka': {
		containers:{
			'kafka': {},
			'kafka-rest': {}
		}
	},
	'mongod': {},
	'postgres': {},
};

function isRunning(containerName) {
	if(!containerExists(containerName)){
		return false;
	}
	var result = exec('docker inspect --format="{{ .State.Running }}" '+containerName).toString().trim();
	return result === 'true';
}

function containerExists(containerName){
	return getAllContainers().indexOf(containerName) > -1;
}

function getAllContainers() {
	var result = exec('docker ps -a').toString().trim();
	var rows = result.split(/\n/).slice(1);
	return _.map(rows, function(row){
		return row.match(/([^\s]+)$/)[1];
	});
}


module.exports = {
	kill: function (argv, containerName) {

		var containersToKill = [];

		if (!containerName && argv.all) {

			if(argv.force){
				containersToKill = getAllContainers();
			}else{
				_.each(containers, function(options,key){
					if(options.containers){
						containersToKill = containersToKill.concat(_.keys(options.containers));
					}else{
						containersToKill.push(key);
					}
				});
			}

		} else if (containerName && (containers[containerName] || argv.force)) {
			let options = containers[containerName];
			if(options && options.containers){
				containersToKill = containersToKill.concat(_.keys(options.containers));
			}else{
				containersToKill.push(containerName);
			}
		} else {
			console.error('Container '.red + containerName.yellow + ' is not a valid container'.red);
			return;
		}

		_.each(containersToKill, function(container){

			if(containerExists(container)){
				let result = exec('docker rm -f '+ container);
				console.log(result.toString().trim());
				console.log('Container '.green + container.yellow + ' killed/removed'.green);
			}else if(containerName){
				// we only show this error if a specific container was being killed
				console.error('Container '.red + containerName.yellow + ' does not exist'.red);
			}
		});


	},
	run: function (argv) {
		console.log(arguments);
		console.log('read json file and run whatever'.green);
	},
	start: function (argv, containerName) {
		// node . docker start kafka
		//console.log(containerName);
		//
		//var response = exec('docker ps');
		//console.log(response.toString());
		if (containers[containerName]) {
			console.log('kill one container');
		} else {
			console.error('Container '.red + containerName.yellow + ' is not a valid container'.red)
		}
	},
	restart: function(argv, containerName){
		this.kill.apply(this, arguments);
		this.start.apply(this, arguments);
	}
};

//if(docker.isRunning('postgres')){
//	console.log('postgres is running');
//}else{
//	console.log('postgres is NOT running');
//}
