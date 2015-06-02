var g = require('../geoAccuracy.js').geoAccuracy;
var assert = require("assert");

//TODO: working asynchronous test
describe('tests', function(){
    
    describe('geo', function(){

	    it('initialize', function(){
			
			var lat1 = 34.3445;
			var lng1 = 44.44;
			var lat2 = 34.35;
			var lng2 = 44.44;
			
			var meters = g.getDistanceInMeters(lat1,lng1,lat2,lng2);
			console.log("distance: "+meters);
			assert.ok(meters<1000, "less than 1000m difference");
		});
    });
})