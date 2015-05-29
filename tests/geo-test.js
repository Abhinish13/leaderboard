var g = require('../geoAccuracy.js').geoAccuracy;
var assert = require("assert");

//TODO: working asynchronous test
describe('tests', function(){
    
    describe('geo', function(){
  
		before(function(done) {
			g.initEval();
			setTimeout(done(),3000);
		});

	    it('initialize', function(){
			console.log("starting the timeout ...");
			assert.equal(4, g.getNumItems());
		});
    });
})