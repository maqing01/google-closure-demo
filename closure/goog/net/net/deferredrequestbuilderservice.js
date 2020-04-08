goog.provide('office.net.DeferredRequestBuilderService');

goog.require('office.net.DeferredRequestBuilder');
goog.require('office.net.DeferredXsrfTokenProvider');
goog.require('office.net.RequestBuilderService');
goog.require('office.net.Util');
goog.require('goog.asserts');
goog.require('goog.string');




office.net.DeferredRequestBuilderService = function() {


  this.xsrfTokenProvider_ = new office.net.DeferredXsrfTokenProvider();


  this.pendingCallbacks_ = [];
};



office.net.DeferredRequestBuilderService.prototype.urlPrefix_ = '';



office.net.DeferredRequestBuilderService.prototype.delegate_ = null;



office.net.DeferredRequestBuilderService.prototype.setDelegate = function(
    netService) {
  this.delegate_ = netService;
  this.xsrfTokenProvider_.setDelegate(netService);

  while (this.pendingCallbacks_.length) {
    var callback = this.pendingCallbacks_.shift();
    callback(this.delegate_);
  }
};



office.net.DeferredRequestBuilderService.prototype.addCallback =
    function(callback) {
  if (this.delegate_) {
    callback(this.delegate_);
  } else {
    this.pendingCallbacks_.push(callback);
  }
};



office.net.DeferredRequestBuilderService.prototype.newRequestBuilder = function(
    path) {
  goog.asserts.assert(goog.string.startsWith(path, '/'));
  var requestBuilder = new office.net.DeferredRequestBuilder(
      path, this, this.xsrfTokenProvider_);
  requestBuilder.setUrlPrefix(this.urlPrefix_);
  return requestBuilder;
};



office.net.DeferredRequestBuilderService.prototype.setUrlPrefix = function(
    urlPrefix) {
  office.net.Util.validateUrlPrefix(urlPrefix);
  this.urlPrefix_ = urlPrefix;
};
