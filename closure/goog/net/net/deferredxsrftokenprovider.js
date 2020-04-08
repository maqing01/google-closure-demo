goog.provide('office.net.DeferredXsrfTokenProvider');

goog.require('office.net.XsrfTokenProvider');
goog.require('goog.async.Deferred');




office.net.DeferredXsrfTokenProvider = function() {

  this.delegate_ = null;


  this.xsrfTokenDeferred_ = new goog.async.Deferred();
};



office.net.DeferredXsrfTokenProvider.prototype.setDelegate = function(
    delegate) {
  this.delegate_ = delegate;
  this.delegate_.getDeferredXsrfToken().addCallback(
      goog.bind(function(xsrfToken) {
        this.xsrfTokenDeferred_.callback(xsrfToken);
      }, this));
};



office.net.DeferredXsrfTokenProvider.prototype.getXsrfToken = function() {
  return this.delegate_ ? this.delegate_.getXsrfToken() : null;
};



office.net.DeferredXsrfTokenProvider.prototype.getDeferredXsrfToken = function() {
  return this.xsrfTokenDeferred_;
};
