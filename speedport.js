module.exports = function(RED) {
  function SpeedportNode(n) {
    RED.nodes.createNode(this,n);
    this.device = n.device;
    this.config = RED.nodes.getNode(this.device);
    this.host = this.config.host;
    this.password = this.config.credentials.password;
    var node = this;

    node.config.on('statusUpdate', node.status);

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
          node.error(`error: ${err.message}`);
        });
        req.end();
      };
      
      function fetchIndexPage(filename, host, password, dataCallback) {
        fetchUrl(host, '/html/login/index.html', function(statusCode, result) {
          var challenge = result.match("[0-9,a-z,A-Z]{64}");
          handleChallenge(challenge, filename, host, password, dataCallback);
        });
      }
      
      function handleChallenge(challenge, filename, host, password, dataCallback) {
        var encryptpwd = sjcl.hash.sha256.hash(challenge + ":" + password);
        var passwordhash = sjcl.codec.hex.fromBits(encryptpwd, true);
        sendPassword(passwordhash, challenge, filename, host, dataCallback);
      }
      
      function sendPassword(passwordHash, challenge, filename, host, dataCallback) {
        var data = querystring.stringify({
            password: passwordHash,
            csrf_token: "nulltoken",
            showpw: "0",
            challengev: challenge
          });
        var options = {
            host: host,
            path: '/data/Login.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'http://' + host + '/html/login/index.html',
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
              try {
                status = JSON.parse(statusJSON);
              }
              catch (e) {
                node.error("Could not parse JSON:");
                node.error(statusJSON);
                var exmsg = "";
                if (e.message) {
                    exmsg += e.message;
                }
                if (e.stack) {
                    exmsg += '\n' + e.stack;
                }
                node.error(exmsg);
                return
              }
              var statusDict = {};
              for (var v in status) {
                statusDict[status[v].varid] = status[v].varvalue
              }
              if (statusDict['login'] != 'success') {
                node.error("Login failed! ", statusDict);
              }
              var cookie = res.headers['set-cookie'].toString();
              var sid = cookie.match(/^.*(SessionID_R3=[a-zA-Z0-9]*).*/);
              sessionID = sid[1];
              downloadJsonInfo(filename, host, dataCallback);
            });
        });
        req.write(data);
        req.end();
      }
      
      function downloadJsonInfo(filename, host, dataCallback)
      {
        var cookie = "challengev=" + challengev + "; " + sessionID;
        var requestPath = "/data/" + filename + ".json";
        var options = {
            host: host,
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
        try {
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
      
      fetchIndexPage(msg.payload, this.host, this.password, function(data) {
        msg.payload = safeParse(data);
        node.send(msg);
      });

    });
  }
  RED.nodes.registerType("speedport",SpeedportNode);
}