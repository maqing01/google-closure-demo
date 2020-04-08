goog.provide('office.util.CallOnceTracker');

goog.require('goog.Disposable');
goog.require('goog.Timer');



/**
 * @extends {goog.Disposable}
 * @constructor
 * @struct
 */
office.util.CallOnceTracker = function() {
  goog.base(this);

  /**
   * The currently pending timer ids.
   * @type {!Object.<number, boolean>}
   * @private
   */
  this.timerIds_ = {};
};
goog.inherits(office.util.CallOnceTracker, goog.Disposable);


/**
 * Calls the given function once, after the optional pause.
 *
 * The function is always called asynchronously, even if the delay is 0. This
 * is a common trick to schedule a function to run after a batch of browser
 * event processing.
 *
 * @param {Function} listener Function or object that has a handleEvent method.
 * @param {number=} opt_delay Milliseconds to wait; default is 0.
 * @param {Object=} opt_handler Object in whose scope to call the listener.
 * @return {number} A handle to the timer ID.
 */
office.util.CallOnceTracker.prototype.callOnce = function(
    listener, opt_delay, opt_handler) {
  // NOTE: Taken from goog.Timer.callOnce to maintain same API and behavior.
  if (goog.isFunction(listener)) {
    if (opt_handler) {
      listener = goog.bind(listener, opt_handler);
    }
  } else if (listener && typeof listener.handleEvent == 'function') {
    // using typeof to prevent strict js warning
    listener = goog.bind(listener.handleEvent, listener);
  } else {
    throw Error('Invalid listener argument');
  }

  var idHolder = new office.util.CallOnceTracker.IdHolder_();
  var timerId = goog.Timer.callOnce(
      goog.bind(this.handleCallOnce_, this, listener, idHolder),
      opt_delay);
  this.timerIds_[timerId] = true;
  idHolder.setId(timerId);
  return timerId;
};


/**
 * Handles the callback from the timer. Cleans up timer id tracking and calls
 * the original callback function
 * @param {!Function} fn The function to call.
 * @param {!office.util.CallOnceTracker.IdHolder_} idHolder The id holder.
 * @private
 */
office.util.CallOnceTracker.prototype.handleCallOnce_ = function(fn, idHolder) {
  var id = idHolder.getId();
  if (!goog.isNull(id)) {
    delete this.timerIds_[id];
  }
  fn();
};


/**
 * Clears a timeout initiated by callOnce.
 * @param {?number} timerId A timer ID.
*/
office.util.CallOnceTracker.prototype.clear = function(timerId) {
  if (!goog.isNull(timerId)) {
    delete this.timerIds_[timerId];
  }
  goog.Timer.clear(timerId);
};


/** @override */
office.util.CallOnceTracker.prototype.disposeInternal = function() {
  for (var idString in this.timerIds_) {
    goog.Timer.clear(Number(idString));
  }

  goog.base(this, 'disposeInternal');
};



/**
 * A class for holding the timer id.
 * @constructor
 * @struct
 * @private
 */
office.util.CallOnceTracker.IdHolder_ = function() {
  /**
   * The timer id.
   * @type {?number}
   * @private
   */
  this.id_ = null;
};


/**
 * Sets the id.
 * @param {number} id The id.
 */
office.util.CallOnceTracker.IdHolder_.prototype.setId = function(id) {
  this.id_ = id;
};


/**
 * Gets the id.
 * @return {?number} The id.
 */
office.util.CallOnceTracker.IdHolder_.prototype.getId = function() {
  return this.id_;
};
