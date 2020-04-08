goog.provide('office.net.CommandReceiver');

goog.require('office.net.CatchupDiagnosticsManager');
goog.require('office.net.CommandTransporterCommandsEvent');
goog.require('office.net.CommandTransporterEventType');
goog.require('office.net.CommandsReceivedEvent');
goog.require('office.net.MessageProcessingChangeEvent');
goog.require('office.net.PreStorageMessageProcessedEvent');
goog.require('office.net.RtcTopic');
goog.require('office.net.SelectionReceivedEvent');
goog.require('office.net.StorageMessageReceivedEvent');
goog.require('office.storage.StorageMessage');
goog.require('office.storage.TransformingCommandQueue');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.object');




office.net.CommandReceiver = function(sid, commandTransporter,
    pendingCommandQueue, transformingCommandQueue, storageMessageSerializer,
    errorReporter, browserChannel, metadataSyncer, opt_isColdStarted) {
  goog.base(this);


  this.sid_ = sid;


  this.metadataSyncer_ = metadataSyncer;


  this.pendingCommandQueue_ = pendingCommandQueue;


  this.commandTransporter_ = commandTransporter;


  this.transformingCommandQueue_ = transformingCommandQueue;
  this.transformingCommandQueue_.setParentEventTarget(this);


  this.storageMessageSerializer_ = storageMessageSerializer;


  this.errorReporter_ = errorReporter;


  this.isColdStarted_ = !!opt_isColdStarted;


  this.startTime_ = goog.now();


  this.waitForAckTimer_ =
      new goog.Timer(office.net.CommandReceiver.MAX_ACK_TIME_);


  this.messageCache_ = [];


  this.catchupDiagnosticsManager_ =
      new office.net.CatchupDiagnosticsManager(errorReporter);


  this.catchupDiagnosticsId_ = null;


  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(this.waitForAckTimer_, goog.Timer.TICK,
          this.handleAcknowledgementTimeout_).
      listen(commandTransporter,
          office.net.CommandTransporterEventType.COMMANDS_FAIL,
          this.handleCommandsFail_).
      listen(commandTransporter,
          office.net.CommandTransporterEventType.COMMANDS_SUCCESS,
          this.handleCommandsSuccess_).
      listen(commandTransporter,
          office.net.CommandTransporterEventType.CATCHUP_FAIL,
          this.handleCatchupFail_).
      listen(commandTransporter,
          office.net.CommandTransporterEventType.CATCHUP_SUCCESS,
          this.handleCatchupSuccess_);



  browserChannel.subscribe(office.net.RtcTopic.CHANGE, this.handleChange_, this);



  browserChannel.subscribe(office.net.RtcTopic.JOIN, this.handleJoin_, this);

  browserChannel.subscribe(
      office.net.RtcTopic.PRESENCE, this.handlePresence_, this);


  this.expectedAckRanges_ = [];
};
goog.inherits(office.net.CommandReceiver, goog.events.EventTarget);



office.net.CommandReceiver.IGNORE_JOIN_TIME_MS_ = 10000;



office.net.CommandReceiver.MAX_ACK_TIME_ = 11000;



office.net.CommandReceiver.prototype.logger_ =
    goog.log.getLogger('office.net.CommandReceiver');



office.net.CommandReceiver.prototype.joinEventCounter_ = 0;



office.net.CommandReceiver.prototype.catchupMode_ = false;



office.net.CommandReceiver.prototype.catchupStartRevision_ = -1;



office.net.CommandReceiver.prototype.processMessages_ = true;



office.net.CommandReceiver.prototype.setProcessMessages = function(
    processMessages) {
  if (processMessages == this.processMessages_) {
    return;
  }
  this.processMessages_ = processMessages;
  this.dispatchEvent(new office.net.MessageProcessingChangeEvent(this,
      !processMessages));

  if (processMessages && !this.catchupMode_) {
    this.processMessageCache_();
  }
  this.sendCatchupRequestIfNeeded_();
};



office.net.CommandReceiver.prototype.loadCommands_ = function(
    commands, startRevision, endRevision, onBehalfOfLocalSession, isMetadata) {
  var commandCountBeforeTransformation =
      this.transformingCommandQueue_.getLength();
  var transformResult = this.transformingCommandQueue_.transformServerCommands(
      commands, startRevision, endRevision, isMetadata);

  var revisionResult = transformResult.getRevisionResult();
  var RevisionResult = office.storage.TransformingCommandQueue.RevisionResult;
  if (revisionResult == RevisionResult.EXPECTED) {
    this.dispatchCommandsReceivedEvent_(transformResult.getCommands(),
        onBehalfOfLocalSession);
  }

  if (!goog.isNull(this.catchupDiagnosticsId_) &&
      (revisionResult == RevisionResult.EXPECTED ||
          revisionResult == RevisionResult.BETWEEN_QUEUE_AND_MODEL)) {
    this.catchupDiagnosticsManager_.recordTransformation(
        this.catchupDiagnosticsId_,
        endRevision - startRevision + 1 /* serverRevisionCount */,
        commandCountBeforeTransformation);
  }

  return revisionResult;
};



office.net.CommandReceiver.prototype.dispatchCommandsReceivedEvent_ = function(
    commands, onBehalfOfLocalSession) {
  if (commands && commands.length > 0) {
    this.dispatchEvent(new office.net.CommandsReceivedEvent(this, commands,
        onBehalfOfLocalSession));
  }
};



office.net.CommandReceiver.prototype.loadSelection_ = function(
    selection, sid, effectiveSid, revision) {
  var transformResult =
      this.transformingCommandQueue_.transformSelection(selection, revision);
  var revisionResult = transformResult.getRevisionResult();
  var transformedSelection = transformResult.getSelection();
  if (revisionResult ==
      office.storage.TransformingCommandQueue.RevisionResult.EXPECTED &&
      transformedSelection) {
    this.dispatchEvent(new office.net.SelectionReceivedEvent(
        this,
        transformedSelection,
        goog.asserts.assertString(effectiveSid || sid,
            'At least one of effective or actual SID must be specified'),
        sid == this.sid_ || effectiveSid == this.sid_ /* isMe */,
        effectiveSid == this.sid_ /* isOnBehalfOfLocalSession */));
  }
  return revisionResult;
};



office.net.CommandReceiver.prototype.getDebugContext = function() {
  var context = this.transformingCommandQueue_.getDebugContext();
  return context;
};



office.net.CommandReceiver.prototype.handleCommandsFail_ = function(e) {
  if (e.requestHadCommands) {
    // 上报至netAccessStateManager阻止用户继续编辑
    $(window).trigger('command.request.failure');
    this.transformingCommandQueue_.processFailedDelivery();
  }
};



office.net.CommandReceiver.prototype.handleCommandsSuccess_ = function(e) {
  goog.log.info(this.logger_, 'handleCommandsSuccess()');
  if (!(e instanceof office.net.CommandTransporterCommandsEvent)) {
    goog.log.info(
        this.logger_, 'handleCommandsSuccess(): Success from selection.');
    this.sendCatchupRequestIfNeeded_();
    return;
  }

  var ranges = e.ranges;
  if (ranges.length <= 0) {
    throw Error('handleCommandSuccess_: unexpected number of ranges ' + ranges);
  }

  this.catchupDiagnosticsManager_.recordServerRevision(
      ranges[ranges.length - 1].end);
  var transformingCommandQueue = this.transformingCommandQueue_;
  var queueRevision = transformingCommandQueue.getQueueRevision();
  if (transformingCommandQueue.isWaitingForAck()) {


    if (ranges[0].start <= queueRevision) {
      throw Error('handleCommandsSuccess_: waitingForAck and ' +
          'command response reported expected revision range ' +
          ranges + ', but this is ' +
          'lower than the currently syncd revision ' + queueRevision);
    }
    this.expectedAckRanges_ = ranges;
    if (this.waitForAckTimer_.enabled) {
      throw Error('handleCommandsSuccess_: Tried to restart ' +
          'already-enabled ack timer.');
    }


    if (!this.catchupMode_) {


      this.waitForAckTimer_.start();
    }
  } else if (ranges[ranges.length - 1].end > queueRevision) {
    throw Error('handleCommandsSuccess_: not waitingForAck and ' +
        'response reported expected revision range ' + ranges +
        ', but this is higher than the currently ' +
        'syncd revision ' + queueRevision);
  }



  this.sendCatchupRequestIfNeeded_();
};



office.net.CommandReceiver.prototype.handleAcknowledgementTimeout_ = function() {
  this.waitForAckTimer_.stop();
  var callFn = goog.bind(this.startCatchup_, this, null);
  this.errorReporter_.protectFunction(callFn, this)();
};



office.net.CommandReceiver.prototype.startCatchup_ = function(storageMessage) {
  if (this.catchupMode_) {
    throw Error('startCatchup_: Cannot start catchup mode while in ' +
        'catchup mode.');
  }

  goog.log.info(this.logger_, 'startCatchup_: Entered catchup mode.');
  this.catchupMode_ = true;


  this.waitForAckTimer_.stop();

  if (storageMessage) {
    this.messageCache_.unshift(storageMessage);
  }
  this.sendCatchupRequestIfNeeded_();
};



office.net.CommandReceiver.prototype.sendCatchupRequestIfNeeded_ = function() {
  if (this.catchupMode_ &&
      this.processMessages_ &&
      !this.commandTransporter_.isPendingCommandsRequest() &&
      !this.commandTransporter_.isPendingCatchupRequest()) {
    var startRevision = this.transformingCommandQueue_.getQueueRevision() + 1;
    this.catchupStartRevision_ = startRevision;
    this.catchupDiagnosticsId_ = this.catchupDiagnosticsManager_.startCatchup(
        startRevision, this.expectedAckRanges_,
        this.transformingCommandQueue_.getLength());
    this.commandTransporter_.sendCatchup(startRevision);
  }
};



office.net.CommandReceiver.prototype.handleCatchupFail_ = function(e) {
  this.catchupDiagnosticsId_ = null;
  e.netEvent.fatalError(
      this.errorReporter_, '', this.getDebugContext());
};



office.net.CommandReceiver.prototype.handleCatchupSuccess_ = function(e) {
  if (!this.catchupMode_) {


    this.errorReporter_.log(new Error(
        'handleCatchupSuccess_: Received catchup results while not in ' +
        'catchup mode.'));
    this.catchupDiagnosticsId_ = null;
    return;
  }



  var catchupDiagnosticsId = goog.asserts.assert(this.catchupDiagnosticsId_);

  this.catchupDiagnosticsManager_.recordProcessingStart(
      catchupDiagnosticsId, this.processMessages_, this.messageCache_.length);

  var catchupMessages = this.deserializeCatchupMessages_(e.changeObjs);
  this.validateCatchupMessages_(catchupMessages);
  if (catchupMessages.length) {
    this.catchupDiagnosticsManager_.recordCatchupEndRevision(
        catchupDiagnosticsId,
        catchupMessages[catchupMessages.length - 1].getEndRevision());
  }

  this.catchupMode_ = false;
  this.catchupStartRevision_ = -1;


  if (this.metadataSyncer_ && e.metadataMessage) {
    this.metadataSyncer_.acceptMetadataMessage(e.metadataMessage);
  }

  goog.array.insertArrayAt(this.messageCache_, catchupMessages);
  if (this.processMessages_) {
    this.processMessageCache_();
  }
  this.catchupDiagnosticsManager_.recordProcessingEnd(catchupDiagnosticsId);



  if (catchupDiagnosticsId == this.catchupDiagnosticsId_) {
    this.catchupDiagnosticsId_ = null;
  }
};



office.net.CommandReceiver.prototype.processMessageCache_ = function() {
  if (!this.processMessages_) {
    throw Error('Processing mesages must be enabled to processMessageCache_');
  }
  if (this.catchupMode_) {
    throw Error('Can not be in catchup mode to processMessageCache_');
  }


  var message;
  while (message = this.messageCache_.shift()) {
    this.processStorageMessage_(message);
    if (this.catchupMode_ || !this.processMessages_) {





      return;
    }
  }
};



office.net.CommandReceiver.prototype.deserializeCatchupMessages_ = function(
    changeObjs) {
  var storageMessages = [];
  var ownStorageMessage = null;
  for (var i = 0; i < changeObjs.length; i++) {
    var storageMessage =
        this.storageMessageSerializer_.deserializeFromChange(changeObjs[i]);
    if (storageMessage.getSid() == this.sid_) {

      if (ownStorageMessage) {


        if (storageMessage.getEffectiveSid() !=
            ownStorageMessage.getEffectiveSid()) {
          throw new Error('Consecutive changes in catchup have same SID but ' +
              'differing effective SIDs, so these changes cannot be merged');
        }
        ownStorageMessage = office.storage.StorageMessage.merge(
            ownStorageMessage, storageMessage);
      } else {
        ownStorageMessage = storageMessage;
      }
    } else {
      if (ownStorageMessage) {
        storageMessages.push(ownStorageMessage);
        ownStorageMessage = null;
      }
      storageMessages.push(storageMessage);
    }
  }
  if (ownStorageMessage) {
    storageMessages.push(ownStorageMessage);
  }

  return storageMessages;
};



office.net.CommandReceiver.prototype.validateCatchupMessages_ = function(
    catchupMessages) {
  var ownSessionMessages = 0;
  for (var i = 0; i < catchupMessages.length; i++) {
    var storageMessage = catchupMessages[i];

    if (storageMessage.getSid() == this.sid_) {
      ownSessionMessages++;




      var expectedAckRange = this.expectedAckRanges_.length > 0 ?
          this.expectedAckRanges_[this.expectedAckRanges_.length - 1] :
          null;
      if (expectedAckRange &&
          (storageMessage.getStartRevision() < expectedAckRange.start ||
          storageMessage.getEndRevision() > expectedAckRange.end)) {
        this.errorReporter_.log(Error('Catchup response includes more ' +
            'changes from the requester\'s session than expected'), {
              'eac': this.expectedAckRanges_,
              'sms': storageMessage.getStartRevision(),
              'sme': storageMessage.getEndRevision()
            });
      }
    }



    if (i == 0 &&
        this.catchupStartRevision_ != storageMessage.getStartRevision()) {
      throw Error('handleCatchupSuccess_: Bad revision on first ' +
          'catchup message. Expected ' + this.catchupStartRevision_ +
          ' but got ' + storageMessage.getStartRevision());
    }
  }





  if (ownSessionMessages > 1) {
    throw Error('Catchup response includes more than one message marked ' +
        'with the requester\'s session id, this is supposed to be impossible.');
  }
};



office.net.CommandReceiver.prototype.handleJoin_ = function(joinEvent) {
  if (!joinEvent['isMe']) {
    return;
  }

  this.joinEventCounter_++;



  if (this.catchupMode_) {
    goog.log.info(this.logger_, 'Received a JOIN event from myself, ignored ' +
        'it because a catchup is already in progress.');
    return;
  }













  if (this.joinEventCounter_ == 1 &&
      goog.now() - this.startTime_ <
          office.net.CommandReceiver.IGNORE_JOIN_TIME_MS_ &&
      (!this.isColdStarted_ ||
          this.pendingCommandQueue_.hasSendableCommands())) {
    goog.log.info(this.logger_, 'Received a JOIN message from myself, ' +
        'ignored it due to its being the first, and occurring soon after ' +
        'startup.');
    return;
  }

  goog.log.info(this.logger_, 'Received a JOIN message from myself, ordering ' +
      'a catchup.');
  this.startCatchup_(null /* storageMessage */);
};



office.net.CommandReceiver.prototype.handleChange_ = function(event) {
  var storageMessage =
      this.storageMessageSerializer_.deserializeFromChangeEvent(event);
  this.errorReporter_.protectFunction(
      goog.bind(this.processStorageMessage_, this, storageMessage), this)();
};



office.net.CommandReceiver.prototype.handlePresence_ = function(event) {
  var storageMessage =
      this.storageMessageSerializer_.deserializeFromPresenceEvent(event);
  if (storageMessage) {
    this.errorReporter_.protectFunction(
        goog.bind(this.processStorageMessage_, this, storageMessage), this)();
  }
};



office.net.CommandReceiver.prototype.processStorageMessage_ = function(
    storageMessage) {
  this.catchupDiagnosticsManager_.recordServerRevision(
      storageMessage.getEndRevision());


  if (this.catchupMode_ || !this.processMessages_) {


    this.messageCache_.push(storageMessage);
    return;
  }

  var isAck = !!this.pendingCommandQueue_.getAckSids()[storageMessage.getSid()];




  if (this.transformingCommandQueue_.isExpectedRevision(
      storageMessage.getStartRevision(), storageMessage.getEndRevision(),
      storageMessage.isMetadata())) {
    this.dispatchEvent(new office.net.PreStorageMessageProcessedEvent(this, isAck,
        storageMessage));
  }

  if (!this.processMessages_) {
    this.messageCache_.push(storageMessage);
    return;
  }




  if (isAck) {
    this.processAcknowledgementMessage_(storageMessage);
  } else {
    this.processCollaboratorMessage_(storageMessage);
  }
};



office.net.CommandReceiver.prototype.processCollaboratorMessage_ = function(
    storageMessage) {
  var commands = storageMessage.getCommands();
  if (commands) {
    goog.log.info(this.logger_, 'Received commands from collaborator.');
    var revisionResult = this.loadCommands_(
        commands,
        storageMessage.getStartRevision(),
        storageMessage.getEndRevision(),
        storageMessage.getEffectiveSid() == this.sid_,
        storageMessage.isMetadata());
    if (revisionResult == office.storage.TransformingCommandQueue.
        RevisionResult.HIGHER_THAN_EXPECTED) {
      this.startCatchup_(storageMessage);
      return;
    }
    if (revisionResult ==
        office.storage.TransformingCommandQueue.RevisionResult.EXPECTED) {
      this.dispatchEvent(new office.net.StorageMessageReceivedEvent(
          this, false /* isAck */, storageMessage));
    }
  }

  var selection = storageMessage.getSelection();
  var sid = storageMessage.getSid();
  var effectiveSid = storageMessage.getEffectiveSid();
  if (selection && (sid || effectiveSid)) {
    var revisionResult = this.loadSelection_(selection, sid, effectiveSid,
        storageMessage.getEndRevision());
    if (revisionResult == office.storage.TransformingCommandQueue.
        RevisionResult.HIGHER_THAN_EXPECTED) {
      this.startCatchup_(storageMessage);
      return;
    }
  }
};



office.net.CommandReceiver.prototype.processAcknowledgementMessage_ = function(
    storageMessage) {


  if (!storageMessage.getCommands()) {
    return;
  }
  if (storageMessage.isMetadata()) {
    throw Error('Acknowledgement messages can not be metadata');
  }
  this.waitForAckTimer_.stop();

  goog.log.info(this.logger_, 'Acknowledge commands.');

  var updateResult = this.transformingCommandQueue_.acknowledge(
      storageMessage.getStartRevision(), storageMessage.getEndRevision());
  var revisionResult = updateResult.getRevisionResult();
  if (revisionResult == office.storage.TransformingCommandQueue.
      RevisionResult.HIGHER_THAN_EXPECTED) {
    this.startCatchup_(storageMessage);
    return;
  }


  var expectedAckRange = this.expectedAckRanges_.shift();
  if (expectedAckRange && expectedAckRange.end !=
      this.transformingCommandQueue_.getQueueRevision()) {
    goog.log.warning(this.logger_, 'processAcknowledgementMessage_: Ack ' +
        'message syncd client to revision ' +
        this.transformingCommandQueue_.getQueueRevision() +
        ' but XHR response said to expect revision ' + this.expectedAckRanges_);
  }


  if (this.expectedAckRanges_.length > 0) {
    this.waitForAckTimer_.start();
  }

  var commands = updateResult.getCommands();
  if (revisionResult ==
      office.storage.TransformingCommandQueue.RevisionResult.EXPECTED) {
    this.dispatchEvent(new office.net.StorageMessageReceivedEvent(
        this, true /* isAck */,
        new office.storage.StorageMessage(commands,
            storageMessage.getSelection(), storageMessage.getTimeMs(),
            storageMessage.getUserId(), storageMessage.getStartRevision(),
            storageMessage.getEndRevision(), storageMessage.getSid(),
            storageMessage.getEffectiveSid())));
  }
};



office.net.CommandReceiver.prototype.disposeInternal = function() {
  delete this.errorReporter_;
  delete this.metadataSyncer_;
  delete this.storageMessageSerializer_;
  delete this.commandTransporter_;
  delete this.expectedAckRanges_;
  delete this.pendingCommandQueue_;

  goog.dispose(this.transformingCommandQueue_);
  delete this.transformingCommandQueue_;

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;

  goog.dispose(this.waitForAckTimer_);
  delete this.waitForAckTimer_;

  goog.base(this, 'disposeInternal');
};
