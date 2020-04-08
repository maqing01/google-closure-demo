goog.provide('office.diagnostics.InitialLoadTimingImpl');

goog.require('office.diagnostics.InitialLoadTiming');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * Manages interactions with a timing object.
 * @constructor
 * @struct
 * @final
 * @implements {office.diagnostics.InitialLoadTiming}
 */
office.diagnostics.InitialLoadTimingImpl = function() {
  /**
   * The timing object to manage.
   * @private {!Object}
   */
  this.timingObject_ = {};

  /**
   * An object with the required timing fields that are not set yet.
   * @private {Object}
   */
  this.uninitializedFields_ = null;

  /** @private {office.debug.ErrorReporter} */
  this.errorReporter_ = null;

  /**
   * Whether office.offline.Timing.initialize method was already called.
   * @private {boolean}
   */
  this.isInitialized_ = false;

  /**
   * Whether all the required timing fields were set in the timing object.
   * This is used for debugging and error handling purposes.
   * @private {boolean}
   */
  this.initialLoadTimingCompleted_ = false;

  /** @private {office.diagnostics.PerformanceManager} */
  this.performanceManager_ = null;

  /** @private {office.diagnostics.InitialLoadStatisticsCalculator} */
  this.statisticsCalculator_ = null;

  // Export these functions so they can be used in the application template.
  //goog.exportProperty(this, 'setTime', this.setTime);
  //goog.exportProperty(this, 'incrementTime', this.incrementTime);
};
goog.addSingletonGetter(office.diagnostics.InitialLoadTimingImpl);


/**
 * Initializes the timing object. Throws if this method was already called.
 * Values that were already set using setTime or incrementTime should not be
 * present in the timing object to set, otherwise this method will throw.
 * @param {!Object} timingObject The timing object to set.
 * @param {!office.debug.ErrorReporter} errorReporter The error reporter.
 * @param {!Array.<office.diagnostics.InitialLoadTimingKeys>} expectedTimingKeys
 *     The list of expected timing keys to wait for before reporting the initial
 *     load stats.
 * @param {!office.diagnostics.PerformanceManager} performanceManager
 * @param {!office.diagnostics.InitialLoadStatisticsCalculator} calculator
 */
office.diagnostics.InitialLoadTimingImpl.prototype.initialize = function(
    timingObject, errorReporter, expectedTimingKeys, performanceManager,
    calculator) {
  if (this.isInitialized_) {
    throw Error('Timing object is already set.');
  }

  // Copy the cached fields to the new timing object.
  for (var field in this.timingObject_) {
    if (goog.isDef(timingObject[field])) {
      throw Error('Field ' + field + ' was set twice.');
    }
    timingObject[field] = this.timingObject_[field];
  }

  this.timingObject_ = timingObject;
  this.errorReporter_ = errorReporter;
  this.uninitializedFields_ = goog.object.createSet(expectedTimingKeys);
  this.performanceManager_ = performanceManager;
  this.statisticsCalculator_ = calculator;

  // Removing from the list of missing fields all fields already set in the
  // timing object.
  for (var field in this.timingObject_) {
    delete this.uninitializedFields_[field];
  }

  this.isInitialized_ = true;
  this.maybeReportInitialLoadStats_();
};


/**
 * Returns whether the given field is uninitialized. This means the field is
 * both required and not set.
 * @param {string} field The field to check.
 * @return {boolean} Whether the field is uninitialized.
 */
office.diagnostics.InitialLoadTimingImpl.prototype.isUninitializedDebugDebug =
    function(field) {
  return !!this.uninitializedFields_[field];
};


/**
 * Returns whether the given field has been set.
 * @param {string} field The field to check.
 * @return {boolean} Whether the given field has been set.
 */
office.diagnostics.InitialLoadTimingImpl.prototype.isSetDebugDebug = function(
    field) {
  return goog.object.containsKey(this.timingObject_, field);
};


/**
 * Removes the given field from the list of missing fields. This is called when
 * the field is set.
 * @param {string} field The timing field to be removed from the array of
 *     missing fields.
 * @private
 */
office.diagnostics.InitialLoadTimingImpl.prototype.removeFromMissingFields_ =
    function(field) {
  if (!this.isInitialized_) {
    return;
  }

  if (this.initialLoadTimingCompleted_) {
    this.errorReporter_.log(new Error('Timing field ' + field +
        ' was set after the initial load timing values were reported.'));
    return;
  }

  delete this.uninitializedFields_[field];
  this.maybeReportInitialLoadStats_();
};


/** @override */
office.diagnostics.InitialLoadTimingImpl.prototype.setAsOptional = function(
    keys) {
  for (var i = 0; i < keys.length; i++) {
    delete this.uninitializedFields_[keys[i]];
  }

  // If the keys we just removed were blocking sending the stats object,
  // do so now.
  this.maybeReportInitialLoadStats_();
};


/**
 * Reports initial load timing values if all required fields are set.
 * @private
 */
office.diagnostics.InitialLoadTimingImpl.prototype.maybeReportInitialLoadStats_ =
    function() {
  if (goog.object.getCount(this.uninitializedFields_) == 0) {
    this.initialLoadTimingCompleted_ = true;
    // All required fields were set, report the initial load timing values.
    var loadStatistics = this.statisticsCalculator_.calculate(
        this.timingObject_);
    this.performanceManager_.saveAndReportInitialLoadStats(
        this.statisticsCalculator_.getStartLoadTime(), loadStatistics);
    this.performanceManager_.maybeReportMemoryStats();
  }
};


/** @override */
office.diagnostics.InitialLoadTimingImpl.prototype.setTime = function(field) {
  this.setValue(field, goog.now());
};


/** @override */
office.diagnostics.InitialLoadTimingImpl.prototype.getTime = function(field) {
  var value = this.timingObject_[field];
  return goog.isDefAndNotNull(value) ? value : null;
};


/** @override */
office.diagnostics.InitialLoadTimingImpl.prototype.incrementTime = function(
    field, timeDelta) {
  if (!goog.isDefAndNotNull(this.timingObject_[field])) {
    this.timingObject_[field] = 0;
  }
  this.timingObject_[field] += timeDelta;
  this.removeFromMissingFields_(field);

  goog.asserts.assert(!this.isInitialized_ ||
      !goog.isDef(this.uninitializedFields_[field]));
};


/** @override */
office.diagnostics.InitialLoadTimingImpl.prototype.setValue = function(
    field, value) {
//  if (goog.isDefAndNotNull(this.timingObject_[field])) {
//    throw Error('Field ' + field + ' is already set.');
//  }
//  this.timingObject_[field] = value;
//  this.removeFromMissingFields_(field);
};


/**
 * @return {boolean} True if all the expected timing keys have been provided.
 */
office.diagnostics.InitialLoadTimingImpl.prototype.isInitialLoadTimingCompleted =
    function() {
  return this.initialLoadTimingCompleted_;
};


//goog.exportProperty(goog.global, '_getTimingInstance',
//    office.diagnostics.InitialLoadTimingImpl.getInstance);
//goog.exportProperty(goog.global, '_docsTiming',
//    office.diagnostics.InitialLoadTimingImpl);
