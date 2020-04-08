goog.provide('office.net.CommunicationsManager');

goog.require('office.net.CommandBuffer');
goog.require('office.net.CommandQueryDataBuilderImpl');
goog.require('office.net.ObfuscatedCommandQueryDataBuilderImpl');
goog.require('office.net.CommandReceiver');
goog.require('office.net.CommandStorageParam');
goog.require('office.net.CommandTransporterImpl');
goog.require('office.net.CommunicationsManagerMilestone');
goog.require('office.net.CrossDomainBcFactory');

goog.require('office.net.NetEvent');
goog.require('office.net.NetService');
goog.require('office.net.Release');
goog.require('office.net.SessionData');
goog.require('office.offline.ServerDocumentCreator');
goog.require('office.storage.CommandBundleSerializer');
goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.storage.TransformingCommandQueue');
goog.require('goog.Timer');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('office.flag.FlagService');



/**
 * @param {string} sessionId The session id for the application.
 * @param {?string} userId The obfuscated user id.
 * @param {string} urlPrefix The URL prefix.
 * @param {boolean} enableMetadataSyncing Whether metadata syncing should be
 *     enabled.
 * @param {boolean} connectOnStart Whether the browser channel should connect
 *     immediately.
 * @param {!office.info.Document} documentInfo The document info.
 * @param {!office.net.Status} netStatus The initial net status.
 * @param {!office.net.CommandStorageImpl} commandStorage The command storage.
 * @param {!office.commands.CommandSerializer} commandSerializer The command
 *     serializer.
 * @param {!office.commands.SelectionConverter} selectionCommandConverter
 *     The selection command converter.
 * @param {!office.storage.StorageMessageSerializer} storageMessageSerializer The
 *     storage message serializer.
 * @param {!office.commands.Transformer} transformer The transformer.
 * @param {!office.commands.SelectionTransformer} selectionTransformer The
 *     selection transformer.
 * @param {!office.debug.ErrorReporter} errorReporter The error reporter.
 * @param {!office.storage.PendingCommandQueue} pendingQueue The pending command
 *     queue.
 * @param {office.localstore.Document} doc The document.
 * @param {boolean} isColdStartOffline Whether this manager should adopt
 *     behavior suitable for the cold start offline version of the editor.
 * @param {!office.util.StageManager} StageManager The milestone manager
 *     used to manage application initial load milestones.
 * @param {!office.net.RequestBuilderFactory} requestBuilderFactory The request
 *     builder factory.
 * @param {office.localstore.DocumentWriterProxy} documentWriterProxy The proxy
 *     used to write local document to storage or null if not cold starting.
 * @param {(function(!office.info.Document, function()))=} opt_renamePromptFn The
 *     rename prompt function if the document should be named before creating.
 * @param {office.net.OfflineObserverApi=} opt_offlineObserver Offline observer,
 *     if one is in use.
 * @param {!office.net.InfoParameters=} opt_infoParameters Info parameters to be
 *     passed to the net service.
 * @param {number=} opt_sendCommandsIntervalMs The interval between batches of
 *     commands being sent to the server.
 * @param {number=} opt_sendSelectionIntervalMs The interval between selection
 *     changes being sent to the server.
 * @param {!office.net.BrowserChannelFactory=} opt_browserChannelFactory The
 *     browser channel factory. By default the
 *     {@code office.net.CrossDomainBcFactory} is used.
 * @param {boolean=} opt_disableReleaseIdentifier Whether to omit setting
 *      release identifier info on the net service.
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.net.CommunicationsManager = function(sessionId, userId, urlPrefix,
    enableMetadataSyncing, connectOnStart, documentInfo, netStatus,
    commandStorage, commandSerializer, selectionCommandConverter,
    storageMessageSerializer, transformer, selectionTransformer, errorReporter,
    pendingQueue, doc, isColdStartOffline, StageManager,
    requestBuilderFactory, documentWriterProxy, opt_renamePromptFn,
    opt_offlineObserver, opt_infoParameters, opt_sendCommandsIntervalMs,
    opt_sendSelectionIntervalMs, opt_browserChannelFactory,
    opt_disableReleaseIdentifier) {
  goog.base(this);

  /**
   * The session ID.
   * @type {string}
   * @private
   */
  this.sessionId_ = sessionId;

  /**
   * The user id, if any.
   * @type {?string}
   * @private
   */
  this.userId_ = userId;

  /**
   * The URL prefix.
   * @type {string}
   * @private
   */
  this.urlPrefix_ = urlPrefix;

  /**
   * Whether metadata syncing should be enabled.
   * @type {boolean}
   * @private
   */
  this.enableMetadataSyncing_ = enableMetadataSyncing;

  /**
   * Whether the browser channel should be connected after it's created.
   * @type {boolean}
   * @private
   */
  this.connectOnStart_ = connectOnStart;

  /**
   * The document metadata.
   * @type {!office.info.Document}
   * @private
   */
  this.documentInfo_ = documentInfo;

  /**
   * The command storage.
   * @type {!office.net.CommandStorageImpl}
   * @private
   */
  this.commandStorage_ = commandStorage;

  /**
   * The command serializer.
   * @type {!office.commands.CommandSerializer}
   * @private
   */
  this.commandSerializer_ = commandSerializer;

  /**
   * The selection command converter.
   * @type {!office.commands.SelectionConverter}
   * @private
   */
  this.selectionConverter_ = selectionCommandConverter;

  /**
   * The storage message serializer.
   * @type {!office.storage.StorageMessageSerializer}
   * @private
   */
  this.storageMessageSerializer_ = storageMessageSerializer;

  /**
   * The transformer.
   * @type {!office.commands.Transformer}
   * @private
   */
  this.transformer_ = transformer;

  /**
   * The selection transformer.
   * @type {!office.commands.SelectionTransformer}
   * @private
   */
  this.selectionTransformer_ = selectionTransformer;

  /**
   * The error reporter.
   * @type {!office.debug.ErrorReporter}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * The pending command queue.
   * @type {!office.storage.PendingCommandQueue}
   * @private
   */
  this.pendingQueue_ = pendingQueue;

  /**
   * The local store document if one is in use.
   * @type {office.localstore.Document}
   * @private
   */
  this.document_ = doc;

  /**
   * Whether this is a cold start load.
   * @type {boolean}
   * @private
   */
  this.isColdStartOffline_ = isColdStartOffline;

  /**
   * The milestone manager.
   * @type {!office.util.StageManager}
   * @private
   */
  this.mm_ = StageManager;

  /**
   * Proxy used to write the local document to storage, if cold start offline is
   * enabled.
   * @private {office.localstore.DocumentWriterProxy}
   */
  this.localDocumentWriter_ = documentWriterProxy;

  /**
   * The rename prompt function.
   * @type {?function(!office.info.Document, function())}
   * @private
   */
  this.renamePromptFn_ = opt_renamePromptFn || null;

  /**
   * @private {?office.net.OfflineObserverApi}
   */
  this.offlineObserver_ = opt_offlineObserver || null;

  /**
   * The interval between batches of commands being sent to the server in ms.
   * @type {number|undefined}
   * @private
   */
  this.sendCommandsIntervalMs_ = opt_sendCommandsIntervalMs;

  /**
   * The interval between batches of selection changes being sent to the server
   * in ms.
   * @type {number|undefined}
   * @private
   */
  this.sendSelectionIntervalMs_ = opt_sendSelectionIntervalMs;

  /**
   * The command buffer.
   * @type {office.net.CommandBuffer}
   * @private
   */
  this.commandBuffer_ = null;

  /**
   * The command receiver.
   * @type {office.net.CommandReceiver}
   * @private
   */
  this.commandReceiver_ = null;

  /**
   * The Browser channel factory. If null, a cross-domain browser channel
   * factory will be used and created later.
   * @type {?office.net.BrowserChannelFactory}
   * @private
   */
  this.bcFactory_ = opt_browserChannelFactory || null;

  // NOTE: Do not dispose of the net service. It is disposed automatically by
  // the office.app.LifecycleManager.
  /**
    * The net service.
    * @type {!office.net.NetService}
    * @private
    */
  this.merlotNetService_ = new office.net.NetService(
      requestBuilderFactory, undefined /* opt_window */,
      this.errorReporter_, netStatus, opt_infoParameters,
      undefined /* opt_limiter */,
      undefined /* opt_includeXsrfHeader */,
      new office.net.SessionData(
          sessionId,
          documentInfo.getSaveStateTracker().isCommentable(),
          documentInfo.getSaveStateTracker().isEditable(),
          undefined /* opt_sessionIdParameter */));
  this.merlotNetService_.setUrlPrefix(urlPrefix);
  if (opt_offlineObserver) {
    this.merlotNetService_.setOfflineObserver(opt_offlineObserver);
  }
  if (!opt_disableReleaseIdentifier) {
    office.net.Release.setReleaseIdentifierOnNetService(this.merlotNetService_);
  }

  /**
   * The event handler.
   * @type {!goog.events.EventHandler.<!office.net.CommunicationsManager>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.
      listen(this.merlotNetService_,
      office.net.NetEvent.Type.CLIENT_ERROR,
          this.handleNetServiceClientError_).
      listen(this.pendingQueue_,
          office.storage.PendingCommandQueueEventType.COMMANDS_UNDELIVERABLE,
          this.handleCommandsUndeliverable_);

  goog.Timer.callOnce(this.maybeShowRenamePrompt_, 0, this);
};
goog.inherits(office.net.CommunicationsManager, goog.events.EventTarget);


/**
 * The browser channel. Created when communications are initialized.
 * @type {office.net.BrowserChannelInterface}
 * @private
 */
office.net.CommunicationsManager.prototype.browserChannel_ = null;


/**
 * The command transporter. Created when communications are initialized.
 * @type {office.net.CommandTransporter}
 * @private
 */
office.net.CommunicationsManager.prototype.commandTransporter_ = null;


/**
 * The metadata syncer.
 * @type {office.net.MetadataSyncer}
 * @private
 */
office.net.CommunicationsManager.prototype.metadataSyncer_ = null;


/**
 * Whether the document is created on the server.
 * @type {boolean}
 * @private
 */
office.net.CommunicationsManager.prototype.documentCreatedOnServer_ = false;


/**
 * Initial model revision. Set when the communications manager is initialized.
 * @type {?number}
 * @private
 */
office.net.CommunicationsManager.prototype.initialDocumentRevision_ = null;


/**
 * @return {!office.net.Status} The status of the connection.
 */
office.net.CommunicationsManager.prototype.getNetStatus = function() {
  return this.merlotNetService_.getStatus();
};


/**
 * @return {!office.net.NetService} The net service. Should be called only after
 *     office.net.CommunicationsManagerMilestone.NETSERVICE_INITIALIZED is passed.
 */
office.net.CommunicationsManager.prototype.getNetService = function() {
  this.mm_.assertMilestone(
      office.net.CommunicationsManagerMilestone.NETSERVICE_INITIALIZED);
  return this.merlotNetService_;
};


/**
 * @return {!office.net.BrowserChannelInterface} The browser channel. Should be called
 *     only after
 *     office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED is
 *     passed.
 */
office.net.CommunicationsManager.prototype.getBrowserChannel = function() {
  this.mm_.assertMilestone(
      office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED);
  if (!this.browserChannel_) {
    throw Error('Browser channel should have been created.');
  }
  return this.browserChannel_;
};


/**
 * @return {!office.net.CommandTransporter} The command transporter. Should be
 *     called only after
 *     office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED is
 *     passed.
 */
office.net.CommunicationsManager.prototype.getCommandTransporter = function() {
  this.mm_.assertMilestone(
      office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED);
  if (!this.commandTransporter_) {
    throw Error('Command transporter should have been created.');
  }
  return this.commandTransporter_;
};


/**
 * @return {!office.net.CommandReceiver} The command receiver. Should be
 *     called only after
 *     office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED is
 *     passed.
 */
office.net.CommunicationsManager.prototype.getCommandReceiver = function() {
  this.mm_.assertMilestone(
      office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED);
  if (!this.commandReceiver_) {
    throw Error('Command receiver should have been created.');
  }
  return this.commandReceiver_;
};


/**
 * Gets the context object for the debug dump.
 * @return {!Object} The debug dump info.
 * @private
 */
office.net.CommunicationsManager.prototype.getDebugContext_ = function() {
  var context = {};
  //context['docInfo_Id'] = this.documentInfo_.getCosmoId();
  //context['docInfo_LastModifiedTime'] =
  //    this.documentInfo_.getLastModifiedTime();
  //context['docInfo_SaveState'] =
  //    this.documentInfo_.getSaveStateTracker().getSaveState().getValue();
  //goog.object.extend(context, this.commandStorage_.getDebugContext());
  return context;
};


/**
 * Handles a client error while processing any net request.
 * @param {!office.net.NetEvent} e The failure event.
 * @private
 */
office.net.CommunicationsManager.prototype.handleNetServiceClientError_ =
    function(e) {
  e.fatalError(this.errorReporter_, '',
      this.getDebugContext_());
};


/**
 * Handles the pending queue becoming undeliverable by disconnecting the
 * browser channel.
 * @param {!goog.events.Event} e The pending queue undeliverable event.
 * @private
 */
office.net.CommunicationsManager.prototype.handleCommandsUndeliverable_ =
    function(e) {
  this.pause();
};


/**
 * Shows the rename prompt when this is an untitled cold-started document.
 * @private
 */
office.net.CommunicationsManager.prototype.maybeShowRenamePrompt_ = function() {
  // Only show the rename prompt when the document doesn't have a title, any
  // modifications and is being cold started. This ensures that the title was
  // not previously set or sent to the server.
  if (!this.document_ ||
      !this.isColdStartOffline_ ||
      this.document_.getTitle() ||
      !goog.isNull(this.document_.getLastModifiedServerTimestamp()) ||
      !this.renamePromptFn_) {
    this.createDocumentIfNeeded_();
    return;
  }

  this.renamePromptFn_(
      this.documentInfo_, goog.bind(this.createDocumentIfNeeded_, this));
};


/**
 * Creates the document on the server if it only exists in local store.
 * @private
 */
office.net.CommunicationsManager.prototype.createDocumentIfNeeded_ = function() {
  if (!this.isColdStartOffline_ || !this.document_) {
    // No creation needed, notification that the network is now ready.
    this.notifyNetworkReadyAndMarkDocumentCreated_();
    return;
  }
  // Prevent initializing communications in a secondary session of a cold
  // started document created offline to avoid multiple sessions trying to
  // create a document when reconnected to the network.
  if (!this.documentInfo_.getSaveStateTracker().areChangesStoredLocally() &&
      !this.document_.getIsCreated()) {
    return;
  }

  var createDeferred = office.offline.ServerDocumentCreator.
      createDocumentIfNeeded(
      this.document_, this.merlotNetService_, this.errorReporter_);
  createDeferred.addCallback(goog.bind(
      this.notifyNetworkReadyAndMarkDocumentCreated_, this));
  createDeferred.addErrback(
      goog.bind(function() {
        this.errorReporter_.fatalError(Error('Document not created.'));
      }, this));
};


/**
 * Passes the net service initialized milestone and marks the bit to indicate
 * that the document has been successfully created on the server. If
 * initialization has already been requested, then performs initialization.
 * @private
 */
office.net.CommunicationsManager.prototype.
    notifyNetworkReadyAndMarkDocumentCreated_ = function() {
  this.mm_.passMilestone(
      office.net.CommunicationsManagerMilestone.NETSERVICE_INITIALIZED);
  this.documentCreatedOnServer_ = true;
  // Marking the doc as created is only neccessary when cold starting. When
  // warm starting, either a document record already exists in which the is
  // not created bit is false, or the bit will be correctly set when the first
  // mutations come down.
  //if (this.localDocumentWriter_ && this.isColdStartOffline_) {
  //  this.localDocumentWriter_.setIsCreated(true);
  //  this.localDocumentWriter_.flush();
  //}
  this.maybeInitialize_();
};


/**
 * Initializes the parts that are needed once the network is ready and the
 * document is available on the server.
 * @param {number} initialDocumentRevision The initial document revision.
 */
office.net.CommunicationsManager.prototype.initialize = function(
    initialDocumentRevision) {
  this.initialDocumentRevision_ = initialDocumentRevision;
  this.documentCreatedOnServer_ = true;
  this.maybeInitialize_();
};


/**
 * Initializes communications if initialization has been requested and the
 * document has been created on the server.
 * @private
 */
office.net.CommunicationsManager.prototype.maybeInitialize_ = function() {
  // Marking the doc as created is only neccessary when cold starting. When
  if (!goog.isDefAndNotNull(this.initialDocumentRevision_) ||
      !this.documentCreatedOnServer_ || this.pendingQueue_.isUndeliverable()) {
    return;
  }

  if (this.browserChannel_) {
    //throw Error('Browser channel already initialized');
    return;
  }

  if (!this.bcFactory_) {
    var isEditable = this.documentInfo_.getSaveStateTracker().isEditable();
    var accessLevel = isEditable ? 'WRITE' : 'READ';
    this.bcFactory_ = new office.net.CrossDomainBcFactory(
        this.documentInfo_.getCosmoId(),
        this.errorReporter_, office.net.CommandStorageParam.ID,
        undefined /* opt_domHelper */, undefined /* opt_xdbcmUri */,
        this.isColdStartOffline_, undefined /* opt_qpsLimitConfig */,
        this.offlineObserver_ || undefined,
        accessLevel);
  }

  var browserChannel = this.browserChannel_ =
      this.bcFactory_.createBrowserChannel();
  if (this.userId_) {
    browserChannel.setUserId(this.userId_);
  }
  browserChannel.setExpectWriteAccess(
      this.documentInfo_.getSaveStateTracker().isEditable());
  browserChannel.setExpectCommentAccess(
      this.documentInfo_.getSaveStateTracker().isCommentable());

  this.merlotNetService_.registerBrowserChannel(browserChannel);

  if (this.connectOnStart_) {
    this.resume();
  }

//  if (this.enableMetadataSyncing_) {
//    this.metadataSyncer_ = new office.net.MetadataSyncer(
//        this.documentInfo_, this.merlotNetService_, browserChannel);
//  }

  var useObfuscation = office.flag.FlagService.getInstance().getBoolean(
      office.flag.Flags.ENABLE_OBFUSCATION);
  var commandBuilder;
  if (!(goog.userAgent.product.IPHONE || goog.userAgent.product.ANDROID)
      && useObfuscation) {
    commandBuilder = new office.net.ObfuscatedCommandQueryDataBuilderImpl(
        new office.storage.CommandBundleSerializer(
            this.commandSerializer_));
  } else {
    commandBuilder = new office.net.CommandQueryDataBuilderImpl(
        new office.storage.CommandBundleSerializer(
            this.commandSerializer_));
  }

  var commandTransporter = this.commandTransporter_ =
      new office.net.CommandTransporterImpl(
          !!this.sessionId_ /* shouldProvideSid */,
          this.documentInfo_.getCosmoId(), this.merlotNetService_,
          this.commandSerializer_, this.selectionConverter_,
          //new office.net.ObfuscatedCommandQueryDataBuilderImpl(
          //new office.net.CommandQueryDataBuilderImpl(
          //    new office.storage.CommandBundleSerializer(
          //        this.commandSerializer_)
          commandBuilder
      //)
  );
  var transformingCommandQueue = office.storage.TransformingCommandQueue.create(
      this.pendingQueue_, this.initialDocumentRevision_,
      this.transformer_, this.selectionTransformer_, this.errorReporter_);
  this.commandReceiver_ = new office.net.CommandReceiver(this.sessionId_,
      commandTransporter, this.pendingQueue_, transformingCommandQueue,
      this.storageMessageSerializer_, this.errorReporter_,
      browserChannel, this.metadataSyncer_, this.isColdStartOffline_);
  var commandBuffer = this.commandBuffer_ = office.net.CommandBuffer.create(
      this.pendingQueue_, commandTransporter,
      this.sendCommandsIntervalMs_, this.sendSelectionIntervalMs_);
  this.commandStorage_.setupCommunications(
      commandTransporter,
      commandBuffer,
      this.commandReceiver_,
      this.documentInfo_,
      this);

  this.mm_.passMilestone(
      office.net.CommunicationsManagerMilestone.COMMUNICATIONS_INITIALIZED);
};


/**
 * Pauses all network communication.
 */
office.net.CommunicationsManager.prototype.pause = function() {
  if (this.browserChannel_) {
    this.browserChannel_.disconnectIfNeeded();
  } else {
    this.connectOnStart_ = false;
  }
};


/**
 * Resumes network communication.
 */
office.net.CommunicationsManager.prototype.resume = function() {
  if (this.pendingQueue_.isUndeliverable()) {
    return;
  }

  if (this.browserChannel_) {
    // TODO(jcai):
    var currentUrl = new goog.Uri(window.location.href);
    if (currentUrl.getParameterValue('ro') == 'true') {
      return;
    }
    this.browserChannel_.connectIfNeeded(this.documentInfo_.getCosmoId(),this.sessionId_, this.urlPrefix_);
  } else {
    this.connectOnStart_ = true;
  }
};


/**
 * Sets the timer interval for sending batches of commands to the server.
 * @param {number} interval New interval, in milliseconds.
 */
office.net.CommunicationsManager.prototype.setCommandsBatchInterval = function(
    interval) {
  if (this.commandBuffer_) {
    this.commandBuffer_.setCommandsBatchInterval(interval);
  }
  this.sendCommandsIntervalMs_ = interval;
};


/**
 * Sets the timer interval for sending updated selection to the server.
 * @param {number} interval New interval, in milliseconds.
 */
office.net.CommunicationsManager.prototype.setSelectionInterval = function(
    interval) {
  if (this.commandBuffer_) {
    this.commandBuffer_.setSelectionInterval(interval);
  }
  this.sendSelectionIntervalMs_ = interval;
};


/** @override */
office.net.CommunicationsManager.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.metadataSyncer_,
      this.eventHandler_,
      this.browserChannel_,
      // This has to be done after the browser channel since the browser channel
      // uses the bcFactory when disposing itself.
      this.bcFactory_);

  goog.base(this, 'disposeInternal');
};
