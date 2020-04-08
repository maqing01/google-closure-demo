

goog.provide('office.net.RequestInternal');

goog.require('office.net.Method');
goog.require('office.net.Request');
goog.require('office.net.ResponseReceivedEvent');
goog.require('office.net.ServiceLevel');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.log');
goog.require('goog.math');
goog.require('goog.uri.utils');




office.net.RequestInternal = function(uri, urlPrefix, content, scottyContent,
    serviceLevel, successFunction, errorFunction, errorNetStateFn,
    externalServerRequest, responseType, isExpectFlaky, timeout, method,
    jsonParser) {
  goog.base(this);


  this.uri_ = uri;


  this.urlPrefix_ = urlPrefix;


  this.content_ = content;



  this.scottyContent_ = scottyContent;


  this.isExpectFlaky_ = isExpectFlaky;


  this.serviceLevel_ = serviceLevel;


  this.method_ = method ||
      (content ? office.net.Method.POST : office.net.Method.GET);


  this.responseType_ = responseType;


  this.successFunction_ = successFunction;


  this.errorFunction_ = errorFunction;


  this.errorNetStateFn_ = errorNetStateFn;


  this.externalServerRequest_ = externalServerRequest;


  this.timeout_ = timeout;


  this.jsonParser_ = jsonParser;


  this.attempts_ = 0;


  this.lastSentTime_ = 0;


  this.lastRetryInterval_ = 0;


  this.logger =
      goog.log.getLogger('office.net.RequestInternal');
};
goog.inherits(office.net.RequestInternal, goog.events.EventTarget);



office.net.RequestInternal.EventType = {

  COMPLETE: goog.events.getUniqueId('complete')
};



office.net.RequestInternal.RETRY_COUNT_ = 3;


office.net.RequestInternal.BASE_RETRY_INTERVAL_ = 5000;


office.net.RequestInternal.RETRY_INTERVAL_RANDOM_FACTOR_ = 0.25;


office.net.RequestInternal.RETRY_BACKOFF_THRESHOLD_ = 30000;


office.net.RequestInternal.BACKOFF_MULTIPLIER_ = 1.5;



office.net.RequestInternal.FIRST_RETRY_INTERVAL_ =
    office.net.RequestInternal.BASE_RETRY_INTERVAL_ *
    goog.math.uniformRandom(
        1 - office.net.RequestInternal.RETRY_INTERVAL_RANDOM_FACTOR_,
        1 + office.net.RequestInternal.RETRY_INTERVAL_RANDOM_FACTOR_);



office.net.RequestInternal.prototype.isNoRetry = function() {
  return this.serviceLevel_ == office.net.ServiceLevel.NO_RETRY;
};



office.net.RequestInternal.prototype.isGuaranteedDelivery = function() {
  return this.serviceLevel_ == office.net.ServiceLevel.GUARANTEED_DELIVERY;
};



office.net.RequestInternal.prototype.isExpectFlaky = function() {
  return this.isExpectFlaky_;
};



office.net.RequestInternal.prototype.getServiceLevel = function() {
  return this.serviceLevel_;
};



office.net.RequestInternal.prototype.getUri = function() {
  return this.uri_;
};



office.net.RequestInternal.prototype.getUrlPrefix = function() {
  return this.urlPrefix_;
};



office.net.RequestInternal.prototype.getResponseType = function() {
  return this.responseType_;
};



office.net.RequestInternal.prototype.handleSuccess = function(response) {
  this.successFunction_(response);
};



office.net.RequestInternal.prototype.getContent = function() {
  return this.content_;
};



office.net.RequestInternal.prototype.getScottyContent = function() {
  return this.scottyContent_;
};



office.net.RequestInternal.prototype.getJsonParser = function() {
  return this.jsonParser_;
};



office.net.RequestInternal.prototype.getMethod = function() {
  return this.method_;
};



office.net.RequestInternal.prototype.getTimeout = function() {
  return this.timeout_;
};



office.net.RequestInternal.prototype.handleError = function(netEvent) {
  return this.errorFunction_(netEvent);
};



office.net.RequestInternal.prototype.calculateErrorNetStatus =
    function(netEvent) {
  return this.errorNetStateFn_(netEvent);
};



office.net.RequestInternal.prototype.isExternalServerRequest =
    function() {
  return this.externalServerRequest_;
};



office.net.RequestInternal.prototype.hasRetries = function() {
  return !this.isNoRetry() &&
      this.attempts_ < office.net.RequestInternal.RETRY_COUNT_ + 1;
};



office.net.RequestInternal.prototype.shouldLogFailure = function() {
  return !this.isNoRetry();
};



office.net.RequestInternal.prototype.send = function(requestUrlState) {
  if (goog.DEBUG) {


    for (var param in requestUrlState.getInfoParamsMap()) {
      if (goog.uri.utils.hasParam(this.uri_, param)) {
        throw Error('Request for uri ' + this.uri_ +
            ' already contains reserved additional param ' + param);
      }
    }
  }

  this.attempts_++;
  this.lastSentTime_ = goog.now();

  if (this.attempts_ > 1) {
    goog.log.fine(this.logger,
        'Request failed, retrying (n=' + this.attempts_ + ')');
  }

  this.sendInternal(requestUrlState);
};



office.net.RequestInternal.prototype.sendInternal = goog.abstractMethod;



office.net.RequestInternal.prototype.handleRequestComplete = function(response) {
  this.reset();

  this.dispatchEvent(new office.net.ResponseReceivedEvent(this, response));
};



office.net.RequestInternal.prototype.calculateDelayToNextRetry =
    function(backoff) {

  var retryInterval = office.net.RequestInternal.FIRST_RETRY_INTERVAL_;
  if (backoff && this.lastRetryInterval_ != 0) {
    if (this.lastRetryInterval_ <
        office.net.RequestInternal.RETRY_BACKOFF_THRESHOLD_) {
      retryInterval = this.lastRetryInterval_ *
          office.net.RequestInternal.BACKOFF_MULTIPLIER_;
    } else {


      retryInterval = this.lastRetryInterval_;
    }
  }
  this.lastRetryInterval_ = retryInterval;




  return Math.max(0, retryInterval - (goog.now() - this.lastSentTime_));
};



office.net.RequestInternal.prototype.getLogContext = function() {
  return {
    'ReqUri': this.uri_,
    'ReqContent': this.scottyContent_ ? this.scottyContent_ : this.content_,
    'ReqMethod': this.method_
  };
};



office.net.RequestInternal.prototype.reset = goog.nullFunction;



office.net.RequestInternal.prototype.disposeInternal = function() {
  this.dispatchEvent(office.net.RequestInternal.EventType.COMPLETE);

  this.reset();

  delete this.errorFunction_;
  delete this.successFunction_;

  goog.base(this, 'disposeInternal');
};
