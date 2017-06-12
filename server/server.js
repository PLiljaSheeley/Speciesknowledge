var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var port = process.env.PORT || 3000;

////////////import modules//////////
var initializeDB = require('./db/connection').initializeDB;
var index = require('./routes/index');

//////////// config /////////////
app.use(express.static('server/public'));
app.use(bodyParser.json());



///////////routes/////////////
app.use('/', index);




/////// DB ////////
initializeDB();





//listen
app.listen(port, function() {
  console.log('listening on port', port);
});
