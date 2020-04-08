

/**
 * @fileoverview General cookie methods.
 * Leaner than the closure's net.cookie and doesn't have all the extra
 * protection/useful utility code that's there.
 *
 * @author iliat@google.com (Ilia Tulchinsky)
 */

goog.provide('webapps.common.cookies');

/**
 * Gets the current value of a cookie, if any.
 * This method is based on goog.net.cookies.get().
 *
 * @param {string} name the name of the cookie.
 * @param {Document?} opt_document the document to take cookie from.
 * @return {string} The value of the cookie, or empty string if the
 *     cookie is not set.
 *
 */
webapps.common.cookies.getCookieValue = function(name, opt_document) {
  if (!opt_document) {
    opt_document = document;
  }
  var result = (new RegExp('(^|;)\\s*' + name + '=([^;]*)'))
      .exec(opt_document.cookie);
  return (result && result[result.length - 1]) || '';
};

/**
 * Sets a cookie.  The max_age can be -1 to set a session cookie, zero to
 *    expire it.
 *
 * @param {string} name  The cookie name.
 * @param {string} value  The cookie value.
 * @param {number} opt_maxAge  The max age in seconds (from now). Use -1 to set
 *     a session cookie, zero to expire a cookie.
 *     If not provided, the default is -1 (i.e. set a session cookie).
 * @param {string} opt_path  The path of the cookie. If not present then this
 *     uses the full request path.
 * @param {string} opt_domain  The domain of the cookie, or null to not specify
 *     a domain attribute (browser will use the full request host name). If not
 *     provided, the default is null (i.e. let browser use full request host
 *     name).
 * @param {Document?} opt_document the document to take cookie from.
 */
webapps.common.cookies.setCookieValue = function(
    name, value, opt_maxAge, opt_path, opt_domain, opt_document) {
  opt_document = opt_document || document;

  if (!goog.isDef(opt_maxAge)) {
    opt_maxAge = -1;
  }

  var domainStr = opt_domain ? '; domain=' + opt_domain : '';
  var pathStr = opt_path ? '; path=' + opt_path : '';

  var expiresStr;

  // Case 1: Set a session cookie.
  if (opt_maxAge < 0) {
    expiresStr = '';
  // Case 2: Expire the cookie.
  } else if (opt_maxAge == 0) {
    var pastDate = new Date(1970, 1 /*Feb*/, 1);  // Feb 1, 1970
    expiresStr = '; expires=' + pastDate.toUTCString();
  // Case 3: Set a persistent cookie.
  } else {
    var futureDate = new Date((new Date).getTime() + opt_maxAge * 1000);
    expiresStr = '; expires=' + futureDate.toUTCString();
  }

  document.cookie = name + '=' + value + domainStr + pathStr + expiresStr;
};
