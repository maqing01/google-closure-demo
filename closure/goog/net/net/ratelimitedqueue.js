

goog.provide('office.net.RateLimitedQueue');

goog.require('goog.Disposable');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.events.EventHandler');




office.net.RateLimitedQueue = function(handlerFn, opt_qpsLimiter) {
  goog.base(this);


  this.queue_ = [];


  this.handlerFn_ = handlerFn;


  this.qpsLimiter_ = opt_qpsLimiter || null;


  this.eventHandler_ = null;


  this.timer_ = null;


  if (this.qpsLimiter_) {
    this.timer_ = new goog.Timer(office.net.RateLimitedQueue.QPS_CHECK_INTERVAL_);
    this.eventHandler_ = new goog.events.EventHandler(this);
    this.eventHandler_.listen(this.timer_, goog.Timer.TICK, this.wakeQueue_);
  }
};
goog.inherits(office.net.RateLimitedQueue, goog.Disposable);



office.net.RateLimitedQueue.QPS_CHECK_INTERVAL_ = 500;



office.net.RateLimitedQueue.prototype.enqueue = function(request) {
  if (this.qpsLimiter_) {
    if (!this.qpsLimiter_.isUnderLimit() || this.queue_.length != 0) {
      this.queue_.push(request);
      this.timer_.start();
      return;
    }


    this.qpsLimiter_.incrementAndCheck();
  }

  this.handlerFn_(request);
};



office.net.RateLimitedQueue.prototype.reset = function() {
  this.queue_ = [];
  if (this.timer_) {
    this.timer_.stop();
  }
};



office.net.RateLimitedQueue.prototype.contains = function(request) {
  return goog.array.contains(this.queue_, request);
};



office.net.RateLimitedQueue.prototype.remove = function(request) {
  goog.array.remove(this.queue_, request);
  this.checkTimer_();
};



office.net.RateLimitedQueue.prototype.wakeQueue_ = function() {
  while (this.queue_.length > 0 && this.qpsLimiter_.isUnderLimit()) {
    this.qpsLimiter_.incrementAndCheck();
    this.handlerFn_(
 (this.queue_.shift()));
  }

  this.checkTimer_();
};



office.net.RateLimitedQueue.prototype.checkTimer_ = function() {
  if (this.queue_.length == 0 && this.timer_) {
    this.timer_.stop();
  }
};



office.net.RateLimitedQueue.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);
  goog.dispose(this.timer_);
  goog.base(this, 'disposeInternal');
};
