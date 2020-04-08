goog.provide('office.localstore.idb.IdbLocalStoreFactory');

goog.require('office.flag');
goog.require('office.localstore.Flags');
goog.require('office.localstore.LocalStore');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.LocalStoreFactory');
goog.require('office.localstore.LocalStoreFactoryResult');
goog.require('office.localstore.idb.DocsDatabaseFactory');
goog.require('office.localstore.idb.IdbLocalStoreFactoryEventType');
//goog.require('office.localstore.idb.version.V1StorageAdapter');
goog.require('office.localstore.idb.V4StorageAdapter');
goog.require('office.localstore.idb.V5StorageAdapter');
goog.require('office.localstore.idb.V6StorageAdapter');
goog.require('office.offline.optin');
goog.require('office.util.BrowserFeatures');
goog.require('docsshared.browser.BrowserFeatures');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.events.EventTarget');
goog.require('goog.functions');
goog.require('goog.log');
goog.require('goog.userAgent.product');
goog.require('goog.userAgent.product.isVersion');



/**
 * This class is used to initialize an application's use of LocalStore, and as a
 * factory for the LocalStore object, which is their 'home' object from then on.
 * This has a small amount of implementation specific stuff baked into it, but
 * nearly all is elsewhere. It really only has enough to detect what schema
 * version is currently in place. Disposing this object disposes all the
 * registered storage and document adapters, as well as the local store object.
 *
 * This class also performs schema updates and selects the schema adapter. Its
 * behavior is as follows. When initialized, it will compare the database's
 * current schema version with the target schema version. If it is possible to
 * upgrade to that version using the registered schema adapters, that will be
 * done. Then, the database's (possibly upgraded) schema version will be
 * compared with those of the registered schema and document adapters. A single
 * matching schema adapter will be chosen, and a single document adapter for
 * each document type. These will then be used for the remainder of the session.
 *
 * The release process imagined for schema changes is that a new schema adapter
 * would be written and developed over a period of time without being made the
 * target version. Then, once it was finished, it would be declared frozen and
 * released as part of all clients, without the target version changing.
 * Finally, once the new schema adapter was omnipresent, pushes would start
 * updating the target version, start with 'scary canary' jobsets and moving
 * forward as usual. The frozen version of the schema adapter, as well as all
 * code which uses it, would need to be finished and released all the way to
 * production before the target version could change, as the upgraded database
 * would trigger the use of the new schema adapter in all binaries, even those
 * without the upgraded target version. Because this process is time consuming
 * and cumbersome, schema upgrades should be infrequent and include as much new
 * schema as possible.
 *
 * Note: This class can only create one instance of LocalStore.
 *
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter. This
 *     will be used to throw synchronously any error while creating the
 *     LocalStore.
 * @param {string} lockSessionId The session id to be used by the LocalStore to
 *     hold locks for the current session.
 * @param {number} lockDuration The amount of time in milliseconds for which a
 *     lock acquired by the current session is valid. Another process will be
 *     allowed to grab the lock for the document if this duration elapses since
 *     the application last refreshed the lock. The LocalStore will
 *     automatically refresh the lock before this duration elapses as long as
 *     the lock has not been released. A value of 0 indicates no auto-refresh.
 * @param {?function(!office.localstore.idb.DocsDatabase):
 *     !Array.<!office.localstore.DocumentAdapter>} documentAdapterFactoryFn The
 *     document adapter factory function. This function takes in a Docs
 *     IndexedDB instance and returns an array of document adapters. If null, no
 *     document adapter will be registered.
 * @param {boolean} shouldCheckUserOptIn Whether to check if the user is opted
 *     in.
 * @param {number} targetSchemaVersion The target schema version for LocalStore.
 * @param {boolean} shouldTryToUpgradeSchema Whether a schema upgrade should
 *     ever be attempted. Typically when cold-started this should be set to
 *     false.
 * @param {boolean=} opt_errorOnDbOpenTimeout Whether database open timeouts
 *     should be treated as initial load errors.
 * @param {office.localstore.idb.DocsDatabase=} opt_indexedDb The IDB docs
 *     database for testing. If not provided explicitly,
       office.localstore.idb.DocsDatabaseFactory will be used to open the database
 *     when calling create().
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 * @implements {office.localstore.LocalStoreFactory}
 */
office.localstore.idb.IdbLocalStoreFactory = function(errorReporter,
    lockSessionId, lockDuration, documentAdapterFactoryFn, shouldCheckUserOptIn,
    targetSchemaVersion, shouldTryToUpgradeSchema, opt_errorOnDbOpenTimeout,
    opt_indexedDb) {
  goog.base(this);

  /**
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * The browser features, used for Chrome-related checks.
   * @type {!office.util.BrowserFeatures}
   * @private
   */
  this.browserFeatures_ = new office.util.BrowserFeatures(this.errorReporter_);

  /**
   * @type {string}
   * @private
   */
  this.lockSessionId_ = lockSessionId;

  /**
   * The lock duration in milliseconds.
   * @type {number}
   * @private
   */
  this.lockDuration_ = lockDuration;

  /**
   * The document adapter factory function.
   * @type {?function(!office.localstore.idb.DocsDatabase):
   *     !Array.<!office.localstore.DocumentAdapter>}
   * @private
   */
  this.documentAdapterFactoryFn_ = documentAdapterFactoryFn;

  /**
   * Whether to check if the user has opted in.
   * @type {boolean}
   * @private
   */
  this.shouldCheckUserOptIn_ = shouldCheckUserOptIn;

  /**
   * The target schema version for LocalStore.
   * @type {number}
   * @private
   */
  this.targetSchemaVersion_ = targetSchemaVersion;

  /**
   * Whether should try to upgrade the schema.
   * @type {boolean}
   * @private
   */
  this.shouldTryToUpgradeSchema_ = shouldTryToUpgradeSchema;

  /** @private {boolean} */
  this.errorOnDbOpenTimeout_ = !!opt_errorOnDbOpenTimeout;

  /**
   * The IndexedDB Docs database.
   * @type {office.localstore.idb.DocsDatabase}
   * @private
   */
  this.indexedDb_ = opt_indexedDb || null;

  /**
   * A map of schema version numbers to storage adapters.
   * @type {!Object.<!office.localstore.idb.StorageAdapter>}
   * @private
   */
  this.storageAdapters_ = {};

  /**
   * A map of schema version numbers to maps of document types to document
   * adapters.
   * @type {!Object.<!Object.<!office.localstore.DocumentAdapter>>}
   * @private
   */
  this.documentAdapters_ = {};

  /**
   * The maximum version for which there is a registered storage adapter.
   * @type {number}
   * @private
   */
  this.maxSchemaVersion_ = -1;

  /**
   * @type {goog.log.Logger}
   * @private
   */
  this.logger_ =
      goog.log.getLogger('office.localstore.idb.IdbLocalStoreFactory');

  /**
   * The deferred result.
   * @type {!goog.async.Deferred}
   * @private
   */
  this.deferredResult_ = new goog.async.Deferred();

  /**
   * Indication whether the create method was called.
   * @type {boolean}
   * @private
   */
  this.createCalled_ = false;
};
goog.inherits(
    office.localstore.idb.IdbLocalStoreFactory, goog.events.EventTarget);


/**
 * The minimum schema version that uses IndexedDB.
 * @type {number}
 */
office.localstore.idb.IdbLocalStoreFactory.MIN_IDB_VERSION = 3;


/**
 * Registers a document adapter, telling the system how to read and persist a
 * particular document type, eg Vodka documents.  Aim is to keep code size under
 * control by not loading the storage code for all of them.  Documents of a type
 * which lacks a registered adapter can still be read and handled, but any
 * details specific to that type cannot, and no writes are allowed.
 * @param {!office.localstore.DocumentAdapter} documentAdapter The document
 *     adapter to register.
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.registerDocumentAdapter_ =
    function(documentAdapter) {
  var idbDocumentAdapter =
      /**@type {!office.localstore.idb.DocumentAdapter} */ (documentAdapter);
  var minSchemaVersion = idbDocumentAdapter.getMinSchemaVersion();
  var maxSchemaVersion = idbDocumentAdapter.getMaxSchemaVersion();
  var documentType = documentAdapter.getDocumentType();
  for (var version = minSchemaVersion; version <= maxSchemaVersion; ++version) {
    var versionMap = this.documentAdapters_[version];
    if (!versionMap) {
      versionMap = this.documentAdapters_[version] = {};
    }
    goog.asserts.assert(versionMap[documentType] == null,
        'Duplicate document adapter for document type %s at schema version %s.',
        documentType, version);
    versionMap[documentType] = documentAdapter;
  }

  goog.log.info(this.logger_, documentType + ' document adapter ' +
      'registered, v' + minSchemaVersion + ' - v' + maxSchemaVersion);
};


/**
 * Registers a storage adapter, which allows the system to read and write that
 * version of the schema, and possibly to upgrade from the previous version.
 * @param {!office.localstore.idb.StorageAdapter} storageAdapter The storage
 *     adapter to register.
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.registerStorageAdapter =
    function(storageAdapter) {
  var adapterVersion = storageAdapter.getSchemaVersion();
  this.maxSchemaVersion_ = Math.max(this.maxSchemaVersion_, adapterVersion);
  this.storageAdapters_[adapterVersion] = storageAdapter;
  goog.log.info(
      this.logger_, 'Storage adapter v' + adapterVersion + ' registered.');
};


/** @override */
office.localstore.idb.IdbLocalStoreFactory.prototype.isUserAuthorized = function(
    user) {
  //if (!office.offline.optin.isUserOptedIn(user)) {
  //  return false;
  //}

  //  Consider moving Chrome-related checks before any database
  // initialization or upgrade.
  // Check the Chrome Drive app is 'effective', that is, that it doesn't exhibit
  // a particular known issue where it is installed but not functional.
  //if (this.browserFeatures_.getChromeAppInstallState() ==
  //    docsshared.browser.BrowserFeatures.AppInstallState.NOT_EFFECTIVE) {
  //  return false;
  //}

  // Check that they have the Chrome Drive app installed; dispatch an event and
  // act opted-out otherwise.
  //if (!this.browserFeatures_.chromeAppHasPermission(
  //    docsshared.browser.BrowserFeatures.AppPermission.UNLIMITED_STORAGE,
  //    true)) {
  //  this.dispatchEvent(
  //      office.localstore.idb.IdbLocalStoreFactoryEventType.CHROME_APP_MISSING);
  //  this.errorReporter_.info(Error('User is opted in, but Chrome Drive app ' +
  //      'is disabled or not installed.'));
  //  return false;
  //}

  return true;
};


/** @override */
office.localstore.idb.IdbLocalStoreFactory.prototype.create = function(
    errorCallback, opt_reportOpenDatabaseTiming) {
  if (this.createCalled_) {
    throw Error('The create method can be called only once.');
  }
  this.createCalled_ = true;
  if (isNaN(this.targetSchemaVersion_)) {
    // Because of the Math.min call and because Math.min(NaN, number) == number,
    // we want to ensure that we're not automatically upgrading to the max
    // schema version. See b/8122698 for more background.
    throw Error('Cannot have the target schema version be NaN.');
  }
  if (!this.indexedDb_) {
    //if (!goog.userAgent.product.CHROME ||
    //    !goog.userAgent.product.isVersion(office.flag.getInstance().getNumber(
    //        office.localstore.Flags.CHROME_VERSION_WITH_IDB_SUPPORT))) {

    if (!office.localstore.Flags.getEnableIndexedDb()) {
      throw Error('Cannot create storage adapters for unsupported browser');
    }

    office.localstore.idb.DocsDatabaseFactory.openDatabase(
        goog.bind(this.registerStorageAndDocumentAdapters_, this),
        errorCallback, this.errorReporter_,
        goog.bind(this.handleDatabaseOpenFailure_, this),
        this.errorOnDbOpenTimeout_, opt_reportOpenDatabaseTiming);
  } else {
    this.registerStorageAndDocumentAdapters_(this.indexedDb_);
  }

  return this.deferredResult_;
};


/** @override */
office.localstore.idb.IdbLocalStoreFactory.prototype.supportsFileStorage =
    goog.functions.TRUE;


/**
 * Handles errors for attempt to open a Docs Indexed DB instance.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.handleDatabaseOpenFailure_ =
    function(localStoreError) {
  goog.log.info(this.logger_, 'Unable to open Docs IDB instance.');
  this.deferredResult_.errback(localStoreError);
  this.disposeOnError_();
};


/**
 * Registers required storage adapter versions. If no storage adapter has
 * already been registered, all storage adapters will be registered. Otherwise
 * no extra storage adapter will be registered. It also registers document
 * adapters using the document adapter factory function.
 * @param {!office.localstore.idb.DocsDatabase} docsDatabase The IDB Docs
 *     database.
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.
    registerStorageAndDocumentAdapters_ = function(docsDatabase) {
  this.indexedDb_ = docsDatabase;

  // Register any document adapters necessary.
  if (this.documentAdapterFactoryFn_) {
    var documentAdapters = this.documentAdapterFactoryFn_(docsDatabase);
    for (var i = 0; i < documentAdapters.length; i++) {
      this.registerDocumentAdapter_(documentAdapters[i]);
    }
  }

  if (this.maxSchemaVersion_ == -1) {
    // No storage adapters are registered. Auto-register all known storage
    // adapters now.
    //this.registerStorageAdapter(new office.localstore.idb.V4StorageAdapter(
    //    docsDatabase, this.documentAdapters_[4] || {}, this.lockSessionId_,
    //    this.lockDuration_, this.errorReporter_));
    //this.registerStorageAdapter(new office.localstore.idb.V5StorageAdapter(
    //    docsDatabase, this.documentAdapters_[5] || {}, this.lockSessionId_,
    //    this.lockDuration_, this.errorReporter_));
    // TODO(jcai): storage upgrade
    this.registerStorageAdapter(new office.localstore.idb.V6StorageAdapter(
        docsDatabase, this.documentAdapters_[1008 /* localStorageSchemaVersion */] || {}, this.lockSessionId_,
        this.lockDuration_, this.errorReporter_));
    // NOTE: Add the new case here as the new version of storage adapter is
    // available and update office.localstore.testing.StorageAdapterFactory.
  }

  if (this.shouldCheckUserOptIn_) {
    this.readUser_();
  } else {
    goog.log.info(this.logger_, 'Skipping local storage user presence check.');
    this.initialize_(null /* user */);
  }
};


/**
 * Checks whether at least one user exists in the database. If the user exists,
 * this continues with the initialization, otherwise the LocalStore creation is
 * abandoned.
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.readUser_ =
    function() {
  //var currentSchemaVersion = this.getDatabaseSchemaVersion();
  //var targetSchemaVersion =
  //    Math.min(this.targetSchemaVersion_, this.maxSchemaVersion_);
  //var adapter;
  //if (currentSchemaVersion >= targetSchemaVersion) {
  //  // If the version is at or beyond target, use the current version.
  //  adapter = this.storageAdapters_[currentSchemaVersion];
  //  if (adapter) {
  //    goog.log.info(this.logger_,
  //        'Checking for user presence using schema adapter ' +
  //        currentSchemaVersion);
  //    adapter.getUserCapability().readUsers(
  //        goog.bind(this.initializeIfUserExists_, this),
  //        goog.bind(this.handleUserCheckError_, this));
  //  } else {
  //    goog.log.warning(this.logger_,
  //        'readUser reporting no user because there was no schema adapter ' +
  //        'for the current version, ' +
  //        currentSchemaVersion);
  //    this.initializeIfUserExists_([] /* users */);
  //  }
  //} else if (
  //    this.checkCanDoUpgrade_(currentSchemaVersion, targetSchemaVersion)) {
  //  // Check with the adapter for current version if it exists, otherwise query
  //  // the adapter that will handle the upgrade.
  //  adapter = this.storageAdapters_[currentSchemaVersion] ||
  //      this.storageAdapters_[currentSchemaVersion + 1];
  //  goog.log.info(this.logger_,
  //      'Checking for user presence using schema adapter ' +
  //      adapter.getSchemaVersion());
  //  adapter.getUserCapability().readUsers(
  //      goog.bind(this.initializeIfUserExists_, this),
  //      goog.bind(this.handleUserCheckError_, this));
  //} else {
  //  // initialize() will be called on the adapter for targetSchemaVersion, so
  //  // presumably there's no usable data
  //  goog.log.warning(this.logger_, 'Target version is above current version ' +
  //      'and upgrade is not possible, so user presence check fails.');
  //  this.initializeIfUserExists_([] /* users */);
  //}
   var user = new office.localstore.User('1234');
   this.initializeIfUserExists_([user]);
};


/**
 * Handles the result of a call to readUser_(). Begins the LocalStore
 * loading sequence if a user is found. If a user is not found, logs a
 * missing user messages and closes the database connection, since the database
 * is not needed if there is no user present. For opt-in the database should
 * be re-opened elsewhere.
 * @param {!Array.<!office.localstore.User>} users
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.initializeIfUserExists_ =
    function(users) {
  if (users.length == 0) {
    // No users found implies that none are opted in.
    goog.log.info(this.logger_,
        'Found no user in the database, abandoning LocalStore creation.');
    if (this.indexedDb_) {
      this.indexedDb_.close();
    }
    this.deferredResult_.callback(
        new office.localstore.LocalStoreFactoryResult(
            null /* localStore */, null /* user */));
    return;
  }

  // We don't support multilogin, so we expect only one user.
  if (users.length > 1) {
    this.errorReporter_.info(Error('More than one user in local storage'));
    if (this.indexedDb_) {
      this.indexedDb_.close();
    }
    this.deferredResult_.callback(
        new office.localstore.LocalStoreFactoryResult(
            null /* localStore */, null /* user */));
    return;
  }

  goog.log.info(this.logger_, 'Local storage user presence check passed.');
  this.initialize_(users[0]);
};


/**
 * Handles errors when attempting to check if the database has a valid user.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.handleUserCheckError_ =
    function(localStoreError) {
  goog.log.info(
      this.logger_, 'Unable to verify a user exists in the Docs IDB database.');
  //  Remove the hasFired() check once b/8469143 is fixed and
  // update LocalStorageLoaderTest.
  if (!this.deferredResult_.hasFired()) {
    this.deferredResult_.errback(localStoreError);
    this.disposeOnError_();
  }
};


/**
 * Initializes the LocalStore. Performs any table creation and/or migration
 * needed to get the store ready for use when opt_preventSchemaUpdate is not
 * true.
 * @param {office.localstore.User} user The user read from local store, or null
 *     if the factory didn't try to read the user (this.shouldCheckUserOptIn_
 *     is false).
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.initialize_ =
    function(user) {
  var targetSchemaVersion =
      Math.min(this.targetSchemaVersion_, this.maxSchemaVersion_);
  var currentSchemaVersion = this.getDatabaseSchemaVersion();

  goog.log.info(this.logger_, 'Initialization started. Current version=' +
      currentSchemaVersion + ', target version =' + targetSchemaVersion +
      ', shouldTryToUpgradeSchema = ' + !!this.shouldTryToUpgradeSchema_);

  if (!this.shouldTryToUpgradeSchema_ && currentSchemaVersion <= 0) {
    this.deferredResult_.errback(
        new office.localstore.LocalStoreError(
            office.localstore.LocalStoreError.Type.SCHEMA_UPDATES_PROHIBITED,
            '' +
            '.'));
    this.disposeOnError_();
    return;
  }

  if (!this.shouldTryToUpgradeSchema_ ||
          currentSchemaVersion >= targetSchemaVersion) {
    // If we're already at the correct version, no update is needed.
    this.finishInitialization_(user);
  } else if (
      this.checkCanDoUpgrade_(currentSchemaVersion, targetSchemaVersion)) {
    // If an upgrade is possible, begin the procedure. Discard the user read
    // from local store, since after the upgrade the user record may have
    // changed.
    this.doUpgrade_(currentSchemaVersion + 1, targetSchemaVersion,
        goog.bind(this.finishInitialization_, this, null /* user */),
        goog.bind(this.handleUpgradeError_, this));
  } else {
    // If not, ask the schema adapter for the target version to initialize the
    // local storage.
    goog.log.info(this.logger_,
        'Upgrade not possible, initializing to version ' + targetSchemaVersion);
    this.storageAdapters_[targetSchemaVersion].initialize(
        goog.bind(this.finishInitialization_, this, user),
        goog.bind(this.handleAdapterInitializationError_, this));
  }
};


/**
 * Handles error when attempting to upgrade the database.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.handleUpgradeError_ =
    function(localStoreError) {
  goog.log.info(this.logger_, 'Unable to upgrade the Docs IDB database.');
  this.deferredResult_.errback(localStoreError);
  this.disposeOnError_();
};


/**
 * Handles errors when attempting to initialize a storage adapter.
 * @param {!office.localstore.LocalStoreError} localStoreError
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.
    handleAdapterInitializationError_ = function(localStoreError) {
  goog.log.info(this.logger_, 'Unable to initialize the storage adapter.');
  this.deferredResult_.errback(localStoreError);
  this.disposeOnError_();
};


/**
 * Checks whether the registered schema adapters can upgrade from one version to
 * another.
 * @param {number} startingSchemaVersion The version number that the upgrade
 *     would start from.
 * @param {number} targetSchemaVersion The version number that the upgrade would
 *     end at.
 * @return {boolean} Whether the registered schema adapters can upgrade from
 *    startingSchemaVersion to targetSchemaVersion.
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.checkCanDoUpgrade_ =
    function(startingSchemaVersion, targetSchemaVersion) {
  for (var version = startingSchemaVersion + 1; version <= targetSchemaVersion;
      ++version) {
    if (this.storageAdapters_[version] == null ||
        !this.storageAdapters_[version].canUpgrade()) {
      return false;
    }
  }
  return true;
};


/**
 * Upgrades the database to a schema version one higher than the current one,
 * and set in train a chain of calls which will ultimately upgrade the
 * database to the given target version.
 * @param {number} nextSchemaVersion The schema version to upgrade to next;
 *     expected to be one higher than the current one.
 * @param {number} targetSchemaVersion The ultimate target version of this
 *     upgrade procecure.
 * @param {function()} boundCompletionCallback A function to call once the
 *     upgrade procecure is complete.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.doUpgrade_ = function(
    nextSchemaVersion, targetSchemaVersion, boundCompletionCallback,
    errorCallback) {
  goog.log.info(
      this.logger_, 'Upgrading to schema version ' + nextSchemaVersion);
  this.storageAdapters_[nextSchemaVersion].upgrade(
      goog.bind(this.continueUpgrade_, this, nextSchemaVersion,
          targetSchemaVersion, boundCompletionCallback, errorCallback),
      errorCallback);
};


/**
 * Checks whether we have achieved a target schema version, and calls the
 * provided callback if so.  Otherwise, continues an upgrade procedure by
 * ordering an upgrade to the next version.
 * @param {number} expectedSchemaVersion The schema version a recently called
 *     upgrade routine was supposed to achieve - this method will check it
 *     was in fact acheived.
 * @param {number} targetSchemaVersion The ultimate target schema version of
 *     this upgrade procedure.
 * @param {function()} boundCompletionCallback A function to call once the
 *     upgrade procedure is complete.
 * @param {function(!office.localstore.LocalStoreError)} errorCallback
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.continueUpgrade_ = function(
    expectedSchemaVersion, targetSchemaVersion, boundCompletionCallback,
    errorCallback) {
  var currentSchemaVersion = this.getDatabaseSchemaVersion();
  goog.asserts.assert(expectedSchemaVersion == currentSchemaVersion,
      'Upgrader to schema version %s failed to achieve that version.',
      expectedSchemaVersion);
  if (currentSchemaVersion == targetSchemaVersion) {
    boundCompletionCallback();
  } else {
    this.doUpgrade_(currentSchemaVersion + 1, targetSchemaVersion,
        boundCompletionCallback, errorCallback);
  }
};


/**
 * Completes the initialization process by creating the LocalStore object and
 * calling the completion callback.
 * @param {office.localstore.User} user
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.finishInitialization_ =
    function(user) {
  var schemaVersion = this.getDatabaseSchemaVersion();
  var storageAdapter = /** @type {!office.localstore.idb.StorageAdapter} */ (
      goog.asserts.assertObject(
      this.storageAdapters_[schemaVersion],
      'Local Storage: No schema adapter for current schema version %s.',
      schemaVersion));
  var localStore = new office.localstore.LocalStore(storageAdapter);
  localStore.registerDisposable(this.indexedDb_);
  for (var i in this.storageAdapters_) {
    localStore.registerDisposable(this.storageAdapters_[i]);
  }
  for (var i in this.documentAdapters_) {
    var versionMap = this.documentAdapters_[i];
    for (var j in versionMap) {
      localStore.registerDisposable(versionMap[j]);
    }
  }

  goog.log.info(this.logger_, 'Initialization complete, schema version=' +
      schemaVersion);
  this.deferredResult_.callback(
      new office.localstore.LocalStoreFactoryResult(localStore, user));
};


/**
 * @return {number} The current version number for the database. Returns -1 if
 * the IDB hasn't been initialized or if the version is less than the min IDB.
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.getDatabaseSchemaVersion =
    function() {
  var idbVersion = this.indexedDb_ ? this.indexedDb_.getVersion() : -1;
  // To be safe, treat anything less than the min IDB version as having an
  // uninitialized IndexedDB.
  return idbVersion < office.localstore.idb.IdbLocalStoreFactory.MIN_IDB_VERSION ?
      -1 : idbVersion;
};


/**
 * Disposes all the references in case of an error.
 * @private
 */
office.localstore.idb.IdbLocalStoreFactory.prototype.disposeOnError_ =
    function() {
  for (var i in this.storageAdapters_) {
    this.storageAdapters_[i].dispose();
  }
  for (var i in this.documentAdapters_) {
    var versionMap = this.documentAdapters_[i];
    for (var j in versionMap) {
      versionMap[j].dispose();
    }
  }
  goog.dispose(this.indexedDb_);
};
