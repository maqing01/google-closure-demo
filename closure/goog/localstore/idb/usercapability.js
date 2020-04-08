goog.provide('office.localstore.idb.UserCapability');

goog.require('office.localstore.Operation');
goog.require('office.localstore.User');
goog.require('office.localstore.UserCapability');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.log');



/**
 * Concrete implementation of the user capability using an IndexedDB database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @constructor
 * @struct
 * @extends {office.localstore.UserCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.UserCapability = function(
    db, idbUtil, storageObjectReaderWriter, errorReporter) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;

  /**
   * The indexedDB util.
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;

  /**
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;
};
goog.inherits(office.localstore.idb.UserCapability,
    office.localstore.UserCapability);


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.UserCapability.prototype.logger_ =
    goog.log.getLogger('office.localstore.idb.UserCapability');


/** @override */
office.localstore.idb.UserCapability.prototype.readUsers = function(
    resultCallback, opt_errorCallback) {
  if (this.db_.hasVersionChanged()) {
    // Since this is used during startup, make sure the callback is called
    // asynchronously.
    goog.Timer.callOnce(goog.partial(resultCallback, [] /* users */));
    return;
  }

  if (!goog.array.contains(this.db_.getObjectStoreNames(),
      office.localstore.idb.StoreName.USERS)) {
    // Handles gracefully the case in which the local store isn't there due
    // to a Chrome bug, a messed up database, or any other reason.
    this.errorReporter_.log(
        Error('Reading from uninitialized IDB database.'));
    goog.Timer.callOnce(goog.partial(resultCallback, [] /* users */));
    return;
  }

  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.USERS], '.',
      opt_errorCallback);

  var users = [];
  transaction.
      getObjectStore(office.localstore.idb.StoreName.USERS).
      get(this.idbUtil_.createUnboundedKeyRange()).
      setSuccessCallback(goog.bind(function(e) {
        var obj = e.target.result;
        if (obj) {
          users = [this.createUserFromStore_(obj)];
        }
      }, this));

  // Wait for the transaction to complete instead of just for the request to
  // succeed. IndexedDB can still abort the transaction after the requests
  // succeeds (e.g. when the database is corrupt or over quota), and we don't
  // want to call both the result callback and the error callback.
  transaction.setCompletionCallback(function() {
    resultCallback(users);
  });
};


/**
 * Creates a user from an object in the user store.
 * @param {!Object} obj The object from the user store.
 * @return {!office.localstore.User} The new user object.
 * @private
 */
office.localstore.idb.UserCapability.prototype.createUserFromStore_ = function(
    obj) {
  var user = new office.localstore.User(
      obj[office.localstore.User.Property.ID], false /* isNew */);
  user.setManagingDomain(obj[office.localstore.User.Property.MANAGING_DOMAIN]);
  user.setEmailAddress(obj[office.localstore.User.Property.EMAIL_ADDRESS]);
  user.setLocale(obj[office.localstore.User.Property.LOCALE]);
  user.setOptInSecret(obj[office.localstore.User.Property.OPT_IN_SECRET]);

  // Perform null checks on fast track and internal properties, which may not
  // have been written by old storage adapters.
  if (goog.isDefAndNotNull(obj[office.localstore.User.Property_v4.FAST_TRACK])) {
    user.setFastTrack(!!obj[office.localstore.User.Property_v4.FAST_TRACK]);
  }
  if (goog.isDefAndNotNull(obj[office.localstore.User.Property_v4.INTERNAL])) {
    user.setInternal(!!obj[office.localstore.User.Property_v4.INTERNAL]);
  }

  if (goog.isDefAndNotNull(obj[office.localstore.User.Property.OPT_IN_REASONS])) {
    user.setOptInReasons(obj[office.localstore.User.Property.OPT_IN_REASONS]);
  }

  user.markAsInitialized();
  return user;
};


/** @override */
office.localstore.idb.UserCapability.prototype.getObjectStoreNamesForOperation =
    function(operation) {
  if (!this.isOperationSupported(operation)) {
    throw Error('Cannot get object store names for operation type ' +
        operation.getType());
  }

  return [office.localstore.idb.StoreName.USERS];
};


/** @override */
office.localstore.idb.UserCapability.prototype.performOperation = function(
    operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var recordOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      this.writeUser_(recordOperation,
          transaction.getObjectStore(office.localstore.idb.StoreName.USERS));
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Writes/updates or deletes a new user row to the database.
 * @param {!office.localstore.UpdateRecordOperation} operation The user to write.
 * @param {!office.localstore.idb.ObjectStore} userStore The user object store.
 * @private
 */
office.localstore.idb.UserCapability.prototype.writeUser_ = function(
    operation, userStore) {
  if (operation.isNew()) {
    goog.log.info(this.logger_, 'Writing new user record');
    userStore.add(operation.getModifications());
  } else {
    goog.log.info(this.logger_, 'Updating user record');
    this.storageObjectReaderWriter_.saveModifications(
        operation.getKey(), operation.getModifications(), userStore);
  }
};
