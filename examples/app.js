// app.js

var cloudApp = angular.module('cloudApp',['cloudKit']);

cloudApp.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

cloudApp.controller("MainController",['$scope','$cloudKit','Post','Types',function($scope,$cloudKit,Post,Types){
	// var container = $cloudKit();
	// container.auth()
	// console.log();
	// UserBookmarkLU.query({zoneID:{zoneName:"bookmarksZone"},resultsLimit:10,query:{recordType:'UserBookmarkLU'}},function(result){
	// 	console.log("page1",result);
	// });
  var posts = Post.query({resultsLimit:10},function(result){
      // angular.forEach(result.records,function(record){
      // 	var recordType = record.record.fields.type.value;
      	// Types.get({records:{recordName:recordType.recordName}},function(typeresult){
      	// 	console.log(typeresult);
      	// });
      // });
      $scope.posts = result;
      // console.log("page1",result);
      console.log("page1",result);
      // Bookmark.query({zoneID:{zoneName:"_defaultZone"},continuationMarker:result.continuationMarker,resultsLimit:10,query:{recordType:'Bookmarks'}},function(result1){
      // 		console.log("page2",result1);
      // });
		// $scope.bookmarks.$query({resultsLimit:5},function(result){
	 //  		console.log("page2",result);
	 //  	});
  });
  // bookmarks.success(function(){
  	
  // })

	$scope.newpost = {};

	$scope.saveAll = function() {
		$scope.bookmarks.$save(function(suc){
			console.log(suc);
		},function(err){
			console.log(err);
		});
	}

	$scope.checkURL = function(link) {
		link.title = {value:"New URL"};
	}

	$scope.newPost = function(newpost) {
		// operations:[{operationType:'create',record:{recordType:'Bookmarks',fields:newbookmark.fields}}]
	    Post.save(newpost.fields,function(result){
	    	$scope.posts.records.push(result);
	    	// $scope.bookmarks.total++;
	    	$scope.newpost = {};
		    // console.log(result);
		});
	}

  // {zoneID:{zoneName:"_defaultZone"},resultsLimit:10,query:{recordType:'Bookmarks',filterBy:[{comparator:'BEGINS_WITH',fieldName:'title',fieldValue:{value:'EU'}}]}}
  

  // console.log(bookmarks);
}]);

cloudApp.directive('appFilereader', function($q) {
    var slice = Array.prototype.slice;

    return {
        restrict: 'A',
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
                if (!ngModel) return;

                ngModel.$render = function() {};

                element.bind('change', function(e) {
                    var element = e.target;

                    $q.all(slice.call(element.files, 0).map(readFile)).then(function(values) {
                            if (element.multiple) { 
                            	ngModel.$setViewValue(values);
                            	// var filevalue = [];
                            	// angular.forEach(values,function(value){
                            	// 	filevalue.push({image:{value:value},title:{value:""},caption:{value:""}});
                            	// });                            	
                            	// ngModel.$setViewValue(filevalue);
                            }
                            else {
                            	ngModel.$setViewValue(values.length ? values[0] : null);
                            	// ngModel.$setViewValue({image:{value:values.length ? values[0] : null},title:{value:""},caption:{value:""}});
                            }
                        });

                    function readFile(file) {
                        var deferred = $q.defer();

                        var reader = new FileReader();
                        reader.onload = function(e) {
                            deferred.resolve(e.target.result);
                        };
                        reader.onerror = function(e) {
                            deferred.reject(e);
                        };
                        reader.readAsDataURL(file);

                        return deferred.promise;
                    }

                }); //change

            } //link
    }; //return
});


cloudApp.config(['$cloudKitProvider','$httpProvider',function($cloudKitProvider,$httpProvider) {
	var connection = {
		container: 'iCloud.watchinharrison.Read-The-News',
		api: '309696db24cbfcc1b79a0750af4dfa92b89588bc5bbbf16ea9fdebe9d2b3446d',
		environment: 'development',
		database:'public'
	}
  // $httpProvider.defaults.headers['Content-Type'] = null;
	$cloudKitProvider.connection(connection);

  	// $cloudKitProvider.connection({
   //  	// Change this to a container identifier you own.
   //  	containerIdentifier: 'iCloud.watchinharrison.Tankiku',

   //  	// And generate an API token through CloudKit Dashboard.
   //  	apiToken: 'c4dc7bcd62035f7ca039b7e9a5c331cab632b3feb380f67aecf1393e28afafb9',

   //  	auth: {
   //    		buttonSize: 'medium',
   //    		persist: true // Sets a cookie.
   //  	},
   //  	environment: 'development'
  	// });
}]);


cloudApp.factory('Types', ['$cloudKit',function($cloudKit){
    return $cloudKit('Types','_defaultZone', {
    	type: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Content', ['$cloudKit','Model','Images','Link',function($cloudKit,Model,Images,Link){
    return $cloudKit('Content','_defaultZone', {
    	image: new Model.hasMany(Images),
    	link: new Model.hasMany(Link),
    	text: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Images', ['$cloudKit',function($cloudKit){
    return $cloudKit('Images','_defaultZone', {
    	image: 'file',
    	title: 'string',
    	description: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Tag', ['$cloudKit',function($cloudKit){
    return $cloudKit('Tag','_defaultZone', {
    	name: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Link', ['$cloudKit',function($cloudKit){
    return $cloudKit('Link','_defaultZone', {
    	description: 'string',
    	title: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Post', ['$cloudKit','Model','Content','Types','Comment','Tag',function($cloudKit,Model,Content,Types,Comment,Tag){
	// console.log(Content);
    return $cloudKit('Post','_defaultZone', {
    	type: new Model.belongsTo(Types),
    	content: new Model.belongsTo(Content),
    	comments: new Model.hasMany(Comment),
    	tags: new Model.hasMany(Tag),
    	title: 'string',
    	url: 'string',
    	allow_comments: 'bool'
	},{}, {
		query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
		get: {method:'POST', params:{importId:'@importId'}},
		save: {method:'POST',params:{importId:'@importId'}},
		remove: {method:'DELETE',params:{importId:'@importId'}}
	});
}]);

cloudApp.factory('Comment', ['$cloudKit','Model','Content',function($cloudKit,Model,Content){
	// console.log(Content);
    return $cloudKit('Comment','_defaultZone', {
    	content: new Model.belongsTo(Content),
    	// post: Model.belongsTo(Post)
	},{}, {
		query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
		get: {method:'POST', params:{importId:'@importId'}},
		save: {method:'POST',params:{importId:'@importId'}},
		remove: {method:'DELETE',params:{importId:'@importId'}}
	});
}]);

// cloudApp.factory('UserBookmarkLU', ['$cloudKit',function($cloudKit){
//     return $cloudKit('UserBookmarkLU','blogZone', {}, {
//       query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
//       get: {method:'POST', params:{importId:'@importId'}},
//       save: {method:'POST',params:{importId:'@importId'}},
//       remove: {method:'DELETE',params:{importId:'@importId'}}
//   });
// }]);

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });