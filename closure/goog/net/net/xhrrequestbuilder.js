

goog.provide('office.net.XhrRequestBuilder');

goog.require('office.net.AbstractRequestBuilder');
goog.require('office.net.XhrRequest');




office.net.XhrRequestBuilder = function(
    requestSender, uri, xsrfTokenProvider, sessionData, opt_slowConnection) {
  goog.base(this, uri, xsrfTokenProvider, sessionData);


  this.sender_ = requestSender;


  this.slowConnection_ = !!opt_slowConnection;
};
goog.inherits(office.net.XhrRequestBuilder, office.net.AbstractRequestBuilder);



office.net.XhrRequestBuilder.DEFAULT_TIMEOUT_MS = 60 * 1000;



office.net.XhrRequestBuilder.SLOW_TIMEOUT_MS = 60 * 1000;



office.net.XhrRequestBuilder.prototype.buildInternal = function() {
  var timeout = this.getTimeout();
  if (timeout < 0) {
    timeout = this.slowConnection_ ?
        office.net.XhrRequestBuilder.SLOW_TIMEOUT_MS :
        office.net.XhrRequestBuilder.DEFAULT_TIMEOUT_MS;
  }
  return new office.net.XhrRequest(
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
      timeout,
      this.getMethod(),
      this.getJsonParser());
};



office.net.XhrRequestBuilder.prototype.sendInternal = function(request) {
  if (!this.sender_) {
    throw Error('Trying to send a request without a request sender for - ' +
        this.getUri());
  }

  this.sender_.send(request);
};
