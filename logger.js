var LOGGER = require('winston');

LOGGER.setLevels({
    debug:0,
    info: 1,
    error: 2
});
LOGGER.addColors({
    debug: 'green',
    info:  'yellow',
    error: 'red'
});

LOGGER.remove(LOGGER.transports.Console);
LOGGER.add(LOGGER.transports.Console, { level: 'debug', colorize:true });

module.exports = LOGGER;