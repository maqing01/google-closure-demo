goog.provide('office.net.AbstractRequestBuilder');

goog.require('office.flag');
goog.require('office.net.Flags');
goog.require('office.net.Method');
goog.require('office.net.Param');
goog.require('office.net.RequestBuilder');
goog.require('office.net.Response');
goog.require('office.net.ServiceLevel');

goog.require('office.net.types.ErrorFunction');

goog.require('office.net.types.SuccessFunction');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.functions');
goog.require('goog.json');
goog.require('goog.json.EvalJsonProcessor');
goog.require('goog.object');
goog.require('goog.string.StringBuffer');
goog.require('goog.uri.utils');




office.net.AbstractRequestBuilder = function(
    urlPath, xsrfTokenProvider, sessionData) {


  this.xsrfTokenProvider_ = xsrfTokenProvider;


  this.urlPath_ = urlPath;


  this.sessionData_ = sessionData;


  this.urlPrefix_ = '';


  this.content_ = undefined;


  this.scottyContent_ = undefined;


  this.method_ = null;


  this.responseType_ = office.net.Response.ResponseType.TEXT;


  this.serviceLevel_ = office.net.ServiceLevel.GUARANTEED_DELIVERY;


  this.expectFlaky_ = false;


  this.errorFunction_ = goog.nullFunction;


  this.errorNetStateFn_ = goog.functions.NULL;


  this.externalServerRequest_ = false;


  this.successFunction_ = goog.nullFunction;


  this.timeout_ = -1;


  this.uploadAllowed_ = false;


  this.jsonParser_ = new goog.json.NativeJsonProcessor();
};



office.net.AbstractRequestBuilder.prototype.withParams = function(var_args) {


  var args = [this.urlPath_];
  goog.array.extend(args, arguments);
  this.urlPath_ = goog.uri.utils.appendParams.apply(null, args);
  return this;
};



office.net.AbstractRequestBuilder.prototype.withSessionData = function() {
  if (!this.sessionData_) {
    throw new Error(
        'Cannot add session data to request when session data not defined.');
  }
  this.urlPath_ = goog.uri.utils.appendParamsFromMap(
      this.urlPath_, this.sessionData_.getParameterMap());
  return this;
};



office.net.AbstractRequestBuilder.prototype.setUrlPrefix = function(urlPrefix) {
  this.urlPrefix_ = urlPrefix;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setContent = function(content) {
  this.content_ = content;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setScottyContent = function(content) {
  this.scottyContent_ = content;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setContentObject = function(content) {
  var map = goog.object.map(content, function(value) {
    return goog.isString(value) ? value : goog.json.serialize(value);
  });
  return this.setContent(goog.uri.utils.buildQueryDataFromMap(map));
};



office.net.AbstractRequestBuilder.prototype.setResponseType =
    function(responseType) {
  this.responseType_ = responseType;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setExpectFlaky =
    function(expectFlaky) {
  this.expectFlaky_ = expectFlaky;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setErrorFunction = function(
    errorFunction, opt_handler) {
  this.errorFunction_ = goog.bind(errorFunction, opt_handler);
  return this;
};



office.net.AbstractRequestBuilder.prototype.setErrorNetStateFn = function(
    errorNetStateFn, opt_handler) {
  this.errorNetStateFn_ = goog.bind(errorNetStateFn, opt_handler);
  return this;
};



office.net.AbstractRequestBuilder.prototype.setExternalServerRequest =
    function(externalServerRequest) {
  this.externalServerRequest_ = externalServerRequest;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setMethod = function(method) {
  this.method_ = method;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setServiceLevel =
    function(serviceLevel) {
  this.serviceLevel_ = serviceLevel;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setSuccessFunction = function(
    successFunction, opt_handler) {
  this.successFunction_ = goog.bind(successFunction, opt_handler);
  return this;
};



office.net.AbstractRequestBuilder.prototype.setTimeout = function(timeout) {
  this.timeout_ = timeout;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setUploadAllowed =
    function(uploadAllowed) {
  this.uploadAllowed_ = uploadAllowed;
  return this;
};



office.net.AbstractRequestBuilder.prototype.setJsonParser = function(jsonParser) {
  this.jsonParser_ = jsonParser;
  return this;
};



office.net.AbstractRequestBuilder.prototype.buildAndSend = function() {
  this.validate();
  var request = this.buildInternal();
  this.sendInternal(request);
  return request;
};



office.net.AbstractRequestBuilder.prototype.validate = function() {
  if (this.method_ == office.net.Method.GET ||
      this.method_ == office.net.Method.HEAD) {
    goog.asserts.assert(!this.content_ && !this.scottyContent_,
        'GET and HEAD methods do not support request content.');
  }

  goog.asserts.assert(!this.content_ || !this.scottyContent_,
      'Cannot set both content & scotty content');

  if (this.uploadAllowed_) {
    goog.asserts.assert(this.hasUploadContent(),
        'Scotty uploads are only supported for string, query arrays ' +
        'or scotty content.');

    if (this.method_) {
      goog.asserts.assert(this.method_ == office.net.Method.POST,
          'Scotty uploads can be used only for POST methods.');
    }
  }
};



office.net.AbstractRequestBuilder.prototype.buildInternal = goog.abstractMethod;



office.net.AbstractRequestBuilder.prototype.sendInternal = goog.abstractMethod;



office.net.AbstractRequestBuilder.prototype.getUri = function() {
  return this.urlPrefix_ + this.urlPath_;
};



office.net.AbstractRequestBuilder.prototype.getUriWithXsrfToken = function() {
  var uri = this.getUri();
  return goog.async.Deferred.when(
      this.xsrfTokenProvider_.getDeferredXsrfToken(),
      function(xsrfToken) {
        return goog.uri.utils.appendParam(uri, office.net.Param.XSRF, xsrfToken);
      });
};



office.net.AbstractRequestBuilder.prototype.getNonPrefixedUri = function() {
  return this.urlPath_;
};



office.net.AbstractRequestBuilder.prototype.getContent = function() {
  if (goog.isArray(this.content_)) {
    var queryArray = /** @type {!goog.uri.utils.QueryArray} */ (this.content_);
    return this.shouldSendQueryArraysUsingFormData_() ?
        office.net.AbstractRequestBuilder.formDataFromQueryArray_(queryArray) :
        goog.uri.utils.buildQueryData(queryArray);
  }

  return this.content_;
};



office.net.AbstractRequestBuilder.prototype.getScottyContent = function() {
  return this.scottyContent_;
};



office.net.AbstractRequestBuilder.prototype.getMethod = function() {
  return this.method_;
};



office.net.AbstractRequestBuilder.prototype.getResponseType = function() {
  return this.responseType_;
};



office.net.AbstractRequestBuilder.prototype.getServiceLevel = function() {
  return this.serviceLevel_;
};



office.net.AbstractRequestBuilder.prototype.isExpectFlaky = function() {
  return this.expectFlaky_;
};



office.net.AbstractRequestBuilder.prototype.getErrorFunction = function() {
  return this.errorFunction_;
};



office.net.AbstractRequestBuilder.prototype.getErrorNetStateFn = function() {
  return this.errorNetStateFn_;
};



office.net.AbstractRequestBuilder.prototype.isExternalServerRequest =
    function() {
  return this.externalServerRequest_;
};



office.net.AbstractRequestBuilder.prototype.getSuccessFunction = function() {
  return this.successFunction_;
};



office.net.AbstractRequestBuilder.prototype.getTimeout = function() {
  return this.timeout_;
};



office.net.AbstractRequestBuilder.prototype.isUploadAllowed = function() {
  return this.uploadAllowed_;
};



office.net.AbstractRequestBuilder.prototype.getJsonParser = function() {
  return this.jsonParser_;
};



office.net.AbstractRequestBuilder.prototype.hasUploadContent = function() {
  return goog.isString(this.content_) || goog.isArray(this.content_) ||
      !!this.scottyContent_;
};



office.net.AbstractRequestBuilder.prototype.getXsrfTokenProvider = function() {
  return this.xsrfTokenProvider_;
};



office.net.AbstractRequestBuilder.prototype.getSessionData = function() {
  return this.sessionData_;
};



office.net.AbstractRequestBuilder.prototype.getUploadContentLength = function() {
  if (!this.hasUploadContent()) {
    throw Error(
        'GetUploadContentLength() called when upload content is not available');
  }
  if (goog.isArray(this.content_)) {
    var contentLength = 0;
    var queryArray = /** @type {goog.uri.utils.QueryArray} */ (this.content_);
    for (var i = 0; i < queryArray.length; i++) {
      if (goog.isString(queryArray[i])) {
        contentLength = contentLength + queryArray[i].length;
      }
    }
    return contentLength;
  } else if (this.scottyContent_) {
    return this.scottyContent_.getSize() || 0;
  } else {
    return (/** @type {string} */ (this.content_)).length;
  }
};



office.net.AbstractRequestBuilder.prototype.getUploadContent =
    function(jsonStringifier) {
  if (!this.hasUploadContent()) {
    throw Error(
        'GetUploadContent() called when upload content is not available');
  }

  if (this.scottyContent_) {
    return this.scottyContent_;
  } else if (goog.isString(this.content_)) {
    return /** @type {string} */ (this.content_);
  } else {
    return office.net.AbstractRequestBuilder.jsonFromQueryArray_(
        jsonStringifier,
 (this.content_));
  }
};



office.net.AbstractRequestBuilder.prototype.getUrlPrefix = function() {
  return this.urlPrefix_;
};



office.net.AbstractRequestBuilder.prototype.shouldSendQueryArraysUsingFormData_ =
    function() {

  var flags = office.flag.getInstance();
  return flags.getBoolean(office.net.Flags.USE_FORM_DATA_FOR_QUERY_ARRAYS) &&
      !!goog.global['FormData'];
};



office.net.AbstractRequestBuilder.prototype.copyTo = function(requestBuilder) {
  requestBuilder.urlPrefix_ = this.urlPrefix_;
  requestBuilder.content_ = this.content_;
  requestBuilder.scottyContent_ = this.scottyContent_;
  requestBuilder.method_ = this.method_;
  requestBuilder.responseType_ = this.responseType_;
  requestBuilder.serviceLevel_ = this.serviceLevel_;
  requestBuilder.expectFlaky_ = this.expectFlaky_;
  requestBuilder.errorFunction_ = this.errorFunction_;
  requestBuilder.errorNetStateFn_ = this.errorNetStateFn_;
  requestBuilder.externalServerRequest_ = this.externalServerRequest_;
  requestBuilder.successFunction_ = this.successFunction_;
  requestBuilder.timeout_ = this.timeout_;
  requestBuilder.uploadAllowed_ = this.uploadAllowed_;
  requestBuilder.jsonParser_ = this.jsonParser_;
};



office.net.AbstractRequestBuilder.jsonFromQueryArray_ =
    function(jsonStringifier, queryData) {
  var queryString = new goog.string.StringBuffer('{');
  for (var i = 0; i < queryData.length; i += 2) {
    if (i > 0) {
      queryString.append(',');
    }
    queryString.
        append(jsonStringifier.stringify(queryData[i])).
        append(':').
        append(jsonStringifier.stringify(queryData[i + 1]));
  }
  queryString.append('}');
  return queryString.toString();
};



office.net.AbstractRequestBuilder.formDataFromQueryArray_ = function(queryData) {
  goog.asserts.assert(!!goog.global['FormData'], 'FormData not defined');


  var formData = new goog.global['FormData']();
  for (var i = 0; i < queryData.length; i += 2) {
    formData['append'](queryData[i], queryData[i + 1]);
  }
  return formData;
};
