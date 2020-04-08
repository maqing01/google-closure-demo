goog.provide('office.localstore.IdleDelay');

goog.require('goog.Disposable');
goog.require('goog.Timer');



/**
 * A class to call a given function after a specified delay, but only if the JS
 * thread is idle. Idleness is determined by whether the timeout fires on time
 * (i.e. within a specified tolerance of the expected timeout). When the
 * document is hidden (http://www.w3.org/TR/page-visibility/), additional time
 * is allowed because some browsers (in particular Chrome) run timers at lower
 * resulution when the document is hidden.
 *
 * @param {function(this:null, !office.localstore.IdleDelay): void} listener The
 *     function to invoke after the delay.
 * @param {number} delayMs The amount of time to delay before invoking the
 *     listener.
 * @param {!Document} document The document. Used to read the hidden property
 *     in order to determine timer resolution.
 * @param {function(this:null): number=} opt_nowFn The function to get the
 *     current timestamp from. Defaults to goog.now. Intended for tests only.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.IdleDelay = function(listener, delayMs, document, opt_nowFn) {
  goog.base(this);

  /**
   * The function that will be invoked after the delay.
   * @private {function(this:null, !office.localstore.IdleDelay): void}
   */
  this.listener_ = listener;

  /**
   * The amount of time to delay before invoking the listener.
   * @private {number}
   */
  this.delayMs_ = delayMs;

  /** @private {!Document} */
  this.document_ = document;

  /**
   * The function to get the current timestamp from.
   * @private {function(this:null): number}
   */
  this.nowFn_ = opt_nowFn || goog.now;

  /**
   * The identifier of the active timer, or 0 when inactive.
   * @private {number}
   */
  this.id_ = 0;

  /**
   * The time at which to expect the timer to fire, or 0 when no timer is
   * running.
   * @private {number}
   */
  this.expectedDelayTimestamp_ = 0;

  /**
   * The list of past delays. When a timer fires, the amount of time it fired
   * after it was expected to fire is added to this list.
   * @private {!Array.<number>}
   */
  this.delays_ = [];
};
goog.inherits(office.localstore.IdleDelay, goog.Disposable);


/**
 * The addional delay to use when the timer fires later than expected.
 * @private
 */
office.localstore.IdleDelay.ADDITIONAL_DELAY_MS_ = 1000;


/**
 * The amount of time for which to consider a timer to be on time when the page
 * is hidden.
 * @private
 */
office.localstore.IdleDelay.HIDDEN_TOLERANCE_MS_ = 1020;


/**
 * The maximum number of additional delays to add before timing out.
 * @private
 */
office.localstore.IdleDelay.MAX_ADDITIONAL_DELAYS_ = 10;


/**
 * The amount of time for which to consider a timer to be on time when the page
 * is visible.
 * @private
 */
office.localstore.IdleDelay.VISIBLE_TOLERANCE_MS_ = 20;


/**
 * Starts the delay timer. Any pending timer will be reset.
 */
office.localstore.IdleDelay.prototype.start = function() {
  if (this.expectedDelayTimestamp_) {
    throw Error('Idle delay has already been started');
  }

  this.expectedDelayTimestamp_ = this.nowFn_() + this.delayMs_;
  this.id_ = goog.Timer.callOnce(this.handleTimer_, this.delayMs_, this);
};


/**
 * Handles the delayed timer. If the timer fired on time, the listener will be
 * called, otherwise another timer is scheduled.
 * @private
 */
office.localstore.IdleDelay.prototype.handleTimer_ = function() {
  this.id_ = 0;

  var delayMs = this.nowFn_() - this.expectedDelayTimestamp_;
  this.delays_.push(delayMs);

  var isHidden = this.document_['hidden'] || this.document_['webkitHidden'] ||
      this.document_['mozHidden'] || this.document_['msHidden'];
  var toleranceMs = isHidden ?
      office.localstore.IdleDelay.HIDDEN_TOLERANCE_MS_ :
      office.localstore.IdleDelay.VISIBLE_TOLERANCE_MS_;
  if (this.delays_.length <
          office.localstore.IdleDelay.MAX_ADDITIONAL_DELAYS_ &&
      delayMs > toleranceMs) {
    var additionalDelayMs = office.localstore.IdleDelay.ADDITIONAL_DELAY_MS_;
    this.expectedDelayTimestamp_ = this.nowFn_() + additionalDelayMs;
    this.id_ = goog.Timer.callOnce(this.handleTimer_, additionalDelayMs, this);
  } else {
    this.listener_(this);
  }
};


/**
 * @return {!Array.<number>} The list of past delays. For every fired timer,
   * this contains the amount of time it fired after it was expected to fire.
 */
office.localstore.IdleDelay.prototype.getDelays = function() {
  return this.delays_.concat();
};


/** @override */
office.localstore.IdleDelay.prototype.disposeInternal = function() {
  if (this.id_) {
    goog.Timer.clear(this.id_);
  }
};
