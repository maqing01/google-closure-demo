



goog.provide('office.debug.ErrorSender');

goog.require('office.net.QpsLimiter');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.events.EventHandler');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');




office.debug.ErrorSender = function(opt_maxErrorsStored) {
  goog.base(this);


  this.xhrIo_ = new goog.net.XhrIo();


  this.resendDelay_ = new goog.async.Delay(this.maybeSendFront,
      office.debug.ErrorSender.RETRY_INTERVAL_, this);


  this.qpsLimiter_ = new office.net.QpsLimiter('errorsender',
      office.debug.ErrorSender.QPS_LIMIT_,
      office.debug.ErrorSender.QPS_LIMIT_INTERVAL_);


  this.qpsLimitExceeded_ = false;


  this.eventHandler_ = new goog.events.EventHandler(this);



  goog.asserts.assert(!goog.isDefAndNotNull(opt_maxErrorsStored) ||
      opt_maxErrorsStored > 0);


  this.maxErrorsStored_ = opt_maxErrorsStored || 10;

  this.eventHandler_.listen(this.xhrIo_, goog.net.EventType.COMPLETE,
      this.handleXhrCompletion_);


  this.eventHandler_.listen(this.xhrIo_, goog.net.EventType.READY,
      this.maybeSendFront);
};
goog.inherits(office.debug.ErrorSender, goog.Disposable);



office.debug.ErrorSender.RequestDataProperty_ = {
  URI: 'u',
  METHOD: 'm',
  CONTENT: 'c',
  HEADERS: 'h'
};



office.debug.ErrorSender.QPS_LIMIT_ = 1;



office.debug.ErrorSender.QPS_LIMIT_INTERVAL_ = 8;



office.debug.ErrorSender.RETRY_INTERVAL_ = 30000;



office.debug.ErrorSender.prototype.send = function(uri, method, content,
    opt_headers) {

  if (this.getQueueSize() >= this.maxErrorsStored_) {
    return;
  }

  var requestData = {};
  var props = office.debug.ErrorSender.RequestDataProperty_;
  requestData[props.URI] = uri;
  requestData[props.METHOD] = method;
  requestData[props.CONTENT] = content;
  requestData[props.HEADERS] = opt_headers;


  this.enqueue(requestData);
  this.maybeSendFront();
};



office.debug.ErrorSender.prototype.getQueueSize = goog.abstractMethod;



office.debug.ErrorSender.prototype.enqueue = goog.abstractMethod;



office.debug.ErrorSender.prototype.getFront = goog.abstractMethod;



office.debug.ErrorSender.prototype.deleteFront = goog.abstractMethod;



office.debug.ErrorSender.prototype.maybeSendFront = function() {
  if (this.getQueueSize() > 0 && !this.resendDelay_.isActive() &&
      !this.xhrIo_.isActive() && !this.qpsLimitExceeded_) {
    this.sendFront_();
  }
};



office.debug.ErrorSender.prototype.sendFront_ = function() {

  goog.asserts.assert(!this.resendDelay_.isActive());
  goog.asserts.assert(!this.xhrIo_.isActive());
  goog.asserts.assert(!this.qpsLimitExceeded_);



  var frontEntry = this.getFront();
  if (!frontEntry) {
    return;
  }

  var props = office.debug.ErrorSender.RequestDataProperty_;
  if (frontEntry[props.URI].length > 4000) {



    this.deleteFront();
    return;
  }

  try {
    this.qpsLimiter_.incrementAndCheck(1);
    this.xhrIo_.send(frontEntry[props.URI], frontEntry[props.METHOD],
        frontEntry[props.CONTENT], frontEntry[props.HEADERS]);
  } catch (exception) {
    if (exception instanceof office.net.QpsLimiter.LimitError) {
      this.qpsLimitExceeded_ = true;
    } else {
      throw exception;
    }
  }
};



office.debug.ErrorSender.prototype.handleXhrCompletion_ = function(event) {
  var status = this.xhrIo_.getStatus();




  if (this.xhrIo_.isSuccess() || (status >= 400 && status <= 500)) {

    this.deleteFront();

  } else {
    this.resendDelay_.start();
  }
};



office.debug.ErrorSender.prototype.disposeInternal = function() {
  goog.disposeAll(
      this.eventHandler_,
      this.resendDelay_,
      this.xhrIo_);

  goog.base(this, 'disposeInternal');
};
