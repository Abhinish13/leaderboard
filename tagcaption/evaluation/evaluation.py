from collections import defaultdict
import json
from os import path
import sys

# construct directory where the metric scripts are stored and add it to the search path
sys.path.append(path.dirname(path.realpath(__file__)))

# prepare tokenizer
from tokenizer.ptbtokenizer import PTBTokenizer
tokenizer = PTBTokenizer()
# perform tokenization
def tokenize(key, caption):
    dd = defaultdict(list)
    dd[key].append({ 'caption': caption })
    return tokenizer.tokenize(dd)

# prepare BLEU scorer
from bleu.bleu import Bleu
bluescorer = Bleu(1)
# prepare METEOR scorer
from meteor.meteor import Meteor
meteorscorer = Meteor()

# evaluate how well two captions arriving through stdin correspondend, and write the scores back to stdout
if __name__ == '__main__':
	# read all lines from stdin
	lines = sys.stdin.readlines()
	# process each line
	for line in lines:
		# ignore empty lines
		if len(line) == 0:
			continue
		# split into test caption and predicted caption
		split = line.split('\t')
		if len(split) != 3:
			print 'ERROR\tinvalid format in line {}'.format(line)
			break
		# tokenize both captions
		testcapt = tokenize(split[0], split[1])
		predcapt = tokenize(split[0], split[2])
		# compute bleu score
		bleuscore, tmp1 = bluescorer.compute_score(testcapt, predcapt)
		bleuscore[0]
		# compute meteor score
		meteorscore = 0.0 #meteorscore, tmp2 = meteorscorer.compute_score(testcapt, predcapt)
		print '{:.2f}\t{:.2f}'.format(bleuscore, meteorscore)
		sys.stdout.flush()
