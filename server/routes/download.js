var router = require('express').Router();
var pg = require('pg');
var crypto = require('crypto');
var bs58 = require('bs58');
var emailer = require('../../modules/email');
var connectionString = require('../db/connection').connectionString;

router.post('/', function(req, res){
  pg.connect(connectionString, function(err, client, done){
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      var result = [];
      var first_name = req.body.first_name;
      var last_name = req.body.last_name;
      var email = req.body.email;
      var institution = req.body.institution;
      var today = new Date();

      //create buffer for token
      var tokenData = crypto.randomBytes(16);
      //convert token to alphanumberic
      var token = bs58.encode(tokenData);

      var query = client.query('INSERT INTO download_details(first_name, last_name, email, institution, token, date_submitted)'+ ' VALUES ($1, $2, $3, $4, $5, $6) ' +
                                'RETURNING id, first_name, last_name, email, institution', [first_name, last_name, email, institution, token, today]);
      query.on('row', function(row){
        result.push(row);
      });

      query.on('end', function() {
        // send email containing link
        emailer(email, result[0].id, token);
        res.sendStatus(200);
        done();
      });

      query.on('error', function(error) {
        console.error('Error running query:', error);
        res.status(500).send(error);
      });
    }
  });
});


module.exports = router;
