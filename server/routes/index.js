var app = require('express');
var router = app.Router();
var path = require('path');



////////// import routes /////////////
// var download = require('./download');
var mapData = require('./mapdata');
var getData = require('./getdata');
var speciesDetail = require('./speciesdetail');


///////////// routes /////////////////
router.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, '../public/views/index.html'));
});

router.use('/mapdata', mapData);
router.use('/add', download);
router.use('/getdata', getData);
router.use('/speciesdetail', speciesDetail);





///////////////////////////////////////

module.exports = router;
