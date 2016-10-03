// global imports
var fs = require('fs.extra');
var path = require('path');
var linereader = require("line-reader-sync");
var random = require('random-seed').create();
var childprocess = require('child_process');

// finds the intersection of two arrays in a simple fashion, non-destructively. 
// PARAMS
// a - first array, must already be sorted
// b - second array, must already be sorted
// NOTES
// - should have O(n) operations, where n is n = MIN(a.length, b.length).
// - from https://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript
function intersect(a, b) {
	// make a copy of both arrays and sort them
	a = a.slice(0).sort();
	b = b.slice(0).sort();
	// perform the intersection
	var ai = 0, bi = 0;
	var result = [];
	while (ai < a.length && bi < b.length) {
		if (a[ai] < b[bi])
			ai++;
		else if (a[ai] > b[bi])
			bi++;
		else {
			result.push(a[ai]);
			ai++;
			bi++;
		}
	}
	return result;
}

// intersect the first k predicted tags with all the test tags and determine the precision
// of the predicted tags
// note: we assume testtags will have at least k elements, while the number of elements in
//       predtags does not necessarily matter
function precision_at_k(testtags, predtags, k) {
	return intersect(testtags, predtags.slice(0, k)).length / k;
}

// intersect the first k predicted tags with all the test tags and determine the recall of
// the predicted tags
// note: we assume testtags will have at least k elements, while the number of elements in
//       predtags does not necessarily matter
// note: this can only return a score of 1 if k is at least the number of testtags
function recall_at_k(testtags, predtags, k) {
	return intersect(testtags, predtags.slice(0, k)).length / testtags.length;
}

// intersect the first k predicted tags with all the test tags and determine the accuracy
// of the predicted tags
// note: we assume testtags will have at least k elements, while the number of elements in
//       predtags does not necessarily matter
function accuracy_at_k(testtags, predtags, k) {
	return intersect(testtags, predtags.slice(0, k)).length > 0 ? 1.0 : 0.0;
}

function tag(file1, file2, missing, ratio) {
	var re1 = /^[0-9]+$/;
	var re2 = /^[a-z +,]+$/;
	// load the missing data
	var reader = new linereader(missing);
	var skip = []
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct format of the photoid
		if (!re1.test(line)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check that there are no duplicate entries
		if (skip[line] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add photoid to array
		skip[line] = true;
	}
	// load the test set
	reader = new linereader(file1);
	var test = [];
	var tests = 0;
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct number of fields
		var split = line.split('\t');
		if (split.length != 2) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		// note: lowercase the second field as we only focus on lowercased tags
		var field1 = split[0];
		var field2 = split[1].toLowerCase();
		// check for correct format of the photoid
		if (!re1.test(field1)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 1 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// skip the photo if it is one of the missing ones
		if (skip[field1] != null)
			continue;
		// check that there are no duplicate entries
		if (test[field1] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the tags
		if (!re2.test(field2) || field2.indexOf(',,') != -1) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// decode the tags
		field2 = decodeURIComponent(field2);
		// split the tags
		field2 = field2.split(',');
		// ensure a minimum of 5 tags are provided
		if (field2.length < 5) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Insufficient tags found in field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add entry to array
		var entry = { photoid: field1, tags: field2 };
		test[field1] = entry;
		tests++;
	}
	// load the submission
	reader = new linereader(file2);
	var pred = [];
	var preds = 0;
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct number of fields
		var split = line.split('\t');
		if (split.length != 2) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		// note: lowercase the second field as we only focus on lowercased tags
		var field1 = split[0];
		var field2 = split[1].toLowerCase();
		// check for correct format of the photoid
		if (!re1.test(field1)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 1 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// skip the photo if it is one of the missing ones
		if (skip[field1] != null)
			continue;
		// check that there are no duplicate entries
		if (pred[field1] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check this entry is actually part of the test set
		if (test[field1] == null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Unexpected entry with photoid' + field1 + ' found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the tags
		if (!re2.test(field2) || field2.indexOf(',,') != -1) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// decode the tags
		field2 = decodeURIComponent(field2);
		// split the tags
		// note: the participant can predict as many tags as he/she likes
		field2 = field2.split(',');
		// add entry to array
		var entry = { photoid: field1, tags: field2 };
		pred[field1] = entry;
		preds++;
	}	
	// check if the correct number of entries were read
	if (tests != preds) {
		process.send({ error: true, title: 'Evaluation failed', message: 'Number of entries in run (' + preds + ') does not correspond with the number of entries in the test set (' + tests + ')' });
		return process.exit();
	}
	// determine which entries we will evaluate
	// note: for the leaderboard we pack a random proportion of entries from the test
	//       set that we will evaluate, as this way the participants get an indication
	//       of the performance their method has on a representative subset of the test
	//       set, without knowing exactly how their method will perform; this avoids
	//       them from over-optimizing by keeping most of the data secret.
	// note: reseed the random generator so it will always select the exact same items
	random.seed('Tag and Caption Prediction Challenge 2016');
	var keys = Object.keys(test);
	var choose = Math.floor(keys.length * ratio);
	var selected = [];
	var indices = [];
	while (selected.length < choose) {
		// generate random index
		var index = random.intBetween(0, keys.length - 1).toString();
		// check if the index was used before
		if (indices[index] != null)
			continue;
		// select the key at this index
		selected.push(keys[index]);
		indices[index] = true;
	}
	var selected = Object.keys(test);
	// perform the evaluation
	var precision = 0.0;
	var recall = 0.0;
	var accuracy = 0.0;
	for (var s in selected) {
		var testtags = test[selected[s]].tags;
		var predtags = pred[selected[s]].tags;
		precision += precision_at_k(testtags, predtags, 5);
		recall += recall_at_k(testtags, predtags, 5);
		accuracy += accuracy_at_k(testtags, predtags, 5);
	}
	precision /= selected.length;
	recall /= selected.length;
	accuracy /= selected.length;
	// notify the caller with the scores
	process.send({ score1: precision, score2: recall, score3: accuracy });
	return process.exit();
}

function caption(file1, file2, missing, metrics, ratio) {
	var re1 = /^[0-9]+$/;
	var re2 = /^[a-z -.,:;!?]+$/;
	// load the missing data
	var reader = new linereader(missing);
	var skip = []
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct format of the photoid
		if (!re1.test(line)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 1 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check that there are no duplicate entries
		if (skip[line] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add photoid to array
		skip[line] = true;
	}
	// load the test set
	reader = new linereader(file1);
	var test = [];
	var tests = 0;
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct number of fields
		var split = line.split('\t');
		if (split.length != 2) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		// note: lowercase the second field as we only focus on lowercased captions
		var field1 = split[0];
		var field2 = split[1].toLowerCase();
		// check for correct format of the photoid
		if (!re1.test(field1)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 1 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// skip the photo if it is one of the missing ones
		if (skip[field1] != null)
			continue;
		// check that there are no duplicate entries
		if (test[field1] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the caption
		if (!re2.test(field2)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + field2 });
			return process.exit();
		}
		// decode the caption
		field2 = decodeURIComponent(field2);
		// add entry to array
		var entry = { photoid: field1, caption: field2 };
		test[field1] = entry;
		tests++;
	}
	// load the submission
	reader = new linereader(file2);
	var pred = [];
	var preds = 0;
	for (var l = 1; ; l++) {
		var line = reader.readline();
		if (line == null)
			break;
		// trim the line to remove excess whitespace, including spurious carriage returns
		line = line.trim();
		// check for correct number of fields
		var split = line.split('\t');
		if (split.length != 2) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		// note: lowercase the second field as we only focus on lowercased captions
		var field1 = split[0];
		var field2 = split[1].toLowerCase();
		// check for correct format of the photoid
		if (!re1.test(field1)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 1 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// skip the photo if it is one of the missing ones
		if (skip[field1] != null)
			continue;
		// check that there are no duplicate entries
		if (pred[field1] != null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Duplicate entry found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check this entry is actually part of the test set
		if (test[field1] == null) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Unexpected entry with photoid' + field1 + ' found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the caption
		if (!re2.test(field2)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// decode the caption
		field2 = decodeURIComponent(field2);
		// add entry to array
		var entry = { photoid: field1, caption: field2 };
		pred[field1] = entry;
		preds++;
	}
	// check if the correct number of entries were read
	if (tests != preds) {
		process.send({ error: true, title: 'Evaluation failed', message: 'Number of entries in run (' + preds + ') does not correspond with the number of entries in the test set (' + tests + ')' });
		return process.exit();
	}
	// determine which entries we will evaluate
	// note: for the leaderboard we pack a random proportion of entries from the test
	//       set that we will evaluate, as this way the participants get an indication
	//       of the performance their method has on a representative subset of the test
	//       set, without knowing exactly how their method will perform; this avoids
	//       them from over-optimizing by keeping most of the data secret.
	// note: reseed the random generator so it will always select the exact same items
	random.seed('Tag and Caption Prediction Challenge 2016');
	var keys = Object.keys(test);
	var choose = Math.floor(keys.length * ratio);
	var selected = [];
	var indices = [];
	while (selected.length < choose) {
		// generate random index
		var index = random.intBetween(0, keys.length - 1).toString();
		// check if the index was used before
		if (indices[index] != null)
			continue;
		// select the key at this index
		selected.push(keys[index]);
		indices[index] = true;
	}
	// perform the evaluation
	var python = childprocess.spawn('python', [metrics], { });
	// define how to process data sent by the python script
	var data = '';
	var update = 25;
	var records = 0;
	python.stdout.on('data', function(d) {
		// add to string
		// note: it is not guaranteed we get the data back from the python script in nice,
		//       directly parseable chunks. so the best is to concatenate to a single string
		//       and process that string afterwards
		data += d.toString();
		// send progress updates every so often
		var r = data.split('\n').length;
		if (records == 0 || r - update > records) {
			records = r;
			process.send({ progress: 'Evaluated ' + (r - r % update) + ' of ' + selected.length + ' captions' });
		}
	});
	python.stdout.on('end', function() {
		var bleu = 0.0;
		var meteor = 0.0;
		var count = 0;
		// extract the computed scores
		var lines = data.split('\n');
		for (var line in lines) {
			split = lines[line].split('\t');
			if (split.length != 2)
				continue;
			bleu += Number(split[0]);
			meteor += Number(split[1]);
			count += 1;
		}
		// check if the correct number of captions were processed
		if (count != selected.length) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of captions evaluated' });
			return process.exit();
		}
		// compute the average score
		bleu /= count;
		meteor /= count;
		// notify the caller with the scores
		process.send({ score1: bleu, score2: meteor, score3: 0.0 });
		return process.exit();
	});
	// send data to the python script
	for (var s in selected) {
		var identifier = selected[s];
		var testcapt = test[selected[s]].caption;
		var predcapt = pred[selected[s]].caption;
		python.stdin.write(identifier + '\t' + testcapt + '\t' + predcapt + '\n');
	}
	python.stdin.end();
}

// process a submission
process.on("message", function (message) {
	var response = null;
	if (message.subtask == 'tag') {
		// evaluate tag prediction run
		tag(message.file, message.run, message.missing, message.ratio);
	} else if (message.subtask == 'caption') {
		// estimate caption prediction run
		caption(message.file, message.run, message.missing, message.metrics, message.ratio);
	} else {
		// invalid subtask targeted
		process.send({ error: true, title: 'Evaluation failed', message: 'Invalid subtask (' + message.subtask + ') targeted.' });
		return process.exit();
	}
});
