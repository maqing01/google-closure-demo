



goog.provide('office.net.DataLoader');

goog.require('office.chrome.DialogUtil');
goog.require('office.net.ServiceLevel');
goog.require('goog.events.EventTarget');




office.net.DataLoader = function(requestBuilderService, callbackHandler,
    handleSuccessFn) {
  goog.base(this);


  this.requestBuilderService_ = requestBuilderService;


  this.pendingRequest_ = null;


  this.callbackHandler_ = callbackHandler;


  this.handleSuccessFn_ = handleSuccessFn;
};
goog.inherits(office.net.DataLoader, goog.events.EventTarget);



office.net.DataLoader.prototype.loadData = function(url, queryArray, opt_timeout,
    opt_serviceLevel) {

  goog.dispose(this.pendingRequest_);

  var requestBuilder = this.requestBuilderService_.newRequestBuilder(url).
      setSuccessFunction(this.handleLoadSuccess_, this).
      setErrorFunction(this.handleLoadFailure_, this);

  if (goog.isNumber(opt_timeout)) {
    requestBuilder.setTimeout(opt_timeout);
  }

  requestBuilder.setServiceLevel(opt_serviceLevel ||
      office.net.ServiceLevel.RETRY);

  requestBuilder.withParams.apply(requestBuilder, queryArray);
  this.pendingRequest_ = requestBuilder.buildAndSend();
};



office.net.DataLoader.prototype.handleLoadSuccess_ = function(response) {
  this.pendingRequest_ = null;
  this.handleSuccessFn_.apply(this.callbackHandler_,
      this.getSuccessFnArguments(response));
};



office.net.DataLoader.prototype.handleLoadFailure_ = function(error) {
  this.pendingRequest_ = null;
  office.chrome.DialogUtil.alert(this.getFailureTitle(), this.getFailureDetail());
};



office.net.DataLoader.prototype.getSuccessFnArguments = goog.abstractMethod;



office.net.DataLoader.prototype.getFailureTitle = goog.abstractMethod;



office.net.DataLoader.prototype.getFailureDetail = goog.abstractMethod;



office.net.DataLoader.prototype.disposeInternal = function() {
  delete this.requestBuilderService_;
  delete this.callbackHandler_;
  delete this.handleSuccessFn_;

  goog.dispose(this.pendingRequest_);
  delete this.pendingRequest_;

  goog.base(this, 'disposeInternal');
};
