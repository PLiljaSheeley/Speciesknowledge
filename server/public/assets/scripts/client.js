var app = angular.module("DiskoApp", ['sticky', 'ui.bootstrap', 'smart-table', 'ngAnimate']);

// directive to tell if images have been loaded
app.directive('imageonload', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
              // on the 'load' event, call the function or expression *on scope* that was given to the directive
                element.bind('load', function() {
                    scope.$apply(attrs.imageonload);
                });
            }
        };
    });

// listens to window for events and broadcasts them to controllers
app.service('ListenerService', ['$window', '$timeout', '$rootScope', function($window, $timeout, $rootScope) {

      function resize() {
        // listen for window resize
        $window.addEventListener('resize', function(event) {
          // we don't want to constantly update stuff as the window is being resized,
          // so we won't broadcast the event until 300ms after the resizing stopped
          var timeout;
          $window.clearTimeout(timeout);
          timeout = $window.setTimeout(function() {
            $rootScope.$broadcast('window.resize', event);
          }, 300);
        });
      }

      function orientation() {
        // listen for device orientation change
        $window.addEventListener('orientationchange', function(event) {

          $rootScope.$broadcast('window.orientation', event);
          console.log(event);
        });
      }

      function timeout(callback, time) {
        console.log('timeout');
        return $timeout(callback, time);
      }

      return {
        resize : resize,
        orientation: orientation,
        timeout: timeout
      };
}]); // ListenerService end


// grabs data from ajax calls
app.factory('DataService', ['$http', '$rootScope',function($http, $rootScope) {

    var mapGroup = {};
		var genus = {};
    var level = 0;
    var species = {};
    var colorSelected = {};

    // this function passes the promise into the controller
    var getMapData = function() {
        return $http.get('/mapdata');
      };

    var keyColor = function(str) {
      if (!str) {
        colorSelected.color = null;
      } else {
        colorSelected.color = str;
      }
    };

		var getGenusDetail = function(genusReq){
      console.log('getting detail for', genusReq);
				$http.get('/speciesdetail/' + genusReq).then(function(response) {
		      	genus.data = response.data;
            console.log(genus.data);
            console.log('genus', genus);
				}, function(err) {
          console.log('Genus query error', err);
        });
			};

    // updates current map view level. If called with no params, just returns current level
    var mapLevel = function(lvl) {
      if(lvl !== undefined) {
        level = lvl;
      }
      return level;
    };

    var mapSelection = function(group) {
      mapGroup.map = group;
      $rootScope.$broadcast('map.selection', group);
      return mapGroup.map;
    };

    var getSpeciesGBIFData = function(group, callback) {
      // grab vernacularName data
      $http.get('http://api.gbif.org/v1/species/' + group.gbif + '/vernacularNames').then(function(response) {
        // the api returns an array of responses from different data sources. Some are not in english.
        // however, each result has a 'language' key that tells us the language
        // so, we parse that array for the first result in english and put that object into englishResult
        var englishResult = response.data.results.find(function(s) {
          return s.language.toLowerCase() === 'eng';
        });
        // if no english result is found, it will be undefined.
        species.name = englishResult ? englishResult.vernacularName : "Not found";

        // no picture data
        return $http.get('http://api.gbif.org/v1/species/' + group.gbif + '/media').then(function(response) {
          // we also get an array of results for the image, but no real objective way to pick one over the other
          // so, if the results are more than 0 long, just pick the first one
          // if not, set it to generic 'not found' image
          console.log('picture query',response);
          species.picture = response.data.results.length ? response.data.results[0].identifier : 'images/no-image-available.jpg';
          // give the controller the array of results as well
          species.pictureList = response.data.results;
          // pass the species object into our callback cuz sometimes angular doesn't update well
          return callback(species);
        });
      });
    };

      return {
				genus: genus,
        species: species,
        getMapData: getMapData,
				getGenusDetail: getGenusDetail,
        mapLevel: mapLevel,
        mapSelection: mapSelection,
        mapGroup: mapGroup,
        getSpeciesGBIFData: getSpeciesGBIFData,
        keyColor: keyColor,
        colorSelected: colorSelected
      };
  }]); // DataService End

app.controller("HeaderController", function() {
  var controller = this;
  this.jumbotronShown = false;
  this.hideJumbotron = function() {
    console.log('BUTTON CLICKED');
    this.jumbotronShown = true;
  }
});

app.controller("DownloadController", ["$http", function($http) {

	var down = this;
  down.submitted = false;
	down.downloadObject = {};
	down.storeDownloadInfo = function(download){
    console.log(download);
    if (download.first_name.length > 0 &&
        download.last_name.length > 0 &&
        download.email.length > 0) {
          $http.post('/add', download);
          down.submitted = true;
        }

	};

}]); // download control end

app.controller("ShareController", ["$http", function($http){
  var share = this;
  share.facebookShare = function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.6&appId=974743415973546";
  fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk');
}]);

app.controller("SidebarController", ["DataService", "$scope", "$http", "$location", function(DataService, $scope, $http, $location) {

	var sidebar = this;
  sidebar.dataSet1 = 'Data Set 1';
	sidebar.genus = DataService.genus;
  sidebar.species = DataService.species;
  sidebar.mapGroup = DataService.mapGroup;
  DataService.mapSelection();
  sidebar.key = {colors: {}};
  sidebar.displayedData = []; // used to display smart-table

// factory will broadcast this event when map is updated
  $scope.$on('map.selection', function(e, group) {
    sidebar.mapGroup = group;
    // if it's a species, grab the API data
    if(group.groupLevel === 5) {
      sidebar.species.show = true;
      sidebar.species.loading = true;
      var lastResult = sidebar.species.picture;
      DataService.getSpeciesGBIFData(group, function(species) {
        sidebar.species.name = species.name;
        // browser won't reload the image if it's the same (not found) image, so we check it ourselves
        if(species.picture === lastResult) {
          sidebar.species.loading = false;
        }
        sidebar.species.picture = species.picture;
        sidebar.species.pictureList = species.pictureList;

      });
    } else {
      // if not, just double make sure the detail div isn't showing
      sidebar.species = {show: false};
    }
    // and angular will $apply() on http calls, but not just on the event emitter, so have to $digest()
    if(!$scope.$$phase) {
      $scope.$digest();
    }
  });

  sidebar.modal = function(num) {
    // get index by taking absolute value divide by total items and get remainder
    sidebar.cycle = Math.abs(sidebar.cycle + num) % sidebar.species.pictureList.length;
    sidebar.modal.loading = true;
};

  sidebar.key.select = function(str) {
    if(sidebar.key.colors[str]) {
      sidebar.key.colors = {};
      DataService.keyColor();
      return;
    }
    sidebar.key.colors = {};
    sidebar.key.colors[str] = 'selected';
    DataService.keyColor(str);
  };

  sidebar.share = function() {
    sidebar.link = 'http://' + $location.host() + ':3000/#/?name=' + sidebar.mapGroup.label.replace(' ', '%20');
  };

}]); //sidebar control end

app.controller('MapController', ['DataService', 'ListenerService', '$location', '$rootScope','$scope', '$timeout', function(DataService, ListenerService, $location, $rootScope, $scope, $timeout) {


	var map = this;
// subscribes the the ListenerService to listen for $broadcasted events
  ListenerService.resize();
  ListenerService.orientation();
  map.mapSelection = DataService.mapSelection;

// puts group and its parents on scope for breadcrumbs
  map.crumbs = {};


// keeps current level view in memory. Important for drawing the labels
  var currentLevel = 0;
  var lastZoomedTo;

// reference arrays for colors and levels
  var levels = ["none", "class", "order", "family", "genus", "species"];
  var defaultColors = [[0],[0, "#F0F0F0","#9ECAE1", "#3182BD", "#000000"], [0, "#f0AE65", "#9EAE6B", "#31826B", "#000000"], [0, "#E6550D", "#9E550D", "#31550D", "#000000"], ["#000000", "#000000", "#000000", "#000000", "#000000"]];
  map.selectedColor = DataService.colorSelected;


// grabs path off URL to zoom to square
  var URLpath = $location.search();

  map.label = '';
  map.foamtree = new CarrotSearchFoamTree({
      id: "visualization",
      rolloutDuration: 0,
      pullbackDuration: 0,
    });

  var loadingDiv = '<div style="display: table-cell; vertical-align: middle;">' +
  '<div><h1>Loading<br />Please Wait</h1>' +
  '<img src="images/mapload.svg" style=" margin: auto;"></div></div>';
  var foamtreeLoader = CarrotSearchFoamTree.loader(map.foamtree, loadingDiv);

    map.getData = function() {
      foamtreeLoader.started();

    DataService.getMapData().then(function(response) {
      foamtreeLoader.complete({ groups: response.data});

      map.foamtree.set({
				// Options object for the map
        maxGroupLevelsDrawn: 3, // number of levels deep to draw
        maxGroupLabelLevelsDrawn: 1,
        rolloutDuration: 0, // animation for building map first time
        pullbackDuration: 0, // animation for removing map
        fadeDuration: 1000, // in lieu of rollout, map just fades in
				// options for group display. changing these can impact performance; read docs
        groupBorderWidth: 1,
        groupInsetWidth: 1.5,
        groupBorderRadius: 0,
        groupBorderWidthScaling: 0.5,
				groupStrokeType: 'none',
				groupFillType: 'plain',
        parentFillOpacity: 0.25,
        groupMinDiameter: 0, // minimum size the map will render a box at
        stacking: 'hierarchical', // don't change
        groupHoverFillLightnessShift : -75,
        groupSelectionOutlineShadowSize: 0, // these get very large when looking at lower groups.
        groupSelectionOutlineWidth: 1, // we can experiment with altering their values as we go to lower tree levels
        wireframeLabelDrawing: 'auto', // automaticall detects based on user settings
        wireframeContentDecorationDrawing: 'auto',
        layout: "squarified",
        pixelRatio: window.devicePixelRatio || 1,
        incrementalDraw: 'fast',
				maxLabelSizeForTitleBar: 0, // never shows title bar
				groupContentDecoratorTriggering: "onShapeDirty", // only redraw when shape of group changes
        openCloseDuration: 500, // open/close animation duration
        zoomMouseWheelFactor: 1,
        // Expiremental
        wireframeToFinalFadeDelay: 100,
        wireframeToFinalFadeDuration: 200,
        wireframeDrawMaxDuration: 50,
        finalCompleteDrawMaxDuration: 0,
        finalIncrementalDrawMaxDuration: 50,
        groupLabelUpdateThreshold: .15,
        // Debugging info
        logging: true,
        /// event listener functions
        /// on-click debugs and object reference
        onGroupClick: function (event) {
          console.log({hierarchy: map.foamtree.get("hierarchy", event.group),
            geometry: map.foamtree.get("geometry", event.group),
            state: map.foamtree.get("state", event.group),
            bottommost: event.bottommostOpenGroup
          });
        },

        //assigns variables for the tooltip

        onGroupHover: function (event) {
          // var hierarchy = map.foamtree.get("hierarchy", event.group);
          // var groupH = hierarchy.group;
          // var groupLabel = hierarchy.group.label;
          // map.showToolTip = true;
          // map.label = event.group.label;
          // map.disko = event.group.disko;
          // map.fertind = event.group.fertind;
          // map.survind = event.group.survind;
          // map.children = event.group.groups.length;
          // $scope.$digest();

        },


        // Disable "expose" on double click, it will not work well on very deeply nested groups.
        // Instead, open the group and zoom into it.
        onGroupDoubleClick: function (e) {
          e.preventDefault();
          if(!e.group) {
            return;
          }
          // if ctrl key was pressed, go to the clicked group's parent. If not, go to clicked group.
          var group = e.ctrlKey ? e.bottommostOpenGroup : e.topmostClosedGroup;
          // set the map level to that group
          var toZoom;
          // get array of this group + all its parents
          var groupAndParents = allParents(e.group);

          // only zoom if there is a group; group will be null if ctrl click on outermost groups
          if (group) {
            // Open on left-click, close on ctrl click
            // keepPrevious will close all groups that are not in groups: array
            this.open({ groups: e.ctrlKey ? group : groupAndParents, open: !e.ctrlKey, keepPrevious: e.ctrlKey });
            toZoom = e.ctrlKey ? map.foamtree.get('hierarchy', group).parent : group;
            // get species detail if group zoomed was a genus
            if(group.groupLevel === 4) {
              DataService.getGenusDetail(group.label);
            }

          } else {
            toZoom = this.get("dataObject");
          }

          this.zoom(toZoom).then(function() {
            console.log('toZoom', toZoom);
            DataService.mapLevel(toZoom.groupLevel);
            this.redraw();
          });
          lastZoomedTo = toZoom;
          map.mapSelection(lastZoomedTo);
          updateBreadcrumbs(lastZoomedTo, !e.ctrlKey);



        },


        // Zoom out when Esc is pressed
        onKeyUp: function(event) {
          if (event.keyCode === 27) {
            event.preventDefault();
            map.zoomToGroup(this.get("dataObject"));
            lastZoomedTo = undefined;
            DataService.mapLevel(0);
            updateBreadcrumbs(lastZoomedTo, false);
          }
        },

        // redraw if someone hits escape
        onViewReset: function(info) {
          map.foamtree.redraw();
          lastZoomedTo = undefined;
          DataService.mapLevel(0);
          updateBreadcrumbs(lastZoomedTo, false);
        },

				// functions for custom group layouts
				  // custom color decorator for group
				groupColorDecorator: function( opts, params, vars ){
          var alpha = 1;
          var survival = params.group.survind;
          var fertility = params.group.fertind;
          var rgb = hexToRgb(defaultColors[survival][fertility]);
          if (survival === 4 || fertility === 4) {
            survival = 4;
            fertility = '';
          }
          if(map.selectedColor.color) {

            if((survival.toString() + fertility) !== map.selectedColor.color) {
              alpha = 0.4;
            }
          }
          vars.groupColor.model = "rgba";
          vars.groupColor.r = rgb.r;
          vars.groupColor.g = rgb.g;
          vars.groupColor.b = rgb.b;
          vars.groupColor.a = alpha;

        },
				// custom label layouts
        groupLabelDecorator: function (opts, params, vars) {
          // adds icon to show group has hidden children that can't be rendered
          if (params.hasChildren && params.browseable === false) {
            vars.labelText += " [+]";
           }
         },

        // draws a box to put under the label to help with visibility
					// this function runs custom decorations for drawing each group.
					// it uses 2D context functions for rendering on canvas.
         groupContentDecorator: function (opts, params, vars) {
              var parentGroup = map.foamtree.get('hierarchy', params.parent);
              var parentIsOpen = map.foamtree.get('state', parentGroup.group).open;
              var ctx = params.context;
              var scratch = ctx.scratch();
              var group = params.group;

              // only draw box if we are in upper levels and its parent is open
              if(params.level < 4 && parentIsOpen) {
								// find out how big box will be when filling in text, but don't actuall fill with text.
								// We want the label to be part of grouplabeldecorator so it will follow the rules
                var fillTextInfo = ctx.fillPolygonWithText(
                  params.polygon,
                  params.polygonCenterX, params.polygonCenterY,
                  group.label);


                // clear scratch buffer so it doesn't draw text
                params.context.buffer = [];

                if (fillTextInfo.fit ) {
                  // Draw the rectangle first
                  var box = fillTextInfo.box;
                  //finish box
                  var padding = params.labelBoxHeight  * 0.15;
                  ctx.lineWidth = 0;

                  ctx.roundRect(params.labelBoxLeft - padding, params.labelBoxTop - padding,
                    params.labelBoxWidth + 2 * padding, params.labelBoxHeight + 2 * padding, padding);
                  ctx.globalAlpha = 0.4;
                  ctx.fill();
                }
              }
              // code for box borders
                  // if(parentIsOpen && !parentGroup.group.isDrawn) {
                  //   console.log(params.boxLeft,params.boxTop,params.boxHeight, params.boxWidth);
                  //   ctx.globalAlpha = 0.9;
                  //   ctx.lindeWidth = 10 * Math.pow(.3, params.level)
                  //   console.log(10 * Math.pow(.3, params.level));
                  //   var parentBox = map.foamtree.get('geometry', params.parent);
                  //   ctx.rect(parentBox.boxLeft,parentBox.boxTop,parentBox.boxWidth, parentBox.boxHeight);
                  //   ctx.stroke();
                  //   parentGroup.group.isDrawn = true;
                  // }
                  scratch.replay(ctx);


         },
         onGroupMouseWheel: function(event){
           event.allowOriginalEventDefault();
         },
         onGroupDrag: function(event){
           event.allowOriginalEventDefault();
         },
        //  // decorator for the title bar that show us on hover
        //  titleBarDecorator: function(options, params, variables) {
        //       variables.titleBarText = params.group.label + "\n" + "Survival Index: " + params.group.survind + "\n" + "Fertility Index: " + params.group.fertind;

        //  },
				 // executes when map has finished rollout from data update
         onRolloutComplete: function() {
           console.log('complete');
         },
				 // executes when data model has been changed
         onModelChanged: function(data) {
           console.log('data', data);
           //data = dataobject
					 // this code will help with zooming into a group based on a URL path (i.e. when map is shared)
					 // it currently does nothing until the map.zoomToGroup func is fleshed out
           if(URLpath.name) {
						 // util function to search through dataset
             var dest = CarrotSearchFoamTree.TreeModel.findFirstByProperty(data,'label', URLpath.name);
             console.log('urlpath', URLpath);
             console.log('dest', dest);
             map.zoomToGroup(dest);
             URLpath = {};
           }
         }


      });

			// redraw on load so everything looks correct
      map.foamtree.redraw();
			// shows ALL viz options on map load for debugging
      console.log('Current Visualization Options:', map.foamtree.get());
    });
};


// window service event listener
$rootScope.$on('window.resize', function(a,b) {
  map.foamtree.resize();
});

$rootScope.$on('window.orientation', function(a,b) {
  map.foamtree.resize();
});

// watch for changes in key selection and redraw map if changed
$scope.$watch('map.selectedColor.color', function(newValue, oldValue) {
    map.foamtree.redraw();
    console.log('changed the dang color');
});


// update breadcrumbs on zoom in/out, or view reset
function updateBreadcrumbs(zoomedGroup, zoomIn) {
  // the allParents fn is expensive,
  // so if we only call it if we need to redo the whole heirarchy, like on a search zoom
  if(!zoomIn) {
    // reset crumbs to nothing
    map.crumbs = {};
  // get hierarchy
  groupAndParents = allParents(zoomedGroup);

  // pop the data object off of groupAndParents
  groupAndParents.pop();
  // we will need to pass entire object for past groups so we can link back to them
  groupAndParents.forEach(function(s) {
    // use levels array to get string of which level we are at
    thisLevel = levels[s.groupLevel];
    // set property on map.crumbs to the correct group
    map.crumbs[thisLevel] = s;
    });

  }

  // if we only zoomed in one level we can just update the next class without redoing the whole object
    if(zoomIn) {
      map.crumbs[levels[zoomedGroup.groupLevel]] = zoomedGroup;
      // make sure that any subclasses ahead of where we clicked on the map are closed
      for(var i = zoomedGroup.groupLevel + 1; i <=5; i++) {
        map.crumbs[levels[i]] = undefined;
      }
    }
    // since this is updated outside Angular code, we need to apply it to the scope as the watchers won't reliably do it
    // the if statement checks if a $digest cycle is in progress. We don't need to run it again if it's already checking.
    if(!$scope.$$phase) {
      $scope.$digest();
    }
  }

// return array of all parents of group, including group
function allParents(group) {
  var parents = [];
  var parent = group;
  while (parent) {
    if(parent && parent.__id) {
    parents.push(parent);
    }
    parent = map.foamtree.get('hierarchy', parent) ? map.foamtree.get('hierarchy', parent).parent : null;
  }
  return parents;
}

// this can likely be moved to its own file since it is not on scope and instead attaches to window.map prototype
// * A number of utilities for working with a hierarchical model of groups.
// */

window.CarrotSearchFoamTree.TreeModel = {
 eachDescendantAndSelf: function (root, callback) {
   if (!root) { return false; }
   return visit(root, 0, undefined, 0);

   function visit(group, index, parent, level) {
     if (group.groups) {
       var children = group.groups;

       for (var i = 0; i < children.length; i++) {
         if (visit(children[i], i, group, level + 1) === false) {
           return false;
         }
       }
     }
     return callback(group, index, parent, level);
   }
 },

 findFirstByProperty: function (root, property, value) {
   var result = undefined;
   window.CarrotSearchFoamTree.TreeModel.eachDescendantAndSelf(root, function (group) {
     if(group[property] == value) {
       result = group;
       return false;
     }
   });
   return result;
 }
};

map.zoomToGroup = function(target) {
  if (target === lastZoomedTo) {
    return;
  }

  if(target.__id === 1) {
    map.foamtree.zoom(target).then(function() {
      map.foamtree.open({all: true, open: false});
      updateBreadcrumbs(target, false);
      map.mapSelection(0);
      map.foamtree.redraw();
    });
    return;
  }

  if (!lastZoomedTo) {
    lastZoomedTo = map.foamtree.get("dataObject");
  }
  // Find the lowest parent ancestor between target and lastZoomedTo
  var common = lowestCommonAncestor(lastZoomedTo, target);

  // We'll need to open all parents of the node we're zooming to.
  // Very deeply-nested nodes will only be initialized if their parents
  // get open. If we don't open the parents, the polygon corresponding
  // to the target group would not exist.
  var targetParents = allParents(target);
  targetParents.pop();

  map.foamtree.open({groups: targetParents, open: true, keepPrevious: false}).then(function() {

    var commonLevel = map.foamtree.get("hierarchy", common) ? map.foamtree.get("hierarchy", common).level : 0;
    // First, zoom out to the lowest common ancestor.
    // Temporarily set the zoom duration based on the difference in levels we need to travel.
    map.foamtree.set("zoomMouseWheelEasing", "squareInOut");
    map.foamtree.set("zoomMouseWheelDuration", Math.max(2000, (lastZoomedTo ? lastZoomedTo.groupLevel : 0 - commonLevel) * 50));
    map.foamtree.zoom(common).then(function() {
      // Open all parents of the target group.
      map.foamtree.open({ groups: target, open: false});
      map.foamtree.set("zoomMouseWheelDuration", Math.max(2000, (target.groupLevel ? target.groupLevel : 0 - commonLevel) * 100));

      // Zoom to the target group.
      map.foamtree.zoom(target);
      map.foamtree.set("zoomMouseWheelDuration", CarrotSearchFoamTree.defaults.zoomMouseWheelDuration);
      map.foamtree.set("zoomMouseWheelEasing", CarrotSearchFoamTree.defaults.zoomMouseWheelEasing);

    });
    lastZoomedTo = target;
    if(lastZoomedTo.groupLevel === 5) {
      DataService.getGenusDetail(lastZoomedTo.label.replace(/\s.+/i, ''));
    }
    console.log('crumb update');
    updateBreadcrumbs(lastZoomedTo, false);
    map.mapSelection(lastZoomedTo.groupLevel);
  });
};

function lowestCommonAncestor(groupA, groupB) {
  var parentsA = allParents(groupA).reverse().pop();//.unshift(map.foamtree.get("dataObject"));
  var parentsB = allParents(groupB).reverse().pop();//.unshift(map.foamtree.get("dataObject"));
  var max = Math.min(parentsA.length, parentsB.length);
  for (var i = 0; i < max; i++) {
    if (parentsA[i].__id !== parentsB[i].__id) {
      // We assume the two nodes do have one common parent
      return parentsA[i - 1];
    }
  }

  return parentsA[max - 1];
}

// Zoom to the group when form submitted
map.form = function () {
  // e.preventDefault();


  var query = '';
  query = $("#searchBox").val();
  console.log('this is query', query);
  if(query.length > 0){
    console.log('this is findFirstByProperty', CarrotSearchFoamTree.TreeModel.findFirstByProperty);
    var group = CarrotSearchFoamTree.TreeModel.findFirstByProperty(map.foamtree.get("dataObject"), "label", query);
      console.log('this is map.foamtree.get', map.foamtree.get("dataObject"), "label", query);
      $("#searchBox").val('');

    if (group !== undefined) {
      map.zoomToGroup(group);
    } else {
      alert(query + " is not found. Please try another search.");
    }

  } else {
    map.zoomToGroup(map.foamtree.get("dataObject"));
  }
};



// autocomplete

function initAutocomplete() {
  // var templates = {
  //   suggestion: Template.make("<div><%- group.label %><small>id: <%- group.id %></small><small>level: <%- group.level %></small></div>")
  // };

  $('#searchBox').typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    },
    {
      name: 'labels',
      displayKey: 'value',
      source: foamTreeSource("label")
      // templates: templates
    },
    {
      name: 'ids',
      displayKey: 'value',
      source: foamTreeSource("id")
      // templates: templates
    }
  );

  // Queries FoamTree model for the purposes of the autocomplete input.
  function foamTreeSource(prop) {
    return function findMatches(q, cb) {
      var matches = [];
      q = q.toLowerCase();

      CarrotSearchFoamTree.TreeModel.eachDescendantAndSelf(map.foamtree.get("dataObject"), function (group) {
        var val = (group[prop] + "");
        var index = val.toLocaleLowerCase().indexOf(q);
        if (index >= 0) {
          matches.push({ value: val, index: index, group: group });
        }
      });

      matches.sort(function (a, b) {
        if (a.index != b.index) {
          return a.index - b.index;
        } else {
          if (a.group.label < b.group.label) {
             return -1;
          } else if (a.group.label > b.group.label) {
            return 1;
          } else {
            return 0;
          }
        }
      });

      cb(matches.slice(0, 20));
    };
  }
}

function hexToRgb(hex) {

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


map.getData();
initAutocomplete();



}]); // test
