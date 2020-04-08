goog.provide('office.localstore.idb.StorageAdapter');

goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.LocalStoreEventType');
goog.require('office.localstore.Operation');
goog.require('office.localstore.SchemaVersionChangeEvent');
goog.require('office.localstore.StorageAdapter');
goog.require('office.localstore.idb.DatabaseDeletionCapability');
goog.require('office.localstore.idb.DatabaseUtil');
goog.require('office.localstore.idb.DocumentCapability');
goog.require('office.localstore.idb.DocumentLockCapability');
goog.require('office.localstore.idb.PendingQueueCapability');
goog.require('office.localstore.idb.StorageObjectReaderWriter');
goog.require('office.localstore.idb.UserCapability');
goog.require('office.localstore.idb.VersionChangeEvent');
goog.require('goog.Timer');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.object');



/**
 * Abstract base class for schema adapters which use the local IndexedDB
 * database. For convenience, contains a few very broad assumptions about the
 * schema of the database. If these are rendered inaccurate, the methods in
 * question can be overridden entirely.
 *
 * This class is structured to allow easy overriding of part of all of the
 * processing of an operation. Read methods are typically structured as follows:
 * There will be a readXXX method, which is on the StorageAdapter interface and
 * can be used to override the entire operation.  The implementation will create
 * an IndexedDB transaction and open a cursor, assuming the structure of the
 * key. Each object retrieved by the cursor will be passed into
 * createXXXFromStore method which should be overriden by versioned subclasses
 * to actually generate {@code office.localstore.Record}s.
 *
 * @param {!office.localstore.idb.DocsDatabase} db The database object.
 * @param {!Object.<string, !office.localstore.DocumentAdapter>} documentAdapters
 * @param {string} lockSessionId The session id to hold locks for the current
 *     session.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. Another process will be
 *     allowed to grab the lock for the document if this duration elapses since
 *     the application last refreshed the lock. The LocalStore will
 *     automatically refresh the lock before this duration elapses as long as
 *     the lock has not been released. A value of 0 indicates no auto-refresh.
 * @param {!office.debug.ErrorReporterApi} errorReporter An error reporter.
 * @constructor
 * @struct
 * @extends {office.localstore.StorageAdapter}
 */
office.localstore.idb.StorageAdapter = function(
    db, documentAdapters, lockSessionId, lockDuration, errorReporter) {
  goog.base(this);

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /**
   * @private {!goog.events.EventHandler.<
   *     !office.localstore.idb.StorageAdapter>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /** @private {!office.localstore.idb.DatabaseUtil} */
  this.idbUtil_ = new office.localstore.idb.DatabaseUtil();

  /**
   * The object used for reading and writing LocalStore data to IndexedDB.
   * @private {!office.localstore.idb.StorageObjectReaderWriter}
   */
  this.storageObjectReaderWriter_ =
      new office.localstore.idb.StorageObjectReaderWriter(this.idbUtil_);

  /** @private {!office.localstore.idb.DocsDatabase} */
  this.db_ = db;
  this.eventHandler_.listen(
      this.db_,
      office.localstore.idb.VersionChangeEvent.EVENT_TYPE,
      this.handleVersionChange_);
  this.eventHandler_.listen(
      this.db_,
      office.localstore.LocalStoreEventType.DATABASE_CLOSED,
      this.handleDatabaseClosed_);

  /** @private {!Object.<string, !office.localstore.DocumentAdapter>} */
  this.documentAdapters_ = documentAdapters;

  /** @private {!office.localstore.PendingQueueCapability} */
  this.pendingQueueCapability_ = new office.localstore.idb.PendingQueueCapability(
      this.db_, this.idbUtil_, this.documentAdapters_, this.errorReporter_);
  this.registerCapability(this.pendingQueueCapability_);

  /** @private {!office.localstore.DocumentCapability} */
  this.documentCapability_ = this.createDocumentCapability(
      this.documentAdapters_);
  this.registerCapability(this.documentCapability_);

  /** @private {!office.localstore.DocumentLockCapability} */
  this.documentLockCapability_ = new office.localstore.idb.DocumentLockCapability(
      this.db_, lockSessionId, lockDuration, this.errorReporter_);

  /** @private {!office.localstore.UserCapability} */
  this.userCapability_ = new office.localstore.idb.UserCapability(
      db, this.idbUtil_, this.storageObjectReaderWriter_, errorReporter);
  this.registerCapability(this.userCapability_);

  /** @private {!office.localstore.DatabaseDeletionCapability} */
  this.databaseDeletionCapability_ =
      new office.localstore.idb.DatabaseDeletionCapability(db);
};
goog.inherits(office.localstore.idb.StorageAdapter,
    office.localstore.StorageAdapter);


/** @protected {goog.log.Logger} */
office.localstore.idb.StorageAdapter.prototype.logger =
    goog.log.getLogger('office.localstore.idb.StorageAdapter');


/** @override */
office.localstore.idb.StorageAdapter.prototype.getPendingQueueCapability =
    function() {
  return this.pendingQueueCapability_;
};


/** @override */
office.localstore.idb.StorageAdapter.prototype.getUserCapability =
    function() {
  return this.userCapability_;
};


/** @override */
office.localstore.idb.StorageAdapter.prototype.getDocumentCapability =
    function() {
  return this.documentCapability_;
};


/** @override */
office.localstore.idb.StorageAdapter.prototype.getDocumentLockCapability =
    function() {
  return this.documentLockCapability_;
};


/** @override */
office.localstore.idb.StorageAdapter.prototype.getDatabaseDeletionCapability =
    function() {
  return this.databaseDeletionCapability_;
};


/**
 * @param {!Object.<!office.localstore.DocumentAdapter>} documentAdapters Map from
 *     document type to document adapter.
 * @return {!office.localstore.DocumentCapability}
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.createDocumentCapability =
    function(documentAdapters) {
  return new office.localstore.idb.DocumentCapability(this.db_, this.idbUtil_,
      this.storageObjectReaderWriter_, documentAdapters);
};


/**
 * Handles a version change event on the cached database connection.
 * @param {office.localstore.idb.VersionChangeEvent} e The event.
 * @private
 */
office.localstore.idb.StorageAdapter.prototype.handleVersionChange_ =
    function(e) {
  this.dispatchEvent(
      new office.localstore.SchemaVersionChangeEvent(e.newVersion));
};


/**
 * Forwards a database close event from the docs database to the storage
 * adapter.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.localstore.idb.StorageAdapter.prototype.handleDatabaseClosed_ =
    function(e) {
  this.dispatchEvent(e);
};


/** @override */
office.localstore.idb.StorageAdapter.prototype.performOperations = function(
    operations, completionCallback, opt_errorCallback) {
  goog.log.fine(this.logger, 'write()');

  if (this.db_.hasVersionChanged()) {
    goog.log.info(this.logger, 'Write abandoned due to a db version change.');
    goog.Timer.callOnce(completionCallback);
    return;
  }

  // Determine what object stores are affected.
  var storeNameSet = {};
  for (var i = 0; i < operations.length; i++) {
    var operation = operations[i];
    var capability = this.getCapabilityForOperation_(operation);
    var recordStoreNames =
        capability.getObjectStoreNamesForOperation(operation);
    for (var j = 0; j < recordStoreNames.length; j++) {
      storeNameSet[recordStoreNames[j]] = true;
    }
  }
  var storeNames = goog.object.getKeys(storeNameSet);
  var transaction = this.db_.openTransaction(storeNames,
      '.', opt_errorCallback, true /* opt_allowWrite */);
  transaction.setCompletionCallback(completionCallback);

  for (i = 0; i < operations.length; i++) {
    var operation = operations[i];
    var capability = this.getCapabilityForOperation_(operation);
    //  Ensure that all capabilities use the passed in error
    // callback and not the database's default error callback.
    capability.performOperation(operation, transaction);
  }
};


/**
 * Given an operation, finds the storage capability that knows how to write that
 * operation.
 * @param {!office.localstore.Operation} operation
 * @return {!office.localstore.idb.IdbStorageCapability} The capability.
 * @private
 */
office.localstore.idb.StorageAdapter.prototype.getCapabilityForOperation_ =
    function(operation) {
  if (office.localstore.Operation.isRecordOperation(operation)) {
    var recordOperation =
        /** @type {!office.localstore.RecordOperation} */ (
            operation);
    var recordType = recordOperation.getRecordType();
    var capability = this.getCapabilityForRecordType(recordType);
    if (!capability) {
      throw Error('No capability registered for record type ' + recordType);
    }
    return /** @type {!office.localstore.idb.IdbStorageCapability} */ (
        capability);
  }

  var operationType = operation.getType();

  if (operationType == office.localstore.Operation.Type.PENDING_QUEUE_CLEAR ||
      operationType ==
          office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT ||
      operationType ==
          office.localstore.Operation.Type.PENDING_QUEUE_CLEAR_SENT_BUNDLE ||
      operationType ==
          office.localstore.Operation.Type.PENDING_QUEUE_DELETE_COMMANDS ||
      operationType ==
          office.localstore.Operation.Type.PENDING_QUEUE_MARK_SENT_BUNDLE ||
      operationType ==
          office.localstore.Operation.Type.PENDING_QUEUE_WRITE_COMMANDS) {
    return /** @type {!office.localstore.idb.PendingQueueCapability} */ (
        this.getPendingQueueCapability());

  } else if (operationType == office.localstore.Operation.Type.DOCUMENT_LOCK) {
    return /** @type {!office.localstore.idb.IdbStorageCapability} */ (
        this.getDocumentLockCapability());

  } else if (operationType == office.localstore.Operation.Type.APPEND_COMMANDS ||
      operationType == office.localstore.Operation.Type.UNSTAGE_COMMANDS ||
      operationType == office.localstore.Operation.Type.WRITE_TRIX_DOC) {
    return /** @type {!office.localstore.idb.IdbStorageCapability} */ (
        this.getDocumentCapability());
  } else if (operationType ==
      office.localstore.Operation.Type.UPDATE_APPLICATION_METADATA) {
    var capability = this.getDocumentCreationCapability();
    if (capability) {
      return /** @type {!office.localstore.idb.IdbStorageCapability} */ (
          capability);
    }
  }
  throw Error('No capability registered for operation type ' + operationType);
};


/**
 * Package private. Delete any existing database and create a new one matching
 * this adapter's schema version.
 * @param {function()} completionCallback A function to call asynchronously
 *     once the initialization is complete.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 */
office.localstore.idb.StorageAdapter.prototype.initialize = function(
    completionCallback, errorCallback) {
  var newVersion = this.getSchemaVersion();
  var dbVersion = this.db_.getVersion();
  if (dbVersion >= newVersion) {
    throw Error('Database already at expected version.');
  }

  this.db_.setVersion(newVersion,
      goog.bind(this.handleSetVersionSuccess_, this, errorCallback),
      office.localstore.idb.DatabaseUtil.createDatabaseErrorCallback(
          '.', errorCallback),
      completionCallback);
};


/**
 * @return {!Array.<string>} A sorted array of the object store names the idb
 *     is expected to contain after initialization.
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.getObjectStoreNames =
    goog.abstractMethod;


/**
 * Actually perform the initialization operation, to be implemented by a
 * subclass.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the initialization.
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.doInitialize = goog.abstractMethod;


/**
 * @return {!office.localstore.idb.DocsDatabase}
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.getDb = function() {
  return this.db_;
};


/**
 * Gets the IDB utility instance.
 * @return {!office.localstore.idb.DatabaseUtil} The IDB utility instance.
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.getIdbUtil = function() {
  return this.idbUtil_;
};


/**
 * @return {!office.localstore.idb.StorageObjectReaderWriter}
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.getStorageObjectReaderWriter =
    function() {
  return this.storageObjectReaderWriter_;
};


/**
 * Handler for database upgrades where the given transactions was the one used
 * to perform the upgrade.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback Callback
 *     for handling errors.
 * @param {!IDBTransaction} transaction The transaction to use to perform
 *     the upgrade.
 * @private
 */
office.localstore.idb.StorageAdapter.prototype.handleSetVersionSuccess_ =
    function(errorCallback, transaction) {
  goog.log.fine(this.logger, 'Received setVersion success callback.');

  try {
    this.doInitialize(transaction);
  } catch (ex) {
    console.log(ex);
    goog.Timer.callOnce(goog.partial(errorCallback,
        new office.localstore.LocalStoreError(
            office.localstore.LocalStoreError.Type.DATABASE_ERROR,
            '.',
            ex
        )));
  }
};


/**
 * @return {!office.debug.ErrorReporterApi} The error reporter.
 * @protected
 */
office.localstore.idb.StorageAdapter.prototype.getErrorReporter = function() {
  return this.errorReporter_;
};


/**
 * @return {number} The schema version this adapter adapts for.
 */
office.localstore.idb.StorageAdapter.prototype.getSchemaVersion =
    goog.abstractMethod;


/**
 * @return {boolean} Whether this adapter is capable of upgrading the schema
 *     from the previous schema version to this one.
 */
office.localstore.idb.StorageAdapter.prototype.canUpgrade = goog.abstractMethod;


/**
 * Package private.  Upgrade a schema of the previous version to one of this
 * version.
 * @param {function()} completionCallback A function to call asynchronously once
 *     the upgrade is complete.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 */
office.localstore.idb.StorageAdapter.prototype.upgrade = goog.abstractMethod;


/** @override */
office.localstore.idb.StorageAdapter.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.eventHandler_,
      this.documentLockCapability_,
      this.pendingQueueCapability_,
      this.documentCapability_,
      this.userCapability_,
      this.databaseDeletionCapability_
  );
  goog.base(this, 'disposeInternal');
};
