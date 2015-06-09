/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

// 'use strict';

var cloudKit = angular.module('cloudKit', ['ngCookies']).provider('$cloudKit', function() {
	var module          = this;
	module.containers 	= [];
	// module.ckSession	= null;

	module.connection = function(container) {
        module.containers.push(container);
        return this;
    };

	module.$get = ['$q','$http','$cookieStore', function ($q,$http,$cookieStore) {

	    function cloudFactory() {
			
	    	var container = module.containers[0];

			function Resource() {
				
			}

			Resource.auth = function() {
				var cloudCookie = $cookieStore.get(container.container);
				if(cloudCookie) {
					container.ckSession = cloudCookie;
				}
				container.database = 'public';
				var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/users/current?ckAPIToken="+container.api;
				if(container.ckSession) {
					authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
				}
				var requestAuth = $http.get(authurl);
				requestAuth.success(function(result){
					console.log(result);
				}).error(function(error){
					if(error && error.redirectUrl) {
						window.open(error.redirectUrl);
					}
				})
				window.addEventListener('message', function(e) {
				    if(e.data.ckSession) {
				    	
				    	$cookieStore.put(container.container,e.data.ckSession);
					    container.ckSession = e.data.ckSession;
					    Resource.auth();
					}
				});
				return requestAuth;
			}

			Resource.prototype['$auth'] = function() {
	           	if (isFunction(params)) {
	              error = success; success = params; params = {};
	            }
	            var result = Resource['auth'].call();
	            return result.$promise || result;
	        };

			return Resource;

		}

		return cloudFactory;

    }];

});

// .provider('$cloudKit', function() {
//     var module          = this;


//     /** default variables */
//     module.environment = 'development';
//     module.containerIdentifier = '';
//     module.apiToken = '';
//     // module.db = null;
//     // module.dbPromise = null;
//     // module.debugMode = false;

//     module.connection = function(containerIdentifier) {
//         module.containerIdentifier = containerIdentifier;
//         // return this;
//     };

//     module.init = function() {
// 	  try {

// 	    // Configure CloudKit for your app.
// 	    CloudKit.configure({
// 	      containers: [{

// 	        // Change this to a container identifier you own.
// 	        containerIdentifier: module.containerIdentifier,

// 	        // And generate an API token through CloudKit Dashboard.
// 	        apiToken: module.apiToken,

// 	        auth: {
// 	          buttonSize: 'medium',
// 	          persist: true // Sets a cookie.
// 	        },
// 	        environment: module.environment
// 	      }]
// 	    });

// 	    var failAuth = function() {
// 	      var span = document.getElementById('username');
// 	      span.textContent = 'Authentication Failed';
// 	    };

// 	    // Try to run the authentication code.
// 	    try {
// 	      // CKCatalog.tabs['authentication'][0].sampleCode().catch(failAuth);
// 	    } catch (e) {
// 	      failAuth();
// 	    }
// 	  } catch (e) {
// 	    // CKCatalog.dialog.showError(e);
// 	  }
// 	};


//     window.addEventListener('cloudkitloaded',module.init);


//     return {
        
//     };

// });