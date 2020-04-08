

/**
 * @fileoverview General url methods.
 * Not using closure functions due to their code size and the fact that many of
 * them do not preserve #fragment.
 *
 * @author mlueck@google.com (Mike Lueck)
 * @author iliat@google.com (Ilia Tulchinsky)
 */

goog.provide('webapps.common.urls');
goog.require('goog.asserts');

/**
 * The sky query parameter.
 * @type {string}
 * @private
 */
webapps.common.urls.SKY_QUERY_PARAM_NAME_ = 'sky';

/**
 * Propagate "sky" parameter on the provided URL.
 * @param {string} url Url to attach sky to.
 * @param {?Document=} opt_document Optional document object.
 *
 * @return {string} The new url.
 */
webapps.common.urls.propagateSkyParam = function(url, opt_document) {
  var doc = opt_document || document;
  // Propagate the sky parameter if it exists in the URL.
  if (doc.location.search) {
    var value = webapps.common.urls.getParameter(
        doc.location.search, webapps.common.urls.SKY_QUERY_PARAM_NAME_);
    if (value) {
      return webapps.common.urls.setParameter(url,
          webapps.common.urls.SKY_QUERY_PARAM_NAME_, value);
    }
  }
  return url;
};

/**
 * Extracts a parameter from the current URL.  Name match is case insensitive.
 * @param {string} url Url or query part of url to extract params from.
 * @param {string} name Name of the parameter.
 * @param {boolean=} opt_caseSensitive True if want case sensitivity.
 * @return {string?} The value of the parameter (uridecoded).
 */
webapps.common.urls.getParameter = function(url, name, opt_caseSensitive) {
  var regExp = webapps.common.urls.createQueryParameterRegExp_(name);
  var value = url && (opt_caseSensitive ? url.match(regExp) :
      url.toLowerCase().match(regExp));
  return value && decodeURIComponent(value[2]);
};

/**
 * Extracts the sky parameter from the current URL.
 * @param {string} url Url or query part of url to extract params from.
 *
 * @return {string?} The value of the sky parameter (uridecoded).
 */
webapps.common.urls.getSkyParameter = function(url) {
  return webapps.common.urls.getParameter(url,
      webapps.common.urls.SKY_QUERY_PARAM_NAME_);
};

/**
 * Append or replace a parameter in the url query portion.
 * @param {string} url Url to change.
 * @param {string} key Key to set
 *    (should be regex escaped and urlencoded).
 * @param {string} value Value to set at the key
 *    (should be regex escaped and url encoded).
 * @return {string} The new url.
 */
webapps.common.urls.setParameter = function(url, key, value) {
  goog.asserts.assert(goog.isDefAndNotNull(key),
      'Key should not be null/undefined.');
  goog.asserts.assert(goog.isDefAndNotNull(value),
      'Value should not be null/undefined.');

  var keyValueString = key + '=' + value;

  var regExp = webapps.common.urls.createQueryParameterRegExp_(key);
  var newUrl = url.replace(regExp, '$1' + keyValueString + '$3');
  if (regExp.test(url)) {
    return newUrl;
  }

  keyValueString = ((url.indexOf('?') >= 0) ? '&' : '?') + keyValueString;
  var hashPos = url.indexOf('#');
  if (hashPos < 0) {
    return url + keyValueString;
  }
  return url.substr(0, hashPos) + keyValueString + url.substr(hashPos);
};

/**
 * Remove a parameter from the url query portion.
 * @param {string} url Url to change.
 * @param {string} key Key to remove
 *    (should be regex escaped and urlencoded).
 * @return {string} The new url.
 */
webapps.common.urls.removeParameter = function(url, key) {
  goog.asserts.assert(key, 'Key should not be null/undefined.');

  var regExp = webapps.common.urls.createQueryParameterRegExp_(key);
  var newUrl = url.replace(regExp, '$1');
  // Note: In (?=#|$) below, ?= means positive lookahead.
  //     See http://www.regular-expressions.info/lookaround.html for more info.
  return newUrl.replace(/[?&](?=#|$)/, '');
};

/**
 * @param {string} key The key of the query parameter you would like to match.
 * @return {!RegExp} Regexp you can use to match the query parameter.
 * @private
 */
webapps.common.urls.createQueryParameterRegExp_ = function(key) {
  var regExp = new RegExp('([&?])' + key + '=([^&#]*)(&?)');
  return regExp;
};

/**
 * Ensures the string starts with a slash y appending a leading slash if
 * the string does not start with it. Otherwise returns the string unchanged.
 * @param {string} s The string to check.
 * @return {string} The string starting with the slash.
 */
webapps.common.urls.ensureStartsWithSlash = function(s) {
  return (s && s.charAt(0) == '/') ? s : ('/' + s);
};

/**
 * Ensures the string does NOT start with a slash by removing
 * a leading slash if it is found. Otherwise returns the string unchanged.
 * @param {string} s The string to check.
 * @return {string} The string NOT starting with the slash.
 */
webapps.common.urls.maybeStripLeadingSlash = function(s) {
  return (s && s.charAt(0) == '/') ? s.substr(1) : s;
};

/**
 * Finds the first # character in the string and removes that character
 * plus all characters following it.
 *
 * @param {string} url The string to strip.
 * @return {string} The resulting string.
 */
webapps.common.urls.stripAnchorFromUrl = function(url) {
  var pos = url.indexOf('#');
  if (pos <= 0) {
    return url;
  }
  return url.substr(0, pos);
};

/**
 * Appends or replace a url path part with a given prefix and value.
 * A path part is assumed to have a form of "/prefix/value".
 * The function either appends the path part to the end of the url path
 * or replaces it if it's already in the url.
 * If prefix or value are null or empty url is returned unchanged.
 *
 * @param {string} url The url to change.
 * @param {string} pathPartPrefix The prefix of the path part.
 *    Prefixes starting with "/" are properly handled by this function.
 *    The prefix should be RegEx escaped.
 * @param {string} value The value to set at after the prefix.
 * @return {string} the The new url.
 */
webapps.common.urls.setUrlPathPartWithPrefix = function(
    url, pathPartPrefix, value) {
  if (!pathPartPrefix || !value) {
    return url;
  }

  pathPartPrefix = webapps.common.urls.ensureStartsWithSlash(pathPartPrefix);

  var fullPathPartToSet = pathPartPrefix + '/' + value;

  var regExp = new RegExp(pathPartPrefix + '/[^/\?#]*');

  var newUrl = url.replace(regExp, fullPathPartToSet);

  if (newUrl != url) {
    return newUrl;
  }

  return webapps.common.urls.appendUrlPathPart(url, fullPathPartToSet);
};

/**
 * Appends path part to a url.
 * E.g. x.y.com?y=z appended with aaa will look like x.y.com/aaa?y=z
 *
 * @param {string} url The url to change.
 * @param {string} pathPart The path part to add. Parts starting with "/"
 *    are properly handled by this function.
 * @return {string} The new url.
 */
webapps.common.urls.appendUrlPathPart = function(url, pathPart) {
  if (!pathPart) {
    return url;
  }
  pathPart = webapps.common.urls.maybeStripLeadingSlash(pathPart);

  var pos1 = url.indexOf('#');
  var pos2 = url.indexOf('?');
  var pathEndPos = (pos1 > 0 && ((pos2 > 0 && pos1 < pos2) || pos2 < 0)) ?
      pos1 : pos2;
  var maybeSlashPos = (pathEndPos > 0 ? pathEndPos : url.length) - 1;
  if (url.charAt(maybeSlashPos) != '/') {
    pathPart = '/' + pathPart;
  }
  if (pathEndPos <= 0) {
    return url + pathPart;
  }
  return url.substr(0, pathEndPos) + pathPart + url.substr(pathEndPos);
};

/**
 * Removes the path part starting with the supplied prefix if it is found.
 * E.g. http://m.google.com/mail/mu/b/45 remove b will result in
 *    http://m.google.com/mail/mu.
 * If pathPrefix is null or empty url is returned unchanged.
 *
 * @param {string} url Url to change.
 * @param {string} pathPartPrefix Path part prefix to remove. No slashes.
 * @return {string} The new url.
 */
webapps.common.urls.removePathPart = function(url, pathPartPrefix) {
  if (!pathPartPrefix) {
    return url;
  }
  pathPartPrefix = webapps.common.urls.maybeStripLeadingSlash(pathPartPrefix);
  return url.replace(new RegExp('/' + pathPartPrefix + '/[^/\?#]*'), '');
};
