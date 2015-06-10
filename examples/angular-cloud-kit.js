/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

// 'use strict';

var $resourceMinErr = angular.$$minErr('$resource');

var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

function isValidDottedPath(path) {
  return (path != null && path !== '' && path !== 'hasOwnProperty' &&
      MEMBER_NAME_REGEX.test('.' + path));
}

function lookupDottedPath(obj, path) {
  if (!isValidDottedPath(path)) {
    throw $resourceMinErr('badmember', 'Dotted member path "@{0}" is invalid.', path);
  }
  var keys = path.split('.');
  for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
    var key = keys[i];
    obj = (obj !== null) ? obj[key] : undefined;
  }
  return obj;
}

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

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

var cloudKit = angular.module('cloudKit', ['ngCookies']).provider('$cloudKit', function() {
	var module          = this;
	var provider = this;

	this.defaults = {
      // Strip slashes by default
      stripTrailingSlashes: true,

      // Default actions configuration
      actions: {
        'get': {method: 'GET'},
        'save': {method: 'POST'},
        'query': {method: 'GET', isArray: true},
        'remove': {method: 'DELETE'},
        'delete': {method: 'DELETE'}
      }
    };

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

	module.$get = ['$q','$http','$cookieStore','$filter', function ($q,$http,$cookieStore,$filter) {

		var container = module.containers[0];

		var zoneSyncTokens = {};

		var saveSyncToken = function(zone,token) {
		    zoneSyncTokens[zone] = token;
		};

		var getSavedSyncToken = function(zone) {
		    return zoneSyncTokens[zone];
		};

		var shouldAppendRecords = false;

		var recordResources = {};

		module.getChanges = function(zoneName) {
			// [path]/database/[version]/[container]/[environment]/private/records/changes
			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/private/records/changes?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}

			var zone = { zoneName: zoneName };

			var postdata = {zoneID:zone,resultsLimit:10}; //,syncToken:,desiredKeys:

			var savedSyncToken = getSavedSyncToken(zoneName);

			if(savedSyncToken) {
		        postdata.syncToken = savedSyncToken;
		    } else {
		        // If we don't have a syncToken we don't want to
		        // append records to an existing list.
		        shouldAppendRecords = false;
		    }

			var requestAuth = $http.post(authurl,postdata,{headers:{'Content-Type': undefined}});
			requestAuth.success(function(response){
				var syncToken = response.syncToken;
	          	var records = response.records;
	          	var moreComing = response.moreComing;

				saveSyncToken(zoneName,syncToken);

				// if(shouldAppendRecords) {

		  //           // Append records to an existing list.
		  //           forEach(records,function(record){
		  //           	var match = $filter("filter")(Resources.records,function(existrecord){
		  //           		return existrecord.record.recordName  == record.recordName;
		  //           	},false);
		  //           	if(match && match[0]) {
		  //           		match[0].record = record;
		  //           	} else {
				//             Resources.records.push(new Resource({record:record}));
				//             Resources.total++;
				//         }
			 //        });
			 //        // console.log(records,Resource);
		  //           // renderedRecords = appendRecords(records,syncToken,moreComing);

		  //       } else {

		            // Replace the existing list of records with a new one.
		            // console.log(records,Resource);
		            forEach(records,function(record){
		            	var Resources = recordResources[record.recordType].Resources;
		            	if(!Resources.records) {
				            Resources.records = [];
				        }
		            	var Resource = recordResources[record.recordType].Resource;
		            	var match = $filter("filter")(Resources.records,function(existrecord){
		            		if(existrecord.record) {
			            		return existrecord.record.recordName  == record.recordName;
			            	}
		            	},false);
		            	if(match && match[0]) {
		            		match[0].record = record;
		            	} else {
				            Resources.records.push(new Resource({record:record}));
				            Resources.total++;
				        }
			        });
		            // renderedRecords = renderRecords(zoneName,records,syncToken,moreComing);

		        // }

	         	// If there are more records to come, we will append the records instead
	          	// of replacing them on the next run.
	          	shouldAppendRecords = moreComing;
	          	// if(moreComing) {
	          	// 	module.getChanges(zoneName,Resources,Resource);
	          	// }

				// module.longpoll(result.webcourierURL);
				// console.log(response);
			}).error(function(error){
				// console.log(error);
				// if(error && error.redirectUrl) {
				// 	window.open(error.redirectUrl);
				// }
			})
		}

		var zonewatchers = {};

		module.lookupZone = function(recordName,zoneName,Resources,Resource) {
			// [path]/database/[version]/[container]/[environment]/[database]/zones/lookup

			recordResources[recordName] = {Resources:Resources,Resource:Resource};

			if(!zonewatchers[zoneName]) {

				var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/zones/lookup?ckAPIToken="+container.api;
				if(container.ckSession) {
					authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
				}

				var postdata = {zones:{zoneName:zoneName}};

				var requestAuth = $http.post(authurl,postdata,{headers:{'Content-Type': undefined}});
				requestAuth.success(function(response){
					var zones = response.zones;
					var zone = zones[0];
					var syncToken = zone.syncToken;

					saveSyncToken(zoneName,syncToken);
					module.notifications();
				});
				zonewatchers[zoneName] = true;
			}
		}

		module.longpoll = function(url) {
			$http.get(url).success(function(result){
				// console.log(result);
				if(result.ck.qry.zid!='_defaultZone') {
					module.getChanges(result.ck.qry.zid);
				}
				module.longpoll(url);
			}).error(function(err){
				// console.log(err);
			});
		}

		module.registerToken = function(tokeninfo) {
			// [path]/database/[version]/[container]/[environment]/tokens/register
			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/tokens/register?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}
			var requestAuth = $http.post(authurl,{apnsToken:tokeninfo.apnsToken,apnsEnvironment:tokeninfo.apnsEnvironment},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				// module.longpoll(result.webcourierURL);
				// console.log(result);
			}).error(function(error){
				// console.log(error);
				// if(error && error.redirectUrl) {
				// 	window.open(error.redirectUrl);
				// }
			})
		}

		module.notifications = function() {
			var authurl = "https://api.apple-cloudkit.com/device/1/"+container.container+"/development/tokens/create?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}
			var requestAuth = $http.post(authurl,{},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				// module.registerToken(result);
				module.longpoll(result.webcourierURL);
				// console.log(result);
			}).error(function(error){
				// console.log(error);
				// if(error && error.redirectUrl) {
				// 	window.open(error.redirectUrl);
				// }
			})
		}

		module.subscription = function() {

			// container.database = 'public';
			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/subscriptions/modify?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			// ,{apnsEnvironment:'development'}
			var requestAuth = $http.post(authurl,{operations:[{operationType:'create',subscription:{zoneID:{zoneName:'bookmarksZone'},subscriptionType:'query',query:{recordType:'Bookmarks'},firesOn:['create','update','delete'],zoneWide:false}}]},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				// module.longpoll(result.webcourierURL);
				// console.log(result);
			}).error(function(error){
				console.log(error);
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
			// container.database = 'public';
			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/users/current?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			var requestAuth = $http.get(authurl);
			requestAuth.success(function(result){
				// console.log(result);
				module.subscription();
			}).error(function(error){
				if(error && error.redirectUrl) {
					window.open(error.redirectUrl);
				}
			})
			window.addEventListener('message', function(e) {
				// console.log(e.data.ckSession);
			    if(e.data.ckSession) {			    	
			    	$cookieStore.put(container.container,e.data.ckSession);
				    container.ckSession = e.data.ckSession;
				    module.auth();
				}
			});
			return requestAuth;
		}

		module.uploadFile = function(filename,filedata,recordName,zoneName,record) {

			var authurl = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/assets/upload?ckAPIToken="+container.api;
			if(container.ckSession) {
				authurl = authurl+"&ckSession="+encodeURIComponent(container.ckSession);
			}
			var tokens = [{
		      "recordType": recordName,
		      "fieldName": filename
		    }];

			var requestAuth = $http.post(authurl,{tokens:tokens,zoneID:{zoneName:zoneName}},{headers:{'Content-Type': undefined}});
			requestAuth.success(function(result){
				forEach(result.tokens,function(token){
					var fd = new FormData();
					console.log(filedata);
					var newfiledata = dataURItoBlob(filedata);
					console.log(newfiledata);
			        fd.append('file', newfiledata,filename);
			        $http.post(token.url, fd, {transformRequest: angular.identity,headers: {'Content-Type': undefined}}).success(function(fileresponse){
			        	var url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/modify?ckAPIToken="+container.api;
			        	if(container.ckSession) {
							url = url+"&ckSession="+encodeURIComponent(container.ckSession);
						}
			        	var fields = {};
			        	fields[filename] = {value:fileresponse.singleFile};
			        	// console.log(record);
			        	var data = {zoneID:{zoneName:zoneName},operations:[{operationType:'update',record:{recordType:recordName,fields:fields,recordName:record.recordName,recordChangeTag:record.recordChangeTag}}]};
			        	$http.post(url, data, {headers:{'Content-Type': undefined}}).success(function(fileupdateresponse){
			        		console.log(fileupdateresponse);
				        });
			        });
				});
				// module.subscription();
			}).error(function(error){
				if(error && error.redirectUrl) {
					window.open(error.redirectUrl);
				}
			})
		}

		module.auth();

		// function Route(template, defaults) {
	 //        this.template = template;
	 //        this.defaults = extend({}, module.defaults, defaults);
	 //        this.urlParams = {};
  //     	}

	    function cloudFactory(recordName,zoneName,paramDefaults, actions, options) {
	    	// var route = new Route(recordName, options);

	    	actions = extend({}, module.defaults.actions, actions);

	    	function extractParams(data, actionParams) {
	          var ids = {};
	          actionParams = extend({}, paramDefaults, actionParams);
	          forEach(actionParams, function(value, key) {
	            if (isFunction(value)) { value = value(); }
	            ids[key] = value && value.charAt && value.charAt(0) == '@' ?
	              lookupDottedPath(data, value.substr(1)) : value;
	          });
	          return ids;
	        }

	    	function defaultResponseInterceptor(response) {
		        return response.resource;
		    }

			function Resource(value) {
				shallowClearAndCopy(value || {}, this);
			}

			angular.forEach(actions,function(action, name){

				var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

				Resource[name] = function(a1, a2, a3, a4) {

					// console.log(a1, a2, a3, a4);

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
					var records = data.records ? data.records : [];
					var value = isInstanceCall ? data : (action.isArray ? new Resource({records:records}) : new Resource(data));
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

<<<<<<< Updated upstream
			        
=======
			        // console.log(data);
>>>>>>> Stashed changes

			        // data['records'] = {'recordName':recordName,'desiredKeys':fields};

			        if (hasBody) { 
			        	httpConfig.data = copy(data);

				        var params = extend({}, extractParams(data, action.params || {}), params);// extractParams(data, action.params || {});

				        forEach(params, function(value, key) {
				            // if (!self.urlParams[key]) {
				              	httpConfig.data = httpConfig.data || {};
				              	httpConfig.data[key] = value;
				            // }
				        });

				    }

			        // console.log(data,params);

			        // console.log(data,httpConfig);
			        // return;

			        var assets = [];

			        httpConfig.headers = {'Content-Type': undefined};
			        if(name == "query") {
			        	value.query = httpConfig.data.query;
			        	value.resultsLimit = httpConfig.data.resultsLimit;
			        	httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/query?ckAPIToken="+container.api;
			        } else if(name == "get") {
				        httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/lookup?ckAPIToken="+container.api;
				    } else if(name == "save") {
				        httpConfig.url = "https://api.apple-cloudkit.com/database/1/"+container.container+"/"+container.environment+"/"+container.database+"/records/modify?ckAPIToken="+container.api;
				        console.log(value,data);
				        if(!data.record || !data.record.recordName) {
					    	httpConfig.data.operations = [{operationType:'create',record:{recordType:recordName,fields:data}}];
					    	forEach(data,function(datavalue,key){
					    		// console.log(key,value);
					    		delete httpConfig.data[key];
					    	});
					    } else if(data.record && ((httpConfig.data.operations && !httpConfig.data.operations.record) || !httpConfig.data.operations)) {
					    	forEach(data.record.fields,function(fieldvalue,key){
					    		if(fieldvalue.asset) {
					    			assets.push({key:key,value:fieldvalue.value});
					    			delete data.record.fields[key];
					    		}
					    	});
					        httpConfig.data.operations = [{operationType:'update',record:data.record}];
					        delete httpConfig.data.record;
					    } else if(data.records && ((httpConfig.data.operations && !httpConfig.data.operations[0].record) || !httpConfig.data.operations)) {
					    	httpConfig.data.operations = [];
					    	forEach(data.records,function(record){
					    		httpConfig.data.operations.push({operationType:'update',record:record.record});
					    	});
					        delete httpConfig.data.records;
					    }
				    }
			        if(container.ckSession) {
						httpConfig.url = httpConfig.url+"&ckSession="+encodeURIComponent(container.ckSession);
					}

					httpConfig.data.zoneID = {zoneName:zoneName};

			        var promise = $http(httpConfig).then(function (response) {
			        	var data = response.data, promise = value.$promise;

			            if (data) {
			              // Need to convert action.isArray to boolean in case it is undefined
			              // jshint -W018
			              if (name == "query" && data.records && angular.isArray(data.records) !== (!!action.isArray)) {
			                throw $resourceMinErr('badcfg',
			                    'Error in resource configuration. Expected ' +
			                    'response to contain an {0} but got an {1}',
			                  action.isArray ? 'array' : 'object',
			                  angular.isArray(data) ? 'array' : 'object');
			              }
			              // jshint +W018
			              if (action.isArray) {
			                // value.records.length = 0;
			                value.total = data.total;
			                value.continuationMarker = data.continuationMarker;
			                // console.log(data);
			                forEach(data.records, function (item) {
			                	// console.log(item);
			                	
			                	if (typeof item === "object") {
				                    value.records.push(new Resource({record:item}));
				                } else {
				                    // Valid JSON values may be string literals, and these should not be converted
				                    // into objects. These items will not have access to the Resource prototype
				                    // methods, but unfortunately there
				                    value.records.push(item);
			                  	}
			                });
			              } else {
			              	if(name == "get" || name == "save") {
			              		if(data.records[0].serverErrorCode) {

			              			// console.log(data,value);

			              			value.$resolved = true;

			              			// var reason = data.records[0].reason;

			              			(error||noop)(response);

			              			// console.log(this);

			              			return $q.reject(response);
			              			// if(httpConfig.data.operations && httpConfig.data.operations.record) {
				              		// 	data.record = httpConfig.data.operations.record;
				              		// }
			              			// // delete data.records;

			              			// shallowClearAndCopy(data, value);

			              			// value.$resolved = true;

						            // response.resource = value;

						            // console.log(data,value);

						            // return response;
					        		// return $q.reject(reason);;
					        	}

					        	// console.log(value);

					        	if(value.records) {
					        		var records = copy(data.records);
					        		data.records = [];
					        		data.total = value.total;
					        		data.query = value.query;
					                data.continuationMarker = value.continuationMarker;

					        		forEach(records,function(record){
					        			data.records.push(new Resource({record:record}));
					        		});
				              		// delete data.records;
					        	} else {
					        		data.record = data.records[0];
					        		forEach(assets,function(asset){
					        			console.log(asset.value);
					        			module.uploadFile(asset.key,asset.value,recordName,zoneName,data.record);
					        		});
				              		delete data.records;
					        	}
			              	}
			                shallowClearAndCopy(data, value);
			                value.$promise = promise;
			              }
			            }

			            if (name == "query") {
				            module.lookupZone(recordName,zoneName,value,Resource);
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

			// console.log(this);

			Resource.bind = function(additionalParamDefaults){
		        return resourceFactory(recordName, zoneName, extend({}, paramDefaults, additionalParamDefaults), actions);
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