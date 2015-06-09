/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

// 'use strict';

var cloudKit = angular.module('cloudKit', []).provider('$cloudKit', function() {
	var module          = this;
	module.containers 	= [];

	module.connection = function(container) {
        module.containers.push(container);
        return this;
    };

	module.$get = ['$q', '$rootScope', '$window', function ($q,$rootScope,$window) {

		var ObjectStore = function(storeName) {
	        this.storeName = storeName;
	        this.transaction = undefined;
	    };

	    ObjectStore.prototype = {

	    }

	    return {
			/**
	         * @ngdoc method
	         * @name $indexedDB.objectStore
	         * @function
	         *
	         * @description an IDBObjectStore to use
	         *
	         * @params {string} storename the name of the objectstore to use
	         * @returns {object} ObjectStore
	         */
	        objectStore: function(storeName) {
	            return new ObjectStore(storeName);
	        }
		}

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