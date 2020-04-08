/**
 * @fileoverview Contains the definition of the LatencyReport class.
 */

goog.provide('office.localstore.LatencyReport');



/**
 * A CSI latency report.
 * @param {?string} releaseId The application release ID.
 * @param {string} actionName The name of the timer used for timing. This
 *     name is reported to CSI and used as an identifier for timed
 *     operations.
 * @param {!Array.<string>} csiExperimentIds The experiment IDs to report to
 *     CSI.
 * @param {string} serviceName The CSI service name for the report.
 * @param {number} startTime The start time relative to the events.
 * @param {!Array.<!Object>} events The events to flush to CSI.
 * @param {boolean} includesServerResponseTime Whether the times in this report
 *     include server response time.
 * @constructor
 * @struct
 */
office.localstore.LatencyReport = function(
    releaseId, actionName, csiExperimentIds, serviceName, startTime, events,
    includesServerResponseTime) {
  /**
   * The application release ID.
   * @type {?string}
   * @private
   */
  this.releaseId_ = releaseId;

  /**
   * The name of the timer used for timing.
   * @type {string}
   * @private
   */
  this.actionName_ = actionName;

  /**
   * The experiment IDs to report to CSI.
   * @type {!Array.<string>}
   * @private
   */
  this.csiExperimentIds_ = csiExperimentIds;

  /**
   * The CSI service name for the report.
   * @type {string}
   * @private
   */
  this.serviceName_ = serviceName;

  /**
   * The start time relative to the events.
   * @type {number}
   * @private
   */
  this.startTime_ = startTime;

  /**
   * The events to flush to CSI.
   * @type {!Array.<!Object>}
   * @private
   */
  this.events_ = events;

  /**
   * Whether the response time includes server response time.
   * @type {boolean}
   * @private
   */
  this.includesServerResponseTime_ = includesServerResponseTime;
};


/**
 * @return {?string} The application release ID..
 */
office.localstore.LatencyReport.prototype.getReleaseId = function() {
  return this.releaseId_;
};


/**
 * @return {string} The name of the timer used for timing.
 */
office.localstore.LatencyReport.prototype.getActionName = function() {
  return this.actionName_;
};


/**
 * @return {!Array.<string>} The experiment IDs to report to CSI.
 */
office.localstore.LatencyReport.prototype.getExperimentIds =
    function() {
  return this.csiExperimentIds_;
};


/**
 * @return {number} The start time relative to the events.
 */
office.localstore.LatencyReport.prototype.getStartTime = function() {
  return this.startTime_;
};


/**
 * @return {!Array.<!Object>} The events to flush.
 */
office.localstore.LatencyReport.prototype.getEvents = function() {
  return this.events_;
};


/**
 * @return {string} The CSI service name.
 */
office.localstore.LatencyReport.prototype.getServiceName = function() {
  return this.serviceName_;
};


/**
 * @return {boolean} Whether the report includes server response time.
 */
office.localstore.LatencyReport.prototype.getIncludesServerResponseTime =
    function() {
  return this.includesServerResponseTime_;
};


/**
 * The property names for storing a report as a simple object.
 * @enum {string}
 * @private
 */
office.localstore.LatencyReport.Property_ = {
  ACTION_NAME: 'actionName',
  CSI_EXPERIMENT_IDS: 'csiExperimentIds',
  EVENTS: 'events',
  RELEASE_ID: 'releaseId',
  SERVICE_NAME: 'serviceName',
  START_TIME: 'startTime',
  INCLUDES_SERVER_RESPONSE_TIME: 'includesServerResponseTime'
};


/**
 * Convert the latency report into a simple object for local storage.
 * @return {!Object} The latency report, represented as a simple object.
 */
office.localstore.LatencyReport.prototype.toSimpleObject = function() {
  var object = {};
  object[office.localstore.LatencyReport.Property_.RELEASE_ID] =
      this.getReleaseId();
  object[office.localstore.LatencyReport.Property_.ACTION_NAME] =
      this.getActionName();
  object[office.localstore.LatencyReport.Property_.CSI_EXPERIMENT_IDS] =
      this.getExperimentIds();
  object[office.localstore.LatencyReport.Property_.SERVICE_NAME] =
      this.getServiceName();
  object[office.localstore.LatencyReport.Property_.START_TIME] =
      this.getStartTime();
  object[office.localstore.LatencyReport.Property_.EVENTS] = this.getEvents();
  object[office.localstore.LatencyReport.Property_.
      INCLUDES_SERVER_RESPONSE_TIME] = this.getIncludesServerResponseTime();
  return object;
};


/**
 * Convert a latency report simple object into a latency report object.
 * @param {!Object} reportObject The latency report represented as a simple
 *     object.
 * @return {!office.localstore.LatencyReport} The latency report.
 */
office.localstore.LatencyReport.fromSimpleObject = function(reportObject) {
  return new office.localstore.LatencyReport(
      reportObject[office.localstore.LatencyReport.Property_.RELEASE_ID],
      reportObject[office.localstore.LatencyReport.Property_.ACTION_NAME],
      reportObject[office.localstore.LatencyReport.Property_.CSI_EXPERIMENT_IDS],
      reportObject[office.localstore.LatencyReport.Property_.SERVICE_NAME],
      reportObject[office.localstore.LatencyReport.Property_.START_TIME],
      reportObject[office.localstore.LatencyReport.Property_.EVENTS],
      reportObject[office.localstore.LatencyReport.Property_.
          INCLUDES_SERVER_RESPONSE_TIME]);
};
