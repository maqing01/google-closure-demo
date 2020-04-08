goog.provide('office.localstore.LocalStorageLoader');

goog.require('office.diagnostics.InitialLoadTimingImpl');
goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.localstore.DocumentLockCapability');
goog.require('office.localstore.LocalStorageLoaderInitErrorEvent');
goog.require('office.localstore.LocalStoreError');
goog.require('office.localstore.LocalStoreEventType');
goog.require('office.localstore.LocalStoreInitializedEvent');
goog.require('office.localstore.LocalStoreLoadResult');
goog.require('office.localstore.LocalStoreLoadResultEventType');
goog.require('office.localstore.LocalStoreMetadataSyncer');
goog.require('office.localstore.LockAcquisitionResult');
goog.require('office.localstore.PendingQueueRecordLoader');
goog.require('office.offline.optin');
goog.require('goog.Timer');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.functions');
goog.require('goog.log');



//  Considering the secondary responsibilities it has collected, this
// class should possibly be renamed and moved.
/**
 * Initializes local storage, acquires the document lock, loads the document,
 * and hooks it up to a mutation writer and cold start document loader. Also
 * responsible for disposing the core local storage objects. This class has also
 * collected some secondary responsibilities for correctly starting the offline
 * portions of an editor, such as appcache maintenance and registering a lock
 * with the sync worker.
 * @param {!office.info.Document} documentInfo Document info object describing the
 *     document to be read.
 * @param {office.localstore.Document.Type} documentType The local store document
 *     type.
 * @param {!office.localstore.DocumentWriterProxy} localDocumentWriter The
 *     document writer proxy.
 * @param {!office.debug.ErrorReporterApi} errorReporter The shelly error
 *     reporter.
 * @param {boolean} shouldCheckUserOptIn Whether to check if the user has opted
 *     in and has the chrome app.
 * @param {!office.localstore.LocalStoreFactory} localStoreFactory the factory
 *     used to create local store.
 * @param {!Window=} opt_window The window object to use, for testing.
 * @param {apps.diagnostics.LatencyReporter=} opt_latencyReporter The latency
 *     reporter to use for setting experiment data related to warm start and
 *     cold start.
 * @param {boolean=} opt_stageCommands Whether writes to the document should be
 *     written to the staging area. This is used by warm started ritz.
 * @param {boolean=} opt_hasPartialModelDataOnlyWhenNew Whether to
 *     set the 'hasPartialModelDataOnly' to true on the document record for new
 *     document. ('New' means that it is not in localstore).
 * @param {boolean=} opt_isColdStart Whether the app is cold starting
 *     from offline storage.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.localstore.LocalStorageLoader = function(
    documentInfo, documentType,
    localDocumentWriter, errorReporter, shouldCheckUserOptIn,
    localStoreFactory,
    opt_window, opt_latencyReporter, opt_stageCommands,
    opt_hasPartialModelDataOnlyWhenNew, opt_isColdStart) {
  goog.base(this);

  /** @private {boolean} */
  this.isColdStart_ = goog.isDef(opt_isColdStart) ? opt_isColdStart :
      office.flag.getInstance().getBoolean(office.flag.Flags.IS_COLD_START_OFFLINE);

  /** @private {!office.info.Document} */
  this.documentInfo_ = documentInfo;

  /** @private {office.localstore.Document.Type} */
  this.localStoreDocumentType_ = documentType;

  /** @private {!office.localstore.DocumentWriterProxy} */
  this.localDocumentWriter_ = localDocumentWriter;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /**
   * Whether to check if the user has opted in.
   * @private {boolean}
   */
  this.shouldCheckUserOptIn_ = shouldCheckUserOptIn;

  /**
   * The latency reporter to use for setting experiment information.
   * @private {apps.diagnostics.LatencyReporter}
   */
  this.latencyReporter_ = opt_latencyReporter || null;

  /** @private {!Window} */
  this.window_ = opt_window || window;

  /** @private {!office.localstore.LocalStoreFactory} */
  this.localStoreFactory_ = localStoreFactory;

  /** @private {office.localstore.LocalStore} */
  this.localStore_ = null;

  /**
   * Whether writes to the document should be written to the staging area.
   * This is used by warm started ritz.
   * @private {boolean}
   */
  this.stageCommands_ = !!opt_stageCommands;

  /** @private {office.localstore.LocalStoreMetadataSyncer} */
  this.metadataSyncer_ = null;

  /**
   * Whether a storage error was encountered while loading.
   * @private {boolean}
   */
  this.storageErrorOnLoad_ = false;

  /**
   * Whether to set the 'hasPartialModelDataOnly' to true on the document
   * record for new document. ('New' means that it is not in localstore).
   * @private {boolean}
   */
  this.hasPartialModelDataOnlyWhenNew_ =
      !!opt_hasPartialModelDataOnlyWhenNew;

  /** @private {boolean} */
  this.readDocumentAndPendingQueueStarted_ = false;

  /** @private {!office.localstore.LocalStoreLoadResult} */
  this.localStoreLoadResult_ =
      new office.localstore.LocalStoreLoadResult(this.errorReporter_);

  /**
   * @private {!goog.events.EventHandler.<
   *     !office.localstore.LocalStorageLoader>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.
      listen(
          this.localStoreLoadResult_,
          office.localstore.LocalStoreLoadResultEventType.
              LOCAL_STORE_LOAD_RESULT_COMPLETE,
          this.handleLocalStoreLoadResultComplete_);
};
goog.inherits(office.localstore.LocalStorageLoader, goog.events.EventTarget);


/**
 * @private {goog.log.Logger}
 */
office.localstore.LocalStorageLoader.prototype.logger_ =
    goog.log.getLogger('office.localstore.LocalStorageLoader');


/**
 * Initializes the local storage system with the goal of loading a particular
 * document. Once the initialization is complete and the document loaded,
 * the local storage object and the document will be registered with the
 * provided cold start document loader and mutation writer proxy. If opt-in
 * verification was requested, then the initialization process may stop; if it
 * does, the mutation writer proxy will be instructed to discard accumulated
 * changes and ignore new changes.
 */
office.localstore.LocalStorageLoader.prototype.loadDocument = function() {
  if (this.shouldCheckUserOptIn_ &&
      !office.offline.optin.haveOptInSecretsFromServer()) {
    goog.log.info(
        this.logger_, 'No server opt-in secret, abandoning offline load.');
    this.completeLoadWithoutLocalStore_();
    return;
  }

  this.createLocalStore_();
};


/**
 * Completes the loading sequence in the case where LocalStore could not be
 * loaded, e.g. because the user isn't opted in, or because of an error during
 * load.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.completeLoadWithoutLocalStore_ =
    function() {
  // Dispose of LocalStore to stop a potentially running lock refresh timer.
  goog.dispose(this.localStore_);
  this.localStore_ = null;

  this.documentInfo_.getSaveStateTracker().setChangesStoredLocallyWhenAvailable(
      false);
  this.localDocumentWriter_.discardAndIgnoreAllUpdates();
  this.dispatchLocalStoreInitializedEvent_(null /* localStore */,
      null /* user */, null /* lockAcquisitionResult */, null /* document */,
      null /* pendingQueue */);
};


/**
 * Dispatches the LocalStoreInitializedEvent.
 * @param {office.localstore.LocalStore} localStore The local store, or null when
 *     local storage should not be used.
 * @param {office.localstore.User} user The user.
 * @param {?office.localstore.LockAcquisitionResult} lockAcquisitionResult The
 *     result of the document lock acquisition, or null if there was no attempt
 *     to acquire the lock.
 * @param {office.localstore.Document} document The document.
 * @param {office.localstore.PendingQueue} pendingQueue
 * @private
 */
office.localstore.LocalStorageLoader.prototype.
    dispatchLocalStoreInitializedEvent_ = function(
        localStore, user, lockAcquisitionResult, document, pendingQueue) {
  this.dispatchEvent(new office.localstore.LocalStoreInitializedEvent(
      localStore, user, lockAcquisitionResult, document, pendingQueue));
};


/**
 * Creates a local store object.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.createLocalStore_ = function() {
  var deferredResult = this.localStoreFactory_.create(
      goog.bind(this.handleLocalStoreError_, this),
      true /* opt_reportOpenDatabaseTiming */);

  deferredResult.addCallbacks(
      goog.bind(this.handleLocalStoreCreated_, this),
      goog.bind(this.handleLocalStoreErrorOnLoad_, this,
          this.completeLoadWithoutLocalStore_ /* completionCallback */));
};


/**
 * Handles the newly created LocalStore. It is called as part of loading a
 * document, once the local store has been created. Fetches the users,
 * registering {@link setUserAndMaybeAcquireLock_} as the callback. If the
 * LocalStore was not created due to a missing opted-in user or a user read
 * error, {@link completeLoadWithoutLocalStore_} is called.
 * @param {!office.localstore.LocalStoreFactoryResult} result The result with
 *     the local store and user.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleLocalStoreCreated_ =
    function(result) {
  this.errorReporter_.assert(!this.localStore_,
      Error('Setting local store when one is already available'));

  if (result.getLocalStore()) {
    this.localStore_ = result.getLocalStore();
    this.eventHandler_.listen(
        this.localStore_,
        office.localstore.LocalStoreEventType.SCHEMA_VERSION_CHANGED,
        this.handleLocalStoreSchemaVersionChanged_);

    if (result.getUser()) {
      // If the factory already successfully read a user, use it rather than
      // having to perform a re-read.
      this.setUserAndMaybeAcquireLock_([result.getUser()]);
    } else {
      this.localStore_.getUserCapability().readUsers(
          goog.bind(this.setUserAndMaybeAcquireLock_, this),
          goog.bind(this.handleLocalStoreErrorOnLoad_, this,
              this.completeLoadWithoutLocalStore_ /* completionCallback */));
    }
  } else {
    // The user is not opted in.
    this.completeLoadWithoutLocalStore_();
  }
};


/**
 * Handles a schema version changed event from the local store by triggering a
 * reload of the page.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.
    handleLocalStoreSchemaVersionChanged_ = function(e) {
  goog.log.info(this.logger_, 'Local store schema version changed. Reloading.');
  // Delay the reload until other event handlers have executed.
  goog.Timer.callOnce(this.window_.location.reload, 0, this.window_.location);
};


/**
 * Called as part of loading a document, once the user objects have been
 * retrieved. If there's only one user and their opt-in is verified, starts
 * up the SyncWorker, attempts to acquire the lock, registering
 * {@link handleDocumentLockAcquired_} as the completion callback.
 * @param {!Array.<!office.localstore.User>} users The users.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.setUserAndMaybeAcquireLock_ =
    function(users) {
  this.errorReporter_.assertCritical(goog.isObject(this.localStore_),
      Error('Setting user when local store is not an object'));

  if (users.length == 0) {
    // No users found implies that none are opted in.
    goog.log.warning(
        this.logger_, 'User found to be missing after user presence check.');
    this.completeLoadWithoutLocalStore_();
    return;
  }

  // We don't support multilogin, so we expect only one user.
  if (users.length > 1) {
    this.errorReporter_.log(Error('More than one user in local storage'));
    this.completeLoadWithoutLocalStore_();
    return;
  }

  // Note: we must perform the opt-in check, if one was requested, before we set
  // the user.
  var user = users[0];
  if (this.shouldCheckUserOptIn_) {
    if (!this.localStoreFactory_.isUserAuthorized(user)) {
      this.completeLoadWithoutLocalStore_();
      return;
    }
  }

  this.documentInfo_.setColdStartOfflineEnabled(true);
  if (this.isColdStart_ && !this.documentInfo_.getEmail()) {
    this.documentInfo_.setEmail(/** @type {string} */ (user.getEmailAddress()));
  }
  this.localStoreLoadResult_.setUser(user);

  office.diagnostics.InitialLoadTimingImpl.getInstance().setTime(
      office.diagnostics.InitialLoadTimingKeys.LOCK_ACQUISITION_STARTED);

  this.eventHandler_.listen(
      this.localStore_.getDocumentLockCapability(),
      office.localstore.DocumentLockCapability.EventType.DOCUMENT_LOCK_ACQUISITION_STARTED,
      goog.bind(this.handleLockAcquisitionStarted_, this));

  this.localStore_.getDocumentLockCapability().acquireDocumentLock(
      this.documentInfo_.getCosmoId(),
      goog.bind(this.handleDocumentLockAcquired_, this),
      goog.bind(this.handleLocalStoreErrorOnLoad_, this,
          goog.partial(this.handleDocumentLockAcquired_,
              office.localstore.LockAcquisitionResult.STORAGE_ERROR)));
};


/**
 * Handles the result of trying to acquire the document lock. Continues the
 * loading sequence by fetching the document from local storage and registers
 * {@code handleDocumentRetrieved_} as the result callback.
 * @param {office.localstore.LockAcquisitionResult} lockAcquisitionResult The
 *     result of the document lock acquisition.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleDocumentLockAcquired_ =
    function(lockAcquisitionResult) {
  this.errorReporter_.assertCritical(goog.isObject(this.localStore_),
      Error('Setting document lock status when local store is not an object'));

  //office.diagnostics.InitialLoadTimingImpl.getInstance().setTime(
  //    office.diagnostics.InitialLoadTimingKeys.LOCK_ACQUISITION_COMPLETE);

  this.localStoreLoadResult_.setLockAcquisitionResult(lockAcquisitionResult);

  // Reads the document and pending queue records when the document lock
  // acquisition started event is not dispatched.
  this.readDocumentAndPendingQueue_();
};


/**
 * @param {goog.events.Event} e
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleLockAcquisitionStarted_ =
    function(e) {
  // Reads the document and pending queue records in parallel with the lock
  // acquisition.
  this.readDocumentAndPendingQueue_();
};


/**
 * Reads the document and pending queue records.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.readDocumentAndPendingQueue_ = function() {
  if (this.readDocumentAndPendingQueueStarted_) {
    return;
  }
  this.readDocumentAndPendingQueueStarted_ = true;

  var documentReadErrorCallback = goog.bind(this.handleLocalStoreErrorOnLoad_,
      this,
      function() {
        this.localStoreLoadResult_.setDocument(null);
      } /* continuationCallback */);
  this.localStore_.getDocumentCapability().readDocument(
      this.documentInfo_.getCosmoId(),
      false /* requireFullySynced */,
      goog.bind(this.handleDocumentRetrieved_, this) /* resultCallback */,
      documentReadErrorCallback);

  var lockAcquisitionResult =
      this.localStoreLoadResult_.getLockAcquisitionResult();
  if (!lockAcquisitionResult || lockAcquisitionResult ==
      office.localstore.LockAcquisitionResult.ACQUIRED) {
    // We only need to read the pending queue when the lock result isn't
    // in yet (when reading the pending queue in parallel with the lock
    // acquisition), or when the lock was acquired.
    var pendingQueueRecordLoader =
        new office.localstore.PendingQueueRecordLoader(
            this.documentInfo_.getCosmoId(),
            this.localStoreDocumentType_,
            this.localStore_);
    pendingQueueRecordLoader.loadPendingQueue(
        goog.bind(this.receivePendingQueue_, this) /* resultCallback */,
        goog.bind(this.handleLocalStoreErrorOnLoad_, this,
            goog.functions.lock(goog.partial(this.receivePendingQueue_,
                null /* pendingQueue */)) /* opt_errorCallback */));
  } else {
    this.localStoreLoadResult_.setPendingQueue(null);
  }
};


/**
 * Called as part of loading a document, once the document itself has been
 * retrieved.  If no document was found, creates one. If the document lock is
 * acquired, this registers the document and local storage object with the
 * mutation writer proxy. If not, it discards the proxy. This also intiailizes
 * a cold start document loader if one is in use and triggers an app cache
 * update.
 * @param {office.localstore.Document} document The retrieved document object or
 *     null.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleDocumentRetrieved_ =
    function(document) {
  this.errorReporter_.assertCritical(goog.isObject(this.localStore_),
      Error('Setting document when local store is not an object'));

  var localStore =
      /** @type {!office.localstore.LocalStore} */ (this.localStore_);
  // If the document doesn't exist in storage, create it.
  if (!document) {
    goog.log.info(
        this.logger_, 'Document not found in local storage, creating.');
    document = localStore.getDocumentCapability().createDocument(
        this.documentInfo_.getCosmoId(), this.localStoreDocumentType_);
    document.setIsCreated(this.documentInfo_.getSaveStateTracker().isCreated());
    if (this.hasPartialModelDataOnlyWhenNew_) {
      document.setHasPartialModelDataOnly(true);
    }
  }

  this.localStoreLoadResult_.setDocument(document);
};


/**
 * @param {office.localstore.PendingQueue} pendingQueue
 * @private
 */
office.localstore.LocalStorageLoader.prototype.receivePendingQueue_ = function(
    pendingQueue) {
  this.localStoreLoadResult_.setPendingQueue(pendingQueue);
};


/**
 * @param {goog.events.Event} e
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleLocalStoreLoadResultComplete_ = function(e) {
  if (this.storageErrorOnLoad_) {
    // If there was a storage error, we will load either with a read-only
    // LocalStore, or without LocalStore. The document lock isn't required in
    // either case, so release it now to prevent further storage errors. This
    // matters in the case where the lock was acquired successfully, but a
    // subsequent LocalStore call failed with a storage error, e.g. the pending
    // queue read.
    this.localStore_.getDocumentLockCapability().releaseAllLocks();
  }

  var document = this.localStoreLoadResult_.getDocument();
  if (!document || (this.storageErrorOnLoad_ && !this.isColdStart_)) {
    // For warm-start, load completely without LocalStore on any storage
    // errors. This ensures no further storage interaction, and prevents errors
    // when the database connection was closed or storage is completely broken.
    this.completeLoadWithoutLocalStore_();
    return;
  }

  var user = this.localStoreLoadResult_.getUser();
  var pendingQueue = this.localStoreLoadResult_.getPendingQueue();

  // If there is a storage error, it is either from the lock acquisition or the
  // pending queue read, and we are cold-starting. Pretend that the lock
  // acquisition has failed to allow falling back to loading with a non-writable
  // LocalStore. This allows users to at least view the document offline in some
  // cases.
  var lockAcquisitionResult = this.storageErrorOnLoad_ ?
      office.localstore.LockAcquisitionResult.STORAGE_ERROR :
      this.localStoreLoadResult_.getLockAcquisitionResult();

  var documentLockAcquired =
      lockAcquisitionResult == office.localstore.LockAcquisitionResult.ACQUIRED;
  var localStore =
      /** @type {!office.localstore.LocalStore} */ (this.localStore_);
  if (documentLockAcquired) {
    localStore.setWritable();
    if (this.stageCommands_) {
      (/** @type {!office.localstore.CommandBasedDocument} */ (document)).
          stageCommands();
    }
    this.updateLastStartedTimestamp_();
  }

  // Dispatch the local store initialized event after the document metadata
  // has been updated from local storage by calling
  // ColdStartDocumentLoader.load.
  this.dispatchLocalStoreInitializedEvent_(
      localStore, user, lockAcquisitionResult, document, pendingQueue);

  // Set the save state to indicate we are not capable of storing changes
  // locally if we have the document lock.
  this.documentInfo_.getSaveStateTracker().setChangesStoredLocallyWhenAvailable(
      documentLockAcquired);

  // Only register the local store on the mutation writer if this session
  // acquired the document lock. Discard all queued changes otherwise.
  if (documentLockAcquired) {
    this.localDocumentWriter_.registerLocalStorage(localStore, document, user);
    this.metadataSyncer_ = new office.localstore.LocalStoreMetadataSyncer(
        this.documentInfo_, localStore, document);
  } else {
    this.localDocumentWriter_.discardAndIgnoreAllUpdates();
  }
};


/**
 * Updates the timestamp on the document that indicates when it was last
 * opened in an editor. Assumes that the document has already been loaded.
 * @private
 */
office.localstore.LocalStorageLoader.prototype.updateLastStartedTimestamp_ =
    function() {
  var document = this.localStoreLoadResult_.getDocument();
  var timestamp = goog.now();
  if (this.isColdStart_) {
    document.setLastColdStartedTimestamp(timestamp);
    // In cold-start mode we don't know that a write will happen after this, so
    // we explicitly perform a write. However, we don't want to write the
    // document if it's new (i.e., it wasn't actually present in local storage).
    if (!document.isNew()) {
      this.localStore_.write(
          [document], goog.nullFunction /* completionCallback */);
    }
  } else {
    document.setLastWarmStartedTimestamp(timestamp);
  }
};


/**
 * Handles a local store error. Depending on the error type, we log the error,
 * report a fatal error to the error reporter, or show a ketchup.
 * @param {!office.localstore.LocalStoreError} e
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleLocalStoreError_ =
    function(e) {
  this.errorReporter_.fatalError(e);
};


/**
 * Handles a storage layer error on initial load. Error handling on load is
 * different because during load we can still back out of offline and revert to
 * the non-offline behavior. Errors further down the road have to be fatal. If
 * another loading error has already been handled, this is a no-op. Otherwise,
 * this logs the error, posts a ketchup to alert the user to restart their
 * browser, and continues the loading sequence by calling the given continuation
 * callback.
 * @param {function()} continuationCallback The function to call after handling
 *     the error, unless another error has already been handled on load. This
 *     function will be called in the this context.
 * @param {!office.localstore.LocalStoreError} e
 * @private
 */
office.localstore.LocalStorageLoader.prototype.handleLocalStoreErrorOnLoad_ =
    function(continuationCallback, e) {
  if (!this.storageErrorOnLoad_) {
    this.storageErrorOnLoad_ = true;
    this.dispatchEvent(new office.localstore.LocalStorageLoaderInitErrorEvent(e));
    continuationCallback.call(this);
  }
};


/** @override */
office.localstore.LocalStorageLoader.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.metadataSyncer_,
      this.eventHandler_);

  goog.base(this, 'disposeInternal');
};
