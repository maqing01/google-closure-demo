

/**
 * @fileoverview An class for detecting if Java is installed, enabled, and at
 * which version.  This script is primarily comprised of pieces taken from:
 * http://java.com/js/deployJava.js (see also the deployment info at:
 * http://java.sun.com/javase/6/docs/technotes/guides/jweb/
 * deployment_advice.html#deplToolkit).
 *
 * NOTE: This file has been modified as little as possible to make it easier
 * to maintain when comparing with changes made to
 * http://java.com/js/deployJava.js.  As that script changes, and later versions
 * of Java are released, we'll need to update this script to ensure that it
 * correctly identifies the newer versions.
 *
 *  This would be nice to have in
 * //javascript/closure/useragent at some point in the future.
 *
 * @author natescottdavis@google.com (Nathan Davis)
 */


goog.provide('apps.uploader.javadetection');

goog.require('goog.dom');
goog.require('goog.string');
goog.require('goog.userAgent');
goog.require('goog.userAgent.product');


/**
 * Identifies if a java plugin is installed and enabled in the current
 * browser where the JVM version is greater than or equal to
 * <code>requiredMinVersion</code>.
 * @param {string} requiredMinVersion JVM minimum version required
 *      (e.g., '1.4.2' or '1.5').
 * @return {boolean} True if java is installed and enabled at or above the
 *     specified version.
 */
apps.uploader.javadetection.isEnabled = function(requiredMinVersion) {
  if (!requiredMinVersion || !navigator.javaEnabled() ||
      apps.uploader.javadetection.unsupportedBrowser()) {
    return false;
  }
  var maxJreVersion = apps.uploader.javadetection.getMaxJre();
  return !!maxJreVersion && goog.string.compareVersions(maxJreVersion,
      requiredMinVersion) >= 0;
};


/**
 * Identifies browsers that do not fully support java yet.
 * @return {boolean} True if the current brower does not support java yet (but
 *     may deceivingly appear to by using the tradtional approach).
 */
apps.uploader.javadetection.unsupportedBrowser = function() {
  // Chrome on non-windows platforms don't support java yet.
  //  Update this when Chrome supports java on all
  // platforms.
  //  Update this when Opera 10 is fixed, and when
  // safari on windows works properly.
  return (goog.userAgent.product.CHROME && !goog.userAgent.WINDOWS) ||
      (goog.userAgent.product.SAFARI && goog.userAgent.WINDOWS) ||
      (goog.userAgent.product.OPERA);
};


/**
 * Identifies the maximum available JRE version on the user's system (e.g.,
 * "1.6.0").  Returns null if no JRE is detected.
 * @return {?string} The version string of the maximum available JRE, or null
 *     if no JRE is detected.
 */
apps.uploader.javadetection.getMaxJre = function() {
  if (goog.userAgent.IE) {
    if (apps.uploader.javadetection.testUsingActiveX_('1.7.0')) {
      return '1.7.0';
    } else if (apps.uploader.javadetection.testUsingActiveX_('1.6.0')) {
      return '1.6.0';
    } else if (apps.uploader.javadetection.testUsingActiveX_('1.5.0')) {
      return '1.5.0';
    } else if (apps.uploader.javadetection.testUsingActiveX_('1.4.2')) {
      return '1.4.2';
    }
  } else if (goog.userAgent.GECKO || goog.userAgent.OPERA ||
      goog.userAgent.WEBKIT) {
    var version = apps.uploader.javadetection.getJpiVersionUsingMimeType_();
    if (version != null) {
      return version;
    } else if (apps.uploader.javadetection.testUsingMimeTypes_('1.7')) {
      return '1.7.0';
    } else if (apps.uploader.javadetection.testUsingMimeTypes_('1.6')) {
      return '1.6.0';
    } else if (apps.uploader.javadetection.testUsingMimeTypes_('1.5')) {
      return '1.5.0';
    } else if (apps.uploader.javadetection.testUsingMimeTypes_('1.4.2')) {
      return '1.4.2';
    } else if (goog.userAgent.WEBKIT) {
      if (apps.uploader.javadetection.testUsingPluginsArray_('1.7.0')) {
        return '1.7.0';
      } else if (apps.uploader.javadetection.testUsingPluginsArray_('1.6')) {
        return '1.6.0';
      } else if (apps.uploader.javadetection.testUsingPluginsArray_('1.5')) {
        return '1.5.0';
      } else if (
          apps.uploader.javadetection.testUsingPluginsArray_('1.4.2')) {
        return '1.4.2';
      }
    }
  }
  return null;
};


/**
 * Attempts to identify if the specified JVM version is available using an
 * ActiveXObject.
 * @param {string} version The JVM version to check for.
 * @return {boolean} True if the specified JVM version is detected.
 * @private
 */
apps.uploader.javadetection.testUsingActiveX_ = function(version) {
  var objectName = 'JavaWebStart.isInstalled.' + version + '.0';
  if (!ActiveXObject) {
    return false;
  }
  try {
    return (/** @type {Object} */(new ActiveXObject(objectName)) != null);
  } catch (e) {
    return false;
  }
};


/**
 * Attempts to identify if the specified JVM version is available using the
 * navigator mimetype array (looking for a jpi-version).
 * @return {?string} The JVM version if detected, null otherwise.
 * @private
 */
apps.uploader.javadetection.getJpiVersionUsingMimeType_ = function() {
  for (var i = 0; i < navigator['mimeTypes']['length']; ++i) {
    var type = navigator['mimeTypes'][i]['type'];
    var match = type.match(/^application\/x-java-applet;jpi-version=(.*)$/);
    if (match != null) {
      return match[1];
    }
  }
  return null;
};


/**
 * Attempts to identify if the specified JVM version is available using the
 * navigator mimetype array.
 * @param {string} version The JVM version to check for.
 * @return {boolean} True if the specified JVM version is detected.
 * @private
 */
apps.uploader.javadetection.testUsingMimeTypes_ = function(version) {
  if (!navigator['mimeTypes']) {
    return false;
  }
  var typeExpression =
      /^application\/x-java-applet\x3Bversion=(1\.8|1\.7|1\.6|1\.5|1\.4\.2)$/;
  for (var i = 0; i < navigator['mimeTypes']['length']; ++i) {
    var type = navigator['mimeTypes'][i]['type'];
    var match = type.match(typeExpression);
    if (match != null) {
      if (goog.string.compareVersions(match[1], version) >= 0) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Attempts to identify if the specified JVM version is available using the
 * navigator plugin array.
 * @param {string} version The JVM version to check for.
 * @return {boolean} True if the specified JVM version is detected.
 * @private
 */
apps.uploader.javadetection.testUsingPluginsArray_ = function(version) {
  if ((!navigator['plugins']) || (!navigator['plugins']['length'])) {
    return false;
  }

  var platform = navigator.platform.toLowerCase();
  for (var i = 0; i < navigator['plugins']['length']; ++i) {
    var description = navigator['plugins'][i]['description'];
    if (description['search'](/^Java Switchable Plug-in (Cocoa)/) != -1) {
      if (goog.string.compareVersions('1.5.0', version) >= 0) {
        return true;
      }
    } else if (description['search'](/^Java/) != -1) {
      if (goog.userAgent.WINDOWS) {
        if (goog.string.compareVersions('1.5.0', version) >= 0) {
          return true;
        }
      }
    }
  }
  if (goog.string.compareVersions('1.5.0', version)) {
    return true;
  }
  return false;
};
