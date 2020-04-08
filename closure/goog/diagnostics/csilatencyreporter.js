
// All Rights Reserved

/**
 * @fileoverview Latency reporter that sends data to CSI.
 *
 * @author corysmith@google.com (Cory Smith)
 * @author pvalenzuela@google.com (Patrick Valenzuela)
 * @author shanbhag@google.com (Shrikant Shanbhag)
 */

goog.provide('apps.diagnostics.CsiLatencyReporter');

goog.require('apps.diagnostics.CsiEventReporter');
goog.require('apps.diagnostics.LatencyReporter');
goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.events.EventHandler');
goog.require('goog.object');



/**
 * Latency reporter that sends data to CSI.
 * @constructor
 * @param {number} reportInterval The time interval (ms) between each report to
 *     CSI.
 * @param {string} reportUri The URI for CSI reporting.
 * @param {!apps.diagnostics.CsiParameters} csiParameters Extra CGI params that
 *     are appended to the logging query.
 * @param {string} loadTimerName The name of the timer to be used for load
 *     timing. This name is reported to CSI and is used as an identifier for
  *    timed operations.
 * @param {string} operationsTimerName The name of the timer to be used for
 *     general timing. This name is reported to CSI and is used as an identifier
 *     for timed operations.
 * @param {function(?) : string} eventCodeToCsi A function to convert
 *     from an application-specific event code to the CSI command type.
 *     Returning CSI command type 'unknown' will result in no tick being marked
 *     for that event code.
 * @param {!apps.diagnostics.CsiAvailabilityProvider} csiAvailabilityProvider
 *     The CSI availability provider.
 * @param {boolean=} opt_sendImmediately Whether to report data immediately.
 *     Reports will still be held until the load events are reported if
 *     opt_waitForLoad is also set.
 * @param {boolean=} opt_waitForLoad Whether to delay reporting logged events
 *     until after load events have been flushed. This will ensure that Server
 *     Response Time is included with the load events report rather than with
 *     other operations, but only makes sense if load events are definitely
 *     reported.
 * @implements {apps.diagnostics.LatencyReporter}
 * @extends {goog.Disposable}
 */
apps.diagnostics.CsiLatencyReporter = function(reportInterval, reportUri,
    csiParameters, loadTimerName, operationsTimerName, eventCodeToCsi,
    csiAvailabilityProvider, opt_sendImmediately, opt_waitForLoad) {
  goog.base(this);

  /**
   * The time interval (ms) between each report to CSI.
   * @type {number}
   * @private
   */
  this.reportInterval_ = reportInterval;

  /**
   * The extra CSI CGI logging params.
   * @type {!apps.diagnostics.CsiParameters}
   * @private
   */
  this.csiParameters_ = csiParameters;

  /**
   * The CSI load timer name.
   * @type {string}
   * @private
   */
  this.loadTimerName_ = loadTimerName;

  /**
   * The CSI operations timer name.
   * @type {string}
   * @private
   */
  this.operationsTimerName_ = operationsTimerName;

  /**
   * A function to convert from an application-specific event code to the CSI
   * command type.
   * @type {function(?) : string}
   * @private
   */
  this.eventCodeToCsi_ = eventCodeToCsi;

  /**
   * The CSI availability provider.
   * @type {!apps.diagnostics.CsiAvailabilityProvider}
   * @private
   */
  this.csiAvailabilityProvider_ = csiAvailabilityProvider;

  /**
   * @type {boolean}
   * @private
   */
  this.sendImmediately_ = !!opt_sendImmediately;

  /**
   * A persister for CSI latency events, or null if no persister is available.
   * @type {apps.diagnostics.CsiLatencyPersister}
   * @private
   */
  this.csiLatencyPersister_ = null;

  /**
   * The map of event codes to times waiting to be reported.
   * @private {!Object.<string, number>}
   */
  this.buffer_ = {};

  /**
   * Whether load events are waiting to be flushed before other events should be
   * delivered. The load events should be in the first CSI report in order for
   * Server Response Time to be delivered with them.
   * @private {boolean}
   */
  this.waitingForLoad_ = !!opt_waitForLoad;

  /**
   * @private {!goog.events.EventHandler}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /**
   * A timer for CSI reporting timeouts.
   * @private {!goog.Timer}
   */
  this.reportTimer_ = new goog.Timer(this.reportInterval_);
  this.eventHandler_.listen(
      this.reportTimer_, goog.Timer.TICK, this.flushOperationsToCsi_);

  /**
   * The reporter that creates and sends CSI reports.
   * @private {!apps.diagnostics.CsiEventReporter}
   */
  this.csiEventReporter_ = new apps.diagnostics.CsiEventReporter(reportUri);
};
goog.inherits(apps.diagnostics.CsiLatencyReporter, goog.Disposable);


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.init = function() {
  if (!this.waitingForLoad_ && !this.sendImmediately_) {
    this.reportTimer_.start();
  }
};


/**
 * Logs an event. Due to the nature of CSI reports, if multiple events translate
 * to the same CSI code within the same report, only the last logged event will
 * be delivered.
 * @override
 * */
apps.diagnostics.CsiLatencyReporter.prototype.log = function(eventCode,
    eventTime) {
  var csiCode = this.eventCodeToCsi_(eventCode);
  if (csiCode && csiCode != 'unknown') {
    this.buffer_[csiCode] = eventTime;
    if (this.sendImmediately_) {
      this.flushOperationsToCsi_();
    }
  }
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.setPersister = function(
    persister) {
  this.csiLatencyPersister_ = persister;
};


/**
 * Logs the operation info to CSI.
 * @private
 */
apps.diagnostics.CsiLatencyReporter.prototype.flushOperationsToCsi_ =
    function() {
  if (this.waitingForLoad_ || goog.object.isEmpty(this.buffer_)) {
    return;
  }

  var startTime = goog.now();
  if (this.csiAvailabilityProvider_.isAvailable()) {
    // Try to flush the events and only clear the buffer on success
    if (this.flushEvents_(this.bufferToEvents_(), startTime,
        this.operationsTimerName_, true /* includesServerResponseTime */)) {
      this.clear();
    }
  } else if (this.csiLatencyPersister_) {
    this.csiLatencyPersister_.persistEvents(this.csiParameters_,
        this.operationsTimerName_, startTime, this.bufferToEvents_(),
        true /* includesServerResponseTime */);
    this.clear();
  }
};


/**
 * @return {!Array.<Object>} The CSI events to report.
 * @private
 */
apps.diagnostics.CsiLatencyReporter.prototype.bufferToEvents_ = function() {
  var events = [];
  for (var csiCode in this.buffer_) {
    var eventTime = this.buffer_[csiCode];
    events.push([csiCode, eventTime]);
  }
  return events;
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.flushOperationEvents =
    function() {
  this.flushOperationsToCsi_();
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.flushLoadEvents = function(
    startTime, events) {
  var csiEvents = [];
  for (var i = 0; i < events.length; i++) {
    var csiCode = this.eventCodeToCsi_(events[i][0]);
    var eventTime = events[i][1];
    if (csiCode && csiCode != 'unknown') {
      csiEvents.push([csiCode, eventTime]);
    }
  }

  if (this.csiAvailabilityProvider_.isAvailable()) {
    this.flushLoadEventsToCsi_(startTime, csiEvents);
  } else if (this.csiLatencyPersister_) {
    this.csiLatencyPersister_.persistEvents(this.csiParameters_,
        this.loadTimerName_, startTime, csiEvents,
        false /* includesServerResponseTime */);
    this.completeLoadEvents_();
  } else {
    this.csiAvailabilityProvider_.callWhenAvailable(goog.bind(
        this.flushLoadEventsToCsi_, this, startTime, csiEvents));
  }
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.addExperiment = function(
    experiment) {
  this.flushOperationsToCsi_();
  this.csiParameters_ = this.csiParameters_.toBuilder().
      addExperimentId(experiment).
      build();
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.removeExperiment = function(
    experiment) {
  this.flushOperationsToCsi_();
  this.csiParameters_ = this.csiParameters_.toBuilder().
      removeExperimentId(experiment).
      build();
};


/**
 * Sends load timing information to CSI when the network is connected.
 * @param {number} startTime The start time relative to the events.
 * @param {!Array.<Object>} events The load events, with event names already
 *     translated to CSI event codes.
 * @private
 */
apps.diagnostics.CsiLatencyReporter.prototype.
    flushLoadEventsToCsi_ = function(startTime, events) {
  this.flushEvents_(events, startTime, this.loadTimerName_,
      false /* includesServerResponseTime */);
  this.completeLoadEvents_();
};


/**
 * Enables regular reporting of events if the reporter was waiting for load
 * events.
 * @private
 */
apps.diagnostics.CsiLatencyReporter.prototype.completeLoadEvents_ =
    function() {
  if (this.waitingForLoad_) {
    // If events were queued waiting for load, they can now be flushed as well.
    this.waitingForLoad_ = false;
    this.flushOperationsToCsi_();
    if (!this.sendImmediately_) {
      this.reportTimer_.start();
    }
  }
};


/**
 * Flushes the given events to CSI.
 * @param {!Array.<Object>} events The events.
 * @param {number} startTime The start time relative to the events.
 * @param {string} timerName The name of the CSI timer to use.
 * @param {boolean} includesServerResponseTime Whether the event time already
 *     includes server response time.
 * @return {boolean} True if the flush succeeded.
 * @private
 */
apps.diagnostics.CsiLatencyReporter.prototype.flushEvents_ = function(events,
    startTime, timerName, includesServerResponseTime) {
  if (!goog.isDefAndNotNull(window.jstiming)) {
    // window.jstiming should be defined very early and if it has not been
    // defined by now, it is most likely because CSI tracking is not enabled.
    // Since CSI tracking is not enabled, we mark this as a success since this
    // method has done all that it should.
    return true;
  }

  return this.csiEventReporter_.reportEvents(timerName, events, startTime,
      includesServerResponseTime, this.csiParameters_.serialize());
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.clear = function() {
  this.buffer_ = {};
};


/** @override */
apps.diagnostics.CsiLatencyReporter.prototype.disposeInternal = function() {
  goog.dispose(this.csiAvailabilityProvider_);
  goog.dispose(this.eventHandler_);
  goog.dispose(this.reportTimer_);

  goog.base(this, 'disposeInternal');
};
