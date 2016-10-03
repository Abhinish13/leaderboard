# Leaderboard #

Prototype leaderboard for evaluations, originally written by [Claudia Hauff][1]. What the leaderboard system essentially does is allow people to easily set up an online competition for which participants are expected to submit entries of which the correctness needs to be assessed.

Two directories are included in the repository that contain examples of competitions that were held in real life. Specifically, the `placing` leaderboard was used to evaluate the submissions to the [MediaEval Placing Task][2] and the `tagcaption` leaderboard was used for the [Yahoo-Flickr Challenge on Tag and Caption Prediction][3], both held in 2016. In both `evaluation` subdirectories you will find the data that was used to evaluate uploaded submissions, as well as baselines that the organizers of the competitions provided that the participants were expected to outperform. Note that the `tagcaption` leaderboard incorporates code from the Microsoft COCO Caption Evaluation repository of [Tsung-Yi Lin][4].

## Prerequisites ##

*Install Node.JS and NPM*
+ For OS X this can be simply done using Homebrew by running `brew install node`.
+ For RHEL6 machines this can be done by running `curl -sL https://rpm.nodesource.com/setup_6.x | sudo -E bash -`.

*Install Dependencies*
+ Run `npm install` in the directory where the archive was unpacked to install the dependencies the leaderboard needs in order to run.

## Instructions ##

*Create the leaderboard*
+ Look at the structure and contents of both the `placing` and `tagcaption` directories for inspiration.
+ Add, remove or modify the front-end files (the .pug files in the 'views' subdirectory and the corresponding images and stylesheets in the 'public' subdirectory) and the back-end files (the .js files) so it looks and works the way you want.
+ Replace the files in the 'evaluation' subdirectory with your own data, and change the email templates in the 'emailer' directory.

*Configure the leaderboard*
+ Update the path in the `app.js` file to point to the subdirectory where your leaderboard resides.
+ Replace the placeholder login/password of an STMP-enabled email account in the `config.json` file located in the leaderboard subdirectory. The easiest is to create a new Gmail address, enable two-factor authentication, and then create an app-specific password (this will allow you to hide the real password of the account and to easily create disposable passwords, which is useful in the case of an accidental commit to GitHub).
+ Start the application with `npm start` from the directory where the archive was unpacked.
+ Access the leaderboard locally at `http://localhost:8080`, or at the port you specified in the config file.
+ Consider using Amazon AWS or another cloud computing service to easily host the leaderboard online.

[1]: https://github.com/chauff/MediaEvalLeaderboard
[2]: https://multimediacommons.wordpress.com/placing-task/
[3]: https://multimediacommons.wordpress.com/tag-caption-prediction-challenge/
[4]: https://github.com/tylin/coco-caption
