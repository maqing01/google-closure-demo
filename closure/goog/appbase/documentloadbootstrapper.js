goog.provide('office.app.DocumentLoadBootStrapper');

goog.require('office.app.ModelLoadObserver');
goog.require('office.app.ModelLoader');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.info.AccessState');
goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.storage.PendingCommandQueueFactory');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('office.localstore.accesslevel');
goog.require('office.localstore.LocalStorageLoader');
goog.require('office.localstore.LocalStorageLoaderEventType');
goog.require('office.localstore.LockAcquisitionResult');
goog.require('goog.events.EventHandler');
goog.require('goog.log');

goog.require('goog.events');


/**
 * @param {!office.info.Document} documentInfo The document metadata.
 * @param {string} sessionId The session id, if this is an online client.
 * @param {!office.util.StageManager} StageManager The milestone manager
 *     used to manage application initial load milestones.
 * @param {office.localstore.CommandBasedDocumentWriterProxy} localDocumentWriter
 *     The proxy to write into local document to storage or null if cold start
 *     is not enabled.
 * @param {!office.commands.CommandSerializer} commandSerializer The command
 *     serializer.
 * @param {!office.net.CommandStorageImpl} commandStorage The command storage.
 * @param {!office.app.ModelPartApplier} modelPartApplier The model part applier.
 * @param {office.localstore.Document.Type} docType The document type.
 * @param {boolean} enableOfflineEditing Whether to enable offline editing.
 * @param {office.net.OfflineObserverApi} offlineObserver The offline observer.
 * @param {!office.debug.ErrorReporter} errorReporter The error reporter.
 * @param {office.app.LifecycleManager} lifecycleManager The life cycle manager
 *     or null if no lifecycle manager can be used, for example in non-browser
 *     based apps.
 * @param {boolean} isColdStart Whether the document been loaded in the cold
 *     start mode for offline.
 * @param {!office.app.DocumentLoader} documentLoader
 * @param {office.localstore.LocalStoreFactory} localStoreFactory
 * @param {office.info.AccessState} accessState
 * @param {boolean} requireExplicitOptInCheck Whether an explicit opt-in status
 *     check should be performed. Only applications that can guarantee that
 *     every user is opted in are allowed to set this to false. This is used by
 *     mobile applications, where the user opt in is guaranteed.
 * @param {boolean=} opt_useAsyncWorkQueue Whether to use an async work queue to
 *     apply model parts on a timer. This is used by mobile applications to
 *     yield the thread of execution to the native code.
 * @param {boolean=} opt_stageCommands Whether writes to the document should be
 *     written to the staging area. This is used by warm started ritz.
 * @param {!office.commands.Compactor=} opt_compactor A command compactor. This
 *     will be used when equeuing commands into the pending queue. It is used
 *     behind the ENABLE_COMMANDS_COMPACTION flag.
 * @param {boolean=} opt_setHasPartialModelDataOnlyForNewDocument Whether to
 *     set the 'hasPartialModelDataOnly' to true on the document record for new
 *     document. ('New' means that it is not in localstore).
 * @param {!office.offline.ClientSnapshotScheduler=} opt_clientSnapshotScheduler
 *     If set, the client snapshot scheduler to use in order to perform
 *     periodic model snapshots to be saved to LocalStore.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 * @implements {office.app.ModelLoadObserver}
 */
office.app.DocumentLoadBootStrapper = function(documentInfo, sessionId,
    StageManager, localDocumentWriter, commandSerializer, commandStorage,
    modelPartApplier, docType, enableOfflineEditing, offlineObserver,
    errorReporter, lifecycleManager, isColdStart,
    documentLoader, localStoreFactory, accessState, requireExplicitOptInCheck,
    opt_useAsyncWorkQueue, opt_stageCommands,
    opt_compactor, opt_setHasPartialModelDataOnlyForNewDocument,
    opt_clientSnapshotScheduler) {
  goog.base(this);

  /**
   * @private {!office.info.Document}
   */
  this.documentInfo_ = documentInfo;

  /**
   * The session id.
   * @private {string}
   */
  this.sessionId_ = sessionId;

  /**
   * @private {office.localstore.Document.Type}
   */
  this.docType_ = docType;

  /**
   * The milestone manager.
   * @private {!office.util.StageManager}
   */
  this.mm_ = StageManager;

  /**
   * The local document writer.
   * @private {office.localstore.CommandBasedDocumentWriterProxy}
   */
  this.localDocumentWriter_ = localDocumentWriter;

  /**
   * @private {office.net.OfflineObserverApi}
   */
  this.offlineObserver_ = offlineObserver;

  /**
   * The error reporter.
   * @private {!office.debug.ErrorReporter}
   */
  this.errorReporter_ = errorReporter;

  /**
   * Whether offline editing is enabled.
   * @private {boolean}
   */
  this.enableOfflineEditing_ = enableOfflineEditing;

  //errorReporter.addStaticContextEntry('sid', this.sessionId_);
  //errorReporter.addStaticContextEntry('isColdStartOffline',
  //    isColdStart.toString());
  //errorReporter.addDynamicContextEntry('offlineOptedIn',
  //    function() {
  //      return documentInfo.isColdStartOfflineEnabled().toString();
  //    });

  //  Consider moving this out of the bootstrapper.
  /**
   * The command storage.
   * @private {!office.net.CommandStorageImpl}
   */
  this.commandStorage_ = commandStorage;

  /**
   * Whether the document should be cold started.
   * @private {boolean}
   */
  this.isColdStart_ = isColdStart;

  /**
   * Whether to check if the user has opted in and has the chrome app.
   * @private {boolean}
   */
  this.shouldCheckUserOptIn_ = requireExplicitOptInCheck && !isColdStart;

  /**
   * @private {office.localstore.LocalStoreFactory}
   */
  this.localStoreFactory_ = localStoreFactory;

  /**
   * @private {office.info.AccessState}
   */
  this.accessState_ = accessState;

  /**
   * The file syncer for syncing embedded objects to local storage, if this
   * feature is enabled.
   * @private {office.localstore.FileSyncerProxy}
   */
  this.fileSyncerProxy_ = null;

  /**
   * The event handler.
   * @private {!goog.events.EventHandler.<!office.app.DocumentLoadBootStrapper>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  /**
   * The lifecycle manager or null if no lifecycle manager can be used,
   * for example in non-browser based apps.
   * @private {office.app.LifecycleManager}
   */
  this.lifecycleManager_ = lifecycleManager;

  if (localDocumentWriter && !isColdStart) {
    // Always set the title on warm start.
    this.localDocumentWriter_.setTitle(documentInfo.getTitle());

    // Clear the isPartiallySynced bit when warm starting. Clearing this bit
    // here is not really correct, but it's the best we can do for now because
    // we don't know when all the resources have loaded.
    this.localDocumentWriter_.setIsPartiallySynced(false);
  }

  /**
   * @private {!office.app.ModelLoader}
   */
  this.modelLoader_ = office.app.ModelLoader.create(modelPartApplier,
      documentLoader, this /* modelLoadObserver */, isColdStart,
      undefined, opt_useAsyncWorkQueue);

  /**
   * Logger for document load bootstrapper.
   * @private {goog.log.Logger}
   */
  this.logger_ =
      goog.log.getLogger('office.app.DocumentLoadBootStrapper');

  /**
   * The pending command queue.
   * @private {office.storage.PendingCommandQueue}
   */
  this.pendingCommandQueue_ = null;

  /**
   * The local store.
   * @private {office.localstore.LocalStore}
   */
  this.localStore_ = null;

  /**
   * The local store user.
   * @private {office.localstore.User}
   */
  this.user_ = null;

  /**
   * The local store document.
   * @private {office.localstore.Document}
   */
  this.document_ = null;

  /**
   * The result of the initial document lock acquisition.
   * @private {?office.localstore.LockAcquisitionResult}
   */
  this.documentLockAcquisitionResult_ = null;

  /**
   * The document revision number received during initial load used for
   * initializing network communications.
   * @private {?number}
   */
  this.initialRevision_ = null;

  /**
   * Whether initialize() was called
   * @private {boolean}
   */
  this.isInitialized_ = false;

  /**
   * Whether writes to the document should be written to the staging area.
   * This is used by warm started ritz.
   * @private {boolean}
   */
  this.stageCommands_ = !!opt_stageCommands;

  /**
   * Whether to set the 'hasPartialModelDataOnly' to true on the document record
   * for new document. ('New' means that it is not in localstore).
   * @private {boolean}
   */
  this.setHasPartialModelDataOnlyForNewDocument_ =
      !!opt_setHasPartialModelDataOnlyForNewDocument;

  /**
   * Local storage document loader.
   * @private {office.localstore.LocalStorageLoader}
   */
  this.localStorageLoader_ = null;

  /**
   * A command compactor. This will be used when equeuing commands into the
   * pending queue.
   * @private {office.commands.Compactor}
   */
  this.compactor_ = office.flag.getInstance().getBoolean(
      office.flag.Flags.ENABLE_COMMANDS_COMPACTION) && opt_compactor ?
      opt_compactor :
      null;

  /**
   * @private {office.offline.ClientSnapshotScheduler}
   */
  this.clientSnapshotScheduler_ = opt_clientSnapshotScheduler || null;
};
goog.inherits(office.app.DocumentLoadBootStrapper, goog.Disposable);


/**
 * @return {boolean} Whether the document should be cold started.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.shouldColdStart = function() {
  return this.isColdStart_;
};


/**
 * Milestones passed during initial load of the application.
 * @enum {string}
 */
office.app.DocumentLoadBootStrapper.Milestone = {
  BASIC_EDITABLE: goog.events.getUniqueId('office-app-be'),
  // This milestone will be passed when basic editable, or if not basic
  // editable, when the model load completes.
  BASIC_EDITABLE_OR_MODEL_LOAD_COMPLETE: goog.events.getUniqueId('office-app-beomlc'),
  FIRST_CHUNK_LOADED: goog.events.getUniqueId('office-app-fmcl'),
  SERVER_MODEL_APPLIED: goog.events.getUniqueId('office-app-sma'),
  EDITABLE: goog.events.getUniqueId('office-app-e'),
  // This milestone will be passed when editable, or if not editable, when
  // the model load completes.
  EDITABLE_OR_MODEL_LOAD_COMPLETE: goog.events.getUniqueId('office-app-eomlc'),
  LOCAL_STORE_INITIALIZED: goog.events.getUniqueId('office-app-lsi'),
  PENDING_QUEUE_INITIALIZED: goog.events.getUniqueId('office-app-pqi')
};


/**
 * @return {boolean} Whether the document load bootstrapper has been
 *     initialized.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.isInitialized = function() {
  return this.isInitialized_;
};


/**
 * @return {office.localstore.FileSyncerProxy} File syncer proxy, or null if
 *     offline is disabled.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getFileSyncerProxy = function() {
  return this.fileSyncerProxy_;
};


/**
 * @return {office.localstore.FileSyncer} File syncer, or null if offline is
 *     disabled.
 */
office.app.DocumentLoadBootStrapper.prototype.getFileSyncer = function() {
  return this.fileSyncerProxy_;
};


/**
 * @return {office.localstore.LocalStore} The local store.
 */
office.app.DocumentLoadBootStrapper.prototype.getLocalStore = function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  return this.localStore_;
};


/**
 * @return {!office.storage.PendingCommandQueue} The pending command queue.
 */
office.app.DocumentLoadBootStrapper.prototype.getPendingCommandQueue =
    function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.PENDING_QUEUE_INITIALIZED);
  if (!this.pendingCommandQueue_) {
    throw Error('Pending queue should be created local store is initialized.');
  }
  return this.pendingCommandQueue_;
};


/**
 * @return {office.localstore.Document} The document.
 */
office.app.DocumentLoadBootStrapper.prototype.getDocument = function() {
  //  Only return a document after the DocumentWriterProxy has been
  // flushed. Until that point, the data in the document record could be stale.
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  return this.document_;
};


/**
 * @return {office.localstore.User} The user.
 */
office.app.DocumentLoadBootStrapper.prototype.getUser = function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  return this.user_;
};


/**
 * @return {?office.localstore.LockAcquisitionResult} The result of the initial
 *     document lock acquisition, or null if not attempt to acquire the lock was
 *     made.
 */
office.app.DocumentLoadBootStrapper.prototype.getDocumentLockAcquisitionResult =
    function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  return this.documentLockAcquisitionResult_;
};


/**
 * @return {number} The initial document revision.
 */
office.app.DocumentLoadBootStrapper.prototype.getInitialRevision = function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.SERVER_MODEL_APPLIED);
  if (goog.isNull(this.initialRevision_)) {
    throw Error('Initial revision should be set after document is loaded.');
  }
  return this.initialRevision_;
};


/**
 * @return {!office.debug.ErrorReporter} The error reporter.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getErrorReporter = function() {
  return this.errorReporter_;
};


/**
 * @return {!goog.events.EventHandler} The event handler.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getEventHandler = function() {
  return this.eventHandler_;
};


/**
 * @return {office.localstore.LocalStorageLoader} Local storage document loader.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getLocalStorageLoader = function() {
  if (!this.isInitialized_) {
    throw Error('Document load boot strapper is not initialized yed.');
  }
  return this.localStorageLoader_;
};


/**
 * @return {office.localstore.LocalStoreFactory}
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getLocalStoreFactory = function() {
  return this.localStoreFactory_;
};


/**
 * @return {office.localstore.CommandBasedDocumentWriterProxy} Local document
 *     writer.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getLocalDocumentWriter =
    function() {
  return this.localDocumentWriter_;
};


/**
 * @return {!office.info.Document}
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getDocumentInfo = function() {
  return this.documentInfo_;
};


/**
 * @return {office.net.OfflineObserverApi}
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getOfflineObserver = function() {
  return this.offlineObserver_;
};


/**
 * @return {string}
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.getSessionId = function() {
  return this.sessionId_;
};


/**
 * Notifies the model loader that the application is ready to apply model
 * chunks. When a chunk queueing strategy other than NONE is used by the model
 * loader, chunks will not be applied until this method is executed.
 */
office.app.DocumentLoadBootStrapper.prototype.enableQueuedChunksApplication =
    function() {
  this.modelLoader_.enableQueuedChunksApplication();
};


/**
 * Performs additional logic required to complete initialization of the pending
 * queue once it's been constructed. By default, no additional processing is
 * needed but subclasses, for example for use in the desktop editors, need to do
 * additional work.
 * @param {!office.storage.PendingCommandQueue} pendingCommandQueue
 * @param {?number} initialRevision
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.initializePendingQueueInternal =
    goog.nullFunction;


/**
 * Performs any subclass specific initialization logic.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.initializeInternal =
    goog.nullFunction;


/**
 * Creates a pending queue given a local store.
 * @param {office.localstore.LocalStore} localStore The local store or null if not
 *     provided or not opted in.
 * @param {office.localstore.PendingQueue} pendingQueue The pending queue record
 *     or null if not opted in or the document lock wasn't acquired.
 * @private
 */
office.app.DocumentLoadBootStrapper.prototype.createPendingQueue_ = function(
    localStore, pendingQueue) {
  var commandQueueDeferred = office.storage.PendingCommandQueueFactory.create(
      this.sessionId_, localStore, this.document_, pendingQueue,
      this.errorReporter_, this.enableOfflineEditing_,
      office.localstore.accesslevel.fromDocumentInfo(this.documentInfo_),
      goog.isDefAndNotNull(this.compactor_) ? this.compactor_ : undefined);
  commandQueueDeferred.addCallback(this.handleCommandQueueCreated_, this);
};


/**
 * Handles the pending command queue being created.
 * @param {!office.storage.PendingCommandQueue} pendingCommandQueue The created
 *     pending command queue.
 * @private
 */
office.app.DocumentLoadBootStrapper.prototype.handleCommandQueueCreated_ =
    function(pendingCommandQueue) {
  goog.log.fine(this.logger_, 'handleCommandQueueCreated_()');
  this.pendingCommandQueue_ = pendingCommandQueue;

  if (pendingCommandQueue.isInitialized()) {
    throw Error('Pending queue may not be initialized before the model loader');
  }
  this.eventHandler_.listenOnce(pendingCommandQueue,
      office.storage.PendingCommandQueueEventType.INITIALIZED,
      this.handlePendingQueueInitialized_);
  this.modelLoader_.setPendingCommandQueue(pendingCommandQueue);
};


/**
 * Handles the pending queue being initialized.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.app.DocumentLoadBootStrapper.prototype.handlePendingQueueInitialized_ =
    function(e) {
  goog.log.fine(this.logger_, 'handlePendingQueueInitialized_()');
  var pendingCommandQueue = /** @type {!office.storage.PendingCommandQueue} */ (
      this.pendingCommandQueue_);
  this.commandStorage_.setPendingCommandQueue(pendingCommandQueue);
  if (this.clientSnapshotScheduler_) {
    this.clientSnapshotScheduler_.registerPendingCommandQueue(
        pendingCommandQueue);
  }
  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.PENDING_QUEUE_INITIALIZED);
  this.initializePendingQueueInternal(
      pendingCommandQueue, this.initialRevision_);
  if (this.accessState_ && pendingCommandQueue.isUndeliverable()) {
    this.accessState_.setEditable(false,
        office.info.AccessState.StateChangeReason.UNDELIVERABLE_PENDING_QUEUE);
    this.accessState_.setCommentable(false,
        office.info.AccessState.StateChangeReason.UNDELIVERABLE_PENDING_QUEUE);
  }
};



/**
 * @param {!docs.localstore.LocalStoreInitializedEvent} e The local storage
 *     initialized event.
 * @private
 */
office.app.DocumentLoadBootStrapper.prototype.
    handleLocalStorageLoaderInitialized_ = function(e) {
  goog.log.fine(this.logger_, 'handleLocalStorageLoaderInitialized_()');
  this.user_ = e.user;
  this.document_ = e.document;
  this.localStore_ = e.localStore;
  this.documentLockAcquisitionResult_ = e.lockAcquisitionResult;
  //docs.diagnostics.InitialLoadTimingImpl.getInstance().setTime(
  //    docs.diagnostics.InitialLoadTimingKeys.LOCAL_STORE_INITIALIZED);
  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  this.initializeLocalStorageLoaderInternal();

  this.createPendingQueue_(e.lockAcquisitionResult ==
      office.localstore.LockAcquisitionResult.ACQUIRED ?
          this.localStore_ :
          null,
      e.pendingQueue);

  if (this.lifecycleManager_ && this.localStore_) {
    var documentLockCapability = this.localStore_.getDocumentLockCapability();
    this.lifecycleManager_.registerUnloadCallback(
        goog.bind(documentLockCapability.releaseAllLocks,
            documentLockCapability));
  }
};


/**
 * @type {function(nest.BarState): nest.BarState|*}
 */
office.app.DocumentLoadBootStrapper.prototype.
    initializeLocalStorageLoaderInternal = goog.nullFunction;


/**
 * Loads document from local storage if localStorageLoader is initialized.
 */
office.app.DocumentLoadBootStrapper.prototype.initialize = function() {
  if (!goog.DEBUG && this.isInitialized_) {
    return;
  }
  goog.asserts.assert(!this.isInitialized_);
  this.isInitialized_ = true;


  if (this.localDocumentWriter_ && this.localStoreFactory_) {
    this.localStorageLoader_ = new office.localstore.LocalStorageLoader(
        this.documentInfo_, this.docType_, this.localDocumentWriter_,
        this.errorReporter_,
        this.shouldCheckUserOptIn_,
        this.localStoreFactory_, undefined /* opt_window */,
        this.latencyReporter_,
        this.stageCommands_,
        this.setHasPartialModelDataOnlyForNewDocument_,
        this.isColdStart_);

    this.registerDisposable(this.localStorageLoader_);
    this.eventHandler_.
        listenOnce(this.localStorageLoader_,
        office.localstore.LocalStorageLoaderEventType.INITIALIZED,
        this.handleLocalStorageLoaderInitialized_);
    this.localStorageLoader_.loadDocument();
  } else {
    this.mm_.passMilestone(
        office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
    this.createPendingQueue_(null /* localStore */, null /* pendingQueue */);
  }

  //this.mm_.passMilestone(
  //    office.app.DocumentLoadBootStrapper.Milestone.LOCAL_STORE_INITIALIZED);
  //this.createPendingQueue_(null /* localStore */, null /* pendingQueue */);

  this.initializeInternal();
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.notifyFirstModelChunkLoaded =
    function() {
  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.FIRST_CHUNK_LOADED);
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.notifyBasicEditable = function() {
  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.BASIC_EDITABLE);
  this.mm_.passMilestone(office.app.DocumentLoadBootStrapper.
      Milestone.BASIC_EDITABLE_OR_MODEL_LOAD_COMPLETE);
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.notifyServerModelApplied = function(
    modelRevision) {
  this.initialRevision_ = modelRevision;

  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.SERVER_MODEL_APPLIED);
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.notifyEditable = function() {
  this.mm_.assertMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.BASIC_EDITABLE);

  // The model loader guarantees that any initial anachronistic pending queue
  // has been delivered by the time it goes editable.
  if (this.localDocumentWriter_) {
    this.localDocumentWriter_.setAnachronismResolved();
  }

  if (this.fileSyncerProxy_) {
    this.fileSyncerProxy_.startSyncing();
  }

  this.mm_.passMilestone(
      office.app.DocumentLoadBootStrapper.Milestone.EDITABLE);

  this.mm_.passMilestone(office.app.DocumentLoadBootStrapper.
      Milestone.EDITABLE_OR_MODEL_LOAD_COMPLETE);
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.notifyModelLoadComplete =
    function() {
  this.mm_.passMilestone(office.app.DocumentLoadBootStrapper.
      Milestone.BASIC_EDITABLE_OR_MODEL_LOAD_COMPLETE);
  this.mm_.passMilestone(office.app.DocumentLoadBootStrapper.
      Milestone.EDITABLE_OR_MODEL_LOAD_COMPLETE);
  this.onModelLoadCompleteInternal();
};


/**
 * Performs any subclass specific logic needed when the model load is complete.
 */
office.app.DocumentLoadBootStrapper.prototype.onModelLoadCompleteInternal =
    goog.nullFunction;


/**
 * Asserts a given milestone.
 * @param {string} milestone The milestone.
 * @protected
 */
office.app.DocumentLoadBootStrapper.prototype.assertMilestone =
    function(milestone) {
  this.mm_.assertMilestone(milestone);
};


/** @override */
office.app.DocumentLoadBootStrapper.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.eventHandler_,
      this.localStorageLoader_,
      this.pendingCommandQueue_,
      this.modelLoader_);

  goog.base(this, 'disposeInternal');
};
