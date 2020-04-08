

goog.provide('office.net.DeferredRequestBuilder');

goog.require('office.net.AbstractRequestBuilder');
goog.require('office.net.DeferredRequest');




office.net.DeferredRequestBuilder =
    function(urlPath, deferredRequestBuilderService, xsrfTokenProvider) {
  goog.base(this, urlPath, xsrfTokenProvider, null /* sessionData */);


  this.deferredRequestBuilderService_ = deferredRequestBuilderService;


  this.deferredRequest_ = null;


  this.withSessionData_ = false;
};
goog.inherits(office.net.DeferredRequestBuilder, office.net.AbstractRequestBuilder);



office.net.DeferredRequestBuilder.prototype.withSessionData = function() {
  this.withSessionData_ = true;
  return this;
};



office.net.DeferredRequestBuilder.prototype.buildAndSend = function() {
  this.validate();
  this.deferredRequest_ = new office.net.DeferredRequest(
      this.getNonPrefixedUri(),
      this.getUrlPrefix(),
      this.getContent(),
      this.getScottyContent(),
      this.getServiceLevel(),
      this.getSuccessFunction(),
      this.getErrorFunction(),
      this.getErrorNetStateFn(),
      this.isExternalServerRequest(),
      this.getResponseType(),
      this.isExpectFlaky(),
      this.getTimeout(),
      this.getMethod(),
      this.getJsonParser());
  this.deferredRequestBuilderService_.addCallback(
      goog.bind(this.buildAndSendUsingRequestBuilderService_, this));
  return this.deferredRequest_;
};



office.net.DeferredRequestBuilder.prototype.copyTo = function(requestBuilder) {
  goog.base(this, 'copyTo', requestBuilder);
  if (this.withSessionData_) {
    requestBuilder.withSessionData();
  }
};



office.net.DeferredRequestBuilder.prototype.
    buildAndSendUsingRequestBuilderService_ = function(requestBuilderService) {
  if (!this.deferredRequest_.isDisposed()) {
    var requestBuilder =

        (requestBuilderService.newRequestBuilder(this.getNonPrefixedUri()));
    this.copyTo(requestBuilder);
    var request = requestBuilder.buildAndSend();
    this.deferredRequest_.registerDisposable(request);
  }
};



office.net.DeferredRequestBuilder.prototype.buildInternal = function() {
  throw Error('buildInternal is not supported for DeferredRequestBuilder.');
};



office.net.DeferredRequestBuilder.prototype.sendInternal = function(request) {
  throw Error('sendInternal is not supported for DeferredRequestBuilder.');
};
