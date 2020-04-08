goog.provide('office.net.CrossDomainBcFactory');
goog.provide('office.net.CrossDomainBcFactory.GlobalParam');
goog.provide('office.net.CrossDomainBcFactory.Message');
goog.provide('office.net.CrossDomainBcFactory.Param');
goog.provide('office.net.CrossDomainBcFactory.Service');

goog.require('office');
goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.net.BrowserChannelUtil');
goog.require('office.net.PushChannel');
goog.require('office.net.OfflineObserverApi');
goog.require('office.net.Param');
goog.require('office.net.QpsLimiter');
goog.require('office.net.RetryManager');
goog.require('office.net.ServiceId');
goog.require('office.url');
goog.require('office.util.BrowserFeatures');
goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.debug.logRecordSerializer');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.BrowserChannel');
goog.require('goog.net.xpc.CfgFields');
goog.require('goog.net.xpc.CrossPageChannel');
goog.require('goog.net.xpc.TransportTypes');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.style');
goog.require('goog.uri.utils');
goog.require('goog.uri.utils.ComponentIndex');




office.net.CrossDomainBcFactory = function(docId, errorReporter,
    opt_idParameter, opt_domHelper, opt_xdbcmUri, opt_startOffline,
    opt_qpsLimitConfig, opt_offlineObserver, opt_accessLevel) {
  goog.base(this);
  var flags = office.flag.getInstance();


  this.enableBcReadyStateChangeThrottling_ =
      flags.getBoolean(office.flag.Flags.ENABLE_BC_READYSTATECHANGE_THROTTLING);


  this.enableCors_ = office.net.BrowserChannelUtil.shouldUseCors() && flags.getBoolean('sub');


  this.eventHandler_ = new goog.events.EventHandler(this);

  this.accessLevel_ = opt_accessLevel;

  this.disconnectXpcTimer_ = new goog.async.Delay(this.markXpcDisconnected_,
      office.net.CrossDomainBcFactory.MIN_INTERVAL_MS, this);


  this.docId_ = docId;


  this.dom_ = opt_domHelper || goog.dom.getDomHelper();


  this.errorReporter_ = errorReporter;


  this.xdbcmUri_ = opt_xdbcmUri || flags.getString(office.flag.Flags.XDBCM_URI);
  goog.asserts.assert(!goog.string.endsWith(this.xdbcmUri_, '/'));





  this.idParameter_ = opt_idParameter;


  this.offlineObserver_ = opt_offlineObserver || null;
  if (this.offlineObserver_) {
    this.xpcDisconnected_ = !this.offlineObserver_.isOnline();
  } else {
    this.xpcDisconnected_ = !!opt_startOffline;
  }


  this.xdbcmRetryManager_ = new office.net.RetryManager(
      goog.bind(this.reconnectXdbcmIframe_, this),
      false /* slowStart */,
      opt_offlineObserver,
      office.net.CrossDomainBcFactory.MIN_INTERVAL_MS,
      office.net.CrossDomainBcFactory.MAX_INTERVAL_MS);


  this.startupQueue_ = [];


  this.stubs_ = {};


  this.browserFeatures_ = new office.util.BrowserFeatures(errorReporter);

  if (opt_qpsLimitConfig) {
    this.qpsLimiter_ = office.net.QpsLimiter.fromConfig(opt_qpsLimitConfig);
  }


  this.eventHandler_.listen(goog.net.BrowserChannel.getStatEventTarget(),
      goog.net.BrowserChannel.Event.SERVER_REACHABILITY_EVENT,
      this.handleReachabilityEvent_);
};
goog.inherits(office.net.CrossDomainBcFactory, goog.Disposable);



office.net.CrossDomainBcFactory.Message;



office.net.CrossDomainBcFactory.GlobalParam = {
  QPS_LIMIT_CONFIG: 'qlc',
  ENABLE_LOG_HANDLER: 'elh',
  ENABLE_OFFLINE_OBSERVER: 'eoo'
};



office.net.CrossDomainBcFactory.Param = {
  ID: 'id',
  RTC_TOPIC: 'rt',
  RTC_DATA: 'rd',
  ERROR_STATUS: 'es',
  LAST_SEQUENCE_NUMBER: 'last_seen',
  LAST_STATUS_CODE: 'lsc',
  INFO_PARAMS: 'ip',
  DOC_ID: 'did',
  SID: 'sid',
  URL_PREFIX: 'up',
  USER_ID: 'ui',
  WRITE_ACCESS: 'wa',
  COMMENT_ACCESS: 'ca',
  LEGACY_VIEW: 'lv',
  REACHABILITY_EVENT_TYPE: 'rat',
  ONLINE_STATE: 'os',
  ENABLE_READYSTATECHANGE_THROTTLING: 'erst'
};



office.net.CrossDomainBcFactory.Service = {
  LOG_MESSAGE: 'lm',
  DELIVER_MESSAGE: 'dm',
  ERROR_STATUS_CHANGE: 'ces',
  CHANNEL_OPENED: 'co',
  SET_INFO_PARAMS: 'sip',
  CONNECT_IF_NEEDED: 'cin',
  DISCONNECT_IF_NEEDED: 'din',
  CREATE_CHANNEL: 'cc',
  SET_USER_ID: 'sui',
  EXPECT_WRITE_ACCESS: 'ewa',
  EXPECT_COMMENT_ACCESS: 'eca',
  IS_LEGACY_VIEW: 'lv',
  SET_LAST_SEQUENCE_NUMBER: 'slsq',
  DISPOSE_CHANNEL: 'dtor',
  REACHABILITY_EVENT: 're',
  ONLINE_STATE_CHANGED: 'osc'
};



office.net.CrossDomainBcFactory.MIN_INTERVAL_MS = 10000;



office.net.CrossDomainBcFactory.MAX_INTERVAL_MS = 30000;



office.net.CrossDomainBcFactory.MANAGER_FRAME_ID = 'xdbcm';



office.net.CrossDomainBcFactory.XPC_CHANNEL_NAME = 'office';



office.net.CrossDomainBcFactory.GLOBAL_CONFIG_URL_PARAM = 'gcp';



office.net.CrossDomainBcFactory.INTERNAL_URL_PARAM = 'internal';



office.net.CrossDomainBcFactory.idCounter_ = 0;



office.net.CrossDomainBcFactory.prototype.crossPageChannel_;



office.net.CrossDomainBcFactory.prototype.hostPrefix_ = null;



office.net.CrossDomainBcFactory.prototype.qpsLimitConfig_ = null;



office.net.CrossDomainBcFactory.prototype.qpsLimiter_ = null;



office.net.CrossDomainBcFactory.prototype.logger_ =
    goog.log.getLogger('office.net.CrossDomainBcFactory');



office.net.CrossDomainBcFactory.prototype.usingXpc_ = false;



office.net.CrossDomainBcFactory.prototype.xpcDisconnected_ = false;



office.net.CrossDomainBcFactory.prototype.createBrowserChannel = function() {

  var hostPrefix = this.enableCors_ ?
      office.net.BrowserChannelUtil.getHostPrefix(this.browserFeatures_) :
      null;
  var bc = new office.net.PushChannel(undefined /* opt_translator */,
      undefined /* opt_channelFactory */,
      hostPrefix /* opt_localSubdomain */,
      this.offlineObserver_ || undefined,
      this.enableBcReadyStateChangeThrottling_,
      this.enableCors_,
      this.accessLevel_);
  if (this.qpsLimiter_) {
    bc.registerQpsLimiter(this.qpsLimiter_);
  }

  if (this.enableCors_) {
    bc.setAllowHostPrefix(true);
  } else {
    bc.setAllowHostPrefix(false);
  }
  return bc;
};



office.net.CrossDomainBcFactory.prototype.sendUserId = function(id,
    userId) {
  goog.log.info(this.logger_, 'sendUserId()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.USER_ID, userId);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.SET_USER_ID, message);
};



office.net.CrossDomainBcFactory.prototype.sendExpectWriteAccess = function(id,
    writeAccess) {
  goog.log.info(this.logger_, 'sendExpectWriteAccess()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.WRITE_ACCESS, writeAccess);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.EXPECT_WRITE_ACCESS, message);
};



office.net.CrossDomainBcFactory.prototype.sendExpectCommentAccess = function(id,
    commentAccess) {
  goog.log.info(this.logger_, 'sendExpectCommentAccess()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.COMMENT_ACCESS, commentAccess);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.EXPECT_COMMENT_ACCESS, message);
};



office.net.CrossDomainBcFactory.prototype.sendIsLegacyView = function(id,
    isLegacyView) {
  goog.log.info(this.logger_, 'sendIsLegacyView()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.LEGACY_VIEW, isLegacyView);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.IS_LEGACY_VIEW, message);
};



office.net.CrossDomainBcFactory.prototype.sendInfoParams = function(id, params) {
  goog.log.info(this.logger_, 'sendInfoParams()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.INFO_PARAMS, params);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.SET_INFO_PARAMS, message);
};



office.net.CrossDomainBcFactory.prototype.sendConnectIfNeeded = function(id,
    opt_docId, opt_sid, opt_urlPrefix) {
  goog.log.info(this.logger_, 'sendConnectIfNeeded()');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id,
      office.net.CrossDomainBcFactory.Param.DOC_ID, opt_docId,
      office.net.CrossDomainBcFactory.Param.SID, opt_sid,
      office.net.CrossDomainBcFactory.Param.URL_PREFIX, opt_urlPrefix);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.CONNECT_IF_NEEDED, message);
};



office.net.CrossDomainBcFactory.prototype.sendDisconnectIfNeeded = function(id) {
  goog.log.info(this.logger_, 'sendDisconnectIfNeeded(' + id + ')');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID, id);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.DISCONNECT_IF_NEEDED, message);
};



office.net.CrossDomainBcFactory.prototype.sendLastSequenceNumber = function(id,
    lastSequenceNumber) {
  goog.log.info(this.logger_, 'sendLastSequenceNumber(' + id + ')');
  var messageObj = goog.object.create(
      office.net.CrossDomainBcFactory.Param.ID,
      id,

      office.net.CrossDomainBcFactory.Param.LAST_SEQUENCE_NUMBER,
      lastSequenceNumber);
  var message = goog.json.serialize(messageObj);
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.SET_LAST_SEQUENCE_NUMBER, message);
};



office.net.CrossDomainBcFactory.prototype.sendDisposeChannel = function(id) {
  goog.log.info(this.logger_, 'disposeChannel(' + id + ')');
  this.sendXpcMessage_(
      office.net.CrossDomainBcFactory.Service.DISPOSE_CHANNEL,
      goog.object.create(office.net.CrossDomainBcFactory.Param.ID, id));
};



office.net.CrossDomainBcFactory.prototype.sendOnlineState_ = function() {
  goog.log.info(this.logger_, 'sendOfflineState_()');
  if (this.offlineObserver_) {
    var messageObj = goog.object.create(
        office.net.CrossDomainBcFactory.Param.ONLINE_STATE,
        this.offlineObserver_.isOnline());
    var message = goog.json.serialize(messageObj);
    this.sendXpcMessage_(
        office.net.CrossDomainBcFactory.Service.ONLINE_STATE_CHANGED, message);
  }
};



office.net.CrossDomainBcFactory.prototype.sendXpcMessage_ = function(service,
    message) {
  if (this.crossPageChannel_ && this.crossPageChannel_.isConnected()) {
    this.crossPageChannel_.send(service, message);
  } else {
    goog.log.info(this.logger_, 'Queueing an XPC message');
    this.startupQueue_.push((
 (
        { service: service, message: message })));
  }
};








































office.net.CrossDomainBcFactory.prototype.markXpcDisconnected_ = function() {
  if (!this.xpcDisconnected_) {
    goog.log.info(this.logger_, 'Marking XPC BC stubs as disconnected.');
    this.xpcDisconnected_ = true;
    this.changeErrorStatusOnAllStubs_(
        goog.net.BrowserChannel.Error.REQUEST_FAILED, -1);
  }
};



office.net.CrossDomainBcFactory.prototype.cleanUpXpcConnection_ = function() {

  if (this.crossPageChannel_) {
    this.crossPageChannel_.dispose();
    this.crossPageChannel_ = null;
  }


  var existingIframe = this.dom_.getElement(
      office.net.CrossDomainBcFactory.MANAGER_FRAME_ID);
  if (existingIframe) {
    this.dom_.removeNode(existingIframe);
  }
};



office.net.CrossDomainBcFactory.prototype.reconnectXdbcmIframe_ = function() {

  this.cleanUpXpcConnection_();


  var crossPageChannel = this.crossPageChannel_ =
      new goog.net.xpc.CrossPageChannel(this.createXpcConfig_());


  crossPageChannel.createPeerIframe(
 (this.dom_.getDocument().body),
      office.net.CrossDomainBcFactory.makeIframeInvisible_);


  crossPageChannel.registerService(
      office.net.CrossDomainBcFactory.Service.DELIVER_MESSAGE,
      goog.bind(this.deliverMessage_, this));
  crossPageChannel.registerService(
      office.net.CrossDomainBcFactory.Service.ERROR_STATUS_CHANGE,
      goog.bind(this.changeErrorStatus_, this));
  crossPageChannel.registerService(
      office.net.CrossDomainBcFactory.Service.CHANNEL_OPENED,
      goog.bind(this.fireChannelOpened_, this));
  crossPageChannel.registerService(
      office.net.CrossDomainBcFactory.Service.LOG_MESSAGE,
      goog.bind(this.logMessage_, this));
  crossPageChannel.registerService(
      office.net.CrossDomainBcFactory.Service.REACHABILITY_EVENT,
      goog.bind(this.handleReachabilityEventMessage_, this));


  crossPageChannel.connect(goog.bind(this.handleChannelConnected_, this));


  this.xdbcmRetryManager_.start();
};



office.net.CrossDomainBcFactory.prototype.deliverMessage_ = function(message) {
  goog.log.info(this.logger_, 'Relaying an RTC message.');
  var messageObj = goog.json.parse(message);
  this.stubs_[messageObj[office.net.CrossDomainBcFactory.Param.ID]].
      deliverMessage(
          messageObj[office.net.CrossDomainBcFactory.Param.RTC_TOPIC],
          messageObj[office.net.CrossDomainBcFactory.Param.RTC_DATA]);
};



office.net.CrossDomainBcFactory.prototype.changeErrorStatus_ = function(message) {
  goog.log.info(this.logger_, 'Relayed an error status change.');
  var messageObj = goog.json.parse(message);
  this.stubs_[messageObj[office.net.CrossDomainBcFactory.Param.ID]].
      changeErrorStatus(
          messageObj[office.net.CrossDomainBcFactory.Param.ERROR_STATUS],
          messageObj[office.net.CrossDomainBcFactory.Param.LAST_STATUS_CODE]);
};



office.net.CrossDomainBcFactory.prototype.fireChannelOpened_ = function(message) {
  goog.log.info(this.logger_, 'Relaying a channel-opened event.');
  var messageObj = goog.json.parse(message);
  this.stubs_[messageObj[office.net.CrossDomainBcFactory.Param.ID]].
      fireChannelOpened();
};



office.net.CrossDomainBcFactory.prototype.logMessage_ = function(message) {
  var rec = goog.debug.logRecordSerializer.unsafeParse(
 (message));
  if (rec) {
    var name = office.net.CrossDomainBcFactory.MANAGER_FRAME_ID +
        '.' + rec.getLoggerName();
    rec.setLoggerName(name);
    goog.log.getLogger(name).logRecord(rec);
  }
};



office.net.CrossDomainBcFactory.prototype.isUsingXpc = function() {
  return this.usingXpc_;
};



office.net.CrossDomainBcFactory.prototype.changeErrorStatusOnAllStubs_ = function(
    errorStatus, lastStatusCode) {
  for (var stubId in this.stubs_) {
    this.stubs_[stubId].changeErrorStatus(errorStatus, lastStatusCode);
  }
};



office.net.CrossDomainBcFactory.prototype.createXpcConfig_ = function() {
  var config = goog.object.create(

      goog.net.xpc.CfgFields.CHANNEL_NAME,
      office.net.CrossDomainBcFactory.XPC_CHANNEL_NAME,





      goog.net.xpc.CfgFields.TRANSPORT,
      goog.net.xpc.TransportTypes.NATIVE_MESSAGING,



      goog.net.xpc.CfgFields.PEER_URI, this.createPrefixedUrl_(),


      goog.net.xpc.CfgFields.IFRAME_ID,
      office.net.CrossDomainBcFactory.MANAGER_FRAME_ID,





      goog.net.xpc.CfgFields.PEER_HOSTNAME, this.createPrefixedDomainUrl_(),





      goog.net.xpc.CfgFields.ONE_SIDED_HANDSHAKE, true);
  return config;
};



office.net.CrossDomainBcFactory.prototype.createPrefixedUrl_ = function() {
  var globalParam = office.net.CrossDomainBcFactory.GlobalParam;
  var uri = goog.uri.utils.split(this.xdbcmUri_);
  var path = uri[goog.uri.utils.ComponentIndex.PATH] || '';
  var queryData = {};


  if (this.idParameter_ == office.net.Param.DOCUMENT_COSMO_ID) {

    path = office.net.CrossDomainBcFactory.addIdToPath_(path, this.docId_);
  } else if (this.idParameter_) {
    queryData[this.idParameter_] = this.docId_;
  }
  var enableLogging = goog.DEBUG || office.INTERNAL;
  queryData[office.net.CrossDomainBcFactory.INTERNAL_URL_PARAM] = enableLogging;
  queryData[office.net.CrossDomainBcFactory.GLOBAL_CONFIG_URL_PARAM] =
      goog.json.serialize(goog.object.create(
          globalParam.QPS_LIMIT_CONFIG, this.qpsLimitConfig_,
          globalParam.ENABLE_LOG_HANDLER, enableLogging,
          globalParam.ENABLE_OFFLINE_OBSERVER, !!this.offlineObserver_));




  queryData['rt'] = 'j';
  return goog.uri.utils.buildFromEncodedParts(
      uri[goog.uri.utils.ComponentIndex.SCHEME],
      null /* opt_userInfo */,
      this.maybePrefixHostName_(uri[goog.uri.utils.ComponentIndex.DOMAIN]),
      uri[goog.uri.utils.ComponentIndex.PORT],
      path,
      goog.uri.utils.buildQueryDataFromMap(queryData));
};



office.net.CrossDomainBcFactory.prototype.createPrefixedDomainUrl_ = function() {
  var uri = goog.uri.utils.split(this.xdbcmUri_);
  return goog.uri.utils.buildFromEncodedParts(
      uri[goog.uri.utils.ComponentIndex.SCHEME],
      null /* opt_userInfo */,
      this.maybePrefixHostName_(uri[goog.uri.utils.ComponentIndex.DOMAIN]),
      uri[goog.uri.utils.ComponentIndex.PORT],
      null /* no path */);
};



office.net.CrossDomainBcFactory.prototype.maybePrefixHostName_ =
    function(hostName) {
  if (!goog.isDef(hostName)) {
    throw Error('Host name for Cross domain BC is undefined.');
  } else if (this.hostPrefix_) {
    return this.hostPrefix_ + '.' + hostName;
  } else {
    return hostName;
  }
};



office.net.CrossDomainBcFactory.prototype.handleChannelConnected_ = function() {
  goog.log.info(this.logger_, 'XPC connected, sending ' +
      this.startupQueue_.length + ' queued message.');


  this.disconnectXpcTimer_.stop();
  this.xpcDisconnected_ = false;
  this.xdbcmRetryManager_.stop();

  this.changeErrorStatusOnAllStubs_(goog.net.BrowserChannel.Error.OK, -1);
  for (var i = 0; i < this.startupQueue_.length; ++i) {
    var message = this.startupQueue_[i];
    this.crossPageChannel_.send(message.service, message.message);
  }
  this.startupQueue_ = [];
};



office.net.CrossDomainBcFactory.prototype.handleReachabilityEvent_ =
    function(event) {
  this.handleReachability_(event.reachabilityType);
};



office.net.CrossDomainBcFactory.prototype.handleReachabilityEventMessage_ =
    function(message) {
  goog.log.info(this.logger_, 'Relayed a reachability event.');
  var messageObj = goog.json.parse(message);
  this.handleReachability_(
 (
          messageObj[
              office.net.CrossDomainBcFactory.Param.REACHABILITY_EVENT_TYPE]));
};



office.net.CrossDomainBcFactory.prototype.handleReachability_ =
    function(reachabilityType) {
  if (this.offlineObserver_) {
    switch (reachabilityType) {
      case goog.net.BrowserChannel.ServerReachability.REQUEST_MADE:
        this.offlineObserver_.notifyNetworkRequest();
        break;
      case goog.net.BrowserChannel.ServerReachability.REQUEST_SUCCEEDED:
      case goog.net.BrowserChannel.ServerReachability.BACK_CHANNEL_ACTIVITY:
        this.offlineObserver_.notifyNetworkResult(true /* wasSuccess */);
        break;
      case goog.net.BrowserChannel.ServerReachability.REQUEST_FAILED:
        this.offlineObserver_.notifyNetworkResult(false /* wasSuccess */);
        break;
    }
  }
};



office.net.CrossDomainBcFactory.prototype.disposeInternal = function() {
  this.cleanUpXpcConnection_();
  goog.disposeAll(this.disconnectXpcTimer_,
      this.eventHandler_,
      this.crossPageChannel_,
      this.xdbcmRetryManager_);

  goog.base(this, 'disposeInternal');
};



office.net.CrossDomainBcFactory.makeIframeInvisible_ = function(
    iframe) {
  goog.style.setElementShown(iframe, false);
};



office.net.CrossDomainBcFactory.get = function(appContext) {
  return /** @type {!office.net.CrossDomainBcFactory} */ (appContext.get(
      office.net.ServiceId.BC_FACTORY));
};



office.net.CrossDomainBcFactory.addIdToPath_ = function(path, docId) {
  if (office.url.isDocsUrl(path)) {
    return path;
  }
  var pathParts = path.split('/');
  if (pathParts.length == 0) {
    throw Error('Path was empty');
  }

  pathParts.splice(pathParts.length - 1, 0, 'd', encodeURIComponent(docId));
  return pathParts.join('/');
};
