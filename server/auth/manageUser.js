var pwdMgr = require('./managePasswords');

module.exports = function (server, db, config) {
  //POST signup form.
  server.post('/api/v1/msa/auth/register', function (req, res, next) {
    var user = req.params;
    pwdMgr.cryptPassword(user.password, function (err, hash) {
      user.password = hash;
      var formData = {
        TableName: config.STARTUP_SIGNUP_TABLE,
        Item: {
          mobile: {'S': user.mobile},
          password: {'S': user.password}
        }
      };
      
      console.log('mobile: %s', user.mobile);
      console.log('crypted password: %s', user.password);
      
      db.putItem(formData, function(err, data) {
        if (err) { // duplicate key error
          console.log('Error adding item to database: %s', err);
          if (err.code == 11000) {
            res.writeHead(400, {
              'Content-Type': 'application/json; charset=utf-8'
            });
            res.end(JSON.stringify({
              error: err,
              message: "A user with this mobile already exists"
            }));
          }
        } else {
          console.log('Form data added to database.');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
          });
          data.password = "";
          res.end(JSON.stringify(data));
          var snsMessage = "New signup: %MOBILE%"; //Send SNS notification containing mobile from form.
          snsMessage = snsMessage.replace('%MOBILE%', formData.Item.mobile['S']);
          sns.publish({ TopicArn: config.NEW_SIGNUP_TOPIC, Message: snsMessage }, function(err, data) {
            if (err) {
              console.log('Error publishing SNS message: ' + err);
            } else {
              console.log('SNS message sent.');
            }
          });
        }
      });
    });
    return next();
  });

  server.post('/api/v1/msa/auth/login', function (req, res, next) {
    var user = req.params;
    if (user.mobile.trim().length == 0 || user.password.trim().length == 0) {
      res.writeHead(403, {
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
          error: "Invalid Credentials"
      }));
    }

    var formData = {
      TableName: config.STARTUP_SIGNUP_TABLE,
      Key: {
        mobile: {'S': user.mobile}
      },
      AttributesToGet: [
        "password"
      ]
    };
    db.getItem(formData, function(err, data) {
      if (err) {
        console.log('User does not exist: ' + err);
      } else {
        console.log('Find the user in database.');
        pwdMgr.comparePassword(user.password, data.password, function (err, isPasswordMatch) {
          if (isPasswordMatch) {
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8'
            });
            //Remove password hash before sending to the client
            data.password = "";
            res.end(JSON.stringify(data));
          } else {
            res.writeHead(403, {
              'Content-Type': 'application/json; charset=utf-8'
            });
            res.end(JSON.stringify({
              error: "Invalid User"
            }));
          }
        });
      }
    });
    return next();
  });
};