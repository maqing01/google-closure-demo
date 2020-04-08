goog.provide('office.app.DesktopBootstrapper');

goog.require('office.app.DefaultWarmStartDocumentLoader');
goog.require('office.app.DocumentLoadBootStrapper');
goog.require('office.app.UndeliverableQueueResolver');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.ui.ButterManager');
goog.require('controls.ButterBar');

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
 * @param {!goog.dom.DomHelper} dom The dom helper.
 * @param {boolean} enableOfflineEditing Whether to enable offline editing.
 * @param {office.net.OfflineObserverApi} offlineObserver The offline observer.
 * @param {!office.debug.ErrorReporter} errorReporter The error reporter.
 * @param {!office.app.LifecycleManager} lifecycleManager The life cycle manager.
 * @param {!apps.diagnostics.LatencyReporter} latencyReporter The latency
 *     reporter.
 * @param {!office.info.AccessState} accessState
 * @param {!office.offline.ColdStartDocumentLoader=} opt_coldStartDocumentLoader
 *     Optional cold start document loader.  If provided, should not provide
 *     the opt_warmStartDocumentLoader and this will be used as the cold start
 *     document loader instead of creating one.
 * @param {!office.app.WarmStartDocumentLoader=} opt_warmStartDocumentLoader
 *     Optional warm start document loader.  If provided, should not provide
 *     the opt_coldStartDocumentLoader and this will be used as the warm start
 *     document loader instead of creating one.
 * @param {boolean=} opt_stageCommands Whether writes to the document should be
 *     written to a staging area. This is used by warm started ritz.
 *     For cold start we don't need to write anything to the staging area
 *     because all the chunks are stored in local store.
 * @param {!office.commands.Compactor=} opt_compactor A command compactor. This
 *     will be used when equeuing commands into the pending queue. It is used
 *     behind the ENABLE_COMMANDS_COMPACTION flag.
 * @param {boolean=} opt_hasPartialModelDataOnlyWhenNew Whether to
 *     set 'hasPartialModelDataOnly' to true on the document record for new
 *     document. ('New' means that it is not in localstore.)
 * @constructor
 * @struct
 * @extends {office.app.DocumentLoadBootStrapper}
 */
office.app.DesktopBootstrapper = function(
    documentInfo,
    sessionId,
    StageManager, localDocumentWriter, commandSerializer, commandStorage,
    modelPartApplier, docType, dom, enableOfflineEditing, offlineObserver,
    errorReporter,
    lifecycleManager,
    accessState,
    opt_coldStartDocumentLoader,
    opt_warmStartDocumentLoader,
    opt_stageCommands,
    opt_compactor, opt_hasPartialModelDataOnlyWhenNew) {

  /**
   * DOM helper.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.dom_ = dom;

  var isColdStartOffline = false;

  /**
   * The warm start document loader, when one is in use (i.e. when warm
   * starting).
   * @type {office.app.WarmStartDocumentLoader}
   * @private
   */
  this.warmStartDocumentLoader_ = null;

  /**
   * @type {office.offline.EditorSyncWorkerClient}
   * @private
   */
  this.syncWorkerClient_ = null;


  if (localDocumentWriter) {
    // Ensure that the access level is set from the SaveStateTracker for warm
    // start.
    localDocumentWriter.setAccessLevel(
        office.localstore.accesslevel.fromDocumentInfo(documentInfo));
  }

  var documentLoader;
  if (!opt_warmStartDocumentLoader) {
    documentLoader = this.warmStartDocumentLoader_ =
        new office.app.DefaultWarmStartDocumentLoader(errorReporter,
            commandSerializer,
            localDocumentWriter,
            documentInfo.getSaveStateTracker().isCreated());
    this.registerDisposable(documentLoader);
  } else {
    documentLoader = this.warmStartDocumentLoader_ = opt_warmStartDocumentLoader;
  }

  enableOfflineEditing = false;
  goog.base(this, documentInfo, sessionId, StageManager,
      localDocumentWriter, commandSerializer, commandStorage,
      modelPartApplier, docType, enableOfflineEditing, offlineObserver,
      errorReporter, lifecycleManager, isColdStartOffline,
      documentLoader, null, /**localStoreFactory,*/ accessState,
      false /* requireExplicitOptInCheck */,
      undefined /* opt_useAsyncWorkQueue */, opt_stageCommands,
      opt_compactor, opt_hasPartialModelDataOnlyWhenNew);

  /**
   * @type {office.app.UndeliverableQueueResolver}
   * @private
   */
  this.undeliverableQueueResolver_ = null;
};
goog.inherits(office.app.DesktopBootstrapper, office.app.DocumentLoadBootStrapper);


/**
 * The default amount of time in milliseconds for which a lock acquired by the
 * current session is valid.
 * @type {number}
 * @private
 */
office.app.DesktopBootstrapper.DEFAULT_LOCK_DURATION_ = 35000;


/**
 * @return {office.app.WarmStartDocumentLoader} An instance of a warm start
 *     document loader, or null if one is not in use.
 */
office.app.DesktopBootstrapper.prototype.getWarmStartDocumentLoader = function() {
  if (!this.isInitialized()) {
    throw Error('Calling getWarmStartDocumentLoader() before initializing ' +
        'documentLoadBootStrapper.');
  }
  return this.warmStartDocumentLoader_;
};


/** @override */
office.app.DesktopBootstrapper.prototype.initializeInternal = function() {
}


/** @override */
office.app.DesktopBootstrapper.prototype.initializePendingQueueInternal = function(
    pendingCommandQueue, initialRevision) {
  this.undeliverableQueueResolver_ = new office.app.UndeliverableQueueResolver(
      pendingCommandQueue, initialRevision, this.getErrorReporter(),
      null);
};


/** @override */
office.app.DesktopBootstrapper.prototype.onModelLoadCompleteInternal =
    function() {
      this.cancelRecoilTimer_();
};


/**
 * Cancels the recoil timer if it was previously set.
 * @private
 */
office.app.DesktopBootstrapper.prototype.cancelRecoilTimer_ =
    function() {
//  var timer = goog.global[
//      office.app.DesktopBootstrapper.RECOIL_TIMER_INSTANCE_NAME_];
//  if (timer) {
//    timer.cancel();
//  }
};


/** @override */
office.app.DesktopBootstrapper.prototype.disposeInternal =
    function() {
  goog.dispose(this.undeliverableQueueResolver_);
  goog.dispose(this.getLocalStoreFactory());
  goog.dispose(this.syncWorkerClient_);
  goog.base(this, 'disposeInternal');
};
