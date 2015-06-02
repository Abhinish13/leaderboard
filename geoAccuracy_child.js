/* global process */
var fs = require('fs');
var geolib = require('geographiclib').Geodesic.WGS84;

process.on("message", function (message) {
	var file = message.file;
	var points = JSON.parse(message.gtPoints);

	var totalErrorDist = 0;
	var validItems = 0;
	var latErrors = 0;
	var lngErrors = 0;

	var errorArray = [];

	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			var msg = "Error when reading submission file " + file;
			process.send({ error: msg, avError : 'NaN', medError : 'NaN' });
			process.exit();
		}
		var lines = data.split(/\n/);
		lines.forEach(function (line) {
			var tokens = line.split(/;/);//separated by semi-colon, hash;latitude;longitude

			var id = tokens[0];
			var latitude = Number(tokens[1]);
			var longitude = Number(tokens[2]);
				
			//our ground truth
			if (id in points) {
				var gtLatitude = points[id].latitude;
				var gtLongitude = points[id].longitude;

				if (latitude!==null && longitude!== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
					var meters = getDistanceInMeters(latitude, longitude, gtLatitude, gtLongitude);
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

		if (validItems < Object.keys(points).length / 2) {
			msg = "Error: less than half of all items present in submission";
			process.send({ error: msg, avError : 'NaN', medError : 'NaN' });
			process.exit();
		}

		var averageError = totalErrorDist / validItems;
		var medianError = median(errorArray);
		process.send({ avError: averageError, medError: medianError });
		process.exit();
	});
});

function median(values) {

    values.sort(function (a, b) { return a - b; });

    var half = Math.floor(values.length / 2);

    if (values.length % 2) {
        return values[half];
	}
    else {
        return (values[half - 1] + values[half]) / 2.0;
	}
};

function getDistanceInMeters(lat1, lng1, lat2, lng2) {
	return geolib.Inverse(lat1, lng1, lat2, lng2).s12;
};