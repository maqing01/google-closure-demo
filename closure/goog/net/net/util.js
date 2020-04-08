



goog.provide('office.net.Util');

goog.require('goog.asserts');
goog.require('goog.string');



office.net.Util.validateUrlPrefix = function(urlPrefix) {
  var validAbsolutePrefix = goog.string.startsWith(urlPrefix, 'https://') ||
      goog.string.startsWith(urlPrefix, 'http://');
  var validRelativePrefix = goog.string.startsWith(urlPrefix, '/');
  var validPrefix = validAbsolutePrefix || validRelativePrefix;
  var validSuffix = !goog.string.endsWith(urlPrefix, '/');

  goog.asserts.assert(urlPrefix == '' || (validPrefix && validSuffix));
};

