



goog.provide('office.net.InfoParameters');

goog.require('office.flag');
goog.require('office.net.Param');
goog.require('office.net.constants');
goog.require('goog.async.Deferred');
goog.require('goog.object');




office.net.InfoParameters = function(opt_object) {

  this.infoParameters_ = opt_object ? goog.object.clone(opt_object) : {};


  this.xsrfTokenDeferred_ = null;
};



office.net.InfoParameters.prototype.maybeFulfillXsrfToken_ = function() {
  if (!this.xsrfTokenDeferred_) {
    return;
  }

  var xsrfToken = this.getXsrfToken();
  if (xsrfToken) {
    this.xsrfTokenDeferred_.callback(xsrfToken);
    this.xsrfTokenDeferred_ = null;
  }
};



office.net.InfoParameters.prototype.setParameter = function(key, value) {
  if (value) {
    this.infoParameters_[key] = value;
    this.maybeFulfillXsrfToken_();
  } else {
    delete this.infoParameters_[key];
  }
};




office.net.InfoParameters.prototype.getParameters = function() {
  var result = [];
  var infoParameters = this.infoParameters_;
  for (var key in infoParameters) {
    result.push(key, infoParameters[key]);
  }
  return result;
};



office.net.InfoParameters.prototype.getParameterObject = function() {
  return this.infoParameters_;
};



office.net.InfoParameters.prototype.getXsrfToken = function() {
  return this.infoParameters_[office.net.Param.XSRF] || null;
};



office.net.InfoParameters.prototype.getDeferredXsrfToken = function() {
  var xsrfToken = this.getXsrfToken();
  if (xsrfToken) {
    return goog.async.Deferred.succeed(xsrfToken);
  }

  if (!this.xsrfTokenDeferred_) {
    this.xsrfTokenDeferred_ = new goog.async.Deferred();
  }
  return this.xsrfTokenDeferred_;
};



office.net.InfoParameters.createFromClientFlags = function() {
  return new office.net.InfoParameters(office.flag.getInstance().getJsonObject(
      office.net.constants.INFO_PARAMS_FLAG_NAME));
};
