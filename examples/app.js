// app.js

var cloudApp = angular.module('cloudApp',['cloudKit']);

cloudApp.controller("MainController",['$scope','$cloudKit',function($scope,$cloudKit){
	console.log($cloudKit);
}]);

cloudApp.config(['$cloudKitProvider',function($cloudKitProvider) {
	console.log($cloudKitProvider);
}])

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });