var events = require('events'),
    path = require('path'),
    ModuleLoader = require('./modules'),
    IntentService = require('./chat/intent'),
    HistoryService = require('./chat/history'),
    configLoader = require('./config'),
    Route = require('./chat/route'),
    DatabaseConnection = require('./database'),
    UserManager = require('./users'),
    Q = require('q'); //jshint ignore:line

function Bot(config) {
    // Determine version
    this.version = require('../package.json').version;

    // Load hardcoded configuration
    configLoader.loadConfig(config);

    // Load yaml files
    configLoader.loadYml();

    // Store references for modules to use
    this.config = configLoader.config;
    this.configLoader = configLoader;

    // Setup event bus
    this.events = new events.EventEmitter();

    // DB init must be before other bits
    this.db = new DatabaseConnection(this);
    this.db.connect();

    // Setup the functional sub-bits
    this.history = new HistoryService(this);
    this.intent = new IntentService(this);
    this.users = new UserManager(this);
    this.modules = new ModuleLoader(this);

    this.events.on('db_connected', this.initConnectors.bind(this));

    // Handle exits from wherever
    process.on('exit', (function () {
        this.shutdown();
    }).bind(this));
}

Bot.prototype = {
    // Signal shutdown to various modules (db, connectors, etc)
    shutdown : function () {
        // Make sure we only shut down once.
        if (this.shutting_down) { return; }
        this.shutting_down = true;

        console.log('\nGoodbye cruel world...');

        this.events.emit('shutdown');
    },

    // Turn on the connectors (after the DB loads)
    initConnectors : function () {
        var connector;
        this.connectors = {};

        if (this.config.connectors && this.config.connectors.length) {
            // Load specified connectors
            for (var i = 0; i < this.config.connectors.length; i++) {
                var module = this.config.connectors[i].module,
                    modulePath = path.join(process.cwd(), this.config.node_directory, module);
                try {
                    // Create the connector, pass it some stuff it should know.
                    connector = new (require(modulePath))(this, i, Route);
                } catch (e) {
                    console.error('Error loading connector', module + '-' + i);
                    throw e;
                }
                this.connectors[connector.idx] = connector;
            }
        } else {
            // No connectors specified - load the shell
            connector = new (require('./chat/shell'))(this, 0, Route);
            this.connectors[connector.idx] = connector;
        }
    }
};

module.exports = Bot;
