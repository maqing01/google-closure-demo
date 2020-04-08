

goog.provide('office.net.XhrRequestBuilderFactory');

goog.require('office.net.RequestBuilderFactory');
goog.require('office.net.XhrRequestBuilder');




office.net.XhrRequestBuilderFactory = function(
    opt_slowConnection, opt_jsonParser) {

  this.slowConnection_ = !!opt_slowConnection;


  this.jsonParser_ = opt_jsonParser || null;
};



office.net.XhrRequestBuilderFactory.prototype.createRequestBuilder =
    function(requestSender, uri, xsrfTokenProvider, sessionData) {
  var builder = new office.net.XhrRequestBuilder(
      requestSender, uri, xsrfTokenProvider, sessionData, this.slowConnection_);
  if (this.jsonParser_) {
    builder.setJsonParser(this.jsonParser_);
  }
  return builder;
};
