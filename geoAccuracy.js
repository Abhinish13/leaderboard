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
		if(file == undefined) {
			return;
		}
		fs.readFile(file, 'utf8',function(err, data) {
			if(err) {
				console.log('Initialization error: '+err);
				return;
			}
			var lines = data.split("\n");
			lines.forEach(function(line) {
				var tokens = line.split(/\s+/);
				points[tokens[0]]=new Point(tokens[0], tokens[1], tokens[2]);
			});
			console.log("Number of evaluation items: "+Object.keys(points).length);
		});
	},
	
	getNumItems : function(evalType) {
		var points = null;
		if(evalType == 'locale') {
			points = geoAccuracy.localePoints;
		}
		else if(evalType=='mobility') {
			points = geoAccuracy.mobilityPoints;
		}
		else {;}
		
		if(points == null ) {
			return 0;
		}
		return Object.keys(points).length;
	},
	
	//compute the error one item at a time
	computeError : function(token, file, evalType) {
		var points = null;
		if(evalType == 'locale') {
			points = geoAccuracy.localePoints;
		}
		else if(evalType=='mobility') {
			points = geoAccuracy.mobilityPoints;
		}
		else {;}		
		
		console.log("Computing the error");
		var totalErrorDist = 0;
		var validItems = 0;
		
		fs.readFile(file, 'utf8', function(err,data) {
			if(err) {
				console.log('Error when reading submission file: '+err);
				return;
			}
			var lines = data.split(/\n/);
			lines.forEach(function(line) {
				var tokens = line.split(/;/);//separated by semi-colon, hash;longitude;latitude
				var id = tokens[0];
				var longitude = Number(tokens[1]);
				var latitude = Number(tokens[2]);
				
				//our ground truth
				if(id in points) {
					var gtLatitude = points[id].latitude;
					var gtLongitude = points[id].longitude;
					
					if(Math.abs(latitude)<=90 && Math.abs(longitude)<=180) {
						var e = geolib.Inverse(latitude, longitude, gtLatitude, gtLongitude);
						totalErrorDist += e.s12;
						validItems++;
					}
				}
			});
			
			if(validItems < geoAccuracy.getNumItems(evalType)/2) {
				console.log('Less than half of all items present in submission');
				app.ranking.updateItem(token,evalType,'NaN',file);
				return;
			}
			var averageError = totalErrorDist / validItems;
			app.ranking.updateItem(token,evalType, averageError, file);
			return;
		});
	}
};

function Point(id, longitude, latitude) {
	this.id = id;
	this.longitude = longitude;
	this.latitude = latitude;
}

exports.geoAccuracy = geoAccuracy;
