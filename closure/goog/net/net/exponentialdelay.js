



goog.provide('office.util.ExponentialDelay');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.math');



/**
 * An ExponentialDelay object invokes a specified function after a delay.  The
 * delay interval increases exponentially each time the listener is invoked,
 * and is reset whenever a requested execution can be scheduled immediately.
 * The actual time intervals are slightly randomized.  The actual timings
 * described below would only actually be seen if the jitter factor was set to
 * zero, which is not the default.
 *
 * For example:
 * <pre>
 *   // Construct an ExponentialDelay with a 5s initial delay and 45s max
 *   // delay.  It should execute at 5, 10, 20, 40, and 45 second intervals.
 *   var d = new office.util.ExponentialDelay(func, 5000, 45000);
 *
 *   d.start(); // callback executes immediately; next run allowed in 5 sec.
 *
 *   ... 1 second passes, t=1 ...
 *   d.start(); // will queue for 4 seconds, run at t=5
 *
 *   ... 4 seconds pass, t=5 ...
 *   // callback executes; next run allowed in 10 sec at t=15
 *
 *   ... 2 seconds pass, t=7 ...
 *   d.start(); // will queue for 8 seconds, run at t=15
 *
 *   ... 8 seconds pass, t=15 ...
 *   // callback executes; next run allowed in 20 sec.
 *   d.start(); // will queue for 20 seconds
 *
 *   ... 20 seconds pass, t=35 ...
 *   // callback executes; next run allowed in 40 sec
 *   d.start(); // will queue for 40 seconds
 *
 *   ... 40 seconds pass, t=75 ...
 *   // callback executes, next run allowed in 45 sec
 *   d.start(); // will queue for 45 seconds
 *
 *   ... 45 seconds pass, t=120 ...
 *   // callback executes, next run allowed in 45 sec
 *
 *   ... 45 seconds pass, t=165 ...
 *   // delay resets, next run allowed immediately.
 *
 *   d.start(); // runs right away, next run allowed in 5 sec.
 *
 *   ... 1 second passes, t=166 ...
 *   d.start(); // will queue for 4 seconds
 *
 *   ... 4 seconds pass, t=170 ...
 *   // callback executes, next run allowed in 10 seconds.
 * </pre>
 *
 * slowStart() prevents the immediate execution of the callback, it will
 * always be at least the minimum interval from either the last execution or
 * the slowStart() call.  If the chosen interval has not elapsed since the
 * last execution, start() and slowStart() behave identically.  For example:
 *
 * <pre>
 *   d.slowStart(); // callback delayed for 5s, to t=5
 *
 *   ... 5 seconds pass, t=5 ...
 *   // callback executes; next run allowed in 10 sec at t=15, etc
 *   start(); or slowStart(); // scheduled for execution in 10s at t=15.
 * </pre>
 *
 * @param {!Function} listener Function to call when the delay completes.
 * @param {number} minInterval The minimum duration, in milliseconds, to wait
 *     between two invocations.  Note that the actual minimum delay can be made
 *     lower than this by the jitter behavior.
 * @param {number} maxInterval The maximum duration, in milliseconds, to wait
 *     between two invocations.  Note that the actual max delay can be made
 *     higher than this by the jitter behavior.
 * @param {number=} opt_jitterFactor Each delay period will be multiplied by 1
 *     plus or minus a random number less than this.  Default is 0.15.
 * @extends {goog.Disposable}
 * @constructor
 * @struct
 */
office.util.ExponentialDelay = function(listener, minInterval, maxInterval,
    opt_jitterFactor) {
  goog.base(this);

  /**
   * @type {number}
   * @private
   */
  this.jitterFactor_ = goog.isDefAndNotNull(opt_jitterFactor) ?
      opt_jitterFactor : office.util.ExponentialDelay.DEFAULT_JITTER_FACTOR_;
  goog.asserts.assert(this.jitterFactor_ >= 0 && this.jitterFactor_ <= 1);

  /**
   * @type {!Function}
   * @private
   */
  this.listener_ = listener;

  /**
   * @type {number}
   * @private
   */
  this.minInterval_ = minInterval;

  /**
   * @type {number}
   * @private
   */
  this.maxInterval_ = maxInterval;

  /**
   * @type {!goog.async.Delay}
   * @private
   */
  this.asyncDelay_ = new goog.async.Delay(this.runListener_, undefined, this);

  /**
   * The last time that this delay fired.  The next execution will not occur
   * until (lastExecutionTime + interval).
   * @type {?number}
   * @private
   */
  this.lastExecutionTime_ = Number.NEGATIVE_INFINITY;

  /**
   * The current millisecond delay to impose, relative to lastExecutionTime_.
   * @type {number}
   * @private
   */
  this.interval_ = 0;
};
goog.inherits(office.util.ExponentialDelay, goog.Disposable);


/**
 * The default jitter factor.
 * @type {number}
 * @private
 */
office.util.ExponentialDelay.DEFAULT_JITTER_FACTOR_ = 0.15;


/**
 * @return {boolean} True if the delay is currently active, false otherwise.
 */
office.util.ExponentialDelay.prototype.isActive = function() {
  return this.asyncDelay_.isActive();
};


/**
 * Starts the delay timer, scheduling a callback as soon as possible.  This
 * might be immediately.
 */
office.util.ExponentialDelay.prototype.start = function() {
  this.startInternal_(false /* resetBackoff */, false /* slowStart */);
};


/**
 * Starts the delay timer, scheduling a callback as soon as possible, but never
 * immediately.  At minimum, the minimum delay (jittered) will always occur
 * between this call and the callback.
 */
office.util.ExponentialDelay.prototype.slowStart = function() {
  this.startInternal_(false /* resetBackoff */, true /* slowStart */);
};


/**
 * Reset the backoff schedule and request a callback.  If less than the minimum
 * delay has elapsed since the last callback, that minimum will be enforced.
 * Otherwise, the callback will be immediate.
 */
office.util.ExponentialDelay.prototype.resetBackoffAndStart = function() {
  this.startInternal_(true /* resetBackoff */, false /* slowStart */);
};


/**
 * Starts the delay timer, scheduling a one-time call to the provided listener
 * function as soon as possible.
 *
 * <p>Unless opt_reset is true, calling start on an active timer has no effect.
 * @param {boolean} resetBackoff Whether to reset the backoff.  Any active
 *     delays will be cancelled, and the next callback will be performed the
 *     minimum interval after the previous one was, or immediately.
 * @param {boolean} slowStart If this call would cause the action to take
 *     place immediately, skip that invocation and wait for the first delay
 *     period.
 * @private
 */
office.util.ExponentialDelay.prototype.startInternal_ = function(resetBackoff,
    slowStart) {
  // You can't ask for both of these at once.
  goog.asserts.assert(!resetBackoff || !slowStart);

  if (resetBackoff) {
    this.asyncDelay_.stop();
    this.setIntervalWithJitter_(this.minInterval_);
  }

  if (this.isActive()) {
    return;
  }

  var now = goog.now();
  var nextExecutionTime = this.lastExecutionTime_ + this.interval_;
  var delay = Math.max(0, nextExecutionTime - now);
  if (delay == 0) {
    if (slowStart) {
      delay = this.setIntervalWithJitter_(this.minInterval_);
    } else {
      this.interval_ = 0;
    }
  }
  this.asyncDelay_.start(delay);
};


/**
 * Stops the timer, cancelling any scheduled execution.  Subsequent calls to
 * start() will continue to obey exponential backoff.
 *
 * <p>If the timer is inactive, no action will be taken.
 */
office.util.ExponentialDelay.prototype.stop = function() {
  this.asyncDelay_.stop();
};


/**
 * Sets the next interval amount, including the application of the jitter.
 * @param {number} newInterval The interval in millis.
 * @return {number} The new interval actually set.
 * @private
 */
office.util.ExponentialDelay.prototype.setIntervalWithJitter_ = function(
    newInterval) {
  if (newInterval > 0 && this.jitterFactor_ != 0) {
    newInterval = Math.floor(newInterval * (1 - this.jitterFactor_ +
        Math.random() * this.jitterFactor_ * 2));
  }

  this.interval_ = newInterval;
  return newInterval;
};


/**
 * Callback that runs the listener.  It marks the last execution time and sets
 * the next delay as being twice the previous delay.
 * @private
 */
office.util.ExponentialDelay.prototype.runListener_ = function() {
  this.lastExecutionTime_ = goog.now();
  this.setIntervalWithJitter_(goog.math.clamp(
      this.interval_ * 2, this.minInterval_, this.maxInterval_));
  this.listener_();
};


/** @override */
office.util.ExponentialDelay.prototype.disposeInternal = function() {
  this.asyncDelay_.dispose();
  delete this.asyncDelay_;
  delete this.listener_;

  goog.base(this, 'disposeInternal');
};
