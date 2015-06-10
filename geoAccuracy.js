/* global app */
var fs = require('fs');
var geolib = require('geographiclib').Geodesic.WGS84;
var child_process = require('child_process');
var LOGGER = require('./logger');  

var geoAccuracy = {
	mobilityPoints: {},
	localePoints: {},
	
	initLocaleEval: function() {
		geoAccuracy.initEval('./data/mediaeval2015_placing_locale_leaderboard', geoAccuracy.localePoints);
	},
	
	initMobilityEval: function() {
		geoAccuracy.initEval('./data/mediaeval2015_placing_mobility_leaderboard', geoAccuracy.mobilityPoints);
	},
	
	//read the public leaderboard items into memory (should only called within geoAccuracy)
	initEval: function (file, points) {
		
		LOGGER.info('Initializing the evaluation of '+file);
		if (file === undefined) {
			LOGGER.error('File ' + file + ' could not be read!');
			return;
		}
		var latErrors = 0;
		var lngErrors = 0;
		fs.readFile(file, 'utf8',function(err, data) {
			if(err) {
				LOGGER.error('Initialization error: '+err);
				return;
			}
			var lines = data.split("\n");
			lines.forEach(function(line) {
				var tokens = line.split(/\s+/);
				
				//format: hash longitude latitude
				var longitude = tokens[1];
				var latitude = tokens[2];
				points[tokens[0]] = new Point(tokens[0], latitude, longitude);
				
				if (Math.abs(Number(latitude)) > 91) {
					latErrors++;
				}
				if (Math.abs(Number(longitude)) > 180) {
					lngErrors++;
				}
			});
			LOGGER.info("Number of evaluation items: "+Object.keys(points).length);
			LOGGER.info("Number of times latitude/longitude was out of bounds: " + latErrors+"/"+lngErrors);
		});
	},
	
	getNumItems : function(evalType) {
		var points = null;
		if(evalType === 'locale') {
			points = geoAccuracy.localePoints;
		}
		else if(evalType==='mobility') {
			points = geoAccuracy.mobilityPoints;
		}
		else {;}
		
		if(points === null ) {
			return 0;
		}
		return Object.keys(points).length;
	},
	
	computeErrorConcur: function (token, file, evalType) {
		
		LOGGER.info('starting concurrent computeError function');
		app.ranking.getItem(token, evalType).valid = -1;

		var points = null;
		if(evalType === 'locale') {
			points = geoAccuracy.localePoints;
		}
		else if (evalType === 'mobility') {
			points = geoAccuracy.mobilityPoints;
		}
		else { ; }
		
		var childCompute = child_process.fork("geoAccuracy_child.js");

	    childCompute.on("message", function(message) {
			var avError = message.avError;
			var medError = message.medError;
			
			LOGGER.info('Concurrent error computation finished, median error in meters: '+medError);

			app.ranking.updateItem(token,evalType, medError, file);
			app.ranking.getItem(token, evalType).valid = 1;
		});
		childCompute.send({ file: file, gtPoints : JSON.stringify(points) });
	}
};

function Point(id, latitude, longitude) {
	this.id = id;
	this.longitude = longitude;
	this.latitude = latitude;
};

exports.geoAccuracy = geoAccuracy;
