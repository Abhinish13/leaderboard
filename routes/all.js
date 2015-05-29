var express = require('express');
var router = express.Router();
var Multer = require('multer');
var nodemailer = require('nodemailer');
var randtoken = require('rand-token');

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

      //build the message
      var emailMessage = app.config["registration-mail-text"].join(" ");
      emailMessage = emailMessage.replace(/RANDOM_TOKEN/,randomToken).replace(/TEAM_NAME/, String(teamName));

      var transporter = nodemailer.createTransport({
      service: app.config["email-service"],
      auth: {
          user: app.config["email-account"],
          pass: app.config["email-password"],
            }
      });
      transporter.sendMail({
          from: app.config["email-account"],
          to: email,
          subject: app.config["registration-mail-subject"],
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
      return filename+Date.now();
    },
  
    onFileUploadStart: function (file, req, res) {
      console.log(file.originalname + ' is starting ...');
    },
    
    onFileUploadComplete: function (file, req, res) {
      
      var token = req.body.token;

      //once the upload is complete, check whether the run is valid
      //and if so, compute the prediction accuracy
      var currentTime = new Date().getTime();
      var lastSubmission = app.ranking.getLastSubmissionDate(token);
      var waitMilliseconds = Number(app.config["milliseconds-between-uploads"]);
      var waitMinutes = waitMilliseconds/(1000 * 60);
      
      if(lastSubmission != null) {
        lastSubmission = new Date(lastSubmission).getTime();
      }
      if(app.ranking.tokenExists(token)==false) {
        res.render('error', { message:'Run upload failed: your token is not valid.' });
      }
      else if( lastSubmission != null && Math.abs(currentTime - lastSubmission) < waitMilliseconds) {
        console.log("Number of seconds waited between uploads: "+ Math.abs(currentTime-lastSubmission)/1000);
        var errorMsg = "Run upload fialed: you have to wait at least "+waitMinutes+" between subsequent submissions.";
        res.render('error', { message: errorMsg });         
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
