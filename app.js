var bodyParser = require('body-parser');
var path = require('path');

var $error = require('./lib/error');
var app = require('./lib/application');
var config = require('./common/config.json');
var restapi = require('./lib/restapi');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// uncomment after under construction
//app.use($error.underConstruction());

// load api routers
var restapiConfig = config.restapi;
restapiConfig.modelBasePath = path.join(__dirname, 'models');
app.use('/api', restapi.init(restapiConfig));

restapi.applyModel('user');
/*
restapi.applyModel('#1');
restapi.applyModel('#2', {});
restapi.applyModel({ "name": "#3", "model": {} });
restapi.applyModel({ "name": "#4", "model": {} }, { "name": "#5", "model": {} }, { "name": "#6", "model": {} });
restapi.applyModel([
  { "name": "#7", "model": {} },
  { "name": "#8", "model": {} },
  { "name": "#9", "model": {} }
]);
*/

app.use('/', function(req, res, next) {
  //res.end("" + result);
  // restapi.execute('get', 'user', { 'q': 'From Router!' })
  //   .then(function(result) {
  //     res.write(JSON.stringify(result));
  //     res.end();

  //   }).catch(function(err) {
  //     console.log(err);
  //     res.write(JSON.stringify(err));
  //     res.end();
  //   });
  //res.end("It's work!");

  // 
  restapi.execute('user', { 'where': '`id` = 3' })
    .then(function(result) {
      res.write(JSON.stringify(result));
      res.end();

    }).catch(function(err) {
      console.log(err);
      res.write(JSON.stringify(err));
      res.end();
    });
});

module.exports = app.init();