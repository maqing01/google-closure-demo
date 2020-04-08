

/**
 * @fileoverview A framework for recording "impressions", which are used to
 * track client-side user behaviour (such as clicking on a button or navigating
 * between different views). There are two types: counter impressions, which
 * simply count the number of times an action is performed; and numeric
 * impressions, which associate a numeric value with each event (e.g., latency
 * timings).
 *
 * Impression names must satisfy two rules:
 *   - Must not contain the character '/'.
 *   - Must not end with a digit.
 *
 * This code is adapted from the Impressions class used in Gmail:
 * //java/com/google/caribou/ui/pinto/modules/app/impressions.js. It inlines
 * some functionality from Closure, especially goog.net.cookies, to reduce the
 * amount of code apps need to pull in to their JS binaries.
 *
 * @author nthomas@google.com (Neil Thomas)
 */

goog.provide('webapps.common.Impressions');
goog.provide('webapps.common.Impressions.Type');

goog.require('goog.asserts');
goog.require('goog.log');
goog.require('webapps.common.cookies');



//  Add a sweep() method that removes pending actions that have
// been around for too long, e.g. 5 minutes, to prevent a memory leak in the
// case where a startAction() call is never followed by the corresponding
// endAction() call.
/**
 * A class used to track user behavior which will be recorded as "impressions"
 * in the GWS logs.
 * @param {string} cookieName The name of the cookie to use. Must not contain
 *     '=' or ';'.
 * @param {string} cookiePath The path on which to set the impressions cookie.
 * @constructor
 */
webapps.common.Impressions = function(cookieName, cookiePath) {
  /**
   * The name of the cookie to use for sending impressions to the server.
   * @type {string}
   * @private
   */
  this.cookieName_ = cookieName;

  /**
   * The path on which to set the impressions cookie.
   * @type {string}
   * @private
   */
  this.cookiePath_ = cookiePath;

  /**
   * Accumulate all the counter impressions here, and flush to the
   * impressions cookie on the next user request. Counter impressions are for
   * impressions that can happen multiple times before being flushed.
   * @type {Object}
   * @private
   */
  this.pendingCounterImpressions_ = {};

  /**
   * Accumulates numeric impressions.
   * @type {Array.<String>}
   * @private
   */
  this.pendingNumericImpressions_ = [];

  /**
   * Tracks the time at which actions that are currently in process began. Each
   * active action is identified by two strings: an impression name that
   * identifies the type of action being performed, and an arbitrary
   * application-specific identifier used to differentiate multiple simultaneous
   * actions of the same type.
   * @type {Object.<string, Object.<string, number>>}
   * @private
   */
  this.activeActions_ = {};
};

/**
 * Enum for impression types.
 * @enum {number}
 */
webapps.common.Impressions.Type = {
  COUNTER: 0,
  LATENCY: 1
};

/**
 * The impression type separator.
 * @type {string}
 * @private
 */
webapps.common.Impressions.IMPRESSION_TYPE_SEPARATOR_ = ':';

/**
 * The result of encodeURIComponent('/').
 * @type {string}
 * @private
 */
webapps.common.Impressions.URI_ENCODED_SLASH_ = '%2F';

/**
 * The maximum size for the impressions cookie. Copied from goog.net.cookies.
 * @type {number}
 * @private
 */
webapps.common.Impressions.MAX_COOKIE_LENGTH_ = 3950;

/**
 * The maximum age to set on the impressions cookie, in milliseconds.
 * @type {number}
 * @private
 */
webapps.common.Impressions.COOKIE_AGE_MSEC_ = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * The default action ID used when none is provided. This string should be
 * unlikely to conflict with any legitimate action IDs.
 * @type {string}
 * @private
 */
webapps.common.Impressions.DEFAULT_ACTION_ID_ = 'no-action-id-provided';

/**
 * Logger object for this class.
 * @type {goog.log.Logger}
 * @private
 */
webapps.common.Impressions.prototype.logger_ =
    goog.log.getLogger('webapps.common.Impressions');

/**
 * Increments a counter impression.
 *
 * @param {string} name The name of the counter impression to be incremented.
 */
webapps.common.Impressions.prototype.incCounterImpression = function(name) {
  var imp = this.prependTypeToImpression_(
      webapps.common.Impressions.Type.COUNTER, name);
  var curVal = this.pendingCounterImpressions_[imp];
  var newVal = curVal ? curVal + 1 : 1;

  goog.log.info(this.logger_, 'Setting counter impression "' + name +
      '" to: ' + newVal);
  this.pendingCounterImpressions_[imp] = newVal;
};

/**
 * Adds a numeric impression with the given value.
 *
 * @param {string} name The name of numeric(latency) impression to be set.
 * @param {number} value The value to set.
 */
webapps.common.Impressions.prototype.setNumericImpression =
    function(name, value) {
  var imp = this.prependTypeToImpression_(
      webapps.common.Impressions.Type.LATENCY, name);

  goog.log.info(this.logger_, 'Setting numeric impression "' + name +
      '" to: ' + value);
  this.pendingNumericImpressions_.push(imp + '-' + value);
};

/**
 * Prepends the impression type.
 * @param {webapps.common.Impressions.Type} type The impression type.
 * @param {string} name The name of the impression.
 * @return {string} The impression string containing the type and name.
 * @private
 */
webapps.common.Impressions.prototype.prependTypeToImpression_ =
    function(type, name) {
  goog.asserts.assert(name.indexOf(
      webapps.common.Impressions.IMPRESSION_TYPE_SEPARATOR_) == -1,
      "Cannot have ':' in the impression name.");
  return type + webapps.common.Impressions.IMPRESSION_TYPE_SEPARATOR_ + name;
};

/**
 * Records the start of an action. To log a numeric impression for the time
 * required to perform an action, call startAction() when the action begins
 * and then endAction() when it is complete.
 *
 * @param {string} action An identifier for the action that will be used as the
 *     impression name. This string must therefore satisfy all the usual rules
 *     for impression names, outlined at the top of this file.
 * @param {string} opt_id An identifier that distinguishes this action from
 *     other actions of the same type that may be happening concurrently. This
 *     may be left undefined if there will never be two simultaneous actions of
 *     the same type.
 */
webapps.common.Impressions.prototype.startAction = function(action, opt_id) {
  var id = opt_id || webapps.common.Impressions.DEFAULT_ACTION_ID_;
  var desc = '(' + action + ',' + id + ')';
  if (this.activeActions_[action] && this.activeActions_[action][id]) {
    goog.log.warning(this.logger_,
        'Restarting action that was already in progress: ' + desc);
  } else {
    goog.log.info(this.logger_, 'Starting action: ' + desc);
  }
  if (!this.activeActions_[action]) {
    this.activeActions_[action] = {};
  }
  this.activeActions_[action][id] = goog.now();
};

/**
 * Records the end of an action that was previously started with startAction().
 * The elapsed time (in ms) is recorded as a numeric impression under the name
 * of the action.
 *
 * @param {string} action An identifier for the action that was passed to
 *     startAction() when the action began.
 * @param {string} opt_id An identifier that distinguishes this action from
 *     other actions of the same type, as passed to startAction() when the
 *     action began. This must be undefined if, and only if, the ID parameter
 *     to startAction() was also undefined.
 */
webapps.common.Impressions.prototype.endAction = function(action, opt_id) {
  var id = opt_id || webapps.common.Impressions.DEFAULT_ACTION_ID_;
  var desc = '(' + action + ',' + id + ')';
  if (this.activeActions_[action] && this.activeActions_[action][id]) {
    var timeDelta = goog.now() - this.activeActions_[action][id];
    goog.log.info(this.logger_, 'Action complete: ' + desc + ', ' +
        timeDelta + ' ms');
    this.setNumericImpression(action, timeDelta);
    delete this.activeActions_[action][id];
  } else {
    goog.log.warning(this.logger_,
        'Tried to end action that was not in progress: ' + desc);
  }
};

/** Flushes all pending impressions to a cookie and clears the history. */
webapps.common.Impressions.prototype.flushPendingImpressions = function() {
  var counterImpressions = encodeURIComponent(
      this.encodeCounterImpressions_().join('/'));
  var numericImpressions = encodeURIComponent(
      this.pendingNumericImpressions_.join('/'));

  if (counterImpressions || numericImpressions) {
    var impressions;
    if (counterImpressions && numericImpressions) {
      impressions = counterImpressions +
          webapps.common.Impressions.URI_ENCODED_SLASH_ + numericImpressions;
    } else {
      impressions = counterImpressions ? counterImpressions :
          numericImpressions;
    }

    var currentCookie = this.getCookieValue_();

    if (currentCookie) {
      impressions = currentCookie +
          webapps.common.Impressions.URI_ENCODED_SLASH_ + impressions;
    }

    // Truncate if the cookie is too long. We will lose some data.
    if (impressions.length > webapps.common.Impressions.MAX_COOKIE_LENGTH_) {
      impressions = impressions.substring(0,
          impressions.lastIndexOf(webapps.common.Impressions.URI_ENCODED_SLASH_,
              webapps.common.Impressions.MAX_COOKIE_LENGTH_));
    }

    goog.log.info(this.logger_, 'Flushing impression to cookie: ' +
        decodeURIComponent(impressions));

    // This code is based on goog.net.cookies.set().
    var futureDate = new Date((new Date).getTime() +
        webapps.common.Impressions.COOKIE_AGE_MSEC_).toUTCString();
    document.cookie =
        this.cookieName_ + '=' + impressions + ';path=' + this.cookiePath_ +
        ';expires=' + futureDate;

    // Clear the pending impressions
    this.pendingCounterImpressions_ = {};
    this.pendingNumericImpressions_ = [];
  }
};

/**
 * Gets all pending counter impressions encoded as an array of strings.
 * @return {Array.<string>} The counter impressions.
 * @private
 */
webapps.common.Impressions.prototype.encodeCounterImpressions_ = function() {
  var impressions = [];
  for (var key in this.pendingCounterImpressions_) {
    impressions.push(key + '-' + this.pendingCounterImpressions_[key]);
  }
  return impressions;
};

/**
 * Gets the current value of the impressions cookie, if any.
 * This method is based on goog.net.cookies.get().
 * @return {string|undefined} The value of the cookie, or undefined if the
 *     cookie is not set.
 * @private
 */
webapps.common.Impressions.prototype.getCookieValue_ = function() {
  return webapps.common.cookies.getCookieValue(this.cookieName_);
};

