
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utils for device detection.
 */

goog.provide('wireless.device');

goog.require('goog.string');


/**
 * Gets the browser's user agent. Using this function allows tests to inject
 * the user agent.
 * @return {string} The user agent.
 */
wireless.device.getUserAgent = function() {
  return navigator.userAgent;
};


/**
 * The regular expression for detecting an iPhone or iPod.
 * @type {!RegExp}
 * @private
 */
wireless.device.IPHONE_USERAGENT_REGEX_ = /iPhone|iPod/;


/**
 * Determines if the current device is an iPhone or iPod.
 * @return {boolean} True if the current device is an iPhone or iPod.
 */
wireless.device.isIPhone = function() {
  return wireless.device.IPHONE_USERAGENT_REGEX_.test(
      wireless.device.getUserAgent());
};


/**
 * Determines if the current device is an iPad.
 * @return {boolean} True if the current device is an iPad.
 */
wireless.device.isIPad = function() {
  return goog.string.contains(wireless.device.getUserAgent(), 'iPad');
};


/**
 * The regular expression for detecting an iPhone or iPod or iPad.
 * @type {!RegExp}
 * @private
 */
wireless.device.MOBILE_SAFARI_USERAGENT_REGEX_ = /iPhone|iPod|iPad/;


/**
 * Determines if the current device is an iPhone or iPod or iPad.
 * @return {boolean} True if the current device is an iPhone or iPod or iPad.
 */
wireless.device.isMobileSafari = function() {
  return wireless.device.MOBILE_SAFARI_USERAGENT_REGEX_.test(
      wireless.device.getUserAgent());
};


/**
 * The regular expression for detecting an iPhone or iPod or iPad simulator.
 * @type {!RegExp}
 * @private
 */
wireless.device.APPLE_SIMULATOR_USERAGENT_REGEX_ = /iP.*Simulator/;


/**
 * Determines if the current device is the iP* Simulator.
 * @return {boolean} True if the current device is an iP* Simulator.
 */
wireless.device.isAppleSimulator = function() {
  return wireless.device.APPLE_SIMULATOR_USERAGENT_REGEX_.test(
      wireless.device.getUserAgent());
};


/**
 * Determines if the current device is an Android.
 * @return {boolean} True if the current device is an Android.
 */
wireless.device.isAndroid = function() {
  return goog.string.contains(wireless.device.getUserAgent(), 'Android');
};


/**
 * Includes Android and Desktop chrome but not iOS Chrome (CriOS) since CriOS
 * acts like Safari for the most part.
 * @return {boolean} True if the current browser is Chrome but not iOS Chrome.
 */
wireless.device.isChrome = function() {
  return goog.string.contains(wireless.device.getUserAgent(), 'Chrome/');
};


/**
 * Determines if the current browser is Andoird Chrome.
 * From https://developers.google.com/chrome/mobile/docs/user-agent .
 * @return {boolean} True if the current browser is Andoird Chrome.
 */
wireless.device.isAndroidChrome = function() {
  return wireless.device.isAndroid() && wireless.device.isChrome();
};


/**
 * Determines if the current device is WebOS WebKit.
 * @return {boolean} True if the current device is WebOS WebKit.
 */
wireless.device.isWebOs = function() {
  return goog.string.contains(wireless.device.getUserAgent(), 'webOS');
};


/**
 * The regular expression for detecting a Kindle Fire in desktop mode.
 * @type {!RegExp}
 * @private
 */
wireless.device.KINDLE_FIRE_DESKTOP_USERAGENT_REGEX_ = /Mac OS X.+Silk\//;


/**
 * Determines if the current device is a Kindle Fire in desktop mode.
 * @return {boolean} True if the current device is a Kindle Fire in desktop
 *     mode.
 */
wireless.device.isKindleFireDesktop = function() {
  return wireless.device.KINDLE_FIRE_DESKTOP_USERAGENT_REGEX_.test(
      wireless.device.getUserAgent());
};


/**
 * The regular expression for detecting a device running IE 10 or later.
 * @type {!RegExp}
 * @private
 */
wireless.device.IE_10_OR_LATER_USERAGENT_REGEX_ = /MSIE 1\d/;


/**
 * Determines if the current device is running IE 10 or later.
 * @return {boolean} True if the current device running IE 10 or later.
 */
wireless.device.isIE10OrLater = function() {
  return wireless.device.IE_10_OR_LATER_USERAGENT_REGEX_.test(
      wireless.device.getUserAgent());
};


/**
 * Creates a version number from 4 int pieces. Valid input must convert to an
 * integer between 0 and 127.
 * @param {*} opt_a The major version.
 * @param {*} opt_b The minor version.
 * @param {*} opt_c The revision number.
 * @param {*} opt_d The build number.
 * @return {number} A representation of the version.
 */
wireless.device.getVersion = function(opt_a, opt_b, opt_c, opt_d) {
  // We want to allow implicit conversion of any type to number while avoiding
  // compiler warnings about the type.
  return /** @type {number} */ (opt_a) << 21 |
      /** @type {number} */ (opt_b) << 14 |
      /** @type {number} */ (opt_c) << 7 |
      /** @type {number} */ (opt_d);
};


/**
 * The regular expression for matching the iPhone/iPad version. Only matches 2.0
 * and up.
 * @type {!RegExp}
 * @private
 */
wireless.device.APPLE_OS_VERSION_REGEX_ = /OS (\d)_(\d)(?:_(\d))?/;


/**
 * Gets the iPhone/iPad OS version. Does not work for 1.0 or 1.1.
 * @return {number} The OS version.
 */
wireless.device.getAppleOsVersion = function() {
  var groups = wireless.device.APPLE_OS_VERSION_REGEX_.exec(
      wireless.device.getUserAgent()) || [];
  groups.shift();
  return wireless.device.getVersion.apply(null, groups);
};


/**
 * The regular expression for matching the Android version. Only known to work
 * on 2 and up on Android browser.
 * @type {!RegExp}
 * @private
 */
wireless.device.ANDROID_OS_VERSION_REGEX_ = /Android (\d+)\.(\d+)(?:\.(\d+))?/;


/**
 * The regular expression for matching the Chrome version.
 * @type {!RegExp}
 * @private
 */
wireless.device.CHROME_VERSION_REGEX_ = /Chrome\/([0-9.]+)/;


/**
 * Gets the Android OS version.
 * @return {number} The OS version.
 */
wireless.device.getAndroidOsVersion = function() {
  var groups = wireless.device.ANDROID_OS_VERSION_REGEX_.exec(
      wireless.device.getUserAgent()) || [];
  groups.shift();
  return wireless.device.getVersion.apply(null, groups);
};


/**
 * True if the browser suppresses touchmoves until such time as suficient
 * distance has occurred from the touch start. It is used by a browser to only
 * send a single touchmove before scrolling starts so that the JS knows that's
 * the last chance it will get to supress scrolling.
 * Note: This is only true if the touchstart has not been previously been
 * preventDefaulted. In this case slop touch moves are not supressed (at least
 * in Chrome).
 * As of March 2014, non-safari browsers do supress slop touch moves.
 * go/touch-event-behavior-details-across-browsers
 * @return {boolean}
 */
wireless.device.browserSupressesSlopTouchMoves = function() {
  return !wireless.device.isMobileSafari();
};


/**
 * Checks whether this device that requires the hack to always use click events
 * because the browser's touchmove handling is broken.
 * Currently set to Android >= 4.0.3.
 * @return {boolean} True if the hack is required.
 */
wireless.device.browserHasBrokenTouchMoveEvents = function() {
  return wireless.device.isAndroid() &&
      !wireless.device.isAndroidChrome() &&
      wireless.device.getAndroidOsVersion() >= ((4 << 21) | (3 << 7));
};


/**
 * Checks whether this device has buggy clientX/clientY variables on its
 * touchstart events. See
 * https://code.google.com/p/chromium/issues/detail?id=141840
 * Currently set to Android Chrome == 18.*.*.*.
 * @return {boolean} True if clientX/clientY variables are buggy.
 */
wireless.device.browserHasBrokenTouchStartClientCoords = function() {
  return wireless.device.isAndroidChrome() &&
      wireless.device.getChromeMajorVersion_() == 18;
};


/**
 * @return {number} The Chrome major version number or NaN if none could be
 *     found.
 * @private
 */
wireless.device.getChromeMajorVersion_ = function() {
  return +wireless.device.getChromeVersion_().split('.')[0];
};


/**
 * Gets the Chrome version number.
 * @return {string} The Chrome version number.
 * @private
 */
wireless.device.getChromeVersion_ = function() {
  var arr = wireless.device.CHROME_VERSION_REGEX_.exec(
      wireless.device.getUserAgent());
  return arr ? arr[1] : '';
};


/**
 * There's a bug in the WebOS WebKit canvas context rotate method, rotation
 * goes in the opposite direction. This is expected to be fixed in the future,
 * but currently all versions have this bug.
 *
 *  Add check for browser version once bug has been fixed.
 *
 * @return {boolean} True if the canvas context rotation bug is present.
 */
wireless.device.hasInverseCanvasRotationBug = wireless.device.isWebOs;


/**
 * There's a bug in the WebOS WebKit canvas context arc method.
 * For some directions it can not draw an arc across the positive x access.
 * i.e. when the angle wraps through 2 pi/ 0.
 * I presume all versions currently have this bug.
 *
 *  Add check for browser version once bug has been fixed.
 *
 * @return {boolean} True if the canvas arc angle bug is present.
 */
wireless.device.hasNonWrappingCanvasArcBug = wireless.device.isWebOs;
