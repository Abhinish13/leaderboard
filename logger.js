var LOGGER = require('winston');

LOGGER.setLevels({
    debug:0,
    info: 1,
    silly:2,
    warn: 3,
    error:4,
});
LOGGER.addColors({
    debug: 'green',
    info:  'cyan',
    silly: 'magenta',
    warn:  'yellow',
    error: 'red'
});

LOGGER.remove(LOGGER.transports.Console);
LOGGER.add(LOGGER.transports.Console, { level: 'debug', colorize:true });

module.exports = LOGGER;