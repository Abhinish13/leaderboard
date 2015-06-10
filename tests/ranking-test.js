var r = require('../ranking.js').ranking;
var assert = require("assert");
var randtoken = require('rand-token');

describe('tests', function(){
    
    describe('ranking', function(){
        
        it('empty ranking', function(){
            assert.equal(0, r.getNumItems('locale'));
        });
        
        var randomToken = randtoken.generate(10);
        var eval = 'locale';
        
        it('single addition', function(){
 
            var teamName = "ABC";
            var email = "test@test.de";
            r.addItem(randomToken, teamName, email);
            assert.equal(1, r.getNumItems(eval));
            assert.equal(true, r.tokenExists(randomToken));
        });
        
         it('single update', function(){
            var s = r.updateItem(randomToken, eval, 0.5, "_file1");
            assert.ok(s);
            assert.equal(1, r.getNumItems(eval));
            assert.equal(0.5, r.getMedianError(randomToken, eval));
        });     
        
         it('list of operations', function(){
            r.addItem(123,"XYZ", "X@X.x");
            r.addItem(234,"DFG", "D@D.d");
            
            r.updateItem(123, eval, 1.23, "_file2");
            r.updateItem(234, eval, 1, "_file3");
            r.updateItem(234, eval, 2, "_file4");

            assert.equal(3, r.getNumItems(eval));
            assert.equal(2, r.getMedianError(234, eval));
            assert.equal(null, r.getMedianError("fdsfsdfsd", eval));
            assert.equal(1, r.getNumUpdates(randomToken, eval));
            assert.equal(2, r.getNumUpdates(234, eval));
        });    
    });
})