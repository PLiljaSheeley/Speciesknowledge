var pg = require('pg');
var connectionString = require('../server/db/connection').connectionString;
var initializeDB = require('../server/db/connection').initializeDB;
var path = require('path');
var fs = require('fs');
var exec = require('child_process');

var filesDir = path.join(__dirname, '..', 'files/');



pg.connect(connectionString, function(err, client, done){

  var query = client.query('DROP TABLE IF EXISTS species_list, species_details;');

  query.on('err', function(err) {
    console.log(err);
  });

  query.on('end', function() {
    console.log('Deleting and remaking tables...');
    var del = exec.exec('rm -rf ./files/zip');
    initializeDB().then(function(){
      unZip().then(function() {
       addData(client);
      })
      .catch(err => {
        throw(err.toString());
        process.exit(1);
      });
    });
  });
});


function addData(client) {
  console.log('now copying files into the db. This might take a bit...');

  var query_list = `COPY species_list FROM '${filesDir}zip/species_list.csv' WITH NULL AS 'NA' DELIMITER ',' CSV HEADER;`;
  var query_details = `COPY species_details FROM '${filesDir}zip/species_details.csv' WITH NULL AS 'NA' DELIMITER ',' CSV HEADER;`;

  var query = client.query(query_list + query_details);

  query.on('err', function(err) {
    console.log(err);
  });

  query.on('end', function() {
    console.log('donezo');
    deleteFiles();
  });

}


function deleteFiles() {
  var del = exec.exec('rm -rf ./files/zip');
    console.log('Deleted temp folder');
    console.log('Good to go baby!');
    process.exit(1);
}


function unZip() {

  return new Promise(function(success, fail) {
    var complete = [false, false];
    var unzipDetails = exec.spawn('unzip', ['-o', filesDir + 'species_details.csv.zip','-d', filesDir + 'zip/'], {encoding: 'utf8'});
      console.log('Unzipping species_details...');
    var unzipSpecies = exec.spawn('unzip', ['-o', filesDir + 'species_list.csv.zip','-d', filesDir + 'zip/'], {encoding: 'utf8'});
      console.log('Unzipping species_list...');

    unzipDetails.on('error', (err) => {
      console.log('error:', err);
      fail(err);
    });

    unzipDetails.stderr.on('data', (err) => {
      console.log(err.toString());
      fail(err);
    });

    unzipDetails.on('close', (code) => {
      complete[0] = true;
      console.log('Done with details!');
      if(complete[0] === complete[1]) {
        success();
      }
    });

    unzipSpecies.on('error', (err) => {
      console.log('error:', err);
      fail(err);
    });

    unzipDetails.stderr.on('data', (err) => {
      console.log('error:', err.toString());
      fail(err);
    });


    unzipSpecies.on('close', (code) => {
      complete[1] = true;
      console.log('Done with species list');
      if(complete[0] === complete[1]) {
        success();
      }
   });
 });
}
