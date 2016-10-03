// global imports
var logger = require('winston');

// different levels of logging and their coloring
logger.setLevels({
    debug: 0,
    info:  1,
    error: 2
});
logger.addColors({
    debug: 'green',
    info:  'yellow',
    error: 'red'
});

// replace console logger
logger.remove(logger.transports.Console).add(logger.transports.Console, { colorize: true });
// also log to file
logger.add(logger.transports.File, { filename: 'leaderboard.log' });

// export the module
module.exports = logger;