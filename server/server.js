//Get modules
var restify = require('restify');
var fs = require('fs');
var AWS = require('aws-sdk');
var server = restify.createServer();

//Read config values from a JSON file.
var config = fs.readFileSync('./app_config.json', 'utf8');
config = JSON.parse(config);
//Add the keys in environment variable, so comment out the below statement.
//AWS.config.update({accessKeyId: 'AKIAJYJUC4B4BBY6ERHQ', secretAccessKey: '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'});

//Create DynamoDB client and pass in region.
var db = new AWS.DynamoDB({region: config.AWS_REGION});
//Create SNS client and pass in region.
var sns = new AWS.SNS({ region: config.AWS_REGION});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// CORS
server.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

server.listen(process.env.PORT || 9804, function () {
  console.log("Server started @ ", process.env.PORT || 9804);
});

var manageUsers = require('./auth/manageUser')(server, db, config);