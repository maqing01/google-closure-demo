/**
* @author: houmingjie
* @file: description
* @Date: 2019-09-24 18:17:30
* @LastEditors: houmingjie
* @LastEditTime: 2019-12-10 14:47:16
 */
goog.provide('office.net.CompositeRequestBuilder');

goog.require('office.flag');
goog.require('office.net.AbstractRequestBuilder');
goog.require('office.net.Flags');

goog.require('office.net.XhrRequestBuilder');




office.net.CompositeRequestBuilder = function(
    requestSender, uri, xsrfTokenProvider, sessionData, opt_uploaderUrl) {
  goog.base(this, uri, xsrfTokenProvider, sessionData);


  this.sender_ = requestSender;

  var flags = office.flag.getInstance();


  this.useScottyUploads_ =
      flags.getBoolean(office.net.Flags.USE_SCOTTY_UPLOADS_FOR_LARGE_REQUESTS);


  this.minSizeForScottyUploads_ =
      flags.getNumber(office.net.Flags.MINIMUM_REQUEST_SIZE_FOR_SCOTTY_UPLOADS);


  this.uploaderUrl_ = opt_uploaderUrl;
};
goog.inherits(
    office.net.CompositeRequestBuilder, office.net.AbstractRequestBuilder);



office.net.CompositeRequestBuilder.prototype.buildInternal = function() {
  var requestBuilder = null;
  if (requestBuilder == null) {
    requestBuilder = new office.net.XhrRequestBuilder(
        this.sender_,
        this.getNonPrefixedUri(),
        this.getXsrfTokenProvider(),
        this.getSessionData());
  }
  this.copyTo(requestBuilder);

  return requestBuilder.buildInternal();
};



office.net.CompositeRequestBuilder.prototype.sendInternal = function(request) {
  if (!this.sender_) {
    throw Error('Trying to send a request without a request sender for - ' +
        this.getUri());
  }

  this.sender_.send(request);
};
