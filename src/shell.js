var readline = require('readline');

function ShellConnector(bot) {
	var self = this;
	self.bot = bot;
    self.config = bot.config.connector;

    this.stdin = process.openStdin()
    this.stdout = process.stdout

    self.repl = readline.createInterface(this.stdin, this.stdout, null)

    self.repl.on('close', function() {
		self.bot.shutdown();
	});

	self.repl.on('line', function(buffer) {
		self.bot.events.emit('sawMessage', {user: null, room: null}, buffer);		
		self.repl.prompt();
	})

	self.bot.events.on('shutdown', self.shutdown.bind(this));
	self.bot.events.on('sendMessage', self.send.bind(this));

	self.repl.setPrompt(self.bot.config.name + ">");
	self.repl.prompt();

	self.bot.events.emit('connected');

}

ShellConnector.prototype.send = function (route, message, deferred) {
	console.log("-->", message);
	deferred.resolve();
	this.repl.prompt();
}

ShellConnector.prototype.shutdown = function () {
	this.repl.close();
	this.stdin.destroy();
}

ShellConnector.prototype.joinRoom = function (room) {
	console.log('Joining Room', room);
	self.bot.events.emit('joinedRoom', room);
}

ShellConnector.prototype.leaveRoom = function (room) {
	console.log('Leaving Room', room);
	self.bot.events.emit('leftRoom', room);
}

module.exports = ShellConnector
