goog.provide('office.net.SaveStateSyncer');

goog.require('apps.time.SimpleClock');
goog.require('office.chrome.EventBasedMessageNotifier');
goog.require('office.chrome.EventBasedTimeoutMessageNotifier');
goog.require('office.chrome.constants');
goog.require('office.commands.NullCommand');
goog.require('office.info.SaveStateTracker');
goog.require('office.net.CommandStorageEventType');
goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.storage.StoredQueueEventType');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');




office.net.SaveStateSyncer = function(documentInfo, commandStorage,
    pendingCommandQueue, userIdConverterFn, messageNotifier) {
  goog.base(this);


  this.documentInfo_ = documentInfo;


  this.commandStorage_ = commandStorage;


  this.pendingCommandQueue_ = pendingCommandQueue;


  this.userIdConverterFn_ = userIdConverterFn;


  this.creationCommand_ = office.commands.NullCommand.getInstance();


  var MSG_SAVESTATESYNCER_STORED_QUEUE_BEING_RESOLVED = goog.getMsg(
      'Syncing offline changes...');


















  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(pendingCommandQueue,
          office.storage.PendingCommandQueueEventType.COMMAND_AVAILABLE,
          this.handleCommandAvailable_).
      listen(pendingCommandQueue,
          office.storage.PendingCommandQueueEventType.WAITING_FOR_ACK,
          this.handleWaitingForAck_).
      listen(pendingCommandQueue,
          office.storage.PendingCommandQueueEventType.COMMANDS_PERSISTED,
          this.handleCommandsPersisted_).
      listen(pendingCommandQueue,
          office.storage.PendingCommandQueueEventType.PENDING_QUEUE_RESET,
          this.handlePendingQueueReset_).
      listen(commandStorage,
          office.net.CommandStorageEventType.RECEIVE_STORAGE_MESSAGE,
          this.handleReceiveStorageMessage_).
      listen(commandStorage,
          office.net.CommandStorageEventType.MESSAGE_PROCESSING_CHANGE,
          this.handleSuspendMessageProcessing_, true).
      listen(documentInfo.getSaveStateTracker(),
          office.info.SaveStateTracker.EventType.CREATE_REQUESTED,
          this.handleCreateRequested_);

  documentInfo.getSaveStateTracker().setClientStorageAvailable(
      pendingCommandQueue.isPersistent());
};
goog.inherits(office.net.SaveStateSyncer, goog.Disposable);



office.net.SaveStateSyncer.prototype.getDebugContext = function() {
  var context = {};




  return context;
};



office.net.SaveStateSyncer.prototype.handleCommandAvailable_ = function(e) {
  if (!this.documentInfo_.getSaveStateTracker().isCreated()) {

    this.documentInfo_.getSaveStateTracker().setCreating();
  }
  this.updateSaveState_();
};



office.net.SaveStateSyncer.prototype.handleCommandsPersisted_ = function(e) {
  this.updateSaveState_();
};



office.net.SaveStateSyncer.prototype.handlePendingQueueReset_ = function(e) {
  this.updateSaveState_();
};



office.net.SaveStateSyncer.prototype.handleWaitingForAck_ = function(e) {
  this.updateSaveState_();
};



office.net.SaveStateSyncer.prototype.handleReceiveStorageMessage_ = function(e) {
  var storageMessage = e.storageMessage;
  if (storageMessage.isMetadata()) {
    return;
  }

  if (!this.documentInfo_.getSaveStateTracker().isCreated()) {



    this.documentInfo_.getSaveStateTracker().setCreated();
  }

  if (e.isAck) {
    this.documentInfo_.setLastModified(null, apps.time.SimpleClock.now());
  } else if (storageMessage.getUserId() && storageMessage.getTimeMs()) {
    var name = this.userIdConverterFn_(
 (storageMessage.getUserId())) ||
        office.chrome.constants.MSG_OFFICE_UNKNOWN_USER;
    this.documentInfo_.setLastModified(name,
 (storageMessage.getTimeMs()));
  }
  this.updateSaveState_();
};



office.net.SaveStateSyncer.prototype.handleSuspendMessageProcessing_ =
    function(e) {
  this.documentInfo_.getSaveStateTracker().
      setSuspendedProcessingMessages(e.suspend);
};



office.net.SaveStateSyncer.prototype.updateSaveState_ = function() {
  this.documentInfo_.getSaveStateTracker().setSavingPending(
      this.pendingCommandQueue_.isWaitingForAck() /* saving */,
      this.pendingCommandQueue_.hasSendableCommands() /* pending */);
  this.documentInfo_.getSaveStateTracker().setUnpersisted(
      this.pendingCommandQueue_.hasUnpersisted());
};



office.net.SaveStateSyncer.prototype.handleCreateRequested_ = function(e) {
  this.commandStorage_.saveCommand(this.creationCommand_);
};



office.net.SaveStateSyncer.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;




  goog.base(this, 'disposeInternal');
};
