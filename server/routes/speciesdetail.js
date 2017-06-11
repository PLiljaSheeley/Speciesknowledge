var router = require('express').Router();
var pg = require('pg');

var connectionString = require('../db/connection').connectionString;

// had to switch as body-parse won't parse data body off of GET request
router.get('/:id', function(req, res) {

  var genusToLoad = req.params.id;
  var allSpeciesInGenus = {};

  pg.connect(connectionString, function(err, client, done) {
    // query database for all data within given genus

    var query = client.query(`SELECT DISTINCT species, gbif FROM species_details WHERE genus='${genusToLoad}';`);

    query.on('row', function(row) {
      allSpeciesInGenus[row.species] = [];
        // gbif: row.gbif,
        // sourcedb: [],
        // varname: [],
        // varval: []
      // };
    });

    query.on('error', function(err) {
      console.log(err);
    });

    query.on('end', function() {
      // console.log(allSpeciesInGenus);
      getDetailData(client, function() {
        // console.log(allSpeciesInGenus);
        done();
        res.send(allSpeciesInGenus);
      });
    });

    query.on('error', function(err) {
      console.log(err);
    });
  });

  function getDetailData(client, callback) {
    var query = client.query(`SELECT DISTINCT species, sourcedb, varname, varval FROM species_details WHERE genus='` + genusToLoad + `' ORDER BY sourcedb;`);

    query.on('row', function(row) {
      allSpeciesInGenus[row.species].push({
        sourcedb: row.sourcedb ? row.sourcedb : null,
        varname: row.varname ? row.varname : null,
        varval: row.varval ? row.varval : null
      });
      // allSpeciesInGenus[row.species].varname.push(row.varname);
      // allSpeciesInGenus[row.species].varval.push(row.varval);
    });

    query.on('error', function(err) {
      console.log(err);
    });

    query.on('end', function() {
      return callback();
    });
  }
});

module.exports = router;
