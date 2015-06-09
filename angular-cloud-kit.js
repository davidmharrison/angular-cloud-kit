/**
 * @license $cloudKit
 * (c) 2015 David Harrison (watchinharrison)
 * License: MIT
 */

'use strict';

angular.module('cloudKit', []).provider('$cloudKit', function() {
    var module          = this;


    /** default variables */
    module.environment = 'development';
    module.containerIdentifier = '';
    module.apiToken = '';
    // module.db = null;
    // module.dbPromise = null;
    // module.debugMode = false;

    module.connection = function(containerIdentifier) {
        module.containerIdentifier = containerIdentifier;
        // return this;
    };

    module.init = function() {
	  try {

	    // Configure CloudKit for your app.
	    CloudKit.configure({
	      containers: [{

	        // Change this to a container identifier you own.
	        containerIdentifier: module.containerIdentifier,

	        // And generate an API token through CloudKit Dashboard.
	        apiToken: module.apiToken,
	        
	        auth: {
	          buttonSize: 'medium',
	          persist: true // Sets a cookie.
	        },
	        environment: module.environment
	      }]
	    });

	    var failAuth = function() {
	      var span = document.getElementById('username');
	      span.textContent = 'Authentication Failed';
	    };

	    // Try to run the authentication code.
	    try {
	      // CKCatalog.tabs['authentication'][0].sampleCode().catch(failAuth);
	    } catch (e) {
	      failAuth();
	    }
	  } catch (e) {
	    // CKCatalog.dialog.showError(e);
	  }
	};


    window.addEventListener('cloudkitloaded',module.init);


    return {
        
    };

});