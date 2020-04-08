

/**
 * @fileoverview Common utility methods used by Scotty.
 *
 * @author andyehou@google.com (Andy Hou)
 */

goog.provide('apps.uploader.common.utils');

goog.require('goog.asserts');
goog.require('goog.fs');
goog.require('goog.memoize');
goog.require('goog.object');
goog.require('goog.uri.utils');


/**
 * Checks if two urls have the same origin (same domain, protocol, and port).
 * @param {string} url1 The first url to check.
 * @param {string} url2 The second url to check.
 * @return {boolean} True if the domain, protocol, and port match or if either
 *     url is relative.
 */
apps.uploader.common.utils.isSameOrigin = function(url1, url2) {
  var scheme1 = goog.uri.utils.getScheme(url1);
  var domain1 = goog.uri.utils.getDomain(url1);
  var port1 = goog.uri.utils.getPort(url1);
  if (!scheme1 && !domain1 && !port1) {
    return true;
  }
  var scheme2 = goog.uri.utils.getScheme(url2);
  var domain2 = goog.uri.utils.getDomain(url2);
  var port2 = goog.uri.utils.getPort(url2);
  if (!scheme2 && !domain2 && !port2) {
    return true;
  }
  return scheme1 == scheme2 && domain1 == domain2 && port1 == port2;
};


/**
 * Convert headers from a string to an object.
 * @param {string} headersString A string with header name/value pairs
 *     separated by LF or CR/LF.
 * @return {!Object} An object with the header keys as keys and header values
 *     as values.
 */
apps.uploader.common.utils.headersToObject = function(headersString) {
  var headersObject = {};
  var headersArray = headersString.replace(/\r/g, '').split('\n');
  for (var i = 0; i < headersArray.length; i++) {
    var header = headersArray[i];
    var colinIndex = header.indexOf(':');
    if (colinIndex < 0) {
      continue;
    }
    var key = header.substring(0, colinIndex);
    var value = header.substring(colinIndex + 2, header.length);
    headersObject[key] = value;
  }
  return headersObject;
};


/**
 * Convert headers from an object to a string.
 * @param {Object} headersObject An object with the header keys as keys and
 *     header values as values.
 * @return {string} A string with header name/value pairs separated by CR/LF.
 */
apps.uploader.common.utils.headersToString = function(headersObject) {
  var headersString = '';
  goog.object.forEach(headersObject, function(value, key) {
    headersString += key + ': ' + value + '\r\n';
  });
  return headersString;
};


/**
 * Returns the size of the raw string represented by a base64 encoded string.
 * @param {string} string The base64 encoded string.
 * @return {number} The size of the raw string.
 */
apps.uploader.common.utils.getBase64DecodedSize = function(string) {
  goog.asserts.assert(string.length % 4 == 0);

  var size = string.length / 4 * 3;

  // Subtract padding.
  if (string.slice(-2) == '==') {
    size -= 2;
  } else if (string.slice(-1) == '=') {
    size -= 1;
  }

  return size;
};


/**
 * Checks for browser support for creating Blobs. The value is lazily computed
 * and then cached.
 * @return {boolean} True if this browser supports creating Blobs.
 */
apps.uploader.common.utils.isBlobSupported = goog.memoize(function() {
  if (!goog.global.Blob) {
    return false;
  }

  // Some browsers (Safari 6, I'm looking at you) define the Blob
  // constructor, but have a buggy implementation where the Blob has
  // an incorrect size, or do not appear to define the blob
  // constructor at all.
  var array = new Uint8Array(100);

  var blob;
  try {
    blob = new Blob([array]);
  } catch (e) {
    return false;
  }

  if (blob.size != 100) {
    return false;
  }

  return true;
});


/**
 * Checks for browser support for slicing Blobs. The value is lazily computed
 * and then cached.
 * @return {boolean} True if this browser supports slicing Blobs.
 */
apps.uploader.common.utils.isBlobSliceSupported = goog.memoize(function() {
  if (!goog.global.Blob) {
    return false;
  }

  var array = new Uint8Array(100);

  var blob;
  try {
    // Safari's blob constructor may simply throw an error.
    blob = new Blob([array]);
  } catch (e) {
    return false;
  }

  if (goog.fs.sliceBlob(blob, 0, 1) === null) {
    return false;
  }

  return true;
});
