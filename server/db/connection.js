var pg = require('pg');

pg.defaults.ssl = true;
var connectionString = process.env.DATABASE_URL;
pg.connect(connectionString, function(err, client) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');
});

function initializeDB(){
  return new Promise(function(resolve, reject) {
  pg.connect(connectionString, function(err, client, done){
    console.log('connected to pg');
    if(err){
      console.log('Error connecting to DB!', err);
      reject(Error(err));
      process.exit(1);

    } else {

      var listTable = 'CREATE TABLE IF NOT EXISTS species_list (' +
      'species varchar(255) NOT NULL,' +
      '"class" varchar(255) NOT NULL,' +
      '"order" varchar(255),' +
      '"family" varchar(255),' +
      'genus varchar(255),' +
      'colid varchar(255),' +
      'gbif varchar(255),' +
      'iucnStatus varchar(255),' +
      'n_seqs varchar(255),' +
      'meanseqlen varchar(255),' +
      'minseqlen varchar(255),' +
      'maxseqlen varchar(255),' +
      'inZoo varchar(255),' +
      'survind INT,' +
      'fertind INT,' +
      'disko INT,' +
      'html_color varchar(255),' +
      'totalrec varchar(255),' +
      'totaldata varchar(10),' +
      'colurl varchar(255),' +
      'gbifurl varchar(255));';


      var detailTable = 'CREATE TABLE IF NOT EXISTS species_details (' +
      'sourcedb varchar(255) NOT NULL,' +
      'species varchar(255) NOT NULL,' +
      'varvalt varchar(255),' +
      'varname varchar(255),' +
      'varval varchar(255),' +
      'weightsize varchar(255),' +
      'biofunctio varchar(255),' +
      'dimension varchar(255),' +
      'lifematrix varchar(255),' +
      'demovar varchar(255),' +
      'demovsex varchar(255),' +
      'agestage varchar(255),' +
      'sampsize varchar(255),' +
      'poptrenden varchar(255),' +
      'nyears varchar(255),' +
      'npop varchar(255),' +
      'origin varchar(255),' +
      'sex varchar(255),' +
      'quality varchar(255),' +
      'adddata varchar(255),' +
      'lifematrixlevel varchar(255),' +
      'lucnstatus varchar(255),' +
      'n_seqs varchar(255),' +
      'gbif varchar(255),' +
      'meanseqlen varchar(255),' +
      'minseqlen varchar(255),' +
      'maxseqlen varchar(255),' +
      'genus varchar(255),' +
      '"family" varchar(255),' +
      '"order" varchar(255),' +
      '"class" varchar(255),' +
      'phylum varchar(255),' +
      'kingdom varchar(255),' +
      'colid varchar(255),' +
      'grp1 varchar(255),' +
      'grp3 varchar(255));';

      var downloadTable = 'CREATE TABLE IF NOT EXISTS download_details (' +
      'id SERIAL PRIMARY KEY,' +
      'first_name varchar(255) NOT NULL,' +
      'last_name varchar(255) NOT NULL,' +
      'email varchar(255),' +
      'institution varchar(255), ' +
      'token varchar(50),' +
      'date_submitted timestamp,' +
      'list_token_is_valid boolean DEFAULT TRUE,' +
      'details_token_is_valid boolean DEFAULT TRUE)';

      var query = client.query(listTable + detailTable + downloadTable);


      query.on('end', function(){
        console.log('species_list, species_detail, and download_details tables created');
        resolve();
        done();
        });


      query.on('error', function(err) {
        console.log('Error executing query', err);
        reject(Error(err));
      });
     }

  });
 });
}


 module.exports.connectionString = connectionString;
 module.exports.initializeDB = initializeDB;
