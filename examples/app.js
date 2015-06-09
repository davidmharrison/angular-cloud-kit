// app.js

var cloudApp = angular.module('cloudApp',['cloudKit']);

cloudApp.controller("MainController",['$scope','$cloudKit','Bookmark',function($scope,$cloudKit,Bookmark){
	// var container = $cloudKit();
	// container.auth()
	// console.log();
  var bookmarks = Bookmark.get({records:{recordName:"B4B43726-1CA6-4F60-BCEC-932A9610CEAD"}},function(result){
    // console.log(result);

    $scope.bookmark = result;

    // result.record.fields.title.value = "EU Title";
    // result.$save(function(postres){
      // console.log(result,postres);  
    // });
    // console.log(result);
    // result.$save({fields:[{title:{value:'EU Updated Title'}}]});
    // Bookmark.save({operations:[{operationType:'update',record:{recordType:'Bookmarks',recordName:'B4B43726-1CA6-4F60-BCEC-932A9610CEAD',recordChangeTag:result.recordChangeTag}}]},function(result){
    //   console.log(result);
    // });
  });

  var bookmarks = Bookmark.query({zoneID:{zoneName:"_defaultZone"},resultsLimit:10,query:{recordType:'Bookmarks',filterBy:[{comparator:'BEGINS_WITH',fieldName:'title',fieldValue:{value:'EU'}}]}},function(result){
      $scope.bookmarks = result;
      console.log($scope.bookmarks);
  });

  $scope.newBookmark = function() {
    Bookmark.save({operations:{operationType:'create',record:{recordType:'Bookmarks',fields:{title:{value:"UE New Bookmark Boy!"}}}}},function(result){
      console.log(result);
    });
  }

  // {zoneID:{zoneName:"_defaultZone"},resultsLimit:10,query:{recordType:'Bookmarks',filterBy:[{comparator:'BEGINS_WITH',fieldName:'title',fieldValue:{value:'EU'}}]}}
  

  console.log(bookmarks);
}]);

cloudApp.config(['$cloudKitProvider','$httpProvider',function($cloudKitProvider,$httpProvider) {
	var connection = {
		container: 'iCloud.watchinharrison.Read-The-News',
		api: '0c661f0e2429f2a17526ad1b136acdd81263278e954990e2da197f6d525ef6ae',
		environment: 'development'
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
    return $cloudKit('Bookmarks', ["title","url"], {
      query: {method:'POST', params:{page:'@page',where:'@where'}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'DELETE',params:{importId:'@importId'}}
  });
}]);

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });