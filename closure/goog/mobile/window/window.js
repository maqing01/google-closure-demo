

/**
 * @fileoverview Lightweight versions of goog.window.* functions.
 *
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.window');

goog.require('goog.string');



/**
 * Opens the given URL in a new window using a META refresh to remove the
 * referrer header.
 * @param {string} url The url to open.
 */
wireless.window.openNewWindowWithoutReferrer = function(url) {
  // Based on goog.window.open().
  var newWin = window.open('', '_blank', '');
  newWin.document.write('<META HTTP-EQUIV="refresh" content="0; url=' +
      goog.string.htmlEscape(url) + '">');
  newWin.document.close();
};

