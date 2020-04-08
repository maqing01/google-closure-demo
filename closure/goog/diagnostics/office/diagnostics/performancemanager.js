goog.provide('office.diagnostics.PerformanceManager');

goog.require('office.diagnostics.CsiConstants');
goog.require('office.diagnostics.MemoryStatsCollector');
goog.require('office.diagnostics.NullLatencyReporter');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('goog.Timer');
goog.require('goog.json');
goog.require('goog.string');



/**
 * Class used to collect latency statistics for specific client-side tasks.
 * @param {function() : number=} opt_now Current time function for testing.
 * @constructor
 * @struct
 */
office.diagnostics.PerformanceManager = function(opt_now) {

  /**
   * Current time function.
   * @type {function() : number}
   * @private
   */
  this.now_ = opt_now || goog.now;

  /**
   * Map of event id to an object with information of the pending event.
   * @type {!Object.<!{startTime: number, eventCode: *}>}
   * @private
   */
  this.pendingEvents_ = {};

  /**
   * The latency reporter for sending data to an external service. A null
   * (no-op) reporter is created here by default.
   * @type {!apps.diagnostics.LatencyReporter}
   * @private
   */
  this.latencyReporter_ = new office.diagnostics.NullLatencyReporter();

  /**
   * The memory stats collector for getting memory stats if they are available.
   * @type {!office.diagnostics.MemoryStatsCollector}
   * @private
   */
  this.memoryStatsCollector_ = new office.diagnostics.MemoryStatsCollector();

  /**
   * Memory stats report interval. If memory_report_interval_in_ms flag is
   * passed to vodka server, it overrides default 30 min interval.
   * @type {number}
   * @private
   */
  this.memoryReportIntervalInMs_ =
      office.diagnostics.PerformanceManager.DEFAULT_MEMORY_REPORT_INTERVAL_IN_MS_;
  if (office.flag.getInstance().flagExists(
      office.flag.Flags.MEMORY_REPORT_INTERVAL_IN_MS)) {
    this.memoryReportIntervalInMs_ = office.flag.getInstance().getNumber(
        office.flag.Flags.MEMORY_REPORT_INTERVAL_IN_MS);
  }

  /** @private {!Object.<office.diagnostics.CsiConstants.Variable, number>} */
  this.initialLoadStats_ = {};

  // Export these functions so they can be used in the application template.
  //goog.exportProperty(this, 'saveInitialLoadStats',
  //    this.saveAndReportInitialLoadStats);
  //goog.exportProperty(this, 'maybeReportMemoryStats',
  //    this.maybeReportMemoryStats);
  //goog.exportProperty(this, 'getInitialLoadStats', this.getInitialLoadStats);
};
goog.addSingletonGetter(office.diagnostics.PerformanceManager);


/**
 * Default memory stats report interval in milliseconds (30 minutes).
 * This value is overridden by memory_report_interval_in_ms flag if passed
 * to vodka server.
 * @type {number}
 * @private
 */
office.diagnostics.PerformanceManager.DEFAULT_MEMORY_REPORT_INTERVAL_IN_MS_ =
    30 * 60 * 1000;


/**
 * Saves the stats from the application's initial load and reports to CSI.
 * @param {number} startLoadTime The time the application started loading in ms
 *     from the epoch.
 * @param {!Object.<office.diagnostics.CsiConstants.Variable, number>} loadStats
 *     An object from csi variables to their values.
 */
office.diagnostics.PerformanceManager.prototype.saveAndReportInitialLoadStats =
    function(startLoadTime, loadStats) {
  this.initialLoadStats_ = loadStats;
  var initialLoadEvents = this.createInitialLoadEvents_(this.initialLoadStats_);

  // Flush the events.
  this.latencyReporter_.flushLoadEvents(
      startLoadTime,
      initialLoadEvents);
};


/**
 * Creates an array of initial load events from the given statistics.
 * @param {!Object.<office.diagnostics.CsiConstants.Variable, number>}
 *     initialLoadStats An object from csi variables to their values.
 * @return {!Array.<!Array>}
 * @private
 */
office.diagnostics.PerformanceManager.prototype.createInitialLoadEvents_ =
    function(initialLoadStats) {
  var events = [];
  for (var csiVariable in initialLoadStats) {
    var event = [csiVariable, initialLoadStats[csiVariable]];
    events.push(event);
  }
  return events;
};


/**
 * Produces a JSON object containing the application's initial load stats.
 * @return {string} The initial load stats as a JSON string.
 */
office.diagnostics.PerformanceManager.prototype.getInitialLoadStats = function() {
  return goog.json.serialize(this.initialLoadStats_);
};


/**
 * Starts timing an event. The most recently started events are completed first.
 * @param {*} eventCode The identifying code of the event.
 * @return {string} The id of the event.
 */
office.diagnostics.PerformanceManager.prototype.startEvent = function(eventCode) {
  var eventId = goog.string.createUniqueString();
  this.pendingEvents_[eventId] = {
    startTime: this.now_(),
    eventCode: eventCode
  };
  return eventId;
};


/**
 * Starts timing the given events. The most recently started events are
 * completed first.
 * @param {!Array.<*>} eventCodes The identifying code of the event.
 * @return {!Array.<string>} The ids of the events.
 */
office.diagnostics.PerformanceManager.prototype.startEvents = function(
    eventCodes) {
  var eventIds = [];
  for (var i = 0; i < eventCodes.length; i++) {
    eventIds.push(this.startEvent(eventCodes[i]));
  }
  return eventIds;
};


/**
 * Stops timing an event.
 * @param {string} eventId The id of the event to complete.
 * @throws {Error} If the id is unknown and in debug mode.
 */
office.diagnostics.PerformanceManager.prototype.completeEvent = function(
    eventId) {
  var timingEvent = this.pendingEvents_[eventId];
  if (!timingEvent) {
    if (goog.DEBUG) {
      throw Error('There is no event with id ' + eventId);
    }
    return;
  }

  this.latencyReporter_.log(
      timingEvent.eventCode, this.now_() - timingEvent.startTime);

  delete this.pendingEvents_[eventId];
};


/**
 * Stops timing the given events.
 * @param {!Array.<string>} eventIds The id of the events to complete.
 */
office.diagnostics.PerformanceManager.prototype.completeEvents = function(
    eventIds) {
  for (var i = 0; i < eventIds.length; i++) {
    this.completeEvent(eventIds[i]);
  }
};


/**
 * Discards an event. The events timing will not be logged.
 * @param {string} eventId The id of the event to discard.
 * @throws {Error} If the id is unknown and in debug mode.
 */
office.diagnostics.PerformanceManager.prototype.discardEvent = function(eventId) {
  if (!this.pendingEvents_[eventId]) {
    if (goog.DEBUG) {
      throw Error('There is no event with id ' + eventId);
    }
    return;
  }

  delete this.pendingEvents_[eventId];
};


/**
 * Logs memory stats to CSI if they are available.  Attempts to collect
 * and report stats every memory report interval.
 */
office.diagnostics.PerformanceManager.prototype.maybeReportMemoryStats =
    function() {
  var memoryStats = this.memoryStatsCollector_.getMemoryStats();
  if (memoryStats != null) {
    this.latencyReporter_.log(
        office.diagnostics.CsiConstants.Variable.HEAP_SIZE_LIMIT,
        memoryStats.getHeapSizeLimit());
    this.latencyReporter_.log(
        office.diagnostics.CsiConstants.Variable.TOTAL_HEAP_SIZE,
        memoryStats.getTotalHeapSize());
    this.latencyReporter_.log(
        office.diagnostics.CsiConstants.Variable.USED_HEAP_SIZE,
        memoryStats.getUsedHeapSize());

    // Attempt to collect stats again after the memory reporting interval.
    goog.Timer.callOnce(this.maybeReportMemoryStats,
        this.memoryReportIntervalInMs_, this);
  }
};
