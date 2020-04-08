

/**
 * @fileoverview Contains logging helpers.
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.debug.logging');

goog.require('goog.asserts');
goog.require('goog.debug.Console');
goog.require('goog.debug.RelativeTimeProvider');
goog.require('goog.log');
goog.require('goog.tweak');
goog.require('wireless.debug');
goog.require('wireless.debug.LogConsole');
goog.require('wireless.device');



goog.tweak.registerString('LogLevel',
    'The minimum severity of log messages to print.', 'Info', {
  validValues: [
    'All',
    'Info',
    'Warning',
    'Off'
  ]
});


/**
 * The logger for this package.
 * @type {goog.log.Logger}
 * @private
 */
wireless.debug.logging.logger_ =
    goog.log.getLogger('wireless.debug.logging');


/**
 * Initializes logging.
 * @param {string=} opt_buildInfo The build info that should be logged before
 *     the log level is set.
 * @param {number=} opt_startTimeMs The timestamp to use as time 0.
 * @param {boolean} opt_enableBrowserConsole Whether to enable logging to
 *     window.console. The default is no for iphone and yes for all others.
 */
wireless.debug.logging.initialize =
    function(opt_buildInfo, opt_startTimeMs, opt_enableBrowserConsole) {
  goog.asserts.assert(!wireless.debug.STRIP_LOGGERS,
      'You should not call wireless.debug.logging.initialize() when ' +
      'wireless.debug.STRIP_LOGGERS is true.');
  if (goog.isDef(opt_startTimeMs)) {
    wireless.debug.logging.setLoggerStartTime_(opt_startTimeMs);
  }
  wireless.debug.logging.initBrowserConsole_(opt_enableBrowserConsole);
  wireless.debug.logging.logAppContext_(opt_buildInfo);
  wireless.debug.logging.setLogLevelFromTweak_();
};


/**
 * Logs the build info and the page URL.
 * @param {string=} opt_buildInfo The build info that should be logged before
 *     the log level is set.
 * @private
 */
wireless.debug.logging.logAppContext_ = function(opt_buildInfo) {
  goog.log.info(wireless.debug.logging.logger_, 'URL: ' + window.location);
  if (opt_buildInfo) {
    goog.log.info(wireless.debug.logging.logger_, opt_buildInfo);
  }
};


/**
 * Sets the log level based on the LogLevel tweak.
 * @private
 */
wireless.debug.logging.setLogLevelFromTweak_ = function() {
  var levelName = goog.tweak.getString('LogLevel') || 'info';
  var level =
      goog.log.Level.getPredefinedLevel(levelName.toUpperCase());
  goog.log.info(wireless.debug.logging.logger_, 'Log Level set to ' + level);
  // Set the log level after logging it so that it does not get silenced.
  goog.debug.LogManager.getRoot().setLevel(level);
};


/**
 * Sets the time which all log statements will be relative to.
 * @param {number} startTimeMs The start time in milliseconds.
 * @private
 */
wireless.debug.logging.setLoggerStartTime_ = function(startTimeMs) {
  goog.debug.RelativeTimeProvider.getDefaultInstance().set(startTimeMs);
};


/**
 * Hooks closure loggers up to window.console.
 * @param {boolean} opt_forceEnable Whether to enable window.console. The
 *     default is no for iphone and yes for all others.
 * @private
 */
wireless.debug.logging.initBrowserConsole_ = function(opt_forceEnable) {
  // Enable logging to the native console
  if (!goog.isDef(opt_forceEnable)) {
    // The built-in iPhone console slows down the app quite a bit and is
    // mostly useless because of our long lines.
    opt_forceEnable = !wireless.device.isIPhone();
  }
  if (opt_forceEnable) {
    new goog.debug.Console().setCapturing(true);
  }
};
