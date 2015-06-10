var distanceInMeters = require('../geoAccuracy_child.js').getDistanceInMeters;
var assert = require("assert");

//TODO: working asynchronous test
describe('tests', function(){
    
    describe('geo', function(){

	    it('distance', function(){
			
			var lat1 = 34.3445;
			var lng1 = 44.44;
			var lat2 = 34.35;
			var lng2 = 44.44;
			
			var meters = distanceInMeters(lat1,lng1,lat2,lng2);
			assert.ok(meters < 1000, "less than 1000m difference");
			
			lat1 = 39;
			lng1 = 120;
			lat2 = 35;
			lng2 = -50;
			
			meters = distanceInMeters(lat1, lng1, lat2, lng2);
			assert.ok(meters < 11750000, "less than 11.75K kilometers");
		});
    });
})