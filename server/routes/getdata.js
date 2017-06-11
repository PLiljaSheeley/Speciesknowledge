// Checks to see if a user has a valid token, sends data file if valid

var router = require('express').Router();
var pg = require('pg');
var url = require('url');
var path = require('path');
var connectionString = require('../db/connection').connectionString;


router.get('/getlist', function(req, res){
  pg.connect(connectionString, function(err, client, done){
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      var urlParts = url.parse(req.url, true);
      var idToTest = urlParts.query.uid;
      var tokenToTest = urlParts.query.token;
      var tokenFound = false;
      var results = [];

      var query = client.query('SELECT * FROM download_details WHERE id = $1 AND token = $2 AND list_token_is_valid = TRUE', [idToTest, tokenToTest]);

      query.on('error', function(err){
        console.log(err);
        res.sendStatus(500);
      });

      query.on('row', function(rowData){
        tokenFound = true;
        results.push(rowData);
      });

      query.on('end', function(){
        if (tokenFound) {
          markComplete(results[0].id, 'list_token_is_valid');
          // insert path to download here
          res.download(path.join(__dirname, '../../files/species_list.csv.zip'));
        } else {
          // insert fail case here
          res.send('No valid token found');
        }
        done();
      });
    }
  });
});

router.get('/getdetails', function(req, res){
  pg.connect(connectionString, function(err, client, done){
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      var urlParts = url.parse(req.url, true);
      var idToTest = urlParts.query.uid;
      var tokenToTest = urlParts.query.token;
      var tokenFound = false;
      var results = [];

      var query = client.query('SELECT * FROM download_details WHERE id = $1 AND token = $2 AND details_token_is_valid = TRUE', [idToTest, tokenToTest]);

      query.on('error', function(err){
        console.log(err);
        res.sendStatus(500);
      });

      query.on('row', function(rowData){
        tokenFound = true;
        results.push(rowData);
      });

      query.on('end', function(){
        if (tokenFound) {
          markComplete(results[0].id, 'details_token_is_valid');
          // insert path to download here
          res.download(path.join(__dirname, '../../files/species_details.csv.zip'));
        } else {
          // insert fail case here
          res.send('No valid token found');
        }
        done();
      });
    }
  });
});

// marks a download as complete in the database and invalidates the token
function markComplete(uid, token) {
  pg.connect(connectionString, function(err, client, done){
    if (err) {
      console.error(err);
    } else {
      var query = client.query('UPDATE download_details SET ' + token + ' = false WHERE id = $1', [uid]);
      
      query.on('error', function(error){
        console.log(error);
      });

      query.on('end', function(){
        done();
      });
    }
  });
}

module.exports = router;
