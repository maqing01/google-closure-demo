goog.provide('office.net.OfflineObserver');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.net.ImagePingSender');
goog.require('office.net.OfflineObserverApi');
goog.require('office.net.ServiceId');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.events.EventHandler');
goog.require('goog.events.OnlineHandler');
goog.require('goog.log');
goog.require('goog.log.Level');
goog.require('goog.net.NetworkStatusMonitor');
goog.require('goog.uri.utils');




office.net.OfflineObserver = function(
    imagePingUrl, opt_maxPingInterval, opt_isColdStart) {
  goog.base(this);

  goog.log.log(this.logger_,
      goog.log.Level.CONFIG,
      'new office.net.OfflineObserver(' + imagePingUrl + ')');


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.imagePingUrl_ = imagePingUrl;


  this.imagePingTimeout_ = new goog.async.Delay(
      goog.bind(this.imagePingComplete_, this, false),
      office.net.OfflineObserver.PING_TIMEOUT_MS_);


  this.maxCheckInterval_ = opt_maxPingInterval ||
      office.net.OfflineObserver.DEFAULT_MAX_CHECK_INTERVAL_MS_;


  this.onlineHandler_ = new goog.events.OnlineHandler();

  var isColdStart = goog.isDef(opt_isColdStart) ? opt_isColdStart :
      office.flag.getInstance().getBoolean(office.flag.Flags.IS_COLD_START_OFFLINE);

  this.onlineState_ = !isColdStart;


  this.lastBackoffResetTime_ = goog.now();


  this.checkTimer_ = null;


  this.imagePingSender_ = new office.net.ImagePingSender(
      goog.bind(this.imagePingComplete_, this));

  this.eventHandler_.
      listen(this.onlineHandler_,
      goog.net.NetworkStatusMonitor.EventType.ONLINE,
      this.handleNavOnlineStateChange_).
      listen(this.onlineHandler_,
      goog.net.NetworkStatusMonitor.EventType.OFFLINE,
      this.handleNavOnlineStateChange_);




  this.recalculateCheckTimer_(true /* resetBackoff */, true /* opt_toZero */);
};
goog.inherits(office.net.OfflineObserver, office.net.OfflineObserverApi);



office.net.OfflineObserver.prototype.logger_ = goog.log.getLogger(
    'office.net.OfflineObserver');



office.net.OfflineObserver.PING_TIMEOUT_MS_ = 10 * 1000;



office.net.OfflineObserver.MIN_CHECK_INTERVAL_MS_ = 10 * 1000;



office.net.OfflineObserver.DEFAULT_MAX_CHECK_INTERVAL_MS_ = 2 * 60 * 1000;



office.net.OfflineObserver.BACKOFF_FACTOR_ = 1.2;



office.net.OfflineObserver.register = function(
    appContext, imagePingUrl, opt_maxPingInterval) {
  var offlineObserver = new office.net.OfflineObserver(
      imagePingUrl, opt_maxPingInterval);
  appContext.registerService(
      office.net.ServiceId.OFFLINE_OBSERVER, offlineObserver);
  return offlineObserver;
};



office.net.OfflineObserver.prototype.notifyPotentialStateChange = function() {
  goog.log.fine(this.logger_, 'notifyPotentialStateChange()');
  this.recalculateCheckTimer_(true /* opt_resetBackoff */,
      true /* opt_toZero */);
};



office.net.OfflineObserver.prototype.notifyNetworkRequest = function() {
  goog.log.fine(this.logger_, 'notifyNetworkRequest()');
  this.recalculateCheckTimer_();
};



office.net.OfflineObserver.prototype.notifyNetworkResult = function(wasSuccess) {
  goog.log.fine(this.logger_, 'notifyNetworkResult(' + wasSuccess + ')');
  if (!wasSuccess && this.onlineState_) {



    this.recalculateCheckTimer_(true /* opt_resetBackoff */,
        true /* opt_toZero */);
  } else {
    this.notifyTrustedNetworkResult_(wasSuccess);
  }
};



office.net.OfflineObserver.prototype.notifyTrustedNetworkResult_ = function(
    wasSuccess) {
  goog.log.fine(this.logger_, 'notifyTrustedNetworkResult(' + wasSuccess + ')');

  this.recalculateCheckTimer_(
      this.setOnlineState_(wasSuccess) /* opt_resetBackoff */);
};



office.net.OfflineObserver.prototype.isOnline = function() {
  return this.onlineState_;
};



office.net.OfflineObserver.prototype.recalculateCheckTimer_ = function(
    opt_resetBackoff, opt_toZero) {
  goog.asserts.assert(!opt_toZero || opt_resetBackoff,
      'Can\'t reset to zero if not resetting at all.');

  var now = goog.now();
  var backoffFactor = office.net.OfflineObserver.BACKOFF_FACTOR_;
  var minInterval = office.net.OfflineObserver.MIN_CHECK_INTERVAL_MS_;
  var timeSinceBackoffReset = now - this.lastBackoffResetTime_;

  var nextDelayTime;
  if (opt_resetBackoff) {
    nextDelayTime = opt_toZero ? 0 : minInterval;
    this.lastBackoffResetTime_ = now - nextDelayTime;
  } else {
    nextDelayTime = minInterval;
    var totalTime = minInterval;
    var step = 1;
    while (totalTime < timeSinceBackoffReset) {
      nextDelayTime = Math.min(this.maxCheckInterval_, minInterval *
      Math.pow(backoffFactor, step++));
      if (nextDelayTime == this.maxCheckInterval_) {
        break;
      }
      totalTime += nextDelayTime;
    }
  }
  goog.dispose(this.checkTimer_);


  this.checkTimer_ = new goog.async.Delay(this.handleCheckTimerFired_,
      nextDelayTime, this);
  this.checkTimer_.start();
};



office.net.OfflineObserver.prototype.handleCheckTimerFired_ = function() {
  this.recalculateCheckTimer_();
  this.performImagePing_();
};



office.net.OfflineObserver.prototype.setOnlineState_ = function(state) {
  if (state != this.onlineState_) {
    goog.log.info(this.logger_, 'OfflineStatusObserver transitioned ' + (state ?
        'ONLINE' : 'OFFLINE'));
    this.onlineState_ = state;
    this.dispatchEvent(state ? office.net.OfflineObserverApi.EventType.ONLINE :
        office.net.OfflineObserverApi.EventType.OFFLINE);
    return true;
  }
  return false;
};



office.net.OfflineObserver.prototype.handleNavOnlineStateChange_ = function() {
  goog.log.info(this.logger_, 'OnlineHandler transitioned ' +
  (this.onlineHandler_.isOnline() ? 'ONLINE' : 'OFFLINE'));
  this.recalculateCheckTimer_(true /* opt_resetBackoff */,
      true /* opt_toZero */);
};



office.net.OfflineObserver.prototype.performImagePing_ = function() {
  goog.log.fine(this.logger_, 'Performing image ping.');
  this.imagePingTimeout_.stop();
  this.imagePingTimeout_.start();

  this.imagePingSender_.sendImage(
      goog.uri.utils.makeUnique(this.imagePingUrl_));
};



office.net.OfflineObserver.prototype.imagePingComplete_ = function(success) {
  var successString = success ? 'succeeded' : 'failed';
  goog.log.fine(this.logger_, 'Image ping ' + successString);

  this.imagePingTimeout_.stop();
  this.notifyTrustedNetworkResult_(success);
};



office.net.OfflineObserver.prototype.disposeInternal = function() {
  this.imagePingTimeout_.stop();

  goog.disposeAll(
      this.checkTimer_,
      this.imagePingTimeout_,
      this.onlineHandler_,
      this.eventHandler_,
      this.imagePingSender_);

  goog.base(this, 'disposeInternal');
};
