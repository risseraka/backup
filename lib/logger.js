module.exports = function makeLogger(message) {

    var slice = Array.prototype.slice;
    var logger = console.log.bind(console);

    return function log() {
	var args = slice.call(arguments);

	args.unshift(message);

	logger.apply(console, args);
    };

};
