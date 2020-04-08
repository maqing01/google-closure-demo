goog.provide('office.localstore.idb.DocsDatabase');

goog.require('office.localstore.LocalStoreEventType');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.OpenDbRequest');
goog.require('office.localstore.idb.Transaction');
goog.require('office.localstore.idb.VersionChangeEvent');
goog.require('office.offline.optin');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.object');



/**
 * @param {function(!office.localstore.LocalStoreError)} errorCallback The default
 *     callback for handling errors.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.idb.DocsDatabase = function(errorCallback, errorReporter) {
  goog.base(this);

  /**
   * The default callback for handling errors.
   * @type {function(!office.localstore.LocalStoreError)}
   * @private
   */
  this.errorCallback_ = errorCallback;

  /**
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * The underlying IndexedDB database.
   * @type {IDBDatabase}
   * @private
   */
  this.db_ = null;

  /**
   * Whether the database version has changed. If the version changes, further
   * reads or writes to the database will be disallowed.
   * @type {boolean}
   * @private
   */
  this.versionChanged_ = false;
};
goog.inherits(office.localstore.idb.DocsDatabase, goog.events.EventTarget);


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.DocsDatabase.prototype.logger_ =
    goog.log.getLogger('office.localstore.idb.DocsDatabase');


/**
 * The browser's IndexedDB factory.
 * @type {IDBFactory}
 * @private
 */
office.localstore.idb.DocsDatabase.IDB_FACTORY_ = goog.global.indexedDB ||
    goog.global.webkitIndexedDB;


/**
 * @return {function(!office.localstore.LocalStoreError)} The default callback
 *     for handling errors.
 */
office.localstore.idb.DocsDatabase.prototype.getErrorCallback = function() {
  return this.errorCallback_;
};


/**
 * Handles a version change event by closing the active database connection. Any
 * users of this connection should listen on the VERSION_CHANGE event to stop
 * interacting with the database.
 * @param {!webkitIDBVersionChangeEvent} e The version change event.
 * @private
 */
office.localstore.idb.DocsDatabase.prototype.handleVersionChange_ = function(e) {
  this.versionChanged_ = true;
  goog.log.info(this.logger_, 'Closing idb connection due to version change.');

  this.close();

  var newVersion = Number(e.version) || e.newVersion || 0;
  this.dispatchEvent(new office.localstore.idb.VersionChangeEvent(newVersion));
};


/**
 * Sets that the version has when the database has been deleted.
 */
office.localstore.idb.DocsDatabase.prototype.setDatabaseDeleted = function() {
  this.versionChanged_ = true;
};


/**
 * @return {boolean} Whether the database version has changed.
 */
office.localstore.idb.DocsDatabase.prototype.hasVersionChanged = function() {
  return this.versionChanged_;
};


/**
 * @return {boolean} Whether the database is open.
 */
office.localstore.idb.DocsDatabase.prototype.isOpen = function() {
  return !!this.db_;
};


/**
 * Closes the database connection and removes the reference to it.
 */
office.localstore.idb.DocsDatabase.prototype.close = function() {
  if (!this.isOpen()) {
    return;
  }

  this.db_.onversionchange = null;
  this.db_.close();
  this.db_ = null;
};


/**
 * Initializes this wrapper by setting a database to manage and attaching event
 * listeners to it. If a database is already being managed an exception is
 * thrown.
 * @param {!IDBDatabase} db
 */
office.localstore.idb.DocsDatabase.prototype.initialize = function(db) {
  goog.log.info(this.logger_, 'Initializing docs database.');

  if (this.isOpen()) {
    throw Error('IdbDocsDatabase already managing a database.');
  }
  if (goog.isDefAndNotNull(db.onversionchange)) {
    // Use the version change event as a proxy to see if this database is being
    // managed by a different class.
    throw Error('This database is being managed by another class.');
  }

  db.onclose = goog.bind(function(e) {
    // The database connection was closed for a reason other than a close()
    // call from script or GC reclaiming the connection object. This includes
    // manual deletion of the database, forced closing by IndexedDB to recover
    // from errors, and closing from chrome:indexeddb-internals.
    var context = {};
    context['optinBackup'] = office.offline.optin.hasOptInSecretInWebStorage();
    this.errorReporter_.info(
        Error('The database connection was closed.'), context);
    this.dispatchEvent(
        office.localstore.LocalStoreEventType.DATABASE_CLOSED);
    //  Treat this as a fatal error once we can ensure that
    // reloading actually fixes the problem. See http://b/11808049.
  }, this);
  db.onerror = office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback(
      'Database error.', this.errorCallback_);
  db.onversionchange = goog.bind(this.handleVersionChange_, this);

  this.db_ = db;
};


/**
 * Returns the version of the database.
 * @return {number} The database version or -1 if there is no version assigned
 *     or data base has not been set yet.
 */
office.localstore.idb.DocsDatabase.prototype.getVersion = function() {
  if (!this.db_) {
    return -1;
  }
  var dbVersion = parseInt(this.db_.version, 10);
  // Version numbers should be positive integers.
  // Note that (NaN >= 0) === false.
  return dbVersion >= 0 ? dbVersion : -1;
};


/**
 * @return {DOMStringList} The list of object stores in this database.
 */
office.localstore.idb.DocsDatabase.prototype.getObjectStoreNames = function() {
  return this.db_.objectStoreNames;
};


/**
 * @return {string} The name of the database.
 */
office.localstore.idb.DocsDatabase.prototype.getDatabaseName = function() {
  return this.db_.name;
};


/**
 * Opens a transaction for the given stores names.
 * @param {!Array.<string>} storeNames The store names to open.
 * @param {string} errorMessage The string to log with IndexedDB errors.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback The
 *     error callback. If unspecified, the default error callback is used.
 * @param {boolean=} opt_allowWrite Whether the transaction should allow writing
 *     to the database.
 * @param {number=} opt_timeoutMs The time in ms to allow for a transaction to
 *     run before logging an error and calling {@code opt_timeoutCallback} if
 *     specified. A default value will be used if this parameter is unspecified.
 * @param {function()=} opt_timeoutCallback The function to call when the
 *     transaction times out. If specified, the transaction will abort when it
 *     times out, and only {@code opt_timeoutCallback} will be called. If
 *     unspecified, only an error is logged when the transaction times out, but
 *     the transaction is not aborted.
 * @param {?string=} opt_csiConstant The CSI constant to use for reporting the
 *     transaction timing, or null to disable reporting for the transaction. If
 *     unspecified, a default constant based on {@code opt_allowWrite} is used.
 * @return {!office.localstore.idb.Transaction} The IndexedDB transaction wrapper.
 */
office.localstore.idb.DocsDatabase.prototype.openTransaction = function(
    storeNames, errorMessage, opt_errorCallback, opt_allowWrite, opt_timeoutMs,
    opt_timeoutCallback, opt_csiConstant) {
  if (!this.db_) {
    throw Error('Cannot open transaction on uninitialized IdbDocsDatabase');
  }
  var transaction = new office.localstore.idb.Transaction(this.db_, storeNames,
      errorMessage, this.errorReporter_,
      opt_errorCallback || this.errorCallback_, opt_allowWrite, opt_timeoutMs,
      opt_timeoutCallback, opt_csiConstant);
  transaction.open();
  return transaction;
};


//  Ensure that the error callback is only called once.
/**
 * Sets the version of the database.
 * @param {number} newVersion The database version or 0 to clear the version.
 * @param {function(!IDBTransaction)} upgradeCallback The function to call upon
 *     successfully setting the version. This function can create object stores
 *     and do other database modifications.
 * @param {function(!Event)} errorCallback The function to call if there is an
 *     error during version-setting. Might be called multiple times.
 * @param {function(!Event)} successCallback The function to call once the
 *     upgrade process has fully finished.
 * @throws {Error} If the database has not yet been opened.
 */
office.localstore.idb.DocsDatabase.prototype.setVersion = function(newVersion,
    upgradeCallback, errorCallback, successCallback) {
  goog.log.info(this.logger_, 'Setting new IDB version');

  if (this.getVersion() >= newVersion) {
    throw Error('Upgrading to a version (' + newVersion + ') less than or ' +
        'equal to current version (' + this.getVersion() + ')');
  }

  var databaseName = this.getDatabaseName();
  this.close();

  var errorReporter = this.errorReporter_;
  var openRequest = new office.localstore.idb.OpenDbRequest(
      office.localstore.idb.DocsDatabase.IDB_FACTORY_.open(
          databaseName, newVersion),
      errorReporter,
      '' /* debugString */);
  //  Make selfObj an optional argument to
  // protectFunction.
  openRequest.setUpgradeNeededCallback(function(e) {
    var transaction = /** @type {!IDBTransaction} */ (e.target.transaction);
    transaction.onabort = transaction.onerror = errorReporter.protectFunction(
        errorCallback, {} /* selfObj */, true /* opt_rethrow */);
    upgradeCallback(transaction);
  });
  openRequest.setErrorCallback(errorCallback);
  openRequest.setBlockedCallback(function(e) {
    errorReporter.info(
        Error('Onblocked handler called when upgrading database.'),
        goog.object.create(
            'Old version', e.oldVersion, 'New version', e.newVersion));
  });
  openRequest.setSuccessCallback(goog.bind(function(e) {
    goog.log.info(
        this.logger_, 'Idb version successfully set to ' + newVersion);
    this.initialize(/** @type {!IDBDatabase} */ (e.target.result));
    successCallback(e);
  }, this));
};


/** @override */
office.localstore.idb.DocsDatabase.prototype.disposeInternal = function() {
  this.close();

  goog.base(this, 'disposeInternal');
};
