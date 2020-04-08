goog.provide('office.net.DefaultRequestBuilderFactory');

goog.require('office.net.CompositeRequestBuilder');
goog.require('office.net.RequestBuilderFactory');




office.net.DefaultRequestBuilderFactory = function(
    opt_uploaderUrl, opt_jsonParser) {


  this.uploaderUrl_ = opt_uploaderUrl;


  this.jsonParser_ = opt_jsonParser || null;
};



office.net.DefaultRequestBuilderFactory.prototype.createRequestBuilder =
    function(requestSender, uri, xsrfTokenProvider, sessionData) {
  var builder = new office.net.CompositeRequestBuilder(
      requestSender,
      uri,
      xsrfTokenProvider,
      sessionData,
      this.uploaderUrl_);
  if (this.jsonParser_) {
    builder.setJsonParser(this.jsonParser_);
  }
  return builder;
};
