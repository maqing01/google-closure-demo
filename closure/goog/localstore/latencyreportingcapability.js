/**
 * @fileoverview Base class for the capablity used for reading and writing
 * latency reports.

 */

goog.provide('office.localstore.LatencyReportingCapability');

goog.require('office.localstore.AbstractStorageCapability');



/**
 * Base class for the capability used for reading and writing latency reports.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.LatencyReportingCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.LatencyReportingCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.LatencyReportingCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [];
};


/**
 * Retrieves and clears the latency reports in storage.
 * @param {function(!Array.<!office.localstore.LatencyReport>)} resultCallback
 *     Called with the current latency reports on success of the operation.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback The
 *     error callback.
 */
office.localstore.LatencyReportingCapability.prototype.getAndClearLatencyReports =
    goog.abstractMethod;


/**
 * Adds the given list of latency reports to the LatencyStats object in storage.
 * @param {!Array.<!office.localstore.LatencyReport>} latencyReports The array of
 *     latency reports to store.
 * @param {function()} resultCallback Called on success of the operation.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback The
 *     error callback.
 */
office.localstore.LatencyReportingCapability.prototype.pushLatencyReports =
    goog.abstractMethod;
