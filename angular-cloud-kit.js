/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

// "use strict";


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

    angular.forEach(dst, function(value, key) {
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

    return new Blob([ia], {
        type: mimeString
    });
}

function Model($injector) {
    var ModelFactory = {};

    ModelFactory.belongsTo = function(model, options) {


        this.many = false;
        this.model = model;
        return this;
    }

    ModelFactory.hasMany = function(model, options) {
        this.many = true;
        this.model = model;
        return this;
    }

    ModelFactory.attr = function(attr) {

    }

    return ModelFactory;

}

var cloudKit = angular.module('cloudKit', ['ngCookies', 'angular-cache']).config(function(CacheFactoryProvider) {
    angular.extend(CacheFactoryProvider.defaults, {
        maxAge: 15 * 60 * 1000, // Items added to this cache expire after 15 minutes.
        cacheFlushInterval: 60 * 60 * 1000, // This cache will clear itself every hour.
        deleteOnExpire: 'aggressive', // Items will be deleted from this cache right when they expire.
        storageMode: 'localStorage' // This cache will use `localStorage`.
    });
}).service('Model', Model).provider('$cloudKit', function() {
    var module = this;
    var provider = this;

    this.defaults = {
        // Strip slashes by default
        stripTrailingSlashes: true,

        // Default actions configuration
        actions: {
            'get': {
                method: 'POST'
            },
            'save': {
                method: 'POST'
            },
            'query': {
                method: 'POST',
                isArray: true
            },
            'remove': {
                method: 'POST'
            },
            'delete': {
                method: 'POST'
            }
        }
    };

    module.containers = [];

    var noop = angular.noop,
        forEach = angular.forEach,
        extend = angular.extend,
        copy = angular.copy,
        isFunction = angular.isFunction;

    module.connection = function(container) {
        module.containers.push(container);
        return this;
    };

    module.user = null;

    module.$get = ['$q', '$http', 'ipCookie', '$filter', '$injector', '$rootScope', '$cacheFactory', 'CacheFactory',
        function($q, $http, ipCookie, $filter, $injector, $rootScope, $cacheFactory, CacheFactory) {

            var cache = CacheFactory('cloudKitCache');

            var container = module.containers[0];

            var zoneSyncTokens = {};

            var saveSyncToken = function(zone, token) {
                zoneSyncTokens[zone] = token;
            };

            var getSavedSyncToken = function(zone) {
                return zoneSyncTokens[zone];
            };

            var shouldAppendRecords = false;

            var recordResources = {};

            module.getChanges = function(zoneName) {

                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/private/records/changes?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }

                var zone = {
                    zoneName: zoneName
                };

                var postdata = {
                    zoneID: zone,
                    resultsLimit: 10
                };

                var savedSyncToken = getSavedSyncToken(zoneName);

                if (savedSyncToken) {
                    postdata.syncToken = savedSyncToken;
                } else {
                    // If we don't have a syncToken we don't want to
                    // append records to an existing list.
                    shouldAppendRecords = false;
                }

                var requestAuth = $http.post(authurl, postdata, {
                    headers: {
                        'Content-Type': undefined
                    }
                });
                requestAuth.success(function(response) {
                    var syncToken = response.syncToken;
                    var records = response.records;
                    var moreComing = response.moreComing;

                    saveSyncToken(zoneName, syncToken);

                    // Replace the existing list of records with a new one.
                    forEach(records, function(record) {
                        var Resources = recordResources[record.recordType].Resources;
                        if (!Resources.records) {
                            Resources.records = [];
                        }
                        var Resource = recordResources[record.recordType].Resource;
                        var match = $filter("filter")(Resources.records, function(existrecord) {
                            if (existrecord.record) {
                                return existrecord.record.recordName == record.recordName;
                            }
                        }, false);
                        if (match && match[0]) {
                            match[0].record = record;
                        } else {
                            Resources.records.push(new Resource({
                                record: record
                            }));
                            Resources.total++;
                        }
                    });

                    // If there are more records to come, we will append the records instead
                    // of replacing them on the next run.
                    shouldAppendRecords = moreComing;

                }).error(function(error) {

                })
            }

            var zonewatchers = {};

            module.lookupZone = function(recordName, zoneName, Resources, Resource) {

                recordResources[recordName] = {
                    Resources: Resources,
                    Resource: Resource
                };

                module.subscription(recordName, zoneName);

                if (!zonewatchers[zoneName]) {

                    var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/zones/lookup?ckAPIToken=" + container.api;
                    if (container.ckSession) {
                        authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                    }

                    var postdata = {
                        zones: {
                            zoneName: zoneName
                        }
                    };

                    var requestAuth = $http.post(authurl, postdata, {
                        headers: {
                            'Content-Type': undefined
                        }
                    });
                    requestAuth.success(function(response) {
                        var zones = response.zones;
                        var zone = zones[0];
                        var syncToken = zone.syncToken;

                        saveSyncToken(zoneName, syncToken);
                        module.notifications();
                    });
                    zonewatchers[zoneName] = true;
                }
            }

            module.createZone = function(zoneName) {

                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/zones/modify?ckAPIToken=" + container.api;

                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }

                var postdata = {
                    operations: [{
                        operationType: 'create',
                        zone: {
                            zoneID: {
                                zoneName: zoneName
                            }
                        }
                    }]
                };

                var requestAuth = $http.post(authurl, postdata, {
                    headers: {
                        'Content-Type': undefined
                    }
                });
                requestAuth.success(function(response) {
                    console.log(response);
                });

            }

            module.longpoll = function(url) {
                $http.get(url,{ignoreLoadingBar: true}).success(function(result) {

                    if (result.ck.qry.zid != '_defaultZone') {
                        module.getChanges(result.ck.qry.zid);
                    }

                }).error(function(err) {

                });
            }

            module.registerToken = function(tokeninfo) {

                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/tokens/register?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }

                var requestAuth = $http.post(authurl, {
                    apnsToken: tokeninfo.apnsToken,
                    apnsEnvironment: tokeninfo.apnsEnvironment
                }, {
                    headers: {
                        'Content-Type': undefined
                    }
                });
                requestAuth.success(function(result) {

                }).error(function(error) {

                })
            }

            module.notifications = function() {
                var authurl = "https://api.apple-cloudkit.com/device/1/" + container.container + "/" + container.environment + "/tokens/create?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }

                var requestAuth = $http.post(authurl, {
                    apnsEnvironment: container.environment
                }, {
                    headers: {
                        'Content-Type': undefined
                    }
                });
                requestAuth.success(function(result) {
                    module.longpoll(result.webcourierURL);
                }).error(function(error) {

                })
            }

            module.subscription = function(recordName, zoneName) {


                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/subscriptions/modify?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }

                var requestAuth = $http.post(authurl, {
                    operations: [{
                        operationType: 'create',
                        subscription: {
                            zoneID: {
                                zoneName: zoneName
                            },
                            subscriptionType: 'query',
                            query: {
                                recordType: recordName
                            },
                            firesOn: ['create', 'update', 'delete'],
                            zoneWide: false
                        }
                    }]
                }, {
                    headers: {
                        'Content-Type': undefined
                    }
                });
                requestAuth.success(function(result) {


                }).error(function(error) {
                    console.log(error);



                })
            }

            module.auth = function() {
                var cloudCookie = ipCookie(container.container);

                if (cloudCookie) {
                    container.ckSession = cloudCookie;
                }

                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/public/users/current?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }
                var requestAuth = $http.get(authurl);
                requestAuth.success(function(result) {
                    module.user = result;
                    $rootScope.user = {
                        login: result
                    };

                }).error(function(error) {
                    if (error && error.redirectUrl) {
                        $rootScope.redirectUrl = error.redirectUrl;
                        $rootScope.user = {
                            login: false
                        };
                        module.user = null;

                    }
                })
                window.addEventListener('message', function(e) {

                    if (e.data.ckSession) {
                        ipCookie(container.container, e.data.ckSession, {
                            domain: '.cloudkit.dev'
                        })

                        container.ckSession = e.data.ckSession;
                        module.auth();
                    }
                });
                return requestAuth;
            }

            module.uploadFile = function(filename, filedata, recordName, zoneName) {

                var authurl = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/assets/upload?ckAPIToken=" + container.api;
                if (container.ckSession) {
                    authurl = authurl + "&ckSession=" + encodeURIComponent(container.ckSession);
                }
                var tokens = [{
                    "recordType": recordName,
                    "fieldName": filename
                }];

                var requestAuth = $http.post(authurl, {
                    tokens: tokens,
                    zoneID: {
                        zoneName: zoneName
                    }
                }, {
                    headers: {
                        'Content-Type': undefined
                    }
                })
                var pFiles = [];
                return requestAuth.then(function(result) {

                    forEach(result.data.tokens, function(token) {
                        var fd = new FormData();
                        // console.log(filedata);
                        var newfiledata = dataURItoBlob(filedata);

                        fd.append('file', newfiledata, filename);
                        var uplodaPromise = $http.post(token.url, fd, {
                            transformRequest: angular.identity,
                            headers: {
                                'Content-Type': undefined
                            }
                        }).success(function(imageupload) {

                            return imageupload;

                        });
                        pFiles.push(uplodaPromise);

                    });
                    return $q.all(pFiles);

                });

            }

            module.auth();

            function cloudFactory(recordName, zoneName, model, paramDefaults, actions, options) {

                actions = extend({}, module.defaults.actions, actions);

                function extractParams(data, actionParams) {
                    var ids = {};
                    actionParams = extend({}, paramDefaults, actionParams);
                    forEach(actionParams, function(value, key) {
                        if (isFunction(value)) {
                            value = value();
                        }
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

                function getReferenceRecords(record,model) {
	            	var children = [];

	            	forEach(record.fields, function(field, fieldkey) {
	                    if (field.type == "REFERENCE") {

	                        if (model[fieldkey] && model[fieldkey].model) {

	                            var newmodel = new model[fieldkey].model;
	                            var getsub = newmodel.$get({
	                                records: {
	                                    recordName: field.value.recordName
	                                }
	                            }).then(function(subres) {
	                                if (subres.record) {
	                                    subres.record.action = "NONE";
	                                }
	                                field.value = new Resource(subres.record);
	                                return subres;
	                            });
	                            children.push(getsub);
	                        }
	                    } else if (field.type == "REFERENCE_LIST") {
	                        if (model[fieldkey] && model[fieldkey].model) {
	                            var values = copy(field.value);
	                            field.value = [];
	                            forEach(values, function(referencevalue) {
	                                var newmodel = new model[fieldkey].model;
	                                var getsub = newmodel.$get({
	                                    records: {
	                                        recordName: referencevalue.recordName
	                                    }
	                                }).then(function(subres) {

	                                    if (subres.record) {
	                                        subres.record.action = "NONE";
	                                    }
	                                    field.value.push(new Resource(subres.record));
	                                    return subres;
	                                });
	                                children.push(getsub);
	                            });
	                        }
	                    }
	                });

					return children;
	            }

                angular.forEach(actions, function(action, name) {

                    var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);

                    Resource[name] = function(a1, a2, a3, a4) {

                        if (name == "query") {
                            module.lookupZone(recordName, zoneName, value, Resource);
                        }

                        var params = {},
                            data, success, error;

                        switch (arguments.length) {
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
                            case 0:
                                break;
                            default:
                                throw $resourceMinErr('badargs',"Expected up to 4 arguments [params, data, success, error], got {0} arguments",arguments.length);
                        }

                        var isInstanceCall = this instanceof Resource;
                        var records = data.records ? data.records : [];
                        var value = isInstanceCall ? data : (action.isArray ? new Resource({ records: records }) : new Resource(data));
                        var httpConfig = {};

                        var responseInterceptor = action.interceptor && action.interceptor.response || defaultResponseInterceptor;

                        var responseErrorInterceptor = action.interceptor && action.interceptor.responseError || undefined;

                        forEach(action, function(value, key) {
                            if (key != 'params' && key != 'isArray' && key != 'interceptor') {
                                httpConfig[key] = copy(value);
                            }
                        });

                        if (hasBody) {
                            httpConfig.data = copy(data);

                            var params = extend({}, extractParams(data, action.params || {}), params);

                            forEach(params, function(value, key) {
                                httpConfig.data = httpConfig.data || {};
                                httpConfig.data[key] = value;
                            });

                        }

                        var assets = [];

                        httpConfig.headers = {
                            'Content-Type': undefined
                        };

                        function checkSub(httpConfig) {
                            return $q(function(resolve, reject) {
                                if (name == "query") {

                                    value.query = httpConfig.data.query;
                                    value.resultsLimit = httpConfig.data.resultsLimit;

                                    var query = extend({}, {
                                        recordType: recordName
                                    }, data.query);

                                    httpConfig.data.query = query;
                                    httpConfig.data.zoneID = {
                                        zoneName: zoneName
                                    };

                                    httpConfig.url = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/records/query?ckAPIToken=" + container.api;
                                    resolve(httpConfig);
                                } else if (name == "get") {
                                    httpConfig.url = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/records/lookup?ckAPIToken=" + container.api;
                                    resolve(httpConfig);
                                } else if (name == "save") {
                                    httpConfig.url = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/records/modify?ckAPIToken=" + container.api;

                                    if (data.recordName) {
                                        var pFiles = [];

                                        forEach(data.fields, function(fieldvalue, key) {

                                            if (fieldvalue.type == "REFERENCE" && fieldvalue.value.recordName) {
                                                if (fieldvalue.value instanceof Resource) {
                                                    fieldvalue.value.$save();
                                                }
                                            }

                                            if (model[key] && model[key].model instanceof Function && model[key].many && value.record && value.record.fields[key] && angular.isArray(value.record.fields[key].value)) {
                                                forEach(data.fields[key].value, function(subval, subindex) {

                                                    if (subval.recordName) {

                                                    } else {
                                                        var newSubModel = new model[key].model(subval.fields);
                                                        var newSubModPromise = newSubModel.$save(subval.fields).then(function(newmodelresult) {
                                                            newmodelresult.record.action = "NONE";
                                                            data.fields[key].value[subindex] = newmodelresult.record;
                                                            return newmodelresult;
                                                        });
                                                        pFiles.push(newSubModPromise);
                                                    }
                                                });
                                            } else {
                                                if (model[key] == 'file') {
                                                    if (angular.isArray(fieldvalue.value)) {
                                                        forEach(fieldvalue.value, function(file) {

                                                            var filePromise = module.uploadFile(key, file, recordName, zoneName);

                                                            var newPromise = filePromise.then(function(fileresult) {

                                                                data[key] = {
                                                                    value: fileresult[0].data.singleFile
                                                                };
                                                                return fileresult[0].data.singleFile;

                                                            });
                                                            delete data[key];
                                                            pFiles.push(newPromise);
                                                        });
                                                    } else {

                                                        var filePromise = module.uploadFile(key, fieldvalue.value, recordName, zoneName);

                                                        var newPromise = filePromise.then(function(fileresult) {

                                                            data[key] = {
                                                                value: fileresult[0].data.singleFile
                                                            };
                                                            return fileresult[0].data.singleFile;

                                                        });
                                                        delete data[key];
                                                        pFiles.push(newPromise);
                                                    }
                                                }
                                            }

                                        });
                                        var configurepromise = $q.all(pFiles).then(function(uploadedFiles) {
                                            httpConfig.data.operations = [{
                                                operationType: 'update',
                                                record: data
                                            }];

                                            resolve(httpConfig);
                                        });
                                        return configurepromise;
                                    } else if ((!data.record || !data.record.recordName) && !data.records) {

                                        var pFiles = [];

                                        forEach(data, function(fieldvalue, key) {

                                            if (model[key] && model[key].model instanceof Function && ((model[key].model && !model[key].model.recordName) || !model[key].model) && ((value[key].value && !value[key].value.recordName) || !value[key].value)) {

                                                var newSubModel = new model[key].model(fieldvalue);

                                                var newSubModPromise = newSubModel.$save(fieldvalue).then(function(newmodelresult) {
                                                    if (model[key].many) {
                                                        if (!data[key]) {
                                                            data[key] = {
                                                                value: []
                                                            };
                                                        }
                                                        if (!data[key].value) {
                                                            data[key].value = [];
                                                        }
                                                        if (newmodelresult.record) {
                                                            newmodelresult.record.action = "NONE";
                                                            data[key].value.push(newmodelresult.record);
                                                            return newmodelresult;
                                                        } else {
                                                            forEach(newmodelresult.records, function(record) {


                                                                data[key].value.push({
                                                                    recordName: record.record.recordName,
                                                                    zoneID: {
                                                                        zoneName: zoneName
                                                                    },
                                                                    action: "NONE"
                                                                });
                                                            });
                                                            return newmodelresult.records;
                                                        }
                                                    } else {
                                                        data[key] = {
                                                            value: {
                                                                recordName: newmodelresult.record.recordName,
                                                                zoneID: {
                                                                    zoneName: zoneName
                                                                },
                                                                action: "NONE"
                                                            }
                                                        };
                                                        return newmodelresult.record.recordName;
                                                    }

                                                });
                                                delete data[key];
                                                pFiles.push(newSubModPromise);
                                            } else {
                                                console.log(model, key, model[key], fieldvalue);
                                                if (model[key] == 'file') {


                                                    if (angular.isArray(fieldvalue.value)) {
                                                        forEach(fieldvalue.value, function(file) {

                                                            var filePromise = module.uploadFile(key, file, recordName, zoneName);

                                                            var newPromise = filePromise.then(function(fileresult) {
                                                                console.log(fileresult);
                                                                data[key] = {
                                                                    value: fileresult[0].data.singleFile
                                                                };
                                                                return fileresult[0].data.singleFile;

                                                            });
                                                            delete data[key];
                                                            pFiles.push(newPromise);
                                                        });
                                                    } else {

                                                        var filePromise = module.uploadFile(key, fieldvalue.value, recordName, zoneName);

                                                        var newPromise = filePromise.then(function(fileresult) {
                                                            console.log(data[key], data, key, fileresult[0].data.singleFile);
                                                            data[key] = {
                                                                value: fileresult[0].data.singleFile
                                                            };
                                                            return fileresult[0].data.singleFile;

                                                        });
                                                        delete data[key];
                                                        pFiles.push(newPromise);
                                                    }

                                                } else if (model[key] == 'files') {
                                                    forEach(fieldvalue.value, function(file) {

                                                        var filePromise = module.uploadFile(key, file, recordName, zoneName);

                                                        var newPromise = filePromise.then(function(fileresult) {
                                                            console.log(fileresult);
                                                            data[key] = {
                                                                value: [fileresult[0].data.singleFile]
                                                            };
                                                            return fileresult[0].data.singleFile;

                                                        });
                                                        delete data[key];
                                                        pFiles.push(newPromise);
                                                    });
                                                } else {
                                                    if (fieldvalue.value.recordName && !fieldvalue.value.action) {
                                                        fieldvalue.value.action = "NONE";
                                                    }

                                                }
                                            }
                                        });

                                        var configurepromise = $q.all(pFiles).then(function(uploadedFiles) {

                                            httpConfig.data.operations = [{
                                                operationType: 'create',
                                                record: {
                                                    recordType: recordName,
                                                    fields: data
                                                }
                                            }];
                                            forEach(data, function(datavalue, key) {

                                                delete httpConfig.data[key];
                                            });


                                            resolve(httpConfig);
                                        });
                                        return configurepromise;

                                    } else if (data.record && ((httpConfig.data.operations && !httpConfig.data.operations.record) || !httpConfig.data.operations)) {

                                        var pFiles = [];

                                        forEach(data.record.fields, function(fieldvalue, key) {

                                            if (fieldvalue.type == "REFERENCE" && fieldvalue.value.recordName) {
                                                if (fieldvalue.value instanceof Resource) {
                                                    fieldvalue.value.$save();
                                                }
                                            }


                                            // console.log(model, key, model[key], value, value.record.fields[key], data, data.record.fields[key]);

                                            if (model[key] && model[key].model instanceof Function && model[key].many && value.record && value.record.fields[key] && angular.isArray(value.record.fields[key].value)) {
                                                forEach(data.record.fields[key].value, function(subval, subindex) {

                                                    if (subval.recordName) {

                                                    } else {
                                                        var newSubModel = new model[key].model(subval.fields);
                                                        var newSubModPromise = newSubModel.$save(subval.fields).then(function(newmodelresult) {
                                                            newmodelresult.record.action = "NONE";
                                                            data.record.fields[key].value[subindex] = newmodelresult.record;
                                                            return newmodelresult;
                                                        });
                                                        pFiles.push(newSubModPromise);
                                                    }
                                                });

                                            } else {

                                                // console.log(model[key]);
                                                if (model[key] == 'file') {


                                                    if (angular.isArray(fieldvalue.value)) {
                                                        forEach(fieldvalue.value, function(file) {

                                                            var filePromise = module.uploadFile(key, file, recordName, zoneName);

                                                            var newPromise = filePromise.then(function(fileresult) {
                                                                console.log(fileresult);
                                                                data[key] = {
                                                                    value: fileresult[0].data.singleFile
                                                                };
                                                                return fileresult[0].data.singleFile;

                                                            });
                                                            delete data[key];
                                                            pFiles.push(newPromise);
                                                        });
                                                    } else {

                                                        var filePromise = module.uploadFile(key, fieldvalue.value, recordName, zoneName);

                                                        var newPromise = filePromise.then(function(fileresult) {
                                                            console.log(data[key], data, key, fileresult[0].data.singleFile);
                                                            data[key] = {
                                                                value: fileresult[0].data.singleFile
                                                            };
                                                            return fileresult[0].data.singleFile;

                                                        });
                                                        delete data[key];
                                                        pFiles.push(newPromise);
                                                    }

                                                } else if (model[key] == 'files') {
                                                    forEach(fieldvalue.value, function(file) {
                                                    	if(!file.downloadURL) {
	                                                        var filePromise = module.uploadFile(key, file, recordName, zoneName);
	                                                        var newPromise = filePromise.then(function(fileresult) {
	                                                            console.log(fileresult);
	                                                            data[key] = {
	                                                                value: [fileresult[0].data.singleFile]
	                                                            };
	                                                            return fileresult[0].data.singleFile;
	                                                        });
	                                                        delete data[key];
	                                                        pFiles.push(newPromise);
	                                                    }
                                                    });
                                                }
                                            }
                                        });
                                        var configurepromise = $q.all(pFiles).then(function(uploadedFiles) {
                                            httpConfig.data.operations = [{
                                                operationType: 'update',
                                                record: data.record
                                            }];
                                            delete httpConfig.data.record;
                                            resolve(httpConfig);
                                        });
                                        return configurepromise;
                                    } else if (data.records && ((httpConfig.data.operations && !httpConfig.data.operations[0].record) || !httpConfig.data.operations)) {
                                        httpConfig.data.operations = [];
                                        forEach(data.records, function(record) {
                                            if (record.record && record.record.recordName) {
                                                httpConfig.data.operations.push({
                                                    operationType: 'update',
                                                    record: record.record
                                                });
                                            } else {
                                                httpConfig.data.operations.push({
                                                    operationType: 'create',
                                                    record: {
                                                        recordType: recordName,
                                                        fields: record
                                                    }
                                                });
                                            }
                                        });
                                        delete httpConfig.data.records;
                                        resolve(httpConfig);
                                    }
                                } else if (name == "delete" || name == "remove") {
                                    httpConfig.url = "https://api.apple-cloudkit.com/database/1/" + container.container + "/" + container.environment + "/" + container.database + "/records/modify?ckAPIToken=" + container.api;

                                    httpConfig.data.operations = [{
                                        operationType: 'delete',
                                        record: data.record
                                    }];
                                    resolve(httpConfig);
                                }
                            });
                        }

                        if (httpConfig.data) {
                            httpConfig.data.zoneID = {
                                zoneName: zoneName
                            };
                        } else {
                            httpConfig.data = {
                                zoneID: {
                                    zoneName: zoneName
                                }
                            }
                        }

                        var checkSubpromise = checkSub(httpConfig);

                        if (httpConfig.data.records && httpConfig.data.records.recordName) {
                            var cacheId = httpConfig.data.records.recordName;
                        } else if (httpConfig.data.records && httpConfig.data.records[0] && httpConfig.data.records[0].recordName) {
                            var cacheId = httpConfig.data.records[0].recordName;
                        } else if (httpConfig.data.recordName) {
                            var cacheId = httpConfig.data.recordName;
                        } else if (httpConfig.data.query && httpConfig.data.query.recordType) {
                            var cacheId = httpConfig.data.query.recordType;
                        } else {
                            var cacheId = recordName;
                        }

                        if (httpConfig.data.continuationMarker) {
                            cacheId = cacheId + "*" + httpConfig.data.continuationMarker;
                        }

                        if (name == "save" || name == "remove" || name == "delete") {
                            cache.remove(cacheId);
                        }

                        if (name == "query" || name == "get") {

                            var cachedData = cache.get(cacheId);
                            // Return the data if we already have it

                            if (cachedData) {


                                var promise = $q(function(resolve, reject) {
                                    resolve(cachedData);
                                });

                                promise = promise.then(function(response) {
                                    var value = responseInterceptor(response);

                                    if (value.records) {
                                        forEach(value.records, function(record, index) {
                                            forEach(record.record.fields, function(fieldval, fieldkey) {
                                                if (fieldval.type == "REFERENCE") {
                                                    record.record.fields[fieldkey].value = new Resource(fieldval.value);
                                                } else if (fieldval.type == "REFERENCE_LIST") {
                                                    forEach(fieldval.value, function(subval, index) {
                                                        record.record.fields[fieldkey].value[index] = new Resource(subval);
                                                    });
                                                }
                                            });
                                            value.records[index] = new Resource(record);
                                        });
                                    }

                                    value = new Resource(value);

                                    (success || noop)(value, response.headers);

                                    return value;
                                });


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
                        }

                        var promise = checkSubpromise.then(function(httpConfig) {

                            if (container.ckSession) {
                                httpConfig.url = httpConfig.url + "&ckSession=" + encodeURIComponent(container.ckSession);
                            }

                            return $http(httpConfig).then(function(response) {
                                var data = response.data,
                                    promise = value.$promise;

                                if (data) {
                                    // Need to convert action.isArray to boolean in case it is undefined
                                    // jshint -W018
                                    if (name == "query" && data.records && angular.isArray(data.records) !== (!!action.isArray)) {
                                        throw $resourceMinErr('badcfg', 'Error in resource configuration. Expected ' + 'response to contain an {0} but got an {1}', action.isArray ? 'array' : 'object', angular.isArray(data) ? 'array' : 'object');
                                    }
                                    // jshint +W018
                                    if (action.isArray) {
                                        value.total = data.total;
                                        value.continuationMarker = data.continuationMarker;

                                        var children = [];

                                        forEach(data.records, function(record) {

                                            // var subchildren = getReferenceRecords(record,model);

                                            var allchildren = $q.all(getReferenceRecords(record,model)).then(function(childresult) {

                                                if (typeof record === "object") {
                                                    value.records.push(new Resource({
                                                        record: record
                                                    }));
                                                    return new Resource({
                                                        record: record
                                                    });
                                                } else {
                                                    // Valid JSON values may be string literals, and these should not be converted
                                                    // into objects. These items will not have access to the Resource prototype
                                                    // methods, but unfortunately there
                                                    value.records.push(record);
                                                    return record;
                                                }
                                            });

                                            children.push(allchildren);
                                        });
                                    } else {
                                        if (name == "get" || name == "save") {
                                            if (data.records[0].serverErrorCode) {

                                                value.$resolved = true;

                                                (error || noop)(response);

                                                return $q.reject(response);
                                            }

                                            if (value.records) {
                                                var records = copy(data.records);
                                                data.records = [];
                                                data.total = value.total;
                                                data.query = value.query;
                                                data.continuationMarker = value.continuationMarker;

                                                var children = [];

                                                forEach(records, function(record) {

                                                    // var subchildren = [];

                                                    // var subchildren = ;

                                                    var allsubchildren = $q.all(getReferenceRecords(record,model)).then(function(childresult) {

                                                        data.records.push(new Resource({
                                                            record: record
                                                        }));
                                                        return new Resource({
                                                            record: record
                                                        });
                                                    });

                                                    children.push(allsubchildren);
                                                });
                                            } else {
                                                var record = data.records[0];
                                                data.record = record;

                                                var children = getReferenceRecords(record,model);

                                                delete data.records;
                                            }
                                        } else if (name == "delete" || name == "remove") {
                                        	console.log(data,value);
                                        	data.record = data.records[0];
                                        	delete data.records;
                                            // forEach(data.records, function(delrecord) {
                                            //     if (delrecord.deleted) {

                                            //     }
                                            // });
                                        }

                                        shallowClearAndCopy(data, value);

                                        value.$promise = promise;
                                    }
                                }

                                return $q.all(children).then(function() {

                                    response.resource = value;

                                    if (name == "query" || name == "get") {

                                    }

                                    return response;
                                });

                            }, function(response) {
                                value.$resolved = true;

                                (error || noop)(response);

                                return $q.reject(response);
                            });
                        });

                        promise = promise.then(function(response) {
                            var value = responseInterceptor(response);

                            (success || noop)(value, response.headers);
                            return value;
                        }, responseErrorInterceptor);

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

                    Resource.prototype['$' + name] = function(params, success, error) {
                        if (isFunction(params)) {
                            error = success;
                            success = params;
                            params = {};
                        }
                        var result = Resource[name].call(this, params, this, success, error);
                        return result.$promise || result;
                    };
                });

                Resource.bind = function(additionalParamDefaults) {
                    return resourceFactory(recordName, zoneName, extend({}, paramDefaults, additionalParamDefaults), actions);
                };
                return Resource;
            }
            return cloudFactory;
        }
    ];

});