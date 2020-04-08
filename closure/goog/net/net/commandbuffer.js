goog.provide('office.net.CommandBuffer');

goog.require('office.storage.PendingCommandQueueEventType');
goog.require('office.crossContext.util');
goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.object');




office.net.CommandBuffer = function(pendingCommandQueue, commandTransporter,
    sendCommandsInterval, sendSelectionInterval) {
  goog.base(this);


  this.pendingCommandQueue_ = pendingCommandQueue;


  this.commandTransporter_ = commandTransporter;


  this.sendCommandsTimer_ = new goog.Timer(sendCommandsInterval);


  this.sendSelectionTimer_ = new goog.Timer(sendSelectionInterval);

  /**
   * 记录有多少次由于正在输入中文，而延缓 unsent 队列的发送
   * 该计数器超过 10 次，我们还是会强制发送，避免用户一直卡在中文输入法，导致上行队列阻塞
   */
  this.unsentTimerCountDueToComposition_ = 0;

  // 记录是否正在输入中文
  this.isComposing_ = false;
  
  // 注册对中文输入状态的监听
  var that = this;

  office.crossContext.util.regist('keyboardHandler.compositionStart', function() {
    that.isComposing_ = true;
  })

  office.crossContext.util.regist('keyboardHandler.compositionEnd', function() {
    that.isComposing_ = false;
  })  

  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(this.sendCommandsTimer_, goog.Timer.TICK,
          this.handleSendCommandsTick_).
      listen(this.sendSelectionTimer_, goog.Timer.TICK,
          this.handleSendSelectionTick_).
      listen(this.pendingCommandQueue_,
          office.storage.PendingCommandQueueEventType.COMMAND_AVAILABLE,
          this.handleCommandAvailable_);

  if (this.pendingCommandQueue_.hasSendableCommands()) {
    this.sendCommandsTimer_.start();
  }
};
goog.inherits(office.net.CommandBuffer, goog.Disposable);



office.net.CommandBuffer.COMMANDS_BATCH_INTERVAL_ = 500;

office.net.CommandBuffer.SELECTION_BATCH_INTERVAL_ = 1000;

office.net.CommandBuffer.MAX_INTERVAL_WITH_COMPOSITION_ = 10;

office.net.CommandBuffer.prototype.logger_ =
    goog.log.getLogger('office.net.CommandBuffer');



office.net.CommandBuffer.prototype.lastSentRevisionWithCommands_ = -1;



office.net.CommandBuffer.prototype.pendingSelection_ = null;



office.net.CommandBuffer.prototype.updateSelection = function(selection) {





  this.pendingSelection_ = selection;
  if (!this.sendCommandsTimer_.enabled) {
    goog.log.info(this.logger_, 'Send selection timer started.');
    this.sendSelectionTimer_.stop();
    this.sendSelectionTimer_.start();
  }
};



office.net.CommandBuffer.prototype.handleSendCommandsTick_ = function(e) {
  
  /**
   * 正在中文输入态则延缓到下一个窗口发送，总共不超过 10 次延缓
   * 对于无法兼容 composition 的，该方案自动回退到常规情况
   */
  if (this.unsentTimerCountDueToComposition_ < 10 && this.isComposing_){
    this.unsentTimerCountDueToComposition_ ++;
  } else {
    this.unsentTimerCountDueToComposition_ = 0;
    this.requestAndSendCommands_();
  }
};



office.net.CommandBuffer.prototype.handleSendSelectionTick_ = function(e) {
  if (this.commandTransporter_.isPendingCommandsRequest()) {
    goog.log.info(this.logger_, 'handleSendSelectionTick_(): Not sending ' +
        'selection because of a pending commands request');
  } else if (this.pendingCommandQueue_.isWaitingForAck()) {
    goog.log.info(this.logger_, 'handleSendSelectionTick_(): Not sending ' +
        'selection because of a pending dequeue');
  } else {
    this.send_(this.getAndClearSelectionForSend_());
  }
};



office.net.CommandBuffer.prototype.handleCommandAvailable_ = function(e) {
  goog.log.info(this.logger_, 'Send commands timer started.');
  this.sendSelectionTimer_.stop();
  this.sendCommandsTimer_.start();
};



office.net.CommandBuffer.prototype.requestAndSendCommands_ = function() {
  goog.log.info(this.logger_, 'requestAndSendCommands_()');



  if (this.pendingCommandQueue_.isWaitingForAck()) {
    goog.log.info(this.logger_, 'requestAndSendCommands_(): waiting for ack');
    return;
  }



  if (this.commandTransporter_.isPendingCommandsRequest()) {
    goog.log.info(this.logger_, 'requestAndSendCommands_(): pending commands ' +
        'request');
    return;
  }


  this.sendCommandsTimer_.stop();

  if (!this.pendingCommandQueue_.hasSendableCommands()) {


    goog.log.info(
        this.logger_, 'requestAndSendCommands_(): no unsent commands');

    if (this.pendingSelection_) {
      this.send_(this.getAndClearSelectionForSend_());
    }

    return;
  }





  this.pendingCommandQueue_.dequeueForSend().addCallback(
      goog.partial(this.handleCommandsReadyForSend_,
          this.pendingCommandQueue_.getQueueVersion(),
          this.getAndClearSelectionForSend_()),
      this);
};



office.net.CommandBuffer.prototype.handleCommandsReadyForSend_ = function(
    revision, selection, commandBundles) {
  goog.log.info(this.logger_, 'handleCommandsReadyForSend_()');

  if (commandBundles.length == 0) {
    throw Error('No command bundles to send.');
  }



  if (this.lastSentRevisionWithCommands_ == revision) {
    throw Error('Client invariant failed. Sent the revision number ' +
        revision + ' twice in a row.');
  }
  this.lastSentRevisionWithCommands_ = revision;

  this.send_(selection, commandBundles, revision);
};



office.net.CommandBuffer.prototype.send_ = function(selection, opt_commandBundles,
    opt_revision) {
  goog.log.info(this.logger_, 'send_()');
  goog.asserts.assert(!opt_commandBundles || goog.isDefAndNotNull(opt_revision),
      'Command bundles must have an associated revision');



  if (this.commandTransporter_.isPendingCommandsRequest()) {
    throw Error('Command transporter has a pending commands request.');
  }


  if (!selection && (!opt_commandBundles || opt_commandBundles.length == 0)) {
    var commandsProblem = opt_commandBundles ? 'an empty list of' : 'null';
    throw Error('Tried to send commands request without selection change ' +
        'and with ' + commandsProblem + ' command bundles.');
  }

  this.commandTransporter_.sendCommandBundles(
      opt_commandBundles || [],
      selection,
      goog.isDef(opt_revision) ?
          opt_revision : this.pendingCommandQueue_.getQueueVersion());
};



office.net.CommandBuffer.prototype.setCommandsBatchInterval = function(interval) {
  this.sendCommandsTimer_.setInterval(interval);
};



office.net.CommandBuffer.prototype.setSelectionInterval = function(interval) {
  this.sendSelectionTimer_.setInterval(interval);
};



office.net.CommandBuffer.prototype.getAndClearSelectionForSend_ = function() {
  this.sendSelectionTimer_.stop();

  var selection = this.pendingSelection_;
  this.pendingSelection_ = null;
  return selection;
};



office.net.CommandBuffer.prototype.getDebugContext = function() {
  var context = {};
  goog.object.extend(context, this.commandTransporter_.getDebugContext());







  return context;
};



office.net.CommandBuffer.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  goog.dispose(this.sendCommandsTimer_);
  delete this.sendCommandsTimer_;

  goog.dispose(this.sendSelectionTimer_);
  delete this.sendSelectionTimer_;

  goog.base(this, 'disposeInternal');
};



office.net.CommandBuffer.create = function(pendingCommandQueue,
    commandTransporter, opt_sendCommandsInterval, opt_sendSelectionInterval) {
  var sendCommandsInterval = goog.isDef(opt_sendCommandsInterval) ?
      opt_sendCommandsInterval :
      office.net.CommandBuffer.COMMANDS_BATCH_INTERVAL_;
  var sendSelectionInterval = goog.isDef(opt_sendSelectionInterval) ?
      opt_sendSelectionInterval :
      office.net.CommandBuffer.SELECTION_BATCH_INTERVAL_;

  return new office.net.CommandBuffer(pendingCommandQueue,
      commandTransporter, sendCommandsInterval, sendSelectionInterval);
};
