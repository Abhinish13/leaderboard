var fs = require('fs');

var ranking = {
	items: [],
	
	//return the number of items
	getNumItems: function () {
		return this.items.length;
	},
	
	//returns an Item object for a given token 
	//or null, if the item does not exist
	getItem: function (token) {
		for (var i in this.items) {
			if (this.items[i].token == token) {
				return this.items[i];
			}
		}
		return null;
	},
	
	getLastSubmissionDate: function(token) {
		var item = this.getItem(token);
		if( item != null) {
			return item.lastSubmission;
		}
		return null;
	},
	
	//returns the average error of a particular item
	getAvError: function (token) {
		var item = this.getItem(token);
		if (item != null) {
			return item.avError;
		}
		return null;
	},

	//number of updates (number of submissions) a team made
	getNumUpdates: function (token) {
		var item = this.getItem(token);
		if (item != null) {
			return item.updates;
		}
		return null;
	},
	
	teamNameExists: function(name) {
		for (var i in this.items) {
			if (this.items[i].name.toLowerCase() == name.toLowerCase()) {
				return true;
			}
		}
		return false;
	},
	
	emailExists: function(email) {
		for (var i in this.items) {
			if (this.items[i].email.toLowerCase() == email.toLowerCase()) {
				return true;
			}
		}
		return false;
	},	
	
	//does an item with 'token' already exist in our list?
	//returns true if it exists, false otherwise
	tokenExists: function (token) {
		var item = this.getItem(token);
		if (item == null) {
			return false;
		}
		return true;
	},

	//add a new item if it does not yet exist
	//returns true if successful
	addItem: function (token, name, email) {
		if(this.tokenExists(token)) {
			return false;
		}
		
		var I = new Item(token, name, email);
		this.items.push(I);
		return true;
	},
	
	//update the score of an existing item
	//returns true if an update occurred, false otherwise
	updateItem: function (token, avError, submissionFile, remark) {
		var item = this.getItem(token);
		if (item == null) {
			return false;
		}
		item.avError = avError;
		if(avError != 'NaN') {
			item.avError = Number(avError).toFixed(2);
		}
		item.remark = remark;
		item.file = submissionFile;
		item.updates++;
		
		if(item.minError == '' || item.minError > item.avError) {
			item.minError = item.avError;
			item.minErrorFile = item.file;
		}
		
		item.lastSubmission = Date();
		return true;
	},
	
	//the content of items[] is regularly saved to file
	backup: function() {
		console.log('Writing the ranking to a backup file');
		var stream = fs.createWriteStream("./data/backup-ranking");
		stream.once('open', function(fd) {
			for (var i in ranking.items) {
				stream.write(JSON.stringify(ranking.items[i])+"\n");
			};
		  stream.end();
		});
	},
	
	loadFromBackup: function() {
		console.log('Loading the existing ranking from the backup file');
		fs.readFile('./data/backup-ranking', 'utf8', function(err,data) {
			if(err) {
				console.log('Error when reading backup ranking file');
				return;
			}
			var lines = data.split(/\n/);
			lines.forEach(function(line) {
				console.log("line:"+line);
				if(line.length > 5) {
					var item = JSON.parse(line);
					ranking.items.push(item);
				}
			});
			console.log('Number of ranking items retrieved from backup: '+ranking.getNumItems());
		});
	}
	
};

function Item(token, name, email) {
	
	this.token = token;
	this.email = email;
	this.name = name;
	this.avError = 'NaN';
	this.file = '';//path to file from which the current evaluation stems
	this.updates = 0;
	this.lastSubmission = '';
	this.remark='';//for additional comments if need be
	//keep track of the best overall submission
	this.minError = 'NaN';
	this.minErorrFile = '';
}
exports.ranking = ranking;
