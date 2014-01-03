var DB = require('./DB.js');

console.log('connecting to memcache...');

DB.start(function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('... connected to memcache!');

  var fs = require('fs');
  var http = require('http');
  var https = require('https');

  var app = require('./app');

  var httpServer = http.createServer(app);

  // starting https server
  var privateKey  = fs.readFileSync('sslcert/ca.key', 'utf8');
  var certificate = fs.readFileSync('sslcert/ca.crt', 'utf8');

  var credentials = { key: privateKey, cert: certificate };

  var httpsServer = https.createServer(credentials, app);

  httpServer.listen(80);
  httpsServer.listen(443);

  console.log('listening on port 80 and 443');
});
