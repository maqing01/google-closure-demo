goog.provide('office.net.PartnerPingSender');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.net.ImagePingSender');
goog.require('office.net.ServiceId');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.events.EventHandler');
goog.require('goog.events.OnlineHandler');
goog.require('goog.log');
goog.require('goog.log.Level');
goog.require('goog.uri.utils');



office.net.PartnerPingSender = function (
    requireExternalNetwork,
    imagePingUrl,
    partnerId,
    partnerSecret,
    netStatus, maxRetryCounts) {
  goog.base(this);
  // IMP: 不再需要，会发一个docs-gifshow请求，404
  return
  this.imagePingUrl_ = imagePingUrl;

    


  this.requireExternalNetwork = requireExternalNetwork;


  this.netStatus_ = netStatus;


  this.partnerId_ = partnerId;


  this.partnerSecret_ = partnerSecret;


  this.imagePingTimeout_ = new goog.async.Delay(
      goog.bind(this.imagePingComplete_, this, false),
      office.net.PartnerPingSender.PING_TIMEOUT_MS_);


  this.checkTimer_ = null;

  this.maxRetryCounts_ = maxRetryCounts;

  this.fails = 0;


  this.imagePingSender_ = new office.net.ImagePingSender(
      goog.bind(this.imagePingComplete_, this));


  this.recalculateCheckTimer_(true /* resetBackoff */, true /* opt_toZero */);
};
goog.inherits(office.net.PartnerPingSender, office.net.OfflineObserverApi);



office.net.PartnerPingSender.prototype.logger_ = goog.log.getLogger(
    'office.net.PartnerPingSender');



office.net.PartnerPingSender.PING_TIMEOUT_MS_ = 60 * 1000;



office.net.PartnerPingSender.MIN_CHECK_INTERVAL_MS_ = 60 * 1000;



office.net.PartnerPingSender.BACKOFF_FACTOR_ = 1.0;



office.net.PartnerPingSender.prototype.recalculateCheckTimer_ = function(
    opt_resetBackoff, opt_toZero) {
  goog.asserts.assert(!opt_toZero || opt_resetBackoff,
      'Can\'t reset to zero if not resetting at all.');
  goog.dispose(this.checkTimer_);

  var nextDelayTime = office.net.PartnerPingSender.MIN_CHECK_INTERVAL_MS_;
  this.checkTimer_ = new goog.async.Delay(this.handleCheckTimerFired_,
      nextDelayTime, this);
  this.checkTimer_.start();
};



office.net.PartnerPingSender.prototype.handleCheckTimerFired_ = function () {
  this.recalculateCheckTimer_();
  this.performImagePing_();
};



office.net.PartnerPingSender.prototype.performImagePing_ = function () {
  goog.log.fine(this.logger_, 'Performing image ping.');
  this.imagePingTimeout_.stop();
  this.imagePingTimeout_.start();

  this.imagePingUrl_ = goog.uri.utils.setParam(this.imagePingUrl_, 'partnerid', this.partnerId_);
  this.imagePingUrl_ = goog.uri.utils.setParam(this.imagePingUrl_,
      'partnersecret', this.partnerSecret_);
  this.imagePingUrl_ = goog.uri.utils.setParam(this.imagePingUrl_, 'token', "yiqixie");
  this.imagePingSender_.sendImage(goog.uri.utils.makeUnique(this.imagePingUrl_));
};



office.net.PartnerPingSender.prototype.imagePingComplete_ = function (success, e) {
  var successString = success ? 'secure domain success' : 'secure domain failed';
  if (!success) {
    this.fails++;
  } else {
    this.fails = 0;
  }
  goog.log.fine(this.logger_, 'Image ping ' + successString);
  if (this.requireExternalNetwork) {
     if (this.fails >= this.maxRetryCounts_) {
       this.netStatus_.setState(office.net.Status.State.INCOMPATIBLE_SERVER);
     }
  } else {
    if (this.fails >= this.maxRetryCounts_ && e.target.getResponseText() == 'expired') {
      this.netStatus_.setState(office.net.Status.State.INCOMPATIBLE_SERVER);
    }
  }

  this.imagePingTimeout_.stop();
};



office.net.PartnerPingSender.prototype.disposeInternal = function () {
  this.imagePingTimeout_.stop();

  goog.disposeAll(
      this.checkTimer_,
      this.imagePingTimeout_,
      this.imagePingSender_);

  goog.base(this, 'disposeInternal');
};
