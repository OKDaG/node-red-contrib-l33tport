module.exports = function(RED) {
  function SpeedportNode(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    node.on('input', function(msg) {

      var sjcl = require("sjcl");
      var querystring = require('querystring');
      var http = require('http');
      
      var challengev = "";
      var sessionID = "";
      
      function fetchUrl(host, path, onResult) {
          var options = {
            host: host,
            port: 80,
            path: path,
            method: 'GET',
          };
          var req = http.request(options, function(res) {
              var output = '';
              res.setEncoding('utf8');
              res.on('data', function (chunk) {
                  output += chunk;
              });
              res.on('end', function() {
                  onResult(res.statusCode, output);
              });
          });
          req.on('error', function(err) {
              //res.send('error: ' + err.message);
          });
          req.end();
      };
      
      function fetchIndexPage(filename, dataCallback) {
        fetchUrl(SPEEDPORT, '/html/login/index.html', function(statusCode, result) {
          var challenge = result.match("[0-9,a-z,A-Z]{64}");
          handleChallenge(challenge, filename, dataCallback);
        });
      }
      
      function handleChallenge(challenge, filename, dataCallback) {
        var encryptpwd = sjcl.hash.sha256.hash(challenge + ":" + PASSWORD);
        var passwordhash = sjcl.codec.hex.fromBits(encryptpwd, true);
        sendPassword(passwordhash, challenge, filename, dataCallback);
      }
      
      function sendPassword(passwordHash, challenge, filename, dataCallback) {
        var data = querystring.stringify({
            password: passwordHash,
            csrf_token: "nulltoken",
            showpw: "0",
            challengev: challenge
          });
        var options = {
            host: SPEEDPORT,
            path: '/data/Login.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'http://' + SPEEDPORT + '/html/login/index.html',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            var body = '';
            res.on('data', function (chunk) {
              body += chunk;
            }).on('end', function() {
                var statusJSON = body.replace(/}\s*,\s*]/g, "}]");
                status = JSON.parse(statusJSON);
                var statusDict = {};
                for (var v in status) {
                  statusDict[status[v].varid] = status[v].varvalue
                }
                if (statusDict['login'] != 'success') {
                  node.error("Login failed! ", statusDict);
                  process.exit(1);
                }
                var cookie = res.headers['set-cookie'].toString();
                var sid = cookie.match(/^.*(SessionID_R3=[a-zA-Z0-9]*).*/);
                sessionID = sid[1];
                downloadJsonInfo(filename, dataCallback);
            });
        });
        req.write(data);
        req.end();
      }
      
      function downloadJsonInfo(fileName, dataCallback)
      {
        var cookie = "challengev=" + challengev + "; " + sessionID;
        var requestPath = "/data/" + fileName + ".json";
        var options = {
            host: SPEEDPORT,
            path: requestPath,
            method: 'GET',
            headers: {
                'Cookie': cookie
            }
        };
        http.get(options, function(res) {
          if (200 != res.statusCode) {
            node.error("WTF: ", res.statusCode);
          }
          var body = '';
          res.on('data', function (chunk) {
              body += chunk;
          }).on('end', function() {
              var fixedQuotes = body.replace(/\'/g,'\"');
              var fixedArrays = fixedQuotes.replace(/\},\s+? +?\]/,"}\n    ]");
              dataCallback(fixedArrays);
          }).on('error', function(e) {
            node.error("Got error: ", e);
          });
        });
      }
      
      function safeParse(input) {
          var parsed = null;
          try{
            parsed = JSON.parse(input.replace(/}\s*,\s*]/g, "}]"));
          }
          catch (e) {
            node.error("Could not parse JSON:");
            node.error(input);
            var exmsg = "";
            if (e.message) {
                exmsg += e.message;
            }
            if (e.stack) {
                exmsg += '\n' + e.stack;
            }
            node.error(exmsg);
          }
          return parsed;
      }
      
      fetchIndexPage(program.filename, function(data) {
        var parsed = safeParse(data);
        msg.payload = JSON.stringify(parsed);
      });

      node.send(msg);
    });
  }
  RED.nodes.registerType("speedport",SpeedportNode);
}