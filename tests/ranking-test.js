var r = require('../ranking.js').ranking;
var assert = require("assert");
var randtoken = require('rand-token');

describe('tests', function(){
    
    describe('ranking', function(){
        
        it('empty ranking', function(){
            assert.equal(0, r.getNumItems());
        });
        
        var randomToken = randtoken.generate(10);
        
        it('single addition', function(){
 
            var teamName = "ABC";
            r.addItem(randomToken, teamName);
            assert.equal(1, r.getNumItems());
            assert.equal(true, r.exists(randomToken));
        });
        
         it('single update', function(){
            var s = r.updateItem(randomToken, "0.5", "test-file", "blah");
            assert.ok(s);
            assert.equal(1, r.getNumItems());
            assert.equal(0.5, r.getAvError(randomToken));
            //using the same random token should not yield in a successful change
            r.addItem(randomToken, "CDE");
            assert.equal(1, r.getNumItems());
        });     
        
         it('list of operations', function(){
            r.addItem(123,"XYZ");
            r.addItem(234,"DFG");
            
            r.updateItem(123, "1.23", "", "semi okay");
            r.updateItem(234, "1");
            r.updateItem(234, "5000");

            assert.equal(3, r.getNumItems());
            assert.equal(5000, r.getAvError(234));
            assert.equal(null, r.getAvError("fdsfsdfsd"));
            assert.equal(1, r.getNumUpdates(randomToken));
            assert.equal(2, r.getNumUpdates(234));
            assert.equal(null, r.getNumUpdates("dsfdsfdsds"));
        });    
    });
})