goog.provide('office.app.ModelLoader');

goog.require('office.app.ChunkQueueingStrategy');
goog.require('office.app.CommandBasedModelPart');
goog.require('office.app.ModelLoadEventType');
goog.require('office.diagnostics.InitialLoadTimingImpl');
goog.require('office.diagnostics.InitialLoadTimingKeys');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.util.AsyncWorkQueue');
goog.require('office.util.StageManager');
goog.require('office.util.SyncWorkQueue');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events');



//  Move the application load logic from here into the
// DocumentLoadBootstrapper.
/**
 * A model loader. If there are no commands in the pending queue, the user can
 * go basic editable after the first model chunk has been received, and editable
 * after the document has loaded. If the pending queue has commands, the user
 * may not go basic editable after receiving the first chunk, and must wait for
 * the pending queue to be cleared before going fully editable. Uses an
 * application-specific {@code office.app.ModelPartApplier} to apply the model
 * parts to the document model.
 * @param {!office.app.ModelPartApplier} modelPartApplier The applier responsible
 *     for applying incoming model parts to the model.
 * @param {!office.app.DocumentLoader} documentLoader The document loader
 *     responsible for loading the document. This class listens on events fired
 *     by this document loader to decide when to go basic editable or editable.
 * @param {!office.app.ModelLoadObserver} modelLoadObserver The model load
 *     observer, which will be notified when the document goes basic editable,
 *     editable, and when the document load is complete.
 * @param {!office.app.ChunkQueueingStrategy} chunkQueueingStrategy The strategy
 *     for queueing model chunks.
 * @param {!office.util.WorkQueue} workQueue The work queue to apply model
 *     parts. Mobile applications use an async work queue to yield the thread
 *     of execution to the native code.
 * @param {!apps.diagnostics.LatencyReporter=} opt_latencyReporter The latency
 *     reporter to use for setting experiment data.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.app.ModelLoader = function(modelPartApplier, documentLoader,
    modelLoadObserver, chunkQueueingStrategy, workQueue, opt_latencyReporter) {
  goog.base(this);

  /**
   * The model part applier.
   * @type {!office.app.ModelPartApplier}
   * @private
   */
  this.modelPartApplier_ = modelPartApplier;

  /**
   * The model load observer.
   * @type {!office.app.ModelLoadObserver}
   * @private
   */
  this.modelLoadObserver_ = modelLoadObserver;

  /**
   * The strategy for queueing model chunks.
   * @type {!office.app.ChunkQueueingStrategy}
   * @private
   */
  this.chunkQueueingStrategy_ = chunkQueueingStrategy;

  /**
   * Model parts that are not yet applied. This will prevent unnecessary
   * apply/flush/render cycles.
   * @private {!Array.<!office.app.ModelPart>}
   */
  this.unappliedModelParts_ = [];

  /**
   * @type {!office.util.WorkQueue}
   * @private
   */
  this.workQueue_ = workQueue;

  /**
   * The timing manager.
   * @type {!office.diagnostics.InitialLoadTiming}
   * @private
   */
  this.timing_ = office.diagnostics.InitialLoadTimingImpl.getInstance();

  /**
   * The milestone manager, which makes it easier to deal with cases where we
   * have logically parallel streams of activity.
   * @type {!office.util.StageManager}
   * @private
   */
  this.mm_ = new office.util.StageManager(this);
  this.mm_.
      addRule(
          [office.app.ModelLoader.Milestone_.PENDING_QUEUE_SET,
           office.app.ModelLoader.Milestone_.MODEL_REVISION_SET],
          this.initializePendingQueue_).
      addRule(
          [office.app.ModelLoader.Milestone_.PENDING_QUEUE_INITIALIZED,
           office.app.ModelLoader.Milestone_.START_MODEL_APPLICATION,
           office.app.ModelLoader.Milestone_.FIRST_CHUNK_LOADED],
          this.maybeSetBasicEditable_).
      addRule(
          [office.app.ModelLoader.Milestone_.PENDING_QUEUE_INITIALIZED,
           office.app.ModelLoader.Milestone_.START_MODEL_APPLICATION,
           office.app.ModelLoader.Milestone_.MODEL_LOAD_COMPLETE],
          this.completeDocumentLoad_).
      start();

  /**
   * The event handler.
   * @type {!goog.events.EventHandler.<!office.app.ModelLoader>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.
      listen(documentLoader,
          office.app.ModelLoadEventType.MODEL_LOAD_START,
          this.handleModelLoadStart_).
      listen(documentLoader,
          office.app.ModelLoadEventType.MODEL_PART_AVAILABLE,
          this.handleModelPartAvailable_).
      listen(documentLoader,
          office.app.ModelLoadEventType.MODEL_LOAD_COMPLETE,
          this.handleModelLoadComplete_);

  /**
   * Whether we've notified the model load observer that basic editable has
   * occurred.
   * @type {boolean}
   * @private
   */
  this.notifiedBasicEditable_ = false;

  /**
   * The latency reporter to use for setting experiment information.
   * @type {apps.diagnostics.LatencyReporter}
   * @private
   */
  this.latencyReporter_ = opt_latencyReporter || null;
};
goog.inherits(office.app.ModelLoader, goog.events.EventTarget);


/**
 * Milestones used by the model loader.
 * @enum {string}
 * @private
 */
office.app.ModelLoader.Milestone_ = {
  FIRST_CHUNK_LOADED: goog.events.getUniqueId('office-app-ml-fcl'),
  MODEL_LOAD_COMPLETE: goog.events.getUniqueId('office-app-ml-mlc'),
  MODEL_REVISION_SET: goog.events.getUniqueId('office-app-ml-mrs'),
  PENDING_QUEUE_INITIALIZED: goog.events.getUniqueId('office-app-ml-pqi'),
  PENDING_QUEUE_SET: goog.events.getUniqueId('office-app-ml-pqs'),
  START_MODEL_APPLICATION: goog.events.getUniqueId('office-app-ml-sma')
};


/**
 * The head revision of the model being loaded. Set when the MODEL_START_LOAD
 * event is received.
 * @type {number}
 * @private
 */
office.app.ModelLoader.prototype.modelRevision_ = 0;


/**
 * Whether the first model chunk has arrived.
 * @type {boolean}
 * @private
 */
office.app.ModelLoader.prototype.waitingForFirstChunk_ = true;


/**
 * Whether model load complete has been handled.
 * @type {boolean}
 * @private
 */
office.app.ModelLoader.prototype.waitingForModelLoadComplete_ = true;


/**
 * Whether the model is loaded incrementally (as opposed to from a snapshot).
 * @type {boolean}
 * @private
 */
office.app.ModelLoader.prototype.incrementalLoad_ = false;


/**
 * The pending command queue.
 * @type {office.storage.PendingCommandQueue}
 * @private
 */
office.app.ModelLoader.prototype.pendingCommandQueue_ = null;


/**
 * Whether or not the pending queue has offline commands before load starts.
 * @type {?boolean}
 * @private
 */
office.app.ModelLoader.prototype.isHoldingOfflinePendingCommands_ = null;


/**
 * Whether any model parts have been applied yet.
 * @type {boolean}
 * @private
 */
office.app.ModelLoader.prototype.hasAppliedModelParts_ = false;


/**
 * @param {!office.storage.PendingCommandQueue} pendingCommandQueue The pending
 *     command queue.
 */
office.app.ModelLoader.prototype.setPendingCommandQueue = function(
    pendingCommandQueue) {
  goog.asserts.assert(!this.pendingCommandQueue_, 'Pending queue already set.');
  this.pendingCommandQueue_ = pendingCommandQueue;

  this.isHoldingOfflinePendingCommands_ =
      pendingCommandQueue.hasSendableCommands() ||
      pendingCommandQueue.isUndeliverable();

  this.chunkQueueingStrategy_.setPendingQueueIsEmpty(
      !this.isHoldingOfflinePendingCommands_);
  this.mm_.passMilestone(
      office.app.ModelLoader.Milestone_.PENDING_QUEUE_SET);
};


/**
 * Notifies that the application is ready to apply model chunks. When a chunk
 * queueing strategy other than NONE is used, chunks will not be applied until
 * this method is executed.
 */
office.app.ModelLoader.prototype.enableQueuedChunksApplication = function() {
  this.chunkQueueingStrategy_.setStartModelApplication();
  if (!this.chunkQueueingStrategy_.shouldQueueChunk()) {
    this.applyQueuedCommands_(this.incrementalLoad_);
  }
  this.mm_.passMilestone(office.app.ModelLoader.Milestone_.START_MODEL_APPLICATION);
};


/**
 * @return {!office.storage.PendingCommandQueue} The pending command queue.
 * @private
 */
office.app.ModelLoader.prototype.getPendingCommandQueue_ = function() {
  if (!this.pendingCommandQueue_) {
    throw Error('Pending command queue not yet set.');
  }
  return this.pendingCommandQueue_;
};


/**
 * Add work to the work queue to apply a model part to the model.
 * @param {!office.app.ModelPart} modelPart The model part that has been loaded.
 * @param {boolean} isIncremental Whether the given mutations are incremental.
 * @private
 */
office.app.ModelLoader.prototype.addWorkToApplyModelPart_ = function(
    modelPart, isIncremental) {
  this.workQueue_.addWork(
      goog.bind(this.applyModelPart_, this, modelPart, isIncremental));
};


/**
 * Applies a model part to the model. The time required to apply the model part
 * is calculated and the model load time is incremented.
 * @param {!office.app.ModelPart} modelPart The model part that has been loaded.
 * @param {boolean} isIncremental Whether the given mutations are incremental.
 * @private
 */
office.app.ModelLoader.prototype.applyModelPart_ = function(
    modelPart, isIncremental) {
  var startModelLoad = goog.now();

  this.modelPartApplier_.applyModelPart(modelPart, isIncremental);

  var modelLoadTime = goog.now() - startModelLoad;
  this.timing_.incrementTime(
      office.diagnostics.InitialLoadTimingKeys.MODEL_LOAD, modelLoadTime);

  if (!this.hasAppliedModelParts_) {
    this.timing_.setTime(office.diagnostics.InitialLoadTimingKeys.
        FIRST_MODEL_PART_LOADED);
    this.timing_.setTime(office.diagnostics.InitialLoadTimingKeys.
        START_FIRST_MODEL_PART_JS_YIELD);
    // Determine the latency of the JS thread unblocking after loading this
    // model part.
    goog.Timer.callOnce(
        this.calculateFirstPartLatencyEnd_, 0 /* opt_delay */, this);

    this.chunkQueueingStrategy_.setHasLoadedChunk(true);

    this.hasAppliedModelParts_ = true;
    this.modelLoadObserver_.notifyFirstModelChunkLoaded();
    this.mm_.passMilestone(
        office.app.ModelLoader.Milestone_.FIRST_CHUNK_LOADED);
  }
};


/**
 * Handles a model load start event.
 * @param {!office.app.ModelLoadStartEvent} e The model load start event.
 * @private
 */
office.app.ModelLoader.prototype.handleModelLoadStart_ = function(e) {
  this.modelRevision_ = e.revision;

  this.mm_.passMilestone(
      office.app.ModelLoader.Milestone_.MODEL_REVISION_SET);
};


/**
 * Handles a model part available event.
 * @param {!office.app.ModelPartAvailableEvent} e The model part available
 *     event.
 * @private
 */
office.app.ModelLoader.prototype.handleModelPartAvailable_ = function(e) {
  if (this.waitingForFirstChunk_) {
    // The revision of the part is not necessarily the model revision because
    // incremental changes can be present when loading from local storage.
    this.incrementalLoad_ = this.modelRevision_ != e.revision;
    this.chunkQueueingStrategy_.setIncrementalLoad(this.incrementalLoad_);
    this.waitingForFirstChunk_ = false;
  }

  var modelPart = e.modelPart;
  if (goog.isDefAndNotNull(modelPart)) {
    this.queueUnappliedModelPart_(modelPart);
    if (!this.chunkQueueingStrategy_.shouldQueueChunk()) {
      this.applyQueuedCommands_(this.incrementalLoad_);
    }
  }
};


/**
 * Queues a model part to be applied later.
 * @param {!office.app.ModelPart} part The model part to apply later.
 * @private
 */
office.app.ModelLoader.prototype.queueUnappliedModelPart_ = function(part) {
  this.unappliedModelParts_.push(part);
};


/**
 * If the model load complete milestone has not been passed, then set the end
 * time for the first model part latency calculation.
 * @private
 */
office.app.ModelLoader.prototype.calculateFirstPartLatencyEnd_ = function() {
  if (this.isDisposed()) {
    return;
  }
  if (this.waitingForModelLoadComplete_) {
    this.timing_.setTime(
        office.diagnostics.InitialLoadTimingKeys.END_FIRST_MODEL_PART_JS_YIELD);
  }
};


/**
 * Initializes the pending queue and dispatch event to basic editing if the
 * pending queue is empty and there are no incremental changes.
 * NOTE: This must be called after the pending queue and model revision is set.
 * @private
 */
office.app.ModelLoader.prototype.initializePendingQueue_ = function() {
  // Initialize the pending queue with the final model revision.
  var pendingCommandQueue = this.getPendingCommandQueue_();
  pendingCommandQueue.initialize(this.modelRevision_);

  this.mm_.passMilestone(
      office.app.ModelLoader.Milestone_.PENDING_QUEUE_INITIALIZED);

  if (!this.chunkQueueingStrategy_.shouldQueueChunk()) {
    this.applyQueuedCommands_(this.incrementalLoad_);
  }
};


/**
 * Sets the document as basic editable if the model load was not incremental
 * and if the pending queue was empty. If we are postponing loading due to
 * either of those cases, then we assume that the document will be editable
 * in the future, and it isn't set basic editable.
 * @private
 */
office.app.ModelLoader.prototype.maybeSetBasicEditable_ = function() {
  goog.asserts.assert(
      goog.isDefAndNotNull(this.isHoldingOfflinePendingCommands_));

  // We now have enough information to start loading. If the load is incremental
  // or the pending queue has changes, then continue postponing. Otherwise,
  // apply all unapplied commands, and keep applying from this point on.
  if (!this.incrementalLoad_ &&
      !this.isHoldingOfflinePendingCommands_) {
    // The application may not go editable at all if the pending queue has
    // commands. If the pending queue does not, the application may go basic
    // editable after receiving the first model chunk, and the
    // application-specific model loaders will handle any basic transformations
    // necessary. In warm start, the final chunk revision will never be
    // provided, and in cold start, the final chunk revision will be provided.
    // If the revision differs from the revision of the snapshot, there are
    // further incremental changes and the application can not go basic editable
    // until these are applied.
    goog.asserts.assert(this.hasAppliedModelParts_);
    // Synchronously notification of basic editable, so that this doesn't end up at
    // the end of the work queue after already pending model part applications.
    this.notifyBasicEditable_();
  }
};


/**
 * Handles the event indicating that model load has completed.
 * @param {!goog.events.Event} e The event.
 * @private
 */
office.app.ModelLoader.prototype.handleModelLoadComplete_ = function(e) {
  this.workQueue_.addWork(goog.bind(this.completeModelLoad_, this));
};


/**
 * Completes model load.
 * @private
 */
office.app.ModelLoader.prototype.completeModelLoad_ = function() {
  this.waitingForModelLoadComplete_ = false;
  this.timing_.setTime(office.diagnostics.InitialLoadTimingKeys.MODEL_LOAD_COMPLETE);
  this.mm_.passMilestone(
      office.app.ModelLoader.Milestone_.MODEL_LOAD_COMPLETE);
};


/**
 * Complete document load by either applying the pending queue optimistically
 * if revisions match or waiting for it to be sent to the server.
 * NOTE: This should be called after the pending queue is initialized and the
 * model has been fully loaded.
 * @private
 */
office.app.ModelLoader.prototype.completeDocumentLoad_ = function() {
  goog.asserts.assert(
      goog.isDefAndNotNull(this.isHoldingOfflinePendingCommands_));

  // Determine whether the pending queue is holding commands that apply to an
  // earlier model revision than was loaded. If so, the commands must be applied
  // over the browser channel. This will go away when our document load process
  // is always-offline.
  var pendingCommandQueue = this.getPendingCommandQueue_();

  if (!pendingCommandQueue.isAnachronistic() &&
      this.isHoldingOfflinePendingCommands_) {
    this.queueUnappliedModelPart_(new office.app.CommandBasedModelPart(
        pendingCommandQueue.getCommands()));
  }
  this.applyQueuedCommands_(
      this.isHoldingOfflinePendingCommands_ || this.incrementalLoad_);

  // For non-anachronistic pending queues, all model parts were applied, so
  // the document can go basic editable, unless the pending queue is
  // undeliverable.
  if (!pendingCommandQueue.isAnachronistic() &&
      !pendingCommandQueue.isUndeliverable()) {
    this.workQueue_.addWork(goog.bind(this.notifyBasicEditable_, this));
  }

  this.workQueue_.addWork(goog.bind(this.notifyServerModelApplied_, this));

  if (!pendingCommandQueue.isUndeliverable()) {
    if (pendingCommandQueue.isAnachronistic()) {
      // If the revisions in the pending queue do not match, wait for the
      // anachronism to be resolved.
      this.eventHandler_.listenOnce(pendingCommandQueue,
          office.storage.PendingCommandQueueEventType.ANACHRONISM_RESOLVED,
          this.handleAnchronismResolved_);
      //this.handleAnchronismResolved_();
      //var defer = pendingCommandQueue.clearAndReset();
      //defer.addCallback(goog.bind(this.notifyEditableAndModelLoadComplete_, this));
      //this.notifyEditableAndModelLoadComplete_();
    } else {
      this.notifyEditableAndModelLoadComplete_();
    }
  } else {
    // Documents with undeliverable pending queues do not go editable.
    this.workQueue_.addWork(
        goog.bind(this.modelLoadObserver_.notifyModelLoadComplete,
            this.modelLoadObserver_));
  }
};


/**
 * Sends the notification that the server model has been applied.
 * @private
 */
office.app.ModelLoader.prototype.notifyServerModelApplied_ = function() {
  //this.timing_.setTime(
  //    office.diagnostics.InitialLoadTimingKeys.START_JS_APPLICATION_SET_LOADED);

  this.modelLoadObserver_.notifyServerModelApplied(this.modelRevision_);

  //this.timing_.setTime(
  //    office.diagnostics.InitialLoadTimingKeys.END_JS_APPLICATION_SET_LOADED);
};


/**
 * Applies queued and pending commands to the model.
 * @param {boolean} isIncremental Whether the model is loaded incrementally,
 *     i.e., there are incrementals or pending commands to be applied to the
 *     model.
 * @private
 */
office.app.ModelLoader.prototype.applyQueuedCommands_ = function(isIncremental) {
  if (isIncremental && this.unappliedModelParts_.length > 0) {
    // If there are incrementals or pending commands, add all model parts to a
    // single chunk, so all commands are applied before anything is rendered.
    var unappliedModelPart = this.unappliedModelParts_[0];
    for (var i = 1; i < this.unappliedModelParts_.length; i++) {
      unappliedModelPart = unappliedModelPart.append(
          this.unappliedModelParts_[i]);
    }
    this.unappliedModelParts_ = [unappliedModelPart];
  }
  for (var i = 0; i < this.unappliedModelParts_.length; i++) {
    this.addWorkToApplyModelPart_(this.unappliedModelParts_[i], isIncremental);
  }
  this.unappliedModelParts_ = [];
};


/**
 * Handles the event fired by the pending queue indicating that anchronism has
 * been resolved.
 * empty.
 * @param {!goog.events.Event} e The anachronism resolved event.
 * @private
 */
office.app.ModelLoader.prototype.handleAnchronismResolved_ = function(e) {
  if (this.unappliedModelParts_.length > 0) {
    throw Error(
        'All model parts should be applied before resolving anachronism.');
  }

  this.addWorkToApplyModelPart_(new office.app.CommandBasedModelPart(
      this.getPendingCommandQueue_().getCommands()), true /* isIncremental */);
  this.notifyEditableAndModelLoadComplete_();
};


/**
 * Notifies the model load observer of basic editable. Ensures that the
 * #notifiedBasicEditable_ bit is set when calling #notifyBasicEditable. If the
 * bit is already set, do nothing.
 * @private
 */
office.app.ModelLoader.prototype.notifyBasicEditable_ = function() {
  if (!this.notifiedBasicEditable_) {
    this.modelLoadObserver_.notifyBasicEditable();
    this.notifiedBasicEditable_ = true;
  }
};


/**
 * Calls notifyBasicEditable_ first.
 * @private
 */
office.app.ModelLoader.prototype.notifyEditableAndModelLoadComplete_ =
    function() {
  this.workQueue_.addWork(
      goog.bind(this.completeNotifyEditableAndModelLoadComplete_, this));
};


/**
 * The completion handler for notifying that the model's editable and model
 * load complete bits have been set.
 * @private
 */
office.app.ModelLoader.prototype.completeNotifyEditableAndModelLoadComplete_ =
    function() {
  this.notifyBasicEditable_();
  this.modelLoadObserver_.notifyEditable();
  this.modelLoadObserver_.notifyModelLoadComplete();
};


/** @override */
office.app.ModelLoader.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.eventHandler_,
      this.mm_,
      this.workQueue_);

  goog.base(this, 'disposeInternal');
};


/**
 * Creates a new model loader.
 * @param {!office.app.ModelPartApplier} modelPartApplier The applier responsible
 *     for applying incoming model parts to the model.
 * @param {!office.app.DocumentLoader} documentLoader The document loader
 *     responsible for loading the document. This class listens on events fired
 *     by this document loader to decide when to go basic editable or editable.
 * @param {!office.app.ModelLoadObserver} modelLoadObserver The model load
 *     observer, which will be notified when the document goes basic editable,
 *     editable, and when the document load is complete.
 * @param {boolean} isColdStart Whether this is the cold start variant of the
 *     application.
 * @param {!apps.diagnostics.LatencyReporter=} opt_latencyReporter The latency
 *     reporter to use for setting experiment data.
 * @param {boolean=} opt_useAsyncWorkQueue Whether to use an async work queue to
 *     apply model parts on a timer. This is used by mobile applications to
 *     yield the thread of execution to the native code.
 * @return {!office.app.ModelLoader} The model loader.
 */
office.app.ModelLoader.create = function(modelPartApplier, documentLoader,
    modelLoadObserver, isColdStart, opt_latencyReporter,
    opt_useAsyncWorkQueue) {
  var chunkQueueingStrategy;
  if (isColdStart && office.flag.getInstance().getBoolean(
      office.flag.Flags.ENABLE_QUEUED_CHUNKS_COLD_START)) {
    chunkQueueingStrategy =
        new office.app.ChunkQueueingStrategy.UntilIncrementalsApplied();
  } else if (!isColdStart && office.flag.getInstance().getBoolean(
      office.flag.Flags.ENABLE_QUEUED_CHUNKS_WARM_START)) {
    chunkQueueingStrategy =
        new office.app.ChunkQueueingStrategy.UntilIncrementalsApplied(
            true /* opt_shouldApplyFirstChunk */);
  } else {
    chunkQueueingStrategy = new office.app.ChunkQueueingStrategy.None();
  }
  var workQueue = opt_useAsyncWorkQueue ?
      new office.util.AsyncWorkQueue() : new office.util.SyncWorkQueue();
  return new office.app.ModelLoader(modelPartApplier, documentLoader,
      modelLoadObserver, chunkQueueingStrategy, workQueue, opt_latencyReporter);
};
