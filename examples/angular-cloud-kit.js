/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

// 'use strict';

var $resourceMinErr = angular.$$minErr('$resource');

function shallowClearAndCopy(src, dst) {
  dst = dst || {};

  angular.forEach(dst, function(value, key){
    delete dst[key];
  });

  for (var key in src) {
    if (src.hasOwnProperty(key) && !(key.charAt(0) === '$' && key.charAt(1) === '$')) {
      dst[key] = src[key];
    }
  }

  return dst;
}

var cloudKit = angular.module('cloudKit', ['ngCookies']).provider('$cloudKit', function() {
	var module          = this;
	module.containers 	= [];
	// module.ckSession	= null;

	var noop = angular.noop,
        forEach = angular.forEach,
        extend = angular.extend,
        copy = angular.copy,
        isFunction = angular.isFunction;

	module.connection = function(container) {
        module.containers.push(container);
        return this;
    };

	module.$get = ['$q','$http','$cookieStore', function ($q,$http,$cookieStore) {

		var container = module.containers[0];

		module.longpoll = function(url) {
			$http.get(url).success(function(result){
				console.log(result);
				module.longpoll(url);
			}).error(function(err){
				console.log(err);
			});
		}

		module.notifications = function() {
			var authurl = "https://api.apple-cloudkit.com/device/1/"+container.container+"/development/tokens/create?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}
			var requestAuth = $http.post(authurl,{},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				module.longpoll(result.webcourierURL);
				console.log(result);
			}).error(function(error){
				console.log(result);
				// if(error && error.redirectUrl) {
				// 	window.open(error.redirectUrl);
				// }
			})
		}

		module.subscription = function() {

			container.database = 'public';
			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/subscriptions/modify?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}
			var requestAuth = $http.post(authurl,{operations:[{operationType:'create',subscription:{zoneID:{zoneName:'_defaultZone'},subscriptionType:'query',query:{recordType:'Bookmarks'},firesOn:'create',zoneWide:false}}]},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				module.longpoll(result.webcourierURL);
				console.log(result);
			}).error(function(error){
				console.log(result);
				// if(error && error.redirectUrl) {
				// 	window.open(error.redirectUrl);
				// }
			})
		}

		module.auth = function() {
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
				// console.log(result);
				module.subscription();
				module.notifications();
			}).error(function(error){
				if(error && error.redirectUrl) {
					window.open(error.redirectUrl);
				}
			})
			window.addEventListener('message', function(e) {
				console.log(e.data.ckSession);
			    if(e.data.ckSession) {			    	
			    	$cookieStore.put(container.container,e.data.ckSession);
				    container.ckSession = e.data.ckSession;
				    module.auth();
				}
			});
			return requestAuth;
		}

		module.auth();

	    function cloudFactory(recordName,fields, actions) {

	    	function defaultResponseInterceptor(response) {
		        return response.resource;
		    }

			function Resource(value) {
				shallowClearAndCopy(value || {}, this);
			}

			angular.forEach(actions,function(action, name){

				var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

				Resource[name] = function(a1, a2, a3, a4) {

					console.log(a1, a2, a3, a4);

					var params = {}, data, success, error;

					switch(arguments.length) {
			          case 4:
			            error = a4;
			            success = a3;
			            //fallthrough
			          case 3:
			          case 2:
			            if (isFunction(a2)) {
			              if (isFunction(a1)) {
			                success = a1;
			                error = a2;
			                break;
			              }

			              success = a2;
			              error = a3;
			              //fallthrough
			            } else {
			              params = a1;
			              data = a2;
			              success = a3;
			              break;
			            }
			          case 1:
			            if (isFunction(a1)) success = a1;
			            else if (hasBody) data = a1;
			            else params = a1;
			            break;
			          case 0: break;
			          default:
			            throw $resourceMinErr('badargs',
			              "Expected up to 4 arguments [params, data, success, error], got {0} arguments",
			              arguments.length);
			        }

			        // console.log(a1, a2, a3, a4);
			        // console.log(params, data, success, error);

					var isInstanceCall = this instanceof Resource;
					var value = isInstanceCall ? data : (action.isArray ? [] : new Resource(data));
					var httpConfig = {};

					var responseInterceptor = action.interceptor && action.interceptor.response ||
                                    defaultResponseInterceptor;

					var responseErrorInterceptor = action.interceptor && action.interceptor.responseError ||
                                    undefined;

					forEach(action, function(value, key) {
			            if (key != 'params' && key != 'isArray' && key != 'interceptor') {
			              httpConfig[key] = copy(value);
			            }
			        });

			        console.log(data);

			        // data['records'] = {'recordName':recordName,'desiredKeys':fields};

			        if (hasBody) httpConfig.data = data;

			        httpConfig.headers = {'Content-Type': undefined};
			        if(name == "query") {
			        	httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/query?ckAPIToken="+container.api;
			        } else if(name == "get") {
				        httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/lookup?ckAPIToken="+container.api;
				    } else if(name == "save") {
				        httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/modify?ckAPIToken="+container.api;
				        if(!httpConfig.data.operations.record) {
					        httpConfig.data.operations = {operationType:'update',record:data.record};
					        delete httpConfig.data.record;
					    }
				    }
			        if(container.ckSession) {
						httpConfig.url = httpConfig.url+"&ckSession="+encodeURIComponent(container.ckSession);
					}

					console.log(httpConfig);
			        									  // [path]/database/[version]/[container]/[environment]/[database]/records/query
			        var promise = $http(httpConfig).then(function (response) {
			        	var data = response.data,
			              promise = value.$promise;

			            if (data) {
			              // Need to convert action.isArray to boolean in case it is undefined
			              // jshint -W018
			              if(name == "query") {
			              	data = data.records;
			              }
			              if (angular.isArray(data) !== (!!action.isArray)) {
			                throw $resourceMinErr('badcfg',
			                    'Error in resource configuration. Expected ' +
			                    'response to contain an {0} but got an {1}',
			                  action.isArray ? 'array' : 'object',
			                  angular.isArray(data) ? 'array' : 'object');
			              }
			              // jshint +W018
			              if (action.isArray) {
			                value.length = 0;
			                // console.log(data);
			                forEach(data, function (item) {
			                  if (typeof item === "object") {
			                    value.push(new Resource({record:item}));
			                  } else {
			                    // Valid JSON values may be string literals, and these should not be converted
			                    // into objects. These items will not have access to the Resource prototype
			                    // methods, but unfortunately there
			                    value.push(item);
			                  }
			                });
			              } else {
			              	if(name == "get" || name == "save") {
			              		data.record = data.records[0];
			              		delete data.records;
			              	}
			                shallowClearAndCopy(data, value);
			                value.$promise = promise;
			              }
			            }

			            value.$resolved = true;

			            response.resource = value;

			            return response;
			        }, function(response) {
			            value.$resolved = true;

			            (error||noop)(response);

			            return $q.reject(response);
			        });

			        promise = promise.then(
		              function(response) {
		                var value = responseInterceptor(response);
		                (success||noop)(value, response.headers);
		                return value;
		              },
		              responseErrorInterceptor);

			          if (!isInstanceCall) {
			            // we are creating instance / collection
			            // - set the initial promise
			            // - return the instance / collection
			            value.$promise = promise;
			            value.$resolved = false;

			            return value;
			          }

			        return promise;

		      	}

				Resource.prototype['$'+name] = function(params, success, error) {
		           	if (isFunction(params)) {
		              error = success; success = params; params = {};
		            }
		            var result = Resource[name].call(this, params, this, success, error);
		            return result.$promise || result;
		        };
	        });

			Resource.bind = function(additionalParamDefaults){
		        return resourceFactory(url, extend({}, paramDefaults, additionalParamDefaults), actions);
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