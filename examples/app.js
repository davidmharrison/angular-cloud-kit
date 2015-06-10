// app.js

var cloudApp = angular.module('cloudApp',['cloudKit']);

cloudApp.controller("MainController",['$scope','$cloudKit','Bookmark','UserBookmarkLU',function($scope,$cloudKit,Bookmark,UserBookmarkLU){
	// var container = $cloudKit();
	// container.auth()
	// console.log();
	UserBookmarkLU.query({zoneID:{zoneName:"bookmarksZone"},resultsLimit:10,query:{recordType:'UserBookmarkLU'}},function(result){
		console.log("page1",result);
	});
  // Bookmark.get({records:{recordName:"B4B43726-1CA6-4F60-BCEC-932A9610CEAD"}},function(result){
  //   // console.log(result);

  //   $scope.bookmark = result;

  //   // result.record.fields.title.value = "EU Title";
  //   // result.$save(function(postres){
  //     // console.log(result,postres);  
  //   // });
  //   // console.log(result);
  //   // result.$save({fields:[{title:{value:'EU Updated Title'}}]});
  //   // Bookmark.save({operations:[{operationType:'update',record:{recordType:'Bookmarks',recordName:'B4B43726-1CA6-4F60-BCEC-932A9610CEAD',recordChangeTag:result.recordChangeTag}}]},function(result){
  //   //   console.log(result);
  //   // });
  // },function(err){
  // 	console.log(err);
  // });

  $scope.sucCB = function(suc){
  	console.log(suc);
  }

  $scope.errCB = function(err){
  	console.log(err);

  }

	// ,filterBy:[{comparator:'BEGINS_WITH',fieldName:'title',fieldValue:{value:'EU'}}]
  var bookmarks = Bookmark.query({zoneID:{zoneName:"bookmarksZone"},resultsLimit:10,query:{recordType:'Bookmarks'}},function(result){
      $scope.bookmarks = result;
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

	$scope.newbookmark = {};

	$scope.saveAll = function() {
		$scope.bookmarks.$save(function(suc){
			console.log(suc);
		},function(err){
			console.log(err);
		});
	}

	$scope.addBookmark = function(newbookmark) {
		// operations:[{operationType:'create',record:{recordType:'Bookmarks',fields:newbookmark.fields}}]
	    Bookmark.save(newbookmark.fields,function(result){
	    	$scope.bookmarks.records.push(result);
	    	// $scope.bookmarks.total++;
	    	$scope.newbookmark = {};
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

                    $q.all(slice.call(element.files, 0).map(readFile))
                        .then(function(values) {
                            if (element.multiple) ngModel.$setViewValue({value:values,asset:true});
                            else ngModel.$setViewValue({value:values.length ? values[0] : null,asset:true});
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
		api: '0c661f0e2429f2a17526ad1b136acdd81263278e954990e2da197f6d525ef6ae',
		environment: 'development',
		database:'private'
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

cloudApp.factory('Bookmark', ['$cloudKit',function($cloudKit){
    return $cloudKit('Bookmarks','bookmarksZone', {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('UserBookmarkLU', ['$cloudKit',function($cloudKit){
    return $cloudKit('UserBookmarkLU','bookmarksZone', {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });