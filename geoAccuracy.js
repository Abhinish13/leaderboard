/* global app */
var fs = require('fs');
var geolib = require('geographiclib').Geodesic.WGS84;

var geoAccuracy = {
	mobilityPoints: [],
	localePoints: [],
	
	initLocaleEval: function() {
		geoAccuracy.initEval('./data/mediaeval2015_placing_locale_leaderboard', geoAccuracy.localePoints);
	},
	
	initMobilityEval: function() {
		geoAccuracy.initEval('./data/mediaeval2015_placing_mobility_leaderboard', geoAccuracy.mobilityPoints);
	},
	
	//read the public leaderboard items into memory (should only called within geoAccuracy)
	initEval: function (file, points) {
		console.log('Initializing the evaluation of '+file);
		if(file === undefined) {
			return;
		}
		var latErrors = 0;
		var lngErrors = 0;
		fs.readFile(file, 'utf8',function(err, data) {
			if(err) {
				console.log('Initialization error: '+err);
				return;
			}
			var lines = data.split("\n");
			lines.forEach(function(line) {
				var tokens = line.split(/\s+/);
				
				//format: hash longitude latitude
				var longitude = tokens[1];
				var latitude = tokens[2];
				points[tokens[0]] = new Point(tokens[0], latitude, longitude);
				
				if (Math.abs(latitude) > 91) {
					latErrors++;
				}
				if (Math.abs(longitude) > 180) {
					lngErrors++;
				}
			});
			console.log("Number of evaluation items: "+Object.keys(points).length);
			console.log("Number of times latitude/longitude was out of bounds: " + latErrors+"/"+lngErrors);
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
	
	getDistanceInMeters : function(lat1, lng1, lat2, lng2) {
		return geolib.Inverse(lat1, lng1, lat2, lng2).s12;
	},
	
	//compute the error one item at a time
	computeError: function (token, file, evalType) {
		
		console.log("starting on computeError ....");
		app.ranking.getItem(token, evalType).valid = -1;
		
		var points = null;
		if(evalType === 'locale') {
			points = geoAccuracy.localePoints;
		}
		else if(evalType === 'mobility') {
			points = geoAccuracy.mobilityPoints;
		}
		else {;}		
		
		console.log("Computing the error");
		var totalErrorDist = 0;
		var validItems = 0;
		var latErrors = 0;
		var lngErrors = 0;
		
		var errorArray = [];

		fs.readFile(file, 'utf8', function(err,data) {
			if(err) {
				console.log('Error when reading submission file: '+err);
				return;
			}
			var lines = data.split(/\n/);
			lines.forEach(function(line) {
				var tokens = line.split(/;/);//separated by semi-colon, hash;latitude;longitude
				var id = tokens[0];
				var latitude = Number(tokens[1]);
				var longitude = Number(tokens[2]);
				
				//our ground truth
				if(id in points) {
					var gtLatitude = points[id].latitude;
					var gtLongitude = points[id].longitude;
					
					if(Math.abs(latitude)<=90 && Math.abs(longitude)<=180) {
						var meters = geoAccuracy.getDistanceInMeters(latitude, longitude, gtLatitude, gtLongitude);
						errorArray.push(meters);
						totalErrorDist += meters;
						validItems++;
					}
					
					if (Math.abs(latitude) >= 91) {
						latErrors++;
					}
					
					if (Math.abs(longitude) >= 181) {
						lngErrors++;
					}
				}
			});
			
			if(validItems < geoAccuracy.getNumItems(evalType)/2) {
				console.log('Less than half of all items present in submission');
				app.ranking.updateItem(token,evalType,'NaN',file);
				return;
			}
			var averageError = totalErrorDist / validItems;
			var medianError = median(errorArray);

			console.log("Number of latitude/longitude errors: " + latErrors+"/"+lngErrors);
			console.log("Average error: " + averageError);
			console.log("Median error: " + medianError);
			
			app.ranking.updateItem(token,evalType, medianError, file);
			return;
		});
		
		app.ranking.getItem(token, evalType).valid = 1;
		console.log("ending on computeError ....");
	}
};

function Point(id, latitude, longitude) {
	this.id = id;
	this.longitude = longitude;
	this.latitude = latitude;
};

function median(values) {

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if (values.length % 2) {
        return values[half];
	}
    else {
        return (values[half - 1] + values[half]) / 2.0;
	}
};

exports.geoAccuracy = geoAccuracy;
