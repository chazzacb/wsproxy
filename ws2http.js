// ws2http
// WebSocket�Ń��N�G�X�g���󂯁AHttpPorxy�ɑ��M����B
// HttpPorxy����̉�����WebSocket�ő��M����

// ��O���������Ă��T�[�r�X���~���Ȃ��悤�ɂ���
process.on('uncaughtException', function(err) {
	console.log(err.stack);
});

var app = require('http').createServer(handler),
io = require('socket.io')
		.listen(app), fs = require('fs');

var net = require('net');

app.listen(8123);

function handler(req, res) {
	fs.readFile(__dirname + '/index.html', function(err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

io.sockets.on('connection', function(socket) {
	var isProxyClose = true;
	// HTTP Proxy�T�[�o�֐ڑ�����B
	var proxy = doProxyProc(socket, isProxyClose);

});

function doProxyProc(wsclient, isProxyClose) {
	var proxy = "";
	console.log('server connected');
	wsclient.on('wstohttp', function(data) {
		// WebSocket�Ńf�[�^���󂯂���HttpProxy�ɐڑ�����
		proxy = net.createConnection(8080, '127.0.0.1', function() {
			console.log("from client : " + data);
			// base64�f�R�[�h����proxy�T�[�o�ɑ���
			var a = new Buffer(data['httpdata'], 'base64');
			proxy.write(a);

			proxy.on('close', function() {
				console.log("proxy close.")
				wsclient.emit("httpend","end");
			});
			proxy.on('data', function(data) {
				// WebSocket��HttpProxy����̉�����Base64�G���R�[�h���ĕԂ��B
				var a = new Buffer(data);

				wsclient.emit('httptows', {httpdata:a.toString('base64')});
				console.log('from server : ' + a.toString('base64'));
			});

			proxy.on('end', function() {
				console.log('server disconnected');
				wsclient.emit('httpend', 'end');
				//socket.end();
			});
		});
		
	});
	wsclient.on('end', function() {
		console.log('client disconnected');
	});
	return proxy;
}
