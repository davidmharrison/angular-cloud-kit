// app.js

var cloudApp = angular.module('cloudApp',['cloudKit']);

cloudApp.controller("MainController",['$scope','$cloudKit',function($scope,$cloudKit){
	var container = $cloudKit();
	container.auth()
	// console.log();
}]);

cloudApp.config(['$cloudKitProvider',function($cloudKitProvider) {
	var connection = {
		container: 'iCloud.watchinharrison.Read-The-News',
		api: '0c661f0e2429f2a17526ad1b136acdd81263278e954990e2da197f6d525ef6ae',
		environment: 'development'
	}
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
}])

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });