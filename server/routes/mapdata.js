var router = require('express').Router();
var path = require('path');
var pg = require('pg');
var connectionString = require('../db/connection').connectionString;
var fs = require('fs');
var os = require('os');


router.get('/', function(req, res) {
  console.log('got request');

  // memory debug stuff
  var mem = process.memoryUsage();
  console.log('Process memory:', mem, 'Heap Remaining:', mem.heapTotal - mem.heapUsed);
  console.log('Global memory:', os.totalmem());
  console.log('Global free memory:', os.freemem());
  console.log('pools', Object.keys(pg.pools.all));

  pg.connect(connectionString, function(err, client, done) {

    // set variables we'll use to sort things later
    var result = [];
    var classIndex = [];


// select all unique classes and group so we only get one instance of each
    var query = client.query('SELECT "class", COUNT("class"), round(AVG(survind)) as survind, round(AVG(fertind)) as fertind, round(AVG(disko)) as disko FROM species_list GROUP BY "class";');

    query.on('error', function(err) {console.log('err', err);});

    query.on('row', function(row) {
      // push classes into result in the format Foam Tree uses

      result.push({label: row.class, groups: [], weight: Math.sqrt(row.count * 1), survind: parseInt(row.survind), fertind: parseInt(row.fertind), disko: parseInt(row.disko), groupLevel: 1});

       // push to an array that we'll use to find the class later
      classIndex.push(row.class);
    });

      // on end, perform next DB search. It's in the 'end' event because it needs to be synchronous
    query.on('end', function() {
      // select orders and group so we only get one instance of each
      var query = client.query('SELECT "order", COUNT("order"), "class", round(AVG(survind)) as survind, round(AVG(fertind)) as fertind, round(AVG(disko)) as disko FROM species_list GROUP BY "order","class";');

      query.on('error', function(err) {console.log('err', err);});

      query.on('row', function(row) {
        // find where in the array the class is
        var index = classIndex.indexOf(row.class);
        // push into that class' group array the order
        result[index].groups.push({label: row.order, groups: [], weight: Math.sqrt(row.count * 1), survind: parseInt(row.survind), fertind: parseInt(row.fertind), disko: parseInt(row.disko), groupLevel: 2});

      });

      query.on('end', function() {
        // now find families
        var query = client.query('SELECT "family", COUNT("family"), "order", "class", round(AVG(survind)) as survind, round(AVG(fertind)) as fertind, round(AVG(disko)) as disko FROM species_list GROUP BY "family", "order", "class";');

        query.on('error', function(err) {console.log('err', err);});

        query.on('row', function(row) {
          var ci = classIndex.indexOf(row.class);
          // find the index of the order in the class' group array by searching for the name
          var oi = result[ci].groups.findIndex(s => s.label === row.order);
          result[ci].groups[oi].groups.push({label: row.family, groups: [], weight: Math.sqrt(row.count * 1), survind: parseInt(row.survind), fertind: parseInt(row.fertind), disko: parseInt(row.disko), groupLevel: 3});
        });

        query.on('end', function() {
          var query = client.query('SELECT split_part(species, \' \', 1) AS genus, split_part(species, \' \', 2) AS species, "family", "order", "class", survind, fertind, disko, gbif FROM species_list;');

          query.on('error', function(err) {console.log('err', err);});

          query.on('row', function(row) {
            // same methods as above but with genus and species
            var ci = classIndex.indexOf(row.class);
            var oi = result[ci].groups.findIndex(s => s.label === row.order);
            var fi = result[ci].groups[oi].groups.findIndex(s => s.label === row.family);
            var gi = result[ci].groups[oi].groups[fi].groups;
            if(gi.every(s => s.label !== row.genus)){
              gi.push({label: row.genus, groups: [], weight: 0, survind: row.survind, fertind: row.fertind, disko: row.disko, groupLevel: 4});
            }
            gi[gi.length-1].weight++;
            var genus = gi.findIndex(s => s.label === row.genus);
            gi[genus].groups.push({label: row.genus + " " + row.species, weight: 0, survind: parseInt(row.survind), fertind: parseInt(row.fertind), disko: parseInt(row.disko), groupLevel: 5, gbif: parseInt(row.gbif)});
          });

          query.on('end', function() {
            res.send(result);
            console.log('sent');
            done();
          });
        });
      });
    });
  });
});

router.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, '../public/views/index.html'));
});


module.exports = router;
