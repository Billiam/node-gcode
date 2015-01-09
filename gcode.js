var Transform = require('stream').Transform;
var util = require('util');
var parser = require('./parser');
var fs = require('fs');
var byline = require('byline');

// Strips spaces out of all incoming g-code except for comments
function GCodeStripper() {
	this.in_comment = false;
	Transform.call(this);
}
util.inherits(GCodeStripper, Transform);

GCodeStripper.prototype._transform = function(s, enc, done) {
	try {
		for(var result = [], i=0, j=0; i<s.length; i++) {
			var c = String.fromCharCode(s[i]);
			var keep_result = true;
			switch(c) {
				case ' ':
				case '\t':
					keep_result = false;
					break;
				case '(':
					if(this.in_comment) {
						// ERROR
					} else {
						this.in_comment = true;
						keep_result=false;
					}
					break;
				case ')':
					if(this.in_comment) {
						this.in_comment = false;
						keep_result=false;
					} else {
						// ERROR
					}
				default:
					if(this.in_comment) { keep_result = false;}
					break;
			}
			if(keep_result) {
				result[j++] = c;
			}
		}
		var output = result.join('');
		this.push(output);
		done();
	} catch(e) {
		console.log(e);
		done();
	}
}

function GCodeParser(options) {
	if (!options) options = {};
	options.objectMode = true;
	Transform.call(this, options);
}
util.inherits(GCodeParser, Transform);

GCodeParser.prototype._transform = function (object, encoding, done) {
	if(encoding === 'buffer') {
		object = object.toString('utf8')
	}
	this.push(parser.parse(object));
	done();
};

var parseFile = function(file, callback) {
	var results = [];
	fs.createReadStream(file)
	.pipe(new GCodeStripper())
	.pipe(byline())
	.pipe(new GCodeParser())
	.on('data', function(line) {
		results.push(line);
	})
	.on('end', function() {
		typeof callback === 'function' && callback(null, results);
	});
}

module.exports.parseFile = parseFile
