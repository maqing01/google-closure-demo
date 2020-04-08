/**
 * @fileoverview Implementation of the CsiLatencyPersister class.
 */

goog.provide('office.diagnostics.CsiLatencyPersister');

goog.require('apps.diagnostics.CsiLatencyPersister');
goog.require('office.localstore.LatencyReport');



/**
 * A latency reporter that writes the stats to local store while offline.
 * @constructor
 * @struct
 * @implements {apps.diagnostics.CsiLatencyPersister}
 */
office.diagnostics.CsiLatencyPersister = function() {
  /**
   * @type {office.localstore.LatencyReportingCapability}
   * @private
   */
  this.storageCapability_ = null;

  /**
   * Array of events to be sent to CSI. Only used if local store is not yet set.
   * @type {!Array.<Object>}
   * @private
   */
  this.reports_ = [];

  /**
   * Whether this persister has been discarded. Once discarded, events will
   * neither be persisted or cached.
   * @private {boolean}
   */
  this.discarded_ = false;
};


/**
 * Sets the local store capability, if available, and flushes any queued events.
 * @param {office.localstore.LatencyReportingCapability} capability The capability
 *     for persisting latency reports.
 */
office.diagnostics.CsiLatencyPersister.prototype.setStorageCapability =
    function(capability) {
  this.storageCapability_ = capability;
  this.persistReports_(this.reports_);
  this.reports_ = [];
};


/**
 * Discard the persister, causing it to silently drop all future events.
 */
office.diagnostics.CsiLatencyPersister.prototype.discard = function() {
  this.reports_ = [];
  this.discarded_ = true;
};


/** @override */
office.diagnostics.CsiLatencyPersister.prototype.persistEvents = function(
    csiParameters, timerName, startTime, events, includesServerResponseTime) {
  if (this.discarded_) {
    return;
  }

  if (!window.jstiming || !window.jstiming.sn) {
    throw Error('CSI service name is not configured.');
  }

  var serviceName = window.jstiming.sn;
  var report = new office.localstore.LatencyReport(
      csiParameters.getReleaseId(), timerName, csiParameters.getExperimentIds(),
      serviceName, startTime, events.concat(), includesServerResponseTime);
  this.persistReports_([report]);
};


/**
 * Writes the given latency reports to storage, or queues them if local store
 * is not available.
 * @param {!Array.<!office.localstore.LatencyReport>} latencyReports The latency
 *     reports to persist.
 * @private
 */
office.diagnostics.CsiLatencyPersister.prototype.persistReports_ = function(
    latencyReports) {
  if (this.storageCapability_ && latencyReports.length > 0) {
    this.storageCapability_.pushLatencyReports(
        latencyReports, goog.nullFunction /* completionCallback */);
  } else {
    this.reports_ = this.reports_.concat(latencyReports);
  }
};
