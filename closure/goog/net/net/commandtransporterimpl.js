goog.provide('office.net.CommandTransporterImpl');

goog.require('office.net.CatchupResponseParam');
goog.require('office.net.CommandStorageParam');
goog.require('office.net.CommandTransporter');
goog.require('office.net.CommandTransporterCatchupEvent');
goog.require('office.net.CommandTransporterCommandsEvent');
goog.require('office.net.CommandTransporterEventType');
goog.require('office.net.CommandTransporterFailEvent');
goog.require('office.net.CommandsFailEvent');
goog.require('office.net.ServiceLevel');
goog.require('office.net.Status');
goog.require('goog.functions');
goog.require('goog.log');
goog.require('goog.math.Range');
goog.require('goog.object');
goog.require('office.net.NetEvent');
goog.require("fe.Logger");




office.net.CommandTransporterImpl = function(shouldProvideSid, cosmoId,
    netService, commandSerializer, selectionCommandConverter,
    commandQueryDataBuilder, opt_serviceLevel, opt_saveErrorState,
    opt_saveTimeout) {
  goog.base(this);


  this.shouldProvideSid_ = shouldProvideSid;


  this.cosmoId_ = cosmoId;


  this.merlotNetService_ = netService;


  this.commandSerializer_ = commandSerializer;


  this.commandQueryDataBuilder_ = commandQueryDataBuilder;


  this.selectionConverter_ = selectionCommandConverter;


  this.serviceLevel_ = goog.isDef(opt_serviceLevel) ? opt_serviceLevel :
      office.net.ServiceLevel.GUARANTEED_DELIVERY;




  opt_saveTimeout = 30 * 1000;
  this.saveTimeout_ = opt_saveTimeout;


  this.saveErrorState_ = opt_saveErrorState || office.net.Status.State.SAVE_ERROR;
};
goog.inherits(office.net.CommandTransporterImpl, office.net.CommandTransporter);



office.net.CommandTransporterImpl.prototype.logger_ =
    goog.log.getLogger('office.net.CommandTransporterImpl');



office.net.CommandTransporterImpl.prototype.pendingCommandsRequest_ = false;



office.net.CommandTransporterImpl.prototype.pendingCatchupRequest_ = false;



office.net.CommandTransporterImpl.prototype.pendingCommandsRequestHadCommands_ =
    true;



office.net.CommandTransporterImpl.prototype.nextCatchupRequestId_ = 0;



office.net.CommandTransporterImpl.prototype.isPendingCommandsRequest =
    function() {
  return this.pendingCommandsRequest_;
};



office.net.CommandTransporterImpl.prototype.isPendingCatchupRequest = function() {
  return this.pendingCatchupRequest_;
};



office.net.CommandTransporterImpl.prototype.sendCommandBundles = function(
    commandBundles, selection, revision) {
  if (this.isPendingCommandsRequest()) {
    goog.log.info(this.logger_, 'Cannot send commands with a pending request');
    return false;
  }

  goog.log.info(this.logger_, 'Sending command batches request.');
  this.pendingCommandsRequest_ = true;
  this.pendingCommandsRequestHadCommands_ = commandBundles.length > 0;


  window.totalCommands += commandBundles.length;

  var queryData = this.commandQueryDataBuilder_.buildBatchesMessageArray(
      commandBundles,
      selection,
      this.selectionConverter_,
      this.commandSerializer_,
      revision);

  var errorStateFn = this.pendingCommandsRequestHadCommands_ ?
      goog.functions.constant(this.saveErrorState_) :
      goog.functions.NULL;

  var queryString = goog.uri.utils.buildQueryData(queryData);
  var url = '/sd/' + this.cosmoId_;

  if (goog.userAgent.DINGMOBILE) {
    url += '?' + queryString;
  }

  var requestBuilder = this.merlotNetService_.newRequestBuilder(url).
      setSuccessFunction(this.handleCommandBatchesRequestSuccess_, this).
      setErrorFunction(this.handleCommandBatchesRequestFailure_, this).
      setErrorNetStateFn(errorStateFn).
      setExpectFlaky(true).
      setServiceLevel(this.serviceLevel_).
      setUploadAllowed(true);

  if (goog.userAgent.DINGMOBILE) {
    requestBuilder.setMethod('GET');
  } else {
    requestBuilder.setContent(queryData);
  }

  if (this.shouldProvideSid_) {
    requestBuilder.withSessionData();
  }

  if (goog.isDef(this.saveTimeout_)) {
    requestBuilder.setTimeout(this.saveTimeout_);
  }

  requestBuilder.buildAndSend();
  return true;
};



office.net.CommandTransporterImpl.prototype.sendCatchup = function(revision) {
  if (this.isPendingCatchupRequest()) {
    goog.log.info(
        this.logger_, 'Can not start catchup with a pending catchup request');
    return false;
  }
  if (!this.shouldProvideSid_) {
    throw Error('sendCatchup: cannot provide session id');
  }
  this.pendingCatchupRequest_ = true;

  goog.log.info(this.logger_, 'Send catchup for revision ' + revision);
  var queryData = [
    office.net.CommandStorageParam.REQUEST_ID, this.nextCatchupRequestId_++,
    office.net.CommandStorageParam.START_REVISION, revision
  ];

  this.merlotNetService_.newRequestBuilder('/heel').
      withParams(office.net.CommandStorageParam.ID, this.cosmoId_).
      setContent(queryData).
      setSuccessFunction(
          goog.bind(this.handleCatchupRequestSuccess_, this, revision), this).
      setErrorFunction(this.handleCatchupRequestFailure_, this).
      setServiceLevel(this.serviceLevel_).
      withSessionData().
      buildAndSend();
  return true;
};



office.net.CommandTransporterImpl.prototype.getDebugContext = function() {
  var context = {};






  return context;
};



office.net.CommandTransporterImpl.prototype.handleCommandBatchesRequestFailure_ =
    function(e) {
  this.pendingCommandsRequest_ = false;
  var requestHadCommands = this.pendingCommandsRequestHadCommands_;
  this.pendingCommandsRequestHadCommands_ = false;
  this.dispatchEvent(new office.net.CommandsFailEvent(e, requestHadCommands));
};



office.net.CommandTransporterImpl.prototype.handleCommandBatchesRequestSuccess_ =
    function(response) {
  goog.log.info(this.logger_, 'Command batches request succeeded');
  try{
    var responseObject = response.getObject();

    this.pendingCommandsRequest_ = false;

    if (responseObject && !goog.object.isEmpty(responseObject)) {
      this.processCommandBatchesRequestSuccessResponse_(responseObject);
    } else {
      if (this.pendingCommandsRequestHadCommands_) {
        fe.Logger.log({'type':'api.sd.emptyResponse'});
        throw Error('handleCommandBatchesRequestSuccess_: Got unexpected empty ' +
            'response after sending command batches.');
      }

      this.dispatchEvent(office.net.CommandTransporterEventType.COMMANDS_SUCCESS);
    }
  }catch(e){
    var responseNetEvent = (response && response.createNetEvent && response.createNetEvent()) || {
      errorCode:0,
      httpStatus:200,
    }
    var netEvent = new office.net.NetEvent(office.net.NetEvent.Type.CLIENT_ERROR,
      responseNetEvent.errorCode, responseNetEvent.httpStatus);
    netEvent.cause = e;
    netEvent.originalType = office.net.NetEvent.Type.SUCCESS;
    fe.Logger.log({'type':'api.sd.error'});
    
    // IMP:该方法触发的事件会throw一个error,上报给sentry
    this.handleCommandBatchesRequestFailure_(netEvent);

  }
};



office.net.CommandTransporterImpl.prototype.
    processCommandBatchesRequestSuccessResponse_ = function(responseObject) {
  var serializedRanges = responseObject[office.net.CommandStorageParam.REVISION_RANGES];
  // 简单的响应格式校验
  if (!serializedRanges || !goog.isArray(serializedRanges) || serializedRanges.length <= 0) {
    throw Error('processCommandBatchesRequestSuccessResponse_: response did ' +
        'not include a non-empty array of revision ranges ' + serializedRanges);
  }

  this.pendingCommandsRequestHadCommands_ = false;
  var ranges = [];
  var lastRangeEnd = -1;
  for (var i = 0; i < serializedRanges.length; i++) {
    var serializedRange = serializedRanges[i];
    if (!serializedRange || serializedRange.length != 2) {
      throw Error('processCommandBatchesRequestSuccessResponse_: invalid ' +
          ' revision range ' + serializedRange);
    }
    var rangeStart = serializedRange[0];
    var rangeEnd = serializedRange[1];
    goog.log.info(this.logger_,
        'processCommandBatchesRequestSuccessResponse_: rangeStart: ' +
        rangeStart + ', rangeEnd: ' + rangeEnd);
    if (!goog.isDefAndNotNull(rangeStart)) {
      throw Error('processCommandBatchesRequestSuccessResponse_: range did ' +
          'not include a start');
    }
    if (!goog.isDefAndNotNull(rangeEnd)) {
      throw Error('processCommandBatchesRequestSuccessResponse_: range did ' +
          'not include an end');
    }
    if (rangeEnd < rangeStart) {
      throw Error('processCommandBatchesRequestSuccessResponse_: ' +
          'expected range end (' + rangeEnd +
          ') < expected range start (' + rangeStart + ')');
    }
    if (rangeStart <= lastRangeEnd || rangeEnd <= lastRangeEnd) {
      throw Error('processCommandBatchesRequestSuccessResponse_: ' +
          'out of order ranges or overlapping ' + serializedRanges);
    }
    lastRangeEnd = rangeEnd;
    ranges.push(new goog.math.Range(rangeStart, rangeEnd));
  }
  var additionalInfo = responseObject[
      office.net.CommandStorageParam.ADDITIONAL_INFO];
  this.dispatchEvent(new office.net.CommandTransporterCommandsEvent(
      ranges, additionalInfo));
};



office.net.CommandTransporterImpl.prototype.handleCatchupRequestSuccess_ =
    function(startRev, response) {
  this.pendingCatchupRequest_ = false;

  var responseObject = response.getObject();
  if (!responseObject) {
    throw Error('processCatchupResponse_: Empty response object received ' +
        'for catchup request for revisions ' + startRev);
  }
  var changeObjs = responseObject[office.net.CatchupResponseParam.MUTATIONS];
  if (!goog.isArray(changeObjs)) {
    throw Error(
        'processCatchupResponse_: Response lacked changes');
  }
  var metadataMessage = responseObject[office.net.CatchupResponseParam.METADATA];
  this.dispatchEvent(
      new office.net.CommandTransporterCatchupEvent(changeObjs, metadataMessage));
};



office.net.CommandTransporterImpl.prototype.handleCatchupRequestFailure_ =
    function(e) {
  goog.log.info(this.logger_, '');
  this.pendingCatchupRequest_ = false;
  this.dispatchEvent(new office.net.CommandTransporterFailEvent(
      office.net.CommandTransporterEventType.CATCHUP_FAIL, e));
};

window.totalCommands = 0;

window.getTotalCommands = function () {
  return window.totalCommands;
};
