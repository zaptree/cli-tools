'use strict';

var fs = require('fs');
var path = require('path');

var argv = require('yargs').argv;
var colors = require('colors');

var helpTexts = {};

if(!argv._[0]){
	console.log('Available Modules:');
	console.log('cli-tools docker --help');
}else{

	var moduleName = argv._[0];
	var module;

	try{
		module = require('./'+moduleName);
	}catch(err){
		console.error('Failed to load module: '.red + argv._[0].yellow);
	}
	// if the module has a custom execute we just pass all execution to the module
	if(module.execute){
		var args = argv._.slice(1);
		args.unshift(argv);
		module.execute.apply(module, args);
	}else{
		let command = argv._[1];

		if(argv.help || !command){
			let text
			if(!helpTexts[moduleName]){
				helpTexts[moduleName] = fs.readFileSync(path.resolve(__dirname, './' + moduleName + '/help.txt')).toString();
			}
			console.log(helpTexts[moduleName]);
		}else{
			if (!module[command]) {
				console.error('Docker module command ('.red + (command || '').yellow + ') does not exits'.red);
			} else {
				let args = argv._.slice(2);
				args.unshift(argv);
				module[command].apply(module, args);
			}


		}
	}
}
