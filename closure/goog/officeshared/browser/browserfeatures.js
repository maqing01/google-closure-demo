goog.provide('docsshared.browser.BrowserFeatures');

goog.require('goog.array');
goog.require('goog.json');
goog.require('goog.userAgent.product');
goog.require('goog.userAgent.product.isVersion');



/**
 * A class for detecting whether the current browser has particular features.
 * @constructor
 * @struct
 */
docsshared.browser.BrowserFeatures = function() {};


/**
 * Mapping between alias name and minimum Chrome version for that alias. If the
 * Chrome version should be ignored, 0 should be used as the min_version.
 * @typedef {{name: string, minVersion: number}}
 * @private
 */
docsshared.browser.BrowserFeatures.AppPermissionAlias_;


/**
 * Selected chrome app permission names.  As aliases are possible, each
 * permission is represented by an array, with the canonical name first.
 * @enum {!Array.<!docsshared.browser.BrowserFeatures.AppPermissionAlias_>}
 */
docsshared.browser.BrowserFeatures.AppPermission = {
  BACKGROUND: [{name: 'background', minVersion: 0},
               {name: 'background_alias_do_not_use', minVersion: 19}],
  CLIPBOARD_READ: [{name: 'clipboardRead', minVersion: 0}],
  CLIPBOARD_WRITE: [{name: 'clipboardWrite', minVersion: 0}],
  UNLIMITED_STORAGE: [{name: 'unlimitedStorage', minVersion: 0},
                      {name: 'unlimited_storage', minVersion: 0}]
};


/**
 * An enum of installation states for a hosted Chrome app.
 * @enum {string}
 */
docsshared.browser.BrowserFeatures.AppInstallState = {
  DISABLED_OR_NOT_INSTALLED: 'disabled-or-not-installed',
  // Due to Chrome bugs, the app may be installed and enabled, but not actually
  // grant permissions.
  NOT_EFFECTIVE: 'not-effective',
  OK: 'ok'
};


/**
 * Detects whether the current browser has a plugin with a particular name.
 * @param {string} pluginName The name to detect.
 * @return {boolean} Whether there is a plugin with the given name.
 */
docsshared.browser.BrowserFeatures.prototype.hasPluginWithName =
    function(pluginName) {
  return goog.array.some(navigator.plugins,
      function(plugin) {
        return plugin.name == pluginName;
      });
};


/**
 * Uses a Chrome-specific API to detect whether the current window was served
 * via SPDY.
 * @return {boolean} Whether this browser is Chrome, and the current window was
 *     served using SPDY.
 */
docsshared.browser.BrowserFeatures.prototype.isChromeAndUsesSpdy =
    function() {
  try {
    return !!goog.global['chrome']['loadTimes']()['wasFetchedViaSpdy'];
  } catch (e) {
    return false;
  }
};


/**
 * If this is chrome, and there is a chrome app installed covering the current
 * window's origin, this method will return it's installation state.
 * @return {docsshared.browser.BrowserFeatures.AppInstallState} The install
 *     state of the hosted Chrome app.
 */
docsshared.browser.BrowserFeatures.prototype.getChromeAppInstallState =
    function() {
  try {
    if (goog.global['chrome']['app']['isInstalled']) {
      return docsshared.browser.BrowserFeatures.AppInstallState.OK;
    }
    var appDetails = this.getChromeAppDetails();
    if (goog.isObject(appDetails)) {
      // There have been a variety of bugs causing isInstalled to return false
      // (and permissions to be ineffective). In all cases to date, getDetails()
      // has consistently returned an object. Example bugs:
      // http://crbug.com/89371, http://crbug.com/89607.
      var context = {};
      for (var detailKey in appDetails) {
        var value = appDetails[detailKey];
        context['appDetails_' + detailKey] =
            goog.isObject(value) ? JSON.stringify(value) : value;
      }
      this.reportError('Chrome Drive app is installed and ' + 'enabled, but not effective (indicating a Chrome bug)', context);
      return docsshared.browser.BrowserFeatures.AppInstallState.
          NOT_EFFECTIVE;
    } else {
      return docsshared.browser.BrowserFeatures.AppInstallState
          .DISABLED_OR_NOT_INSTALLED;
    }
  } catch (e) {
    return docsshared.browser.BrowserFeatures.AppInstallState
        .DISABLED_OR_NOT_INSTALLED;
  }
};


/**
 * Returns whether a Chrome app process can be run in the current configuration.
 * @return {boolean} Whether a Chrome app process can be run in the current
 * configuration.
 */
docsshared.browser.BrowserFeatures.prototype.canRunAppProcess =
    function() {
  // An app process can not run if we are inside an iframe.
  //  Update this once there is a way to know if the app process can
  // run in the current configuration. See Chrome bug 107216.
  return goog.userAgent.product.CHROME && goog.global.top == goog.global;
};


/**
 * Use a Chrome-specific API to get details about an installed hosted Chrome
 * app.
 * @return {Object} Details about the Chrome app, or {@code null} if it is
 *     disabled or not installed.
 */
docsshared.browser.BrowserFeatures.prototype.getChromeAppDetails =
    function() {
  if (!goog.userAgent.product.CHROME) {
    return null;
  }
  try {
    return goog.global['chrome']['app']['getDetails']();
  } catch (e) {
    return null;
  }
};


//  Switch to using the async chrome.permissions.contains()
// method, once it's supported in Chrome Stable, which is somewhere between
// M16 and M20 - unclear yet.
/**
 * If this is chrome, and there is a chrome app installed covering the current
 * window's origin, this method will return true if that app has the given
 * permission.
 * NOTE: This method only examines the manifest declarations for the app. It
 * does not actually reflect whether the Chrome app is truly using the
 * permission. This means that permissions that the version of Chrome being
 * used doesn't understand may actually return true here, if that permission
 * is listed in the app's manifest.
 * @param {!docsshared.browser.BrowserFeatures.AppPermission} permission
 *     The permission to check for.
 * @param {boolean} noApiDefault The value to return if the chrome app is
 *     installed but the chrome version we're running on lacks the APIs
 *     necessary to make the permission check.
 * @return {boolean} Whether there is a chrome app installed covering this
 *     window.
 */
docsshared.browser.BrowserFeatures.prototype.chromeAppHasPermission =
    function(permission, noApiDefault) {
  if (!goog.userAgent.product.CHROME) {
    return false;
  }
  var appInstallState = this.getChromeAppInstallState();
  if (appInstallState ==
      docsshared.browser.BrowserFeatures.AppInstallState.OK) {
    try {
      var permissions = this.getChromeAppDetails()['permissions'] || [];
      for (var i = 0; i < permission.length; i++) {
        if (goog.array.contains(permissions, permission[i].name) &&
            goog.userAgent.product.isVersion(permission[i].minVersion)) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return noApiDefault;
    }
  } else {
    return false;
  }
};


/**
 * Report an error.  By default this just throws, subclasses may have better
 * methods.
 * @param {string} msg The error message.
 * @param {!Object.<!string,!string>=} opt_context A context object.
 * @protected
 */
docsshared.browser.BrowserFeatures.prototype.reportError = function(msg,
    opt_context) {
  var output = msg;
  if (opt_context) {
    output += ' ' + goog.json.serialize(opt_context);
  }
  throw new Error(output);
};
