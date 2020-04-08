goog.provide('office.net.RequestUrlState');

goog.require('office.net.InfoParameters');
goog.require('office.net.Param');
goog.require('office.net.Util');
goog.require('office.net.constants');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.object');
goog.require('goog.uri.utils');




office.net.RequestUrlState = function(opt_window, opt_infoParameters,
    opt_includeXsrfHeader) {
  goog.base(this);


  this.headers_ = goog.object.create(office.net.constants.XSRF_HEADER_NAME,
      office.net.constants.XSRF_HEADER_VALUE);

  if (opt_includeXsrfHeader === false) {
    this.headers_ = {};
  }


  this.urlPrefix_ = '';


  this.logger_ = goog.log.getLogger('office.net.RequestUrlState');


  this.infoParameters_ =
      opt_infoParameters || office.net.InfoParameters.createFromClientFlags();

  var window = opt_window || goog.global;
  this.inferParamsFromPageLocation_(window.location.href);
};
goog.inherits(office.net.RequestUrlState, goog.events.EventTarget);



office.net.RequestUrlState.EventType = {
  INFO_PARAMETERS_UPDATED: goog.events.getUniqueId('info_parameters_updated')
};



office.net.RequestUrlState.prototype.setHeaders = function(headers) {
  goog.object.extend(this.headers_, headers);
  this.logger_ && this.logger_.config && this.logger_.config('setHeaders(' + goog.json.serialize(headers) + ')');
};

office.net.RequestUrlState.prototype.removeHeader = function(key) {
  goog.object.remove(this.headers_, key);
};

office.net.RequestUrlState.prototype.getHeaders = function() {
  return goog.object.clone(this.headers_);
};



office.net.RequestUrlState.prototype.setReleaseIdentifier = function(releaseId) {
  goog.log.info(this.logger_,
      'setReleaseIdentifier(' + releaseId + ')');
  this.headers_[office.net.constants.RELEASE_IDENTIFIER_HEADER_NAME] = releaseId;
};



office.net.RequestUrlState.prototype.getUrlPrefix = function() {
  return this.urlPrefix_;
};



office.net.RequestUrlState.prototype.setUrlPrefix = function(urlPrefix) {
  goog.log.info(this.logger_, 'setUrlPrefix(' + urlPrefix + ')');
  office.net.Util.validateUrlPrefix(urlPrefix);
  this.urlPrefix_ = urlPrefix;
};


office.net.RequestUrlState.prototype.setInfoParam = function(key, value) {
  this.infoParameters_.setParameter(key, value);
  this.dispatchEvent(
      office.net.RequestUrlState.EventType.INFO_PARAMETERS_UPDATED);
};



office.net.RequestUrlState.prototype.setXsrfToken = function(xsrfToken) {
  goog.log.info(this.logger_, 'setXsrfToken(' + xsrfToken + ')');
  this.setInfoParam(office.net.Param.XSRF, xsrfToken);
};



office.net.RequestUrlState.prototype.getXsrfToken = function() {
  return this.infoParameters_.getXsrfToken();
};



office.net.RequestUrlState.prototype.getDeferredXsrfToken = function() {
  return this.infoParameters_.getDeferredXsrfToken();
};



office.net.RequestUrlState.prototype.setAuthKey = function(authKey) {
  goog.log.info(this.logger_, 'setAuthKey(' + authKey + ')');
  this.setInfoParam(office.net.Param.AUTH_KEY, authKey);
};



office.net.RequestUrlState.prototype.getInfoParams = function() {
  return this.infoParameters_.getParameters();
};



office.net.RequestUrlState.prototype.getInfoParamsMap = function() {
  return this.infoParameters_.getParameterObject();
};



office.net.RequestUrlState.prototype.inferParamsFromPageLocation_ = function(
    pageLocation) {
  var authKey = goog.uri.utils.getParamValue(
      pageLocation, office.net.Param.AUTH_KEY);



  if (authKey) {
    this.setAuthKey(authKey);
  }
};
