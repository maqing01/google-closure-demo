goog.provide('office.net.BrowserChannel');
goog.provide('office.net.BrowserChannel.Message');

goog.require('office.net.BrowserChannelInterface');
goog.require('office.net.ClientProperties');
goog.require('office.net.OfflineObserverApi');
goog.require('office.net.QpsLimiter');
goog.require('office.net.RetryManager');
goog.require('office.net.RtcTopic');
goog.require('office.net.constants');
goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.BrowserChannel');
goog.require('goog.object');
goog.require('goog.pubsub.PubSub');
goog.require('goog.string');




office.net.BrowserChannel = function(opt_translator, opt_channelFactory,
    opt_localSubdomain, opt_offlineObserver,
    opt_enableBcReadyStateChangeThrottling, opt_enableCors) {
  goog.net.BrowserChannel.Handler.call(this);


  this.localSubdomain_ = opt_localSubdomain || null;


  this.enableBcReadyStateChangeThrottling_ = true;


  this.errorStatusCallback_ = goog.nullFunction;


  this.channelOpenedCallback_ = goog.nullFunction;


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.id_ = null;


  this.sid_ = null;


  this.urlPrefix_ = null;


  this.translator_ = opt_translator ||
      office.net.BrowserChannel.translateDefaultJson_;


  this.pubsub_ = new goog.pubsub.PubSub();


  this.channelFactory_ = opt_channelFactory;


  this.underlyingChannelConnected_ = false;


  this.underlyingChannelError_ = null;


  this.handlingUnknownSessionId_ = false;


  this.reconnect_ = false;


  this.reconnecting_ = false;


  this.offlineObserver_ = opt_offlineObserver || null;

  if (this.offlineObserver_) {
    this.eventHandler_.listen(this.offlineObserver_,
        [office.net.OfflineObserverApi.EventType.ONLINE,
         office.net.OfflineObserverApi.EventType.OFFLINE],
         goog.bind(this.onNetStatusChange_, this));
  }


  this.retryManager_ = new office.net.RetryManager(
      goog.bind(this.reconnectIfNeeded_, this),
      true /* slowStart */,
      this.offlineObserver_ || undefined,
      office.net.BrowserChannel.MIN_RETRY_DELAY_,
      office.net.BrowserChannel.MAX_RETRY_DELAY_);


  this.lastSequenceNumber_ = -1;


  this.currentError_ = null;


  this.infoParams_ = {};


  this.enableCors_ = !!opt_enableCors;


  this.disposed_ = false;


  this.subscribe(
      office.net.RtcTopic.GAIA_SESSION_ID_UPDATE,
      this.handleGaiaSessionIdUpdate_,
      this);
};
goog.inherits(office.net.BrowserChannel, goog.net.BrowserChannel.Handler);


office.net.BrowserChannel.prototype.onNetStatusChange_ = function (){
  var that = this;
  fe.Logger.log(function(){
    return {
        'type':'push-channel-netst-change',
        'isWs':false,
        'is-ob-online': that.offlineObserver_ ? that.offlineObserver_.isOnline() : 'no-ob',
    }
  });
  this.maybeUpdateError_();
}

office.net.BrowserChannel.Message;



office.net.BrowserChannel.Param_ = {
  ACCESS_LEVEL: 'l',
  IS_LEGACY_VIEW: 'lv',
  LAST_SEQUENCE_NUMBER: 'last_seen',
  USER_ID: 'u'
};



office.net.BrowserChannel.MAX_RETRY_DELAY_ = 45000;



office.net.BrowserChannel.MIN_RETRY_DELAY_ = 7000;



office.net.BrowserChannel.READYSTATECHANGE_THROTTLE_MS_ = 200;



office.net.BrowserChannel.prototype.allowHostPrefix_ = true;



office.net.BrowserChannel.prototype.browserChannel_ = null;



office.net.BrowserChannel.prototype.userId_ = null;



office.net.BrowserChannel.prototype.expectCommentAccess_ = false;



office.net.BrowserChannel.prototype.expectWriteAccess_ = false;



office.net.BrowserChannel.prototype.isLegacyView_ = false;



office.net.BrowserChannel.prototype.logger_ =
    goog.log.getLogger('office.net.BrowserChannel');



office.net.BrowserChannel.prototype.qpsLimiter_;



office.net.BrowserChannel.prototype.rtcCallback_;



office.net.BrowserChannel.prototype.registerRtcCallback = function(rtcCallback) {
  goog.asserts.assert(!this.rtcCallback_,
      'Only one RTC callback may be registered.');
  this.rtcCallback_ = rtcCallback;
};



office.net.BrowserChannel.prototype.subscribe = function(topic, fn, opt_context) {
  this.pubsub_.subscribe(topic, fn, opt_context);
};



office.net.BrowserChannel.prototype.correctHostPrefix = function(
    serverHostPrefix) {
  return this.localSubdomain_ || serverHostPrefix;
};



office.net.BrowserChannel.prototype.unsubscribe = function(
    topic, fn, opt_context) {
  return this.pubsub_.unsubscribe(topic, fn, opt_context);
};



office.net.BrowserChannel.translateDefaultJson_ = function(array) {
  if (array['yiqixie']) {
    var actualPayload = goog.crypt.obfuscation.deobfuscate(array['yiqixie']);
    var result = /** @type {Array} */ (goog.json.unsafeParse(actualPayload));
    return {
      type: /** @type {number} */ (result[0]),
      sequence: /** @type {number} */ (result[1]),
      data: /** @type {Object} */ (result[2]),
      tfe: /** @type {?string} */ (result[3] || null)
    };
  } else {
    if (array.length == 1 && goog.isString(array[0])) {
      var msg = array[0];
      array = /** @type {Array} */ (goog.json.unsafeParse(msg));
    }
    return {
      type: /** @type {number} */ (array[0]),
      sequence: /** @type {number} */ (array[1]),
      data: /** @type {Object} */ (array[2]),
      tfe: /** @type {?string} */ (array[3] || null)
    };
  }
};



office.net.BrowserChannel.prototype.channelHandleArray = function(
    browserChannel, array) {

  var event = this.translator_(array);

  goog.asserts.assert(goog.isNumber(event.type),
      'Event type must be a number: ' + event.type);
  goog.asserts.assert(event.type >= 0,
      'Event type should be non-negative: ' + event.type);
  goog.asserts.assert(goog.isNumber(event.sequence),
      'Event sequence number must be a number: ' + event.sequence);
  goog.asserts.assert(goog.isObject(event.data),
      'Event data must be of type object: ' + event.data);
  goog.asserts.assert(goog.isString(event.tfe) || goog.isNull(event.tfe),
      'Event tfe param must be of type string or null: ' + event.tfe);

  if (event.sequence > this.lastSequenceNumber_) {

    this.lastSequenceNumber_ = event.sequence;

    this.publishRtcEvent_(String(event.type), event.data);
  } else {

  }
};



office.net.BrowserChannel.prototype.publishRtcEvent_ = function(eventType, data) {
  if (this.rtcCallback_) {
    this.rtcCallback_(eventType, data);
  }
  this.pubsub_.publish(eventType, data);
};



office.net.BrowserChannel.prototype.setUserId = function(userId) {
  this.userId_ = userId;
};



office.net.BrowserChannel.prototype.setExpectCommentAccess =
    function(expectCommentAccess) {
  this.expectCommentAccess_ = expectCommentAccess;
};



office.net.BrowserChannel.prototype.setExpectWriteAccess =
    function(expectWriteAccess) {
  this.expectWriteAccess_ = expectWriteAccess;
};



office.net.BrowserChannel.prototype.setIsLegacyView = function(isLegacyView) {
  this.isLegacyView_ = isLegacyView;
};



office.net.BrowserChannel.prototype.setInfoParams = function(params) {
  this.infoParams_ =
 (goog.object.clone(params));
};

office.net.BrowserChannel.prototype.getAdditionalParams = function(
    browserChannel) {
  var params = goog.object.clone(this.infoParams_);
  goog.asserts.assert(
      !params[office.net.BrowserChannel.Param_.LAST_SEQUENCE_NUMBER] &&
      !params[office.net.BrowserChannel.Param_.USER_ID] &&
      !params[office.net.BrowserChannel.Param_.ACCESS_LEVEL]
  );
  params[office.net.BrowserChannel.Param_.LAST_SEQUENCE_NUMBER] =
      String(this.lastSequenceNumber_);
  if (this.userId_ != null) {
    params[office.net.BrowserChannel.Param_.USER_ID] = this.userId_;
  }
  if (this.expectCommentAccess_) {
    params[office.net.BrowserChannel.Param_.ACCESS_LEVEL] = 1;
  }
  if (this.expectWriteAccess_) {
    params[office.net.BrowserChannel.Param_.ACCESS_LEVEL] = 2;
  }

  return params;
};



office.net.BrowserChannel.prototype.okToMakeRequest = function() {
  if (this.qpsLimiter_) {
    try {
      this.qpsLimiter_.incrementAndCheck();
    } catch (e) {
      if (!(e instanceof office.net.QpsLimiter.LimitError)) {
        throw e;
      }
      goog.log.warning(this.logger_,
          'Browserchannel request blocked by QpsLimiter: ' + e.message);
      return goog.net.BrowserChannel.Error.NETWORK;
    }
  }
  return goog.net.BrowserChannel.Error.OK;
};



office.net.BrowserChannel.prototype.channelOpened = function(
    browserChannel) {
  goog.log.fine(this.logger_, 'Underlying channel opened.');
  this.underlyingChannelConnected_ = true;
  this.reconnecting_ = false;

  this.maybeUpdateError_(goog.net.BrowserChannel.Error.OK);
  this.channelOpenedCallback_();
};



office.net.BrowserChannel.prototype.channelClosed = function(
    browserChannel) {
  goog.log.fine(this.logger_, 'Underlying channel closed.');
  this.underlyingChannelConnected_ = false;
  if (!this.reconnecting_) {
    this.retryManager_.start();
  }
};



office.net.BrowserChannel.prototype.connectIfNeeded = function(
    opt_id, opt_sid, opt_urlPrefix) {
  this.id_ = opt_id || this.id_;
  this.sid_ = opt_sid || this.sid_;
  this.urlPrefix_ = opt_urlPrefix || this.urlPrefix_ || '';
  goog.asserts.assert(!goog.string.endsWith(this.urlPrefix_, '/'),
      'The URL prefix shouldn\'t end with a trailing slash');
  if (!this.underlyingChannelConnected_ && !this.reconnecting_) {
    this.reconnect_ = true;
    this.connect_();
  }
};



office.net.BrowserChannel.prototype.connect_ = function() {
  goog.asserts.assert(!!this.id_, 'browser channel ID must be defined');
  goog.asserts.assert(goog.isDefAndNotNull(this.urlPrefix_),
      'url prefix must be defined');


  if (this.browserChannel_) {
    this.browserChannel_.setHandler(null);
    this.browserChannel_.disconnect();
  }
  this.browserChannel_ = this.createBrowserChannel_();

  var params = {'id': this.id_};
  if (this.sid_) {
    params['sid'] = this.sid_;
  }

  var token = goog.uri.utils.getParamValue(window.location.href,
      'API-SESSION-TOKEN');
  if (!!token) {
    params['API-SESSION-TOKEN'] = token;
  }

  this.browserChannel_.connect(this.urlPrefix_ + '/websocket-connect',
      this.urlPrefix_ + '/websocket-channel', params);
};



office.net.BrowserChannel.prototype.disconnectIfNeeded = function() {


  this.currentError_ = null;
  this.underlyingChannelError_ = null;

  if (this.underlyingChannelConnected_) {
    this.reconnect_ = false;
    this.reconnecting_ = false;
    this.browserChannel_.disconnect();
  }
};



office.net.BrowserChannel.prototype.reconnectIfNeeded_ = function() {
  if (this.reconnect_ && !this.underlyingChannelConnected_) {
    this.reconnecting_ = true;
    this.connect_();




    this.retryManager_.start();
  }
};



office.net.BrowserChannel.prototype.createBrowserChannel_ = function() {
  var channel;
  if (this.channelFactory_) {
    channel = this.channelFactory_();
  } else {
    channel = new goog.net.BrowserChannel('1' /* clientVersion */);
  }

  channel.setExtraHeaders(goog.object.create(
      office.net.constants.XSRF_HEADER_NAME,
      office.net.constants.XSRF_HEADER_VALUE));

  channel.setAllowHostPrefix(this.allowHostPrefix_);
  channel.setSupportsCrossDomainXhrs(this.enableCors_);
  if (this.enableBcReadyStateChangeThrottling_) {
    channel.setReadyStateChangeThrottle(
        office.net.BrowserChannel.READYSTATECHANGE_THROTTLE_MS_);
  }
  channel.setHandler(this);
  return channel;
};



office.net.BrowserChannel.prototype.channelError = function(browserChannel,
    error) {
  this.maybeUpdateError_(error);
};



office.net.BrowserChannel.prototype.maybeUpdateError_ =
    function(opt_channelError) {
  if (goog.isDefAndNotNull(opt_channelError)) {
    this.underlyingChannelError_ = opt_channelError;
    if (!this.handlingUnknownSessionId_ &&
        opt_channelError == goog.net.BrowserChannel.Error.UNKNOWN_SESSION_ID) {
      this.handlingUnknownSessionId_ = true;
      this.connectIfNeeded();
      return;
    } else {
      this.handlingUnknownSessionId_ = false;
    }
  }


  var error;
  if (this.offlineObserver_ && !this.offlineObserver_.isOnline()) {
    error = goog.net.BrowserChannel.Error.NETWORK;
  } else if (this.underlyingChannelError_ != null) {
    error = this.underlyingChannelError_;
  } else {
    error = goog.net.BrowserChannel.Error.OK;
  }

  if (error != this.currentError_) {
    goog.log.fine(this.logger_, 'Reporting error state: ' + error);
    this.currentError_ = error;
    this.errorStatusCallback_.call(goog.global, error);
  }
};


office.net.BrowserChannel.prototype.getErrorStatus = function() {
  return this.currentError_ == null ? goog.net.BrowserChannel.Error.OK :
      this.currentError_;
};



office.net.BrowserChannel.prototype.getLastStatusCode = function() {
  return this.browserChannel_ ? this.browserChannel_.getLastStatusCode() : -1;
};



office.net.BrowserChannel.prototype.registerErrorStatusCallback =
    function(errorStatusCallback) {
  goog.asserts.assert(this.errorStatusCallback_ == goog.nullFunction,
      'Illegal to register two Error Status Callbacks');
  this.errorStatusCallback_ = errorStatusCallback;
  if (this.currentError_ != null) {
    this.errorStatusCallback_(this.currentError_);
  }
};



office.net.BrowserChannel.prototype.unregisterErrorStatusCallback =
    function() {
  this.errorStatusCallback_ = goog.nullFunction;
};



office.net.BrowserChannel.prototype.registerChannelOpenedCallback =
    function(channelOpenedCallback) {
  goog.asserts.assert(this.channelOpenedCallback_ == goog.nullFunction,
      'Illegal to register two channel-opened callbacks');
  this.channelOpenedCallback_ = channelOpenedCallback;
};



office.net.BrowserChannel.prototype.unregisterChannelOpenedCallback =
    function() {
  this.channelOpenedCallback_ = goog.nullFunction;
};



office.net.BrowserChannel.prototype.registerQpsLimiter = function(qpsLimiter) {
  goog.asserts.assert(!this.qpsLimiter_, 'QpsLimiter already registered');
  this.qpsLimiter_ = qpsLimiter;
};



office.net.BrowserChannel.prototype.getNetworkTestImageUri = function(
    channel) {




  return new goog.Uri('/static/yiqixie/try.gif').makeUnique();
};



office.net.BrowserChannel.prototype.setLastSequenceNumber = function(
    lastSequenceNumber) {
  goog.asserts.assert(this.lastSequenceNumber_ == -1,
      'setLastSequenceNumber should only be called once in initialization');
  this.lastSequenceNumber_ = lastSequenceNumber;
};



office.net.BrowserChannel.prototype.setAllowHostPrefix = function(
    allowHostPrefix) {
  this.allowHostPrefix_ = allowHostPrefix;
};



office.net.BrowserChannel.prototype.handleGaiaSessionIdUpdate_ =
    function(event) {
  var gaiaSessionIdentifier = event['gai'];
  if (gaiaSessionIdentifier) {
    office.net.ClientProperties.getInstance().
        setGaiaSessionIdProperty(gaiaSessionIdentifier);
  } else {
    throw Error('GAIA session id should be a valid string. Received - ' +
        gaiaSessionIdentifier);
  }
};



office.net.BrowserChannel.prototype.dispose = function() {


  if (!this.disposed_) {
    this.disposed_ = true;

    if (this.browserChannel_) {
      this.unregisterErrorStatusCallback();
      this.browserChannel_.setHandler(null);
      this.browserChannel_.disconnect();
      delete this.browserChannel_;
    }

    goog.dispose(this.eventHandler_);
    goog.dispose(this.retryManager_);
    goog.dispose(this.pubsub_);

    delete this.eventHandler_;
    delete this.retryManager_;
    delete this.offlineObserver_;
    delete this.pubsub_;
  }
};



office.net.BrowserChannel.prototype.isDisposed = function() {
  return this.disposed_;
};
