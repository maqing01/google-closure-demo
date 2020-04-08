goog.provide('office.net.RetryManager');

goog.require('office.net.OfflineObserverApi');
goog.require('office.util.ExponentialDelay');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');
goog.require('goog.log');




office.net.RetryManager = function(retryCallback, slowStart, opt_offlineObserver,
    opt_minDelay, opt_maxDelay, opt_jitterFactor) {
  goog.base(this);


  this.exponentialDelay_ = new office.util.ExponentialDelay(
      goog.bind(this.handleTimerCallback_, this),
      opt_minDelay || office.net.RetryManager.DEFAULT_MIN_DELAY_,
      opt_maxDelay || office.net.RetryManager.DEFAULT_MAX_DELAY_,
      opt_jitterFactor);


  this.eventHandler_ = new goog.events.EventHandler(this);


  this.retryCallback_ = retryCallback;


  this.slowStart_ = slowStart;


  this.offlineObserver_ = opt_offlineObserver || null;


  if (this.offlineObserver_) {
    this.eventHandler_.
        listen(this.offlineObserver_,
            office.net.OfflineObserverApi.EventType.ONLINE,
            this.handleOnline_).
        listen(this.offlineObserver_,
            office.net.OfflineObserverApi.EventType.OFFLINE,
            this.handleOffline_);
  }

  this.registerDisposable(this.exponentialDelay_);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(office.net.RetryManager, goog.Disposable);



office.net.RetryManager.DEFAULT_MAX_DELAY_ = 45000;



office.net.RetryManager.DEFAULT_MIN_DELAY_ = 5000;



office.net.RetryManager.prototype.active_ = false;



office.net.RetryManager.prototype.logger_ =
    goog.log.getLogger('office.net.RetryManager');



office.net.RetryManager.prototype.start = function() {




  this.active_ = true;
  if (this.isOnline_()) {
    if (this.slowStart_) {
      this.exponentialDelay_.slowStart();
    } else {
      this.exponentialDelay_.start();
    }
  }
};



office.net.RetryManager.prototype.stop = function() {
  this.exponentialDelay_.stop();
  this.active_ = false;
};



office.net.RetryManager.prototype.handleOnline_ = function(e) {
  goog.log.info(this.logger_, 'OfflineObserver signalled ONLINE state.');
  if (this.active_) {
    this.exponentialDelay_.resetBackoffAndStart();
  }
};



office.net.RetryManager.prototype.handleOffline_ = function(e) {
  goog.log.info(this.logger_, 'OfflineObserver signalled OFFLINE state.');
  this.exponentialDelay_.stop();
};



office.net.RetryManager.prototype.handleTimerCallback_ = function() {
  if (this.active_ && this.isOnline_()) {
    this.active_ = false;
    this.retryCallback_();
  }
};



office.net.RetryManager.prototype.isOnline_ = function() {
  return !this.offlineObserver_ || this.offlineObserver_.isOnline();
};



office.net.RetryManager.prototype.disposeInternal = function() {
  delete this.retryCallback_;
  delete this.eventHandler_;
  delete this.exponentialDelay_;
  delete this.offlineObserver_;

  goog.base(this, 'disposeInternal');
};
