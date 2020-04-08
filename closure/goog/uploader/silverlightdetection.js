

/**
 * @fileoverview Utils to detect if Silverlight is installed, and which version.
 *
 * @author azzie@google.com (Marcin Marszalek)
 */


goog.provide('apps.uploader.silverlightdetection');
goog.provide('apps.uploader.silverlightdetection.agcontrol');
goog.provide('apps.uploader.silverlightdetection.navigator');


/**
 * Use AgControl to check if a given Silverlight version is available on IE.
 * @param {string} version Silverlight version required.
 * @return {?boolean} Whether the requested Silverlight version is supported,
 *     null if we don't know.
 * @private
 */
apps.uploader.silverlightdetection.agcontrol.isVersionSupported_ = function(
    version) {
  if (typeof ActiveXObject == 'undefined') {
    return null;
  }
  try {
    // Constructor will throw if AgControl.AgControl is not available.
    var control = new ActiveXObject('AgControl.AgControl');
    return control['IsVersionSupported'](version);
  } catch (e) {
    return null;
  }
};


/**
 * Use AgControl to guess the Silverlight version installed on IE.
 * @return {?string} Silverlight version string, empty if plugin is
 *     not installed, null if we don't know.
 * @private
 */
apps.uploader.silverlightdetection.agcontrol.guessVersion_ = function() {
  if (typeof ActiveXObject == 'undefined') {
    return null;
  }
  try {
    // Constructor will throw if AgControl.AgControl is not available.
    var control = new ActiveXObject('AgControl.AgControl');
    // This function requires semi-regular maintenance, otherwise new
    // Silverlight versions will *not* be guessed correctly on IE.
    // Luckily, Silverlight version detection on Firefox and Chrome
    // works differently, so if a new Silverlight version appears on
    // those, it should be immediately added to the following list.
    var knownVersions = [
        // Early versions found in Microsoft materials.
        // http://www.microsoft.com/silverlight/scripts/silverlight/General.js
        // pre v1
        '0.90.20416.10', '0.95.20416.10',
        // v1
        '1.0.20724.0', '1.0.20730.0', '1.0.20806.0', '1.0.20813.0',
        '1.0.20816.0', '1.0.20926.0', '1.0.21115.0', '1.0.30109.0',
        '1.0.30401.0', '1.0.30715.0', '1.0.30716.0',
        // v1.1
        '1.1.20724.0', '1.1.20730.0', '1.1.20806.0', '1.1.20813.0',
        '1.1.20816.0', '1.1.20926.0',
        // v2
        '2.0.30226', '2.0.30523.2', '2.0.30523.6', '2.0.30523.8',
        // Versions below are confirmed by YouTube stats.
        '2.0.30523.9', '2.0.31005.0', '2.0.40115.0',
        // v3
        '3.0.40307.0', '3.0.40624.0', '3.0.40723.0', '3.0.40818.0',
        '3.0.50106.0', '3.0.50611.0',
        // v4
        '4.0.41108.0', '4.0.50401.0', '4.0.50524.0', '4.0.50826.0',
        '4.0.50917.0', '4.0.51204.0', '4.0.60129.0', '4.0.60310.0',
        '4.0.60531.0',
        // v5
        '5.0.60401.0', '5.0.60818.0'];
    // If Microsoft drops support for old Silverlight versions in some
    // version of the plugin, we will have to switch to goog.filter()
    // or similar.
    for (var i = 0; i < knownVersions.length; i++) {
      if (!control['IsVersionSupported'](knownVersions[i])) {
        break;
      }
    }
    if (i == 0) {
      return '';
    }
    return knownVersions[i - 1];
  } catch (e) {
    return null;
  }
};


/**
 * Returns the Silverlight version from navigator.plugins on Firefox/Chrome.
 * @param {boolean} acceptMoonlight If true, accept Moonlight as well.
 * @return {?string} Silverlight version string, empty if plugin is
 *     not installed, null if we don't know.
 * @private
 */
apps.uploader.silverlightdetection.navigator.getVersion_ = function(
    acceptMoonlight) {
  if (navigator.plugins) {
    var plugin = navigator.plugins['Silverlight Plug-In'];
    if (plugin) {
      // Moonlight has a characteristic filename.
      if (!acceptMoonlight && plugin['filename'] == 'libmoonloaderxpi.so') {
        return '';
      }
      // Description contains version information.
      return plugin['description'];
    }
    return '';
  }
  return null;
};


/**
 * Check if a given Silverlight version is available.
 * @param {number} version Silverlight version required.
 * @param {boolean} acceptMoonlight If true, accept Moonlight as well.
 * @return {boolean} Whether a usable version of Silverlight is available.
 */
apps.uploader.silverlightdetection.isSilverlightAvailable = function(
    version, acceptMoonlight) {
  var detection = apps.uploader.silverlightdetection;

  // Try ActiveX Silverlight control object for IE.
  // IsVersionSupported() requires minor version number as well.
  var isSupported = detection.agcontrol.isVersionSupported_(version + '.0');
  if (goog.isBoolean(isSupported)) {
    return isSupported;
  }

  // Try plugins list to find Silverlight/Moonlight on Chrome or Firefox.
  var versionString = detection.navigator.getVersion_(acceptMoonlight);
  if (goog.isString(versionString)) {
    var major = parseInt(versionString, 10);
    return major >= version;
  }

  return false;
};


/**
 * Returns the installed Silverlight version.
 *
 * WARNING: This is hacky and will return nonsense without regular maintenance.
 * This function should only be used for computing occassional statistics, use
 * isSilverlightAvailable() for anything else including uploader selection and
 * bug workarounds.
 *
 * @param {boolean} acceptMoonlight If true, accept Moonlight as well.
 * @return {string} Silverlight version string, empty if not installed.
 */
apps.uploader.silverlightdetection.guessSilverlightVersion = function(
    acceptMoonlight) {
  var detection = apps.uploader.silverlightdetection;
  var versionString;

  // Try ActiveX Silverlight control object for IE.
  versionString = detection.agcontrol.guessVersion_();
  if (goog.isString(versionString)) {
    return versionString;
  }

  // Try plugins list to find Silverlight/Moonlight on Chrome or Firefox.
  versionString = detection.navigator.getVersion_(acceptMoonlight);
  if (goog.isString(versionString)) {
    return versionString;
  }

  return '';
};
