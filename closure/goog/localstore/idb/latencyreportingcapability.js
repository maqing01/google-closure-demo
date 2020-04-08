goog.provide('office.localstore.idb.LatencyReportingCapability');

goog.require('office.flag');
goog.require('office.localstore.Flags');
goog.require('office.localstore.LatencyReport');
goog.require('office.localstore.LatencyReportingCapability');
goog.require('office.localstore.ProfileData');
goog.require('office.localstore.idb.StoreName');



/**
 * The capability used to to read and write latency reports using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @constructor
 * @struct
 * @extends {office.localstore.LatencyReportingCapability}
 */
office.localstore.idb.LatencyReportingCapability = function(db) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;
};
goog.inherits(office.localstore.idb.LatencyReportingCapability,
    office.localstore.LatencyReportingCapability);


/**
 * The data type for the latency stats record.
 * @type {string}
 * @private
 */
office.localstore.idb.LatencyReportingCapability.DATA_TYPE_ = 'lsy';


/**
 * The property name in the IDB record.
 * @type {string}
 * @private
 */
office.localstore.idb.LatencyReportingCapability.IDB_PROPERTY_NAME_ =
    'lrs';


/** @override */
office.localstore.idb.LatencyReportingCapability.prototype.
    getAndClearLatencyReports = function(resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.PROFILE_DATA],
      '', opt_errorCallback,
      true /* opt_allowWrite */);
  var reports = [];
  transaction.setCompletionCallback(goog.partial(resultCallback, reports));
  var profileDataStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA);

  this.readLatencyReports_(profileDataStore, goog.bind(function(storedReports) {
    for (var i = 0; i < storedReports.length; i++) {
      reports.push(
          office.localstore.LatencyReport.fromSimpleObject(storedReports[i]));
    }
    transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA).
        put(this.createProfileDataLatencyStatsObject_([]));
  }, this) /* resultCallback */);
};


/** @override */
office.localstore.idb.LatencyReportingCapability.prototype.pushLatencyReports =
    function(latencyReports, resultCallback, opt_errorCallback) {
  // CSI reporting of this transaction is disabled because writing that report
  // would itself be reported, ad infinitum.
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.PROFILE_DATA],
      '', opt_errorCallback,
      true /* opt_allowWrite */, undefined /* timeoutMs */,
      undefined /* timeoutCallback */, null /* csiConstant */);
  transaction.setCompletionCallback(resultCallback);
  var profileDataStore =
      transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA);

  this.readLatencyReports_(profileDataStore, goog.bind(function(storedReports) {
    var reports = storedReports;
    for (var i = 0; i != latencyReports.length; i++) {
      reports.push(latencyReports[i].toSimpleObject());
    }
    var lengthLimit = office.flag.getInstance().getNumber(
        office.localstore.Flags.LATENCY_REPORT_ARRAY_LIMIT);
    if (lengthLimit && reports.length > lengthLimit) {
      reports.splice(0, reports.length - lengthLimit);
    }
    transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA).
        put(this.createProfileDataLatencyStatsObject_(reports));
  }, this) /* resultCallback */);
};


/**
 * Read the latency reports out of the database.
 * @param {!office.localstore.idb.ObjectStore} profileDataStore The profile data
 *     object store.
 * @param {function(!Array.<!Object>)} resultCallback Called with the current
 *     latency reports simple objects on success of the operation.
 * @private
 */
office.localstore.idb.LatencyReportingCapability.prototype.readLatencyReports_ =
    function(profileDataStore, resultCallback) {
  var request = profileDataStore.get(
      office.localstore.idb.LatencyReportingCapability.DATA_TYPE_);
  request.setSuccessCallback(function(e) {
    resultCallback(e.target.result ?
        e.target.result[
            office.localstore.idb.LatencyReportingCapability.IDB_PROPERTY_NAME_] :
        []);
  });
};


/**
 * Create a latancy stats storage object from a list of simple latency record
 * objects.
 * @param {!Array.<!Object>} reports The simple latency report objects to wrap.
 * @return {!Object} The latency stats storage object.
 * @private
 */
office.localstore.idb.LatencyReportingCapability.prototype.
    createProfileDataLatencyStatsObject_ = function(reports) {
  var latencyStats = {};
  latencyStats[office.localstore.ProfileData.Property.DATA_TYPE] =
      office.localstore.idb.LatencyReportingCapability.DATA_TYPE_;
  latencyStats[
      office.localstore.idb.LatencyReportingCapability.IDB_PROPERTY_NAME_] =
      reports;
  return latencyStats;
};
