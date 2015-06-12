/*
Copyright (C) 2015 Apple Inc. All Rights Reserved.
See LICENSE.txt for this sample’s licensing information

Abstract:
A singleton which encapsulates the functionality of the app's modal dialog.
*/

CKCatalog.dialog = (function() {
  var self = {};

  var el = document.getElementById('dialog');
  var textEl = document.getElementById('dialog-text');

  self.hide = function() {
    el.classList.add('hide');
  };

  var dismissBtn = document.createElement('button');
  dismissBtn.className = 'link';
  dismissBtn.textContent = 'Close';
  dismissBtn.onclick = self.hide;

  var actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(dismissBtn);


  var positionTextEl = function() {
    var rect = textEl.getBoundingClientRect();
    textEl.style.left = 'calc(50% - ' + (rect.width/2) + 'px)';
    textEl.style.top = 'calc(50% - ' + (rect.height/2) + 'px)';
  };

  self.show = function(text) {
    el.classList.remove('hide');
    textEl.classList.add('no-actions');
    textEl.innerHTML = text;
    positionTextEl();
  };

  self.showError = function(error) {
    el.classList.remove('hide');
    textEl.classList.remove('no-actions');
    if(error.ckErrorCode) {
      textEl.innerHTML = '<h2>Error: <span class="error-code">' + error.ckErrorCode + '</span></h2>' +
        '<p class="error">Reason: ' + (error.reason ? error.reason : 'An error occurred.') + '</p>';
    } else {
      var message = error.message || 'An unexpected error occurred.';
      textEl.innerHTML = '<h2>Error</h2>' +
        '<p class="error">' + message + '</p>';
    }
    textEl.appendChild(actions);
    positionTextEl();
  };

  return self;
})();