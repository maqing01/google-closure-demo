goog.provide('office.diagnostics.InitialLoadStatisticsCalculator');

goog.require('office.diagnostics.CsiConstants');
goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('goog.functions');



/**
 * A class which calculates the appropriate CSI metrics from initial load
 * checkpoints.
 * @param {number} startLoadTime The time the application started loading in ms.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @param {function(string): boolean=} opt_filterFn A function to filter the
 *     load statistics. Should return true for all desired keys.
 * @constructor
 * @struct
 * @final
 */
office.diagnostics.InitialLoadStatisticsCalculator = function(
    startLoadTime, errorReporter, opt_filterFn) {
  /** @private {number} */
  this.startLoadTime_ = startLoadTime;

  /** @private {office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /** @private {function(string): boolean} */
  this.filterFn_ = opt_filterFn || goog.functions.TRUE;
};


/** @return {number} */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.
    getStartLoadTime = function() {
  return this.startLoadTime_;
};


/**
 * Calculates the appropriate CSI metrics from the given timing object.
 * @param {!Object.<office.diagnostics.InitialLoadTimingKeys, number>} timing
 * @return {!Object.<office.diagnostics.CsiConstants.Variable, number>}
 */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.calculate = function(
    timing) {
  var loadStats = {};

  // Interval times.
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.TOTAL_LOAD,
      timing,
      office.diagnostics.InitialLoadTimingKeys.END_LOAD);
  this.setInterval(
      loadStats,
      office.diagnostics.CsiConstants.Variable.LOAD_JS,
      timing,
      office.diagnostics.InitialLoadTimingKeys.START_JS_LOAD,
      office.diagnostics.InitialLoadTimingKeys.END_JS_LOAD);
  this.setInterval(
      loadStats,
      office.diagnostics.CsiConstants.Variable.CREATE_JS_APP,
      timing,
      office.diagnostics.InitialLoadTimingKeys.START_JS_APPLICATION_CREATION,
      office.diagnostics.InitialLoadTimingKeys.END_JS_APPLICATION_CREATION);
  this.setInterval(
      loadStats,
      office.diagnostics.CsiConstants.Variable.CHROME_FLUSH,
      timing,
      office.diagnostics.InitialLoadTimingKeys.START_CHROME_FLUSH,
      office.diagnostics.InitialLoadTimingKeys.END_CHROME_FLUSH);
  this.setInterval(
      loadStats,
      office.diagnostics.CsiConstants.Variable.SET_LOADED_JS_APP,
      timing,
      office.diagnostics.InitialLoadTimingKeys.START_JS_APPLICATION_SET_LOADED,
      office.diagnostics.InitialLoadTimingKeys.END_JS_APPLICATION_SET_LOADED);
  this.setInterval(
      loadStats,
      office.diagnostics.CsiConstants.Variable.FIRST_MODEL_PART_JS_YIELD,
      timing,
      office.diagnostics.InitialLoadTimingKeys.START_FIRST_MODEL_PART_JS_YIELD,
      office.diagnostics.InitialLoadTimingKeys.END_FIRST_MODEL_PART_JS_YIELD);


  // Checkpoint times.
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.APPLICATION_LOAD_COMPLETE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.APPLICATION_LOAD_COMPLETE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.JS_APPLICATION_LOAD,
      timing,
      office.diagnostics.InitialLoadTimingKeys.JS_APPLICATION_LOAD);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.CHROME_VIEWABLE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.CHROME_VIEWABLE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.CONTENT_VIEWABLE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.CONTENT_VIEWABLE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.OPEN_DATABASE_STARTED,
      timing,
      office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_STARTED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.OPEN_DATABASE_JS_YIELD,
      timing,
      office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_JS_YIELD);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.OPEN_DATABASE_COMPLETE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_COMPLETE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.LOCK_ACQUISITION_STARTED,
      timing,
      office.diagnostics.InitialLoadTimingKeys.LOCK_ACQUISITION_STARTED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.LOCK_ACQUISITION_COMPLETE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.LOCK_ACQUISITION_COMPLETE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.LOCAL_STORE_INITIALIZED,
      timing,
      office.diagnostics.InitialLoadTimingKeys.LOCAL_STORE_INITIALIZED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.PENDING_QUEUE_CREATED,
      timing,
      office.diagnostics.InitialLoadTimingKeys.PENDING_QUEUE_CREATED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.MODEL_LOAD_COMPLETE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.MODEL_LOAD_COMPLETE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.FIRST_ASYNC_REDRAW,
      timing,
      office.diagnostics.InitialLoadTimingKeys.FIRST_ASYNC_REDRAW);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.CONTENT_EDITABLE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.CONTENT_EDITABLE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.FIRST_BASIC_EDIT,
      timing,
      office.diagnostics.InitialLoadTimingKeys.FIRST_BASIC_EDIT);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.FIRST_MODEL_PART_LOADED,
      timing,
      office.diagnostics.InitialLoadTimingKeys.FIRST_MODEL_PART_LOADED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.FULL_CONTENT_EDITABLE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.FULL_CONTENT_EDITABLE);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.TIME_TO_TYPE,
      timing,
      office.diagnostics.InitialLoadTimingKeys.TYPING_ENABLED);
  this.setIntervalFromStartLoad(
      loadStats,
      office.diagnostics.CsiConstants.Variable.WEBFONTS_RENDER,
      timing,
      office.diagnostics.InitialLoadTimingKeys.WEBFONTS_RENDER);

  // Absolute interval times.
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.LOAD_MODEL,
      timing[office.diagnostics.InitialLoadTimingKeys.MODEL_LOAD]);
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.DESERIALIZE_MODEL,
      timing[office.diagnostics.InitialLoadTimingKeys.MODEL_DESERIALIZATION]);
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.PERSIST_MODEL,
      timing[office.diagnostics.InitialLoadTimingKeys.MODEL_PERSIST]);
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.PARSE_MODEL,
      timing[office.diagnostics.InitialLoadTimingKeys.MODEL_PARSE]);
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.READ_MODEL,
      timing[office.diagnostics.InitialLoadTimingKeys.MODEL_READ]);

  // Percentage values.
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.WEBFONTS_AVAILABLE,
      timing[office.diagnostics.InitialLoadTimingKeys.WEBFONTS_AVAILABLE]);
  this.setValue(
      loadStats,
      office.diagnostics.CsiConstants.Variable.WEBFONTS_VARIANTS_AVAILABLE,
      timing[
          office.diagnostics.InitialLoadTimingKeys.WEBFONTS_VARIANTS_AVAILABLE]);

  this.filterStatistics_(loadStats);
  return loadStats;
};


/**
 * Filters in place the given load statistics for relevancy.
 * @param {!Object.<office.diagnostics.CsiConstants.Variable, number>} loadStats
 * @private
 */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.filterStatistics_ =
    function(loadStats) {
  if (this.filterFn_ == goog.functions.TRUE) {
    return;
  }

  for (var key in loadStats) {
    if (!this.filterFn_(key)) {
      delete loadStats[key];
    }
  }
};


/**
 * Sets the given csiVariable in the loadStats object to the given value.
 * @param {!Object.<number>} loadStats
 * @param {office.diagnostics.CsiConstants.Variable} csiVariable
 * @param {?number} value
 * @protected
 */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.setValue = function(
    loadStats, csiVariable, value) {
  if (goog.isDefAndNotNull(value)) {
    if (isNaN(value)) {
      this.errorReporter_.log(
          Error('Latency variable ' + csiVariable + ' is NaN'));
    } else if (!isFinite(value)) {
      this.errorReporter_.log(
          Error('Latency variable ' + csiVariable + ' is infinite'));
    }
    loadStats[csiVariable] = value;
  }
};


/**
 * Sets the given csiVariable in the loadStats object to interval between the
 * start load time and the given key.
 * @param {!Object.<number>} loadStats
 * @param {office.diagnostics.CsiConstants.Variable} csiVariable
 * @param {!Object.<number>} timing The object containing the check point times.
 * @param {office.diagnostics.InitialLoadTimingKeys} key
 * @protected
 */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.
    setIntervalFromStartLoad = function(loadStats, csiVariable, timing, key) {
  var end = timing[key];
  var value = goog.isNumber(end) ?
      end - this.startLoadTime_ :
      null;
  this.setValue(loadStats, csiVariable, value);
};


/**
 * Sets the given csiVariable in the loadStats object to interval between the
 * given start and end keys.
 * @param {!Object.<number>} loadStats
 * @param {office.diagnostics.CsiConstants.Variable} csiVariable
 * @param {!Object.<number>} timing The object containing the check point times.
 * @param {office.diagnostics.InitialLoadTimingKeys} startKey
 * @param {office.diagnostics.InitialLoadTimingKeys} endKey
 * @protected
 */
office.diagnostics.InitialLoadStatisticsCalculator.prototype.setInterval =
    function(loadStats, csiVariable, timing, startKey, endKey) {
  var end = timing[endKey];
  var start = timing[startKey];
  var value = goog.isNumber(end) && goog.isNumber(start) ?
      end - start :
      null;
  this.setValue(loadStats, csiVariable, value);
};


/**
 * Creates an InitialLoadStatisticsCalculator from the given timing
 * object.
 * @param {!Object} timing The timing object that contains the start load time.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @return {!office.diagnostics.InitialLoadStatisticsCalculator}
 */
office.diagnostics.InitialLoadStatisticsCalculator.create = function(
    timing, errorReporter) {
  var startLoad = timing[office.diagnostics.InitialLoadTimingKeys.START_LOAD];
  return new office.diagnostics.InitialLoadStatisticsCalculator(
      startLoad, errorReporter);
};
