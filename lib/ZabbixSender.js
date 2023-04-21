module.exports = ZabbixSender;
var execFile = require('child_process').execFile;

// nullLogger: essentially a fake bunyan logger API.
function noLog() {
	return;
}
var nullLogger = {
	trace: noLog,
	debug: noLog,
	info: noLog,
	warn: noLog,
	error: noLog,
	fatal: noLog
};

/**
 * creates an sender instance
 * @param {type} options
 * @returns {ZabbixSender}
 */
function ZabbixSender(options) {

	options = options || {};

	this.options = {
		config : options.config,
		bin : options.bin || '/usr/bin/zabbix_sender',
		hostname : options.hostname || '-', //'-' will take the one of the config
		port : options.port,
		server : options.server,
		joinString : options.joinString || '.',
		logger : options.logger || nullLogger,
		debug : options.debug || false
	};
	this.logger = this.options.logger;

	return this;
}

ZabbixSender.nullLogger = nullLogger;


/**
 * send data to the zabbix
 * @param {type} data
 * @param {type} errorCallback
 * @returns {undefined}
 */
ZabbixSender.prototype.send = function(data, errorCallback) {

	var cmdArgs = getCmdArgs(this.options);
	var stdIn = stringifyData(data, this.options.joinString);
	console.log('Values', stdIn);
	var actionPhrase = (this.options.debug) ? 'Pretending to execute' : 'Executing';
	this.logger.trace({
		event: 'ZabbixSender#send',
		bin: this.options.bin,
		args: cmdArgs,
		stdIn: stdIn,
		debug: this.options.debug,
	}, actionPhrase + ': %s %s', this.options.bin, cmdArgs.join(' '));

	if (!this.options.debug) {
		var stdin = execFile(this.options.bin, cmdArgs, errorCallback).stdin;
		stdin.on ('error', function () {/* Ignore errors */});
		stdin.end(stdIn);
	}
	return this;
};


/**
 * Return an array of command line arguments to use for the current options given when
 * @param {object} options
 */
function getCmdArgs(options) {

	var argString = [];

	//we need to set a specific config file to use
	if (options.config) {
		argString.push('--config', options.config);
	}

	//we need to set a specific server port to use
	if (options.server) {
		argString.push('--zabbix-server', options.server);
	}
	
	// if (options.hostname) {
	// 	argString.push('--host', `"${options.hostname}"`);
	// }

	//we need to set a specific server port to use
	if (options.port) {
		argString.push('--port', options.port);
	}

	//we want to read from std input
	argString.push('--input-file', '-');

	return argString;
}


/**
 * prepares the data structure for a zabbix sender
 * @param hostname
 * @param {object} obj
 * @param {string} joinString
 * @returns {String}
 */
function stringifyData(hostname, obj, joinString) {

	var input = '';
	var flat = flattenData(obj, joinString);

	for (var key in flat) {
		var value = flat[key];
		input += [`"${hostname}"`, key, value].join(' ') + '\n';
	}
	return input;
}


/**
 * plain structure for objects
 * @param {type} obj
 * @param {string} joinString
 * @param {type} flat
 * @param {type} prefix
 * @returns {object}
 */
function flattenData(obj, joinString, flat, prefix) {

	flat = flat || {};
	prefix = prefix || '';

	for (var key in obj) {
		var value = obj[key];

		if (typeof value === 'object') {
			flattenData(value, joinString, flat, prefix + key + joinString);
		} else {
			if (typeof value === 'number') {
				value = value.toFixed(0);
			}

			flat[prefix + key] = value;
		}
	}

	return flat;
}
