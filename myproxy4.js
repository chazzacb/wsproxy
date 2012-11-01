// myproxy4.js
// HttpProxy�Ƃ��ėv�����󂯂āAWebSocket�ɂ��ėv����]������B
// WebSocket���牞�����󂯂āAHttpProxy�ɓ]������B

// ��O���������Ă��T�[�r�X���~���Ȃ��悤�ɂ���
process.on('uncaughtException', function(err) {
	console.log(err.stack);
});

var app = require('http').createServer(handler), io = require('socket.io')
		.listen(app), fs = require('fs')

app.listen(80);

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

var myWsClient = {};
var count = 0;
var webClients = {};

io.sockets.on('connection', function(wsclient) {
	myWsClient = wsclient;
	console.log("HTTP Proxy start");
	var server = doProxy(wsclient);
	wsclient.on('end', function() {
		console.log("HTTP Proxy end");
		server.close();
	});
});

function doProxy(wsclient) {
	// HttpProxy���J�n����B
	var port = 8081;
	var sys = require('util');
	var net = require('net');

	var server = net.createServer(function(webBrowser) {
		count++;
		// �ڑ����Ă����u���E�U�̃\�P�b�g��ێ�����B
		webClients[count] = webBrowser;
		webBrowser.wid = count;

		console.log('web client connected [' + count + "]");

		// �N���C�A���g����f�[�^���󂯂��ꍇ
		webBrowser.on('data', function(data) {
			webBrowser.pause();
			var parseheader = data.toString().split(/\n/);
			if (parseheader[0].match(/^GET/)
					|| parseheader[0].match(/^CONNECT/)
					|| parseheader[0].match(/^POST/)) {
				console.log("client send : " + parseheader[0].toString());
			} else {
				console.log("client send ");
			}

			// Base64������WS->HttpProxy�֑���
			//console.log("to ws : " + data.toString('base64'));
			wsclient.emit('httptows', {
				httpdata : data.toString('base64'),
				wid : webBrowser.wid
			});
			webBrowser.resume();
		});

		webBrowser.on('end', function() {
			// �u���E�U�̐ڑ����ؒf���ꂽ�ꍇ�̏���
			console.log('client disconnected[' + webBrowser.wid + ']');
			wsclient.emit('httpend', {
				wid : webBrowser.wid
			});
			webClients[webBrowser.wid] = "";
		});

		webBrowser.on('close',
				function() {
					// �u���E�U�̐ڑ����ؒf���ꂽ�ꍇ�̏���
					console.log('client connection is closed.['
							+ webBrowser.wid + ']');
					webClients[webBrowser.wid] = "";

					wsclient.emit('httpend', {
						wid : webBrowser.wid
					});
				});

		webBrowser.on('error', function(err) {
			// �u���E�U�̐ڑ����ؒf���ꂽ�ꍇ�̏���
			console.log('client err[' + webBrowser.wid + '].' + err);
			webClients[webBrowser.wid] = "";

			wsclient.emit('httpend', {
				wid : webBrowser.wid
			});
		});

	}); // server

	server.listen(port, function() { //'listening' listener
		console.log('server bound');
	});

	wsclient.on('wstohttp', function(data) {
		// WebSocket����̉������u���E�U�ɕԂ��B
		if (webClients[data['wid']] == "") {
			console.log('web client connection has been closed.');
			wsclient.emit('httpend', {
				wid : data['wid']
			});
			return;
		}
		// WebSocket�o�R�Ō��ʎ��ABase64�f�R�[�h���ău���E�U�ɕԂ��B
		console.log('server send data : [' + data['wid'] + "]");
		var a = new Buffer(data['httpdata'].toString(), 'base64');
		var clientSocket = webClients[data['wid']];
		clientSocket.pause();
		clientSocket.write(a);
		//dumpResponse(a);
		clientSocket.resume();
	});

	wsclient.on('httpend', function(data) {
		console.log("server is closed.[" + data['wid'] + "]");
		// HttpProxy��ŃR�l�N�V�������؂ꂽ��A��������N���C�A���g��ؒf
		var clientSocket = webClients[data['wid']];
		console.log("clientSocket = "+clientSocket);
		if (clientSocket == "") {
			return;
		}
		clientSocket.end();
		webClients[data['wid']] = "";
	});

	wsclient.on('end', function() {
		console.log('server disconnected');
		
		//var clientSocket = webClients[data['wid']];
		//clientSocket.end();
	});

	sys.puts('Server listening on port ' + port);
}

function dumpResponse(buf) {
	var tmp = "";
	// �\���ł��镶���͕\������
	for ( var i = 0; i < buf.length; i++) {
		var c = buf.readUInt8(i);
		if ((c > 31 && c < 127) || c == 13 || c == 10) {
			tmp = tmp + String.fromCharCode(c);
		} else {
			tmp = tmp + c + ":";
		}
	}
	console.log(tmp);
}
