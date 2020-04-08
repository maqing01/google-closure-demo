goog.provide('office.localstore.idb.DocsDatabaseFactory');

goog.require('office.diagnostics.CsiConstants');
goog.require('office.diagnostics.InitialLoadTimingImpl');
goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('office.flag');
goog.require('office.localstore.Flags');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.idb.DATABASE_NAME');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.DocsDatabase');
goog.require('office.localstore.idb.OpenDbRequest');
goog.require('goog.Timer');
goog.require('goog.log');


/**
 * @type {IDBFactory}
 * @private
 */
office.localstore.idb.DocsDatabaseFactory.IDB_FACTORY_ = goog.global.indexedDB ||
    goog.global.webkitIndexedDB;


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.DocsDatabaseFactory.logger_ =
    goog.log.getLogger('office.localstore.idb.DocsDatabaseFactory');


/**
 * Creates a connection to the docs database.
 * @param {function(!office.localstore.idb.DocsDatabase)} successCallback The
 *     success callback.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 *     Callback for handling errors after the database has been opened.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @param {function(!office.localstore.LocalStoreError)} initialErrorCallback
 *     Callback for handling errors during initial database opens.
 * @param {boolean} errorOnTimeout Whether the request should be abandoned
 *     on timeout and the error callback should be called. The initial error
 *     callback is used if provided, otherwise the error callback is used.
 * @param {boolean=} opt_reportOpenDatabaseTiming Whether open database timing
 *     should be reported to CSI.
 */
office.localstore.idb.DocsDatabaseFactory.openDatabase = function(
    successCallback, errorCallback, errorReporter, initialErrorCallback,
    errorOnTimeout, opt_reportOpenDatabaseTiming) {
  //goog.log.info(office.localstore.idb.DocsDatabaseFactory.logger_,
  //    'Opening new idb connection.');
  var timeoutCallback = errorOnTimeout ?
      function() {
        initialErrorCallback(new office.localstore.LocalStoreError(
            office.localstore.LocalStoreError.Type.OPEN_DATABASE_TIMEOUT,
            '.'));
      } :
      undefined;

  //var timing = office.diagnostics.InitialLoadTimingImpl.getInstance();
  //if (opt_reportOpenDatabaseTiming) {
  //  timing.setTime(
  //      office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_STARTED);
  //
  //  // Determine the latency of the JS thread unblocking after opening
  //  // the database.
  //  goog.Timer.callOnce(
  //      goog.bind(timing.setTime, timing,
  //          office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_JS_YIELD));
  //}

  var openRequest = new office.localstore.idb.OpenDbRequest(
      office.localstore.idb.DocsDatabaseFactory.IDB_FACTORY_.open(
          office.localstore.idb.DATABASE_NAME),
      errorReporter, '' /* debugString */, timeoutCallback,
      office.flag.getInstance().getNumber(
          office.localstore.Flags.IDB_OPEN_REQUEST_TIMEOUT),
      office.diagnostics.CsiConstants.Variable.INDEXEDDB_OPEN_DATABASE);

  openRequest.setSuccessCallback(function(e) {
    goog.log.info(office.localstore.idb.DocsDatabaseFactory.logger_,
        '.');
    //if (opt_reportOpenDatabaseTiming) {
    //  timing.setTime(
    //      office.diagnostics.InitialLoadTimingKeys.OPEN_DATABASE_COMPLETE);
    //}

    var docsDb =
        new office.localstore.idb.DocsDatabase(errorCallback, errorReporter);
    docsDb.initialize(/** @type {!IDBDatabase} */ (e.target.result));

    successCallback(docsDb);
  });
  openRequest.setErrorCallback(
      office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback(
      '.', initialErrorCallback));
};


/**
 * @param {function(!Event)} successCallback
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 */
office.localstore.idb.DocsDatabaseFactory.deleteDatabase = function(
    successCallback, errorCallback) {
  goog.log.info(office.localstore.idb.DocsDatabaseFactory.logger_,
      'Deleting idb database.');

  // No need to explicitly close the database, it will happen as a result of the
  // deleteDatabase call if it is open.
  var deleteRequest =
      office.localstore.idb.DocsDatabaseFactory.IDB_FACTORY_.deleteDatabase(
          office.localstore.idb.DATABASE_NAME);
  deleteRequest.onsuccess = successCallback;
  deleteRequest.onerror =
      office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback(
          '.', errorCallback);
};
