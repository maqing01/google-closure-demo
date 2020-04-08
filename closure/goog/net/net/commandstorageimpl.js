goog.provide('office.net.CommandStorageImpl');

goog.require('office.net.CommandStorage');
goog.require('office.net.CommandStorageEventType');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.object');
goog.require('office.net.Status');



office.net.CommandStorageImpl = function(errorReporter, localDocumentWriter) {
  goog.base(this);


  this.documentInfo_ = null;


  this.errorReporter_ = errorReporter;


  this.localDocumentWriter_ = localDocumentWriter;


  this.eventHandler_ = new goog.events.EventHandler(this);

  this.communicationsManager_  = null;

};
goog.inherits(office.net.CommandStorageImpl, office.net.CommandStorage);



office.net.CommandStorageImpl.prototype.commandBuffer_ = null;



office.net.CommandStorageImpl.prototype.commandReceiver_ = null;



office.net.CommandStorageImpl.prototype.pendingCommandQueue_ = null;



office.net.CommandStorageImpl.prototype.pendingSelection_ = null;



office.net.CommandStorageImpl.prototype.logger_ =
    goog.log.getLogger('office.net.CommandStorageImpl');



office.net.CommandStorageImpl.prototype.setPendingCommandQueue = function(
    pendingCommandQueue) {
  goog.asserts.assert(!this.pendingCommandQueue_, 'Pending queue already set.');
  goog.asserts.assert(pendingCommandQueue.isInitialized(),
      'Pending queue not initialized.');











  this.pendingCommandQueue_ = pendingCommandQueue;
};



office.net.CommandStorageImpl.prototype.getPendingCommandQueue_ = function() {
  if (!this.pendingCommandQueue_) {
    throw Error('Pending command queue not yet set.');
  }
  return this.pendingCommandQueue_;
};



office.net.CommandStorageImpl.prototype.setupCommunications = function(
    commandTransporter, commandBuffer, commandReceiver, documentInfo, communicationsManager) {
  goog.asserts.assert(!this.commandBuffer_, 'Command buffer set.');
  goog.asserts.assert(!this.commandReceiver_, 'Command receiver set.');
  goog.asserts.assert(!this.documentInfo_, 'Document info set.');







  if (this.pendingSelection_ &&
      documentInfo.getSaveStateTracker().isCreated()) {
    commandBuffer.updateSelection(this.pendingSelection_);
    this.pendingSelection_ = null;
  }





  commandReceiver.setParentEventTarget(this);

  this.registerDisposable(commandTransporter);
  this.commandBuffer_ = commandBuffer;
  this.commandReceiver_ = commandReceiver;
  this.documentInfo_ = documentInfo;
  this.communicationsManager_ = communicationsManager;
};



office.net.CommandStorageImpl.prototype.getCurrentRevision = function() {
  return this.getPendingCommandQueue_().getQueueVersion();
};



office.net.CommandStorageImpl.prototype.saveCommand = function(command) {
  this.saveCommands([command]);
};



office.net.CommandStorageImpl.prototype.saveCommands = function(commands) {
  goog.log.info(this.logger_, 'saveCommands()');

  var pendingCommandQueue = this.getPendingCommandQueue_();
  
  if (pendingCommandQueue.isExpired()) {
    // 由于您长时间未操作，已切换到离线阅读模式，刷新页面可恢复。点击重新加载
    this.alertClientIdle();
    // //第三个参数，强制发送报告，实际没有抛出异常
    // this.errorReporter_.fatalError(
    //     new Error('Changes took too long to be received by server. ' +
    //         'Shutting down to prevent data loss.'), this.getDebugContext(), true);
    // 增加下面一行，是为了真正把错误抛出去，这样sentry能收集
    throw new Error('Changes took too long to be received by server. ' +
    'Shutting down to prevent data loss.');
    return;
  }

  goog.log.info(this.logger_, 'Before commands enqueued.');
  pendingCommandQueue.enqueue(commands);
  goog.log.info(this.logger_, 'Commands enqueued.');
};

office.net.CommandStorageImpl.prototype.alertClientIdle = function(){
  if(this.communicationsManager_ && this.communicationsManager_.getBrowserChannel){
    var netStatus = this.communicationsManager_.getNetStatus();
    if(netStatus){
      //弹出提示并阻止用户
      netStatus.setState(office.net.Status.State.CLIENT_IDLE);
      this.communicationsManager_.getBrowserChannel().disconnectIfNeeded();
    }
  }
}


office.net.CommandStorageImpl.prototype.updateSelection = function(selection) {


  if (this.commandBuffer_ && this.documentInfo_ &&
      this.documentInfo_.getSaveStateTracker().isCreated()) {
    this.commandBuffer_.updateSelection(selection);
  } else {
    this.pendingSelection_ = selection;
  }
};



office.net.CommandStorageImpl.prototype.getDebugContext = function() {
  var context = {};
  if (this.commandReceiver_) {
    goog.object.extend(context, this.commandReceiver_.getDebugContext());
  }
  if (this.commandBuffer_) {
    goog.object.extend(context, this.commandBuffer_.getDebugContext());
  }
  return context;
};



office.net.CommandStorageImpl.prototype.handleStorageMessage_ = function(e) {
  var storageMessage = e.storageMessage;

  if (this.localDocumentWriter_ && !storageMessage.isMetadata()) {


    this.localDocumentWriter_.setIsCreated(true /* isCreated */);

    var commands = storageMessage.getCommands() || [];


    var nonMetadataCommands =
        office.net.CommandStorageImpl.removeMetadataCommands_(commands);


    if (nonMetadataCommands.length > 0) {
      this.localDocumentWriter_.addCommands(storageMessage.getEndRevision(),
          0 /* chunkIndex */,
          storageMessage.getUserId(),
          storageMessage.getTimeMs(),
          nonMetadataCommands);
      this.localDocumentWriter_.flush();
    }
  }
};



office.net.CommandStorageImpl.removeMetadataCommands_ = function(commands) {
  var nonMetadataCommands = [];

  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    if (!command.isMetadata()) {
      nonMetadataCommands.push(command);
    }
  }
  return nonMetadataCommands;
};



office.net.CommandStorageImpl.prototype.disposeInternal = function() {
  delete this.documentInfo_;
  delete this.localDocumentWriter_;
  delete this.errorReporter_;
  delete this.pendingSelection_;

  goog.dispose(this.commandBuffer_);
  delete this.commandBuffer_;

  goog.dispose(this.commandReceiver_);
  delete this.commandReceiver_;

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  goog.dispose(this.pendingCommandQueue_);
  delete this.pendingCommandQueue_;

  goog.base(this, 'disposeInternal');
};
