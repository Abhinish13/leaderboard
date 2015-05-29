var fs = require('fs');
var geolib = require('geographiclib').Geodesic.WGS84;

var geoAccuracy = {
	points: [],
	
	//read the evaluation file
	initEval: function (p) {
		fs.readFile('./data/public-eval', 'utf8',function(err, data) {
			if(err) {
				console.log('Error during the initialization of the evaluation module: '+err);
				return;
			}
			var lines = data.split("\n");
			lines.forEach(function(line) {
				var tokens = line.split(/\s+/);
				var p = new Point(tokens[0], tokens[1], tokens[2]);
				geoAccuracy.points[tokens[0]]=p;
			});
			console.log("Number of loaded items for evaluation: "+geoAccuracy.getNumItems());
		});
	},
	
	getNumItems : function() {
		return Object.keys(geoAccuracy.points).length;
	},
	
	//compute the error one item at a time
	computeError : function(token, file) {
		console.log("Computing the error");
		var totalErrorDist = 0;
		var validItems = 0;
		
		fs.readFile(file, 'utf8', function(err,data) {
			if(err) {
				console.log('Error when reading submission file');
				app.ranking.update(name,'NaN',file,'Submitted file appears to be corrupt');
				return;
			}
			var lines = data.split(/\n/);
			lines.forEach(function(line) {
				var tokens = line.split(/\s+/);
				var id = tokens[0];
				var latitude = Number(tokens[1]);
				var longitude = Number(tokens[2]);
				
				//our ground truth
				if(geoAccuracy.points[id]!=undefined) {
					var gtLatitude = geoAccuracy.points[id].latitude;
					var gtLongitude = geoAccuracy.points[id].longitude;
					
					if(Math.abs(latitude)<=90 && Math.abs(longitude)<=180 && geoAccuracy.points[id]!=undefined) {
						var e = geolib.Inverse(latitude, longitude, gtLatitude, gtLongitude);
						totalErrorDist += e.s12;
						validItems++;
					}
				}
			});
			
			if(validItems < geoAccuracy.getNumItems()/2) {
				console.log('Less than half of all items present in submission');
				app.ranking.updateItem(token,'NaN',file, 'Submitted file contains less than half of the evaluated items');
				return;
			}
			var averageError = totalErrorDist / validItems;
			console.log("Average error (m): "+averageError+ " ["+token+" for submission "+file+"]");
			console.log("Average error (km): "+averageError/1000);
			app.ranking.updateItem(token,averageError, file, (validItems < geoAccuracy.getNumItems()) ? 'Not all evaluated items were found' : '');
			return;
		});
	}
};

function Point(id, latitude, longitude) {
	this.id = id;
	this.latitude = latitude;
	this.longitude = longitude;
}

exports.geoAccuracy = geoAccuracy;
