// global imports
var fs = require('fs.extra');
var path = require('path');
var linereader = require("line-reader-sync");
var karney = require('geographiclib').Geodesic.WGS84;
var random = require('random-seed').create();

// progress update frequency
var update = 100000;

function estimation(file1, file2, missing, ratio) {
	var re1 = /^[0-9]+$/;
	var re2 = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
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
		if (split.length != 3) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		var field1 = split[0];
		var field2 = split[1];
		var field3 = split[2];
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
		// check for correct format of the coordinates
		if (!re2.test(field2) || Number(field2) <= -180.0 || Number(field2) >= 180.0) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 3 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		if (!re2.test(field3) || Number(field3) <= -90.0 || Number(field3) >= 90.0)	{
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 4 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add entry to array
		var entry = { photoid: field1, longitude: Number(field2), latitude: Number(field3) };
		test[field1] = entry;
		tests++;
		// send progress updates
		if (tests % update == 0)
			process.send({ progress: 'Loaded ' + tests + ' entries from the test set' });
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
		if (split.length != 3) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Incorrect number of fields in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// get the fields
		var field1 = split[0];
		var field2 = split[1];
		var field3 = split[2];
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
			process.send({ error: true, title: 'Evaluation failed', message: 'Unexpected entry with photoid ' + field1 + ' found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the coordinates
		if (!re2.test(field2) || Number(field2) <= -180.0 || Number(field2) >= 180.0) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		if (!re2.test(field3) || Number(field3) <= -90.0 || Number(field3) >= 90.0)	{
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 3 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add entry to array
		var entry = { photoid: field1, longitude: Number(field2), latitude: Number(field3) };
		pred[field1] = entry;
		preds++;
		// send progress updates
		if (preds % update == 0)
			process.send({ progress: 'Loaded ' + preds + ' entries from the submitted run' });
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
	process.send({ progress: 'Selecting entries' });
	random.seed('MediaEval Placing Task 2016');
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
	process.send({ progress: 'Evaluating entries' });
	var distances = [];
	var total = 0.0;		
	for (var s in selected) {
		// get the ground truth location
		var eg = test[selected[s]];
		var xg = eg.longitude;
		var yg = eg.latitude;
		// get the predicted location
		var ep = pred[selected[s]];
		var xp = ep.longitude;
		var yp = ep.latitude;
		// compute the distance between the two in km
		var d = karney.Inverse(yg, xg, yp, xp).s12 / 1000.0;
		distances.push(d);
		total += d;
		// send progress updates
		if (distances.length % update == 0)
			process.send({ progress: 'Evaluated ' + distances.length + ' of ' + selected.length + ' estimates' });
	}
	// sort the distances
	distances.sort(function (a, b) { return a - b; });
	// determine average and median distance error
	var average = total / distances.length;
	var median = distances.length % 2 == 1 ? distances[Math.floor(distances.length / 2)] : (distances[distances.length / 2 - 1] + distances[distances.length / 2]) / 2.0;
	// notify the caller with the scores
	process.send({ score1: average, score2: median });
	return process.exit();
}

function verification(file1, file2, missing, ratio) {
	var re1 = /^[0-9]+$/;
	var re2 = /^[0-1]$/;
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
		var field1 = split[0];
		var field2 = split[1];
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
		// check for correct format of the classification
		if (!re2.test(field2)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add entry to array
		var entry = { photoid: field1, classification: Number(field2) };
		test[field1] = entry;
		tests++;
		// send progress updates
		if (tests % update == 0)
			process.send({ progress: 'Loaded ' + tests + ' entries from the test set' });
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
		var field1 = split[0];
		var field2 = split[1];
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
			process.send({ error: true, title: 'Evaluation failed', message: 'Unexpected entry with photoid ' + field1 + ' found in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// check for correct format of the coordinates
		if (!re2.test(field2)) {
			process.send({ error: true, title: 'Evaluation failed', message: 'Invalid format of field 2 in line ' + l + ' @ ' + line.replace('\t', ' ') });
			return process.exit();
		}
		// add entry to array
		var entry = { photoid: field1, classification: Number(field2) };
		pred[field1] = entry;
		preds++;
		// send progress updates
		if (preds % update == 0)
			process.send({ progress: 'Loaded ' + preds + ' entries from the submitted run' });
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
	process.send({ progress: 'Selecting entries' });
	random.seed('MediaEval Placing Task 2016');
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
	process.send({ progress: 'Evaluating entries' });
	var fp = 0;
	var tp = 0;
	var fn = 0;
	var tn = 0;
	for (var s in selected) {
		// get the ground truth classification
		var eg = test[selected[s]];
		var cg = eg.classification;
		// get the predicted classification
		var ep = pred[selected[s]];
		var cp = ep.classification;
		// compute the correspondence between the two
		if (cg == 0) {
			if (cp == 0)
				tn++;
			else
				fp++;
		} else {
			if (cp == 0)
				fn++;
			else
				tp++;
		}
		// send progress updates
		var count = fp + tp + fn + tn;
		if (count % update == 0)
			process.send({ progress: 'Evaluated ' + count + ' of ' + selected.length + ' estimates' });
	}
	// compute precision and recall
	//var precision = tp / (tp + fp);
	//var recall = tp / (tp + fn);
	var accuracy = (tp + tn) / (fp + tp + fn + tn);
	// notify the caller with the scores
	//process.send({ score1: precision, score2: recall });
	process.send({ score1: accuracy, score2: null });
	return process.exit();
}

// process a submission
process.on("message", function (message) {
	var response = null;
	if (message.subtask == 'estimation') {
		// evaluate estimation run
		response = estimation(message.file, message.run, message.missing, message.ratio);
	} else if (message.subtask == 'verification') {
		// estimate verification run
		response = verification(message.file, message.run, message.missing, message.ratio);
	} else {
		// invalid subtask targeted
		process.send({ error: true, title: 'Evaluation failed', message: 'Invalid subtask (' + message.subtask + ') targeted.' });
		return process.exit();
	}
});
