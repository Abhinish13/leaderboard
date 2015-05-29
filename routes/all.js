var express = require('express');
var router = express.Router();
var Multer = require('multer');
var nodemailer = require('nodemailer');
var randtoken = require('rand-token');

var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

/* GET current leaderboard */
router.get('/', function(req, res, next) {
  console.log("Rendering the leaderboard with "+app.ranking.items.length+" items");
  res.render('leaderboard', { ranking:app.ranking.items });
});


/* GET registration page (requesting a token) */
router.get('/register', function(req, res, next) {
  res.render('register');
});

/* GET registration token */
router.get('/receiveToken', function(req, res, next) {
  console.log("Registration request received");

  var teamName = req.query.teamName;
  var email = req.query.email;
  
  var re1 = /^[A-Za-z0-9_]{3,15}/;
  
  //validation
  if(app.ranking.teamNameExists(teamName) == true ) {
      res.render('error', { message:'Team registration unsuccessful: this team name is already registered.' });
  }
  else if(app.ranking.emailExists(email) == true ) {
      res.render('error', { message:'Team registration unsuccessful: this email adres is already registered.' });
  }
  else if( ! re1.test(teamName)) {
    res.render('error', { message:'Team registration unsuccessful: the team name is invalid' });
  }
  else {
    var re2 = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    if( ! re2.test(email)) {
      res.render('error', { message:'Team registration unsuccessful: the provided email adres is invalid.' });
    }
    //all good, generate token and send an email
    else {
      var randomToken = 0;
      do {
        randomToken = randtoken.generate(10);
      } while( app.ranking.tokenExists(randomToken));
      
      var emailMessage = 
"Dear Placing Task participant,\n\n \
please use the token \""+randomToken+"\" (without quotes) when submitting runs to the public leaderboard.\n \
Your entry will appear under the name \""+teamName+"\".\n \
If you have questions or need some help for the task, please contact us at placing2015@gmail.com.\n\n \
Best of luck!\n\n \
-- the Placing Task organizers\n \
Bart Thomee\n \
Olivier Van Laere\n \
Claudia Hauff\n \
Jaeyoung Choi\n";
      
      var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: config["email-account"],
          pass: config["email-password"],
            }
      });
      transporter.sendMail({
          from: config["email-account"],
          to: email,
          subject: 'MediaEval Placing Task 2015: registration token',
          text: emailMessage
        }, 
        function(error, info){
          if(error){
            console.log(error);
          }else{
            console.log('Message sent: ' + info.response);
          }
      });
      var success = app.ranking.addItem(randomToken, teamName, email);
      if(success == true) {
        res.render('success', { message:'You should receive an email from mediaeval.leaderboard@gmail.com within a few minutes.' });
      }
      else {
        res.render('error', { message:'Team registration failed: please try again to register in a few minutes.' });
      }
    }
  }
});


/* GET submisson page (submitting a run) */
router.get('/submit', function(req,res,next) {
  console.log("Submitting results");
  res.render('submit');
});


/* submitted runs are sent by POST */
/* post-upload validation checks mean that useless uploads might occur (needs fixing) */
router.post('/runSubmission', Multer(
    
  { 
    dest: './uploads/',
    
    rename: function (fieldname, filename) {
      console.log('renamed file!');
      return filename+Date.now();
    },
  
    onFileUploadStart: function (file, req, res) {
      console.log(file.originalname + ' is starting ...');
    },
    
    onFileUploadComplete: function (file, req, res) {
      
      var token = req.body.token;
      //once the upload is complete, compute the accuracy of the submission
      console.log("Checking the error of submission "+req.body.token+", stored in "+file.path);
      
      var currentTime = new Date().getTime();
      var lastSubmission = app.ranking.getLastSubmissionDate(token);
      
      if(lastSubmission != null) {
        lastSubmission = new Date(lastSubmission).getTime();
      }
      if(app.ranking.tokenExists(token)==false) {
        res.render('error', { message:'Run upload failed: your token is not valid.' });
      }
      else if( lastSubmission != null && Math.abs(currentTime - lastSubmission)/1000 < 60) {
        console.log("Number of seconds waited between uploads: "+ Math.abs(currentTime-lastSubmission)/1000);
        res.render('error', { message:'Run upload failed: you have to wait at least one minute between subsequent submissions.' });         
      }
      else {
        app.geoAccuracy.computeError(req.body.token, file.path);
        res.render('success', { message:'It may take a few minutes for your new score to be computed.' });
      }
    }
  }
  )
);


module.exports = router;
