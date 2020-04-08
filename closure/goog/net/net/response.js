goog.provide('office.net.Response');

goog.require('office.net.NetEvent');
goog.require('office.net.constants');
goog.require('office.net.constants.RestartInstruction');
goog.require('goog.asserts');
goog.require('goog.json.EvalJsonProcessor');
goog.require('goog.net.ErrorCode');
goog.require('goog.net.HttpStatus');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');
goog.require('proto.fava.request.ErrorResponse');
goog.require('goog.crypt.obfuscation');
goog.require('goog.json.NativeJsonProcessor');



office.net.Response = function (response, opt_responseType, opt_contentType,
                                opt_httpStatusCode, opt_errorCode, opt_headers, opt_requestLogContext,
                                opt_jsonParser) {

  var ResponseType = office.net.Response.ResponseType;


  this.response_ = response;


  this.responseType_ = opt_responseType || ResponseType.TEXT;


  this.contentType_ =
      goog.string.isEmptySafe(opt_contentType) ? null :
 (opt_contentType);


  this.httpStatusCode_ = goog.isDef(opt_httpStatusCode) ? opt_httpStatusCode :
      goog.net.HttpStatus.OK;


  this.headers_ = {};



  if (opt_headers) {
    for (var header in opt_headers) {
      this.headers_[header.toLowerCase()] = opt_headers[header];
    }
  }


  this.errorCode_ =
      goog.isDef(opt_errorCode) ? opt_errorCode : goog.net.ErrorCode.NO_ERROR;


  this.requestLogContext_ = opt_requestLogContext || {};


  this.jsonParser_ = opt_jsonParser || null;


  this.parsedResponse_ = undefined;

  if (goog.isDefAndNotNull(response)) {
    if (this.responseType_ == ResponseType.TEXT) {
      goog.asserts.assert(goog.isString(response),
          'Response doesn\'t match string response type.');
    } else if (this.responseType_ == ResponseType.ARRAY_BUFFER) {
      goog.asserts.assert(ArrayBuffer != null &&
          response instanceof ArrayBuffer,
          'Response doesn\'t match ArrayBuffer response type.');
    } else if (this.responseType_ == ResponseType.BLOB) {
      goog.asserts.assert(Blob != null && response instanceof Blob,
          'Response doesn\'t match ArrayBuffer response type.');
    } else if (this.responseType_ == ResponseType.DOCUMENT) {
      goog.asserts.assert(Document != null && response instanceof Document,
          'Response doesn\'t match Document response type.');
    } else {
      goog.asserts.assert(false, 'Unknown response type: ' +
          this.responseType_);
    }
  }
};






office.net.Response.DEFAULT_PARSER_ = new goog.json.NativeJsonProcessor();




office.net.Response.ResponseType = {
  ARRAY_BUFFER: 'arraybuffer',
  BLOB: 'blob',
  DOCUMENT: 'document',
  TEXT: 'text' // There will be no distinction between DEFAULT and TEXT.
};



office.net.Response.prototype.getContentType = function () {
  return this.contentType_;
};



office.net.Response.prototype.getResponseType = function () {
  return this.responseType_;
};



office.net.Response.prototype.isSuccess = function () {
  return this.errorCode_ == goog.net.ErrorCode.NO_ERROR;
};



office.net.Response.prototype.getErrorCode = function () {
  return this.errorCode_;
};



office.net.Response.prototype.getHttpStatusCode = function () {
  return this.httpStatusCode_;
};



office.net.Response.prototype.getHeader = function (key) {
  return this.headers_[key.toLowerCase()];
};



office.net.Response.prototype.hasTextResponse = function () {
  return this.isStringResponseType() && goog.isDefAndNotNull(this.response_);
};



office.net.Response.prototype.getString = function () {
  goog.asserts.assert(this.isStringResponseType(),
      'Cannot get string for response of type: ' + this.responseType_ +
      '. Use Response.getTypedResponse().');
  return /** @type {string} */ (this.response_ || '');
};



office.net.Response.prototype.getTypedResponse = function () {
  goog.asserts.assert(!this.isStringResponseType(),
      'Cannot get typed response for a string response. ' +
      'Use Response.getString().');
  return /** @type {ArrayBuffer|Blob|Document} */ (this.response_);
};



office.net.Response.prototype.isStringResponseType = function () {
  return this.responseType_ == office.net.Response.ResponseType.TEXT;
};



office.net.Response.prototype.getObject = function () {
  if (!goog.isDef(this.parsedResponse_)) {

    this.parsedResponse_ =
        office.net.Response.parseObject(this.getString(), this.jsonParser_);
    if (this.parsedResponse_['yiqixie']) {
      var obfuscated = this.parsedResponse_['yiqixie'];
      var plainText = goog.crypt.obfuscation.deobfuscate(obfuscated);

      this.parsedResponse_ = office.net.Response.parseObject(
          plainText, this.jsonParser_);
    }
  }

  return /** @type {?Object} */ (this.parsedResponse_);
};



office.net.Response.prototype.getField = function (name) {
  return this.getObject()[name];
};



office.net.Response.prototype.hasField = function (name) {
  return name in this.getObject();
};



office.net.Response.prototype.getStringField = function (name) {
  var field = this.getField(name);
  return goog.isDef(field) ? String(this.getField(name)) : null;
};



office.net.Response.prototype.getBooleanField = function (name) {
  return !!this.getField(name);
};



office.net.Response.prototype.getNumberField = function (name) {
  return Number(this.getField(name));
};



office.net.Response.prototype.getArrayField = function (name) {
  return goog.asserts.assertArray(this.getField(name));
};



office.net.Response.prototype.getObjectField = function (name) {
  return goog.asserts.assertObject(this.getField(name));
};



office.net.Response.prototype.getLogContext = function () {
  var logContext = {








  };
  goog.object.extend(logContext, this.requestLogContext_);
  return logContext;
};



office.net.Response.prototype.parseErrorResponseProto = function () {




  if (this.hasTextResponse() && goog.string.startsWith(this.getString(),
          office.net.constants.JSON_SAFETY_PREFIX)) {
    var envelope = this.getObject();
    if (goog.isArray(envelope)) {

      var data = /** @type {!Array} */ (envelope)[0];

      if (goog.isArray(data) && /** @type {!Array} */ (data)[0] ==
          proto.fava.request.ErrorResponse.messageId) {
        return new proto.fava.request.ErrorResponse(data);
      }
    }
  }
  return null;
};



office.net.Response.prototype.createNetEvent = function () {

  if (this.getHeader(
          office.net.constants.RESTART_INSTRUCTION_HEADER_NAME) ==
      office.net.constants.RestartInstruction.NOW) {
    return new office.net.NetEvent(office.net.NetEvent.Type.RESTART_NOW,
        this.errorCode_, this.httpStatusCode_);
  }

  var eventType;
  if (this.errorCode_ == goog.net.ErrorCode.ABORT) {

    return null;
  } else if (this.isNetworkWarning_()) {


    eventType = office.net.NetEvent.Type.NETWORK_WARNING;
  } else if (this.isServerWarning_()) {
    eventType = office.net.NetEvent.Type.SERVER_WARNING;
  } else if (this.isSuccess()) {
    eventType = office.net.NetEvent.Type.SUCCESS;
  } else {

    eventType = office.net.NetEvent.Type.ERROR;
  }

  return new office.net.NetEvent(eventType, this.errorCode_, this.httpStatusCode_,
      this.getFrameworkDetailedError_());
};



office.net.Response.prototype.isNetworkWarning_ = function () {
  var errorCode = this.errorCode_;
  var httpStatus = this.httpStatusCode_;

  if (this.isSuccess()) {
    if (errorCode == goog.net.ErrorCode.NO_ERROR && httpStatus == 0 && !this.hasTextResponse()) {

      return true;
    }

    return false;
  }
  if (errorCode == goog.net.ErrorCode.TIMEOUT) {

    return true;
  }
  if (errorCode == goog.net.ErrorCode.EXCEPTION) {


    return true;
  }
  if (errorCode == goog.net.ErrorCode.HTTP_ERROR) {
    if (httpStatus <= 0 || httpStatus == 503) {

      return true;
    }
    if (httpStatus == 405) {



      return true;
    }
    if (goog.userAgent.IE && httpStatus >= 12001 && httpStatus <= 12156) {



      return true;
    }
  }

  return false;
};



office.net.Response.prototype.isServerWarning_ = function () {
  var httpStatus = this.httpStatusCode_;

  if (this.errorCode_ == goog.net.ErrorCode.HTTP_ERROR &&
      (httpStatus == 202 || httpStatus == 401 || httpStatus == 403 ||
      httpStatus == 409 || httpStatus == 429 ||
      httpStatus >= 500 && httpStatus <= 599 &&
      httpStatus != 503 &&
      httpStatus != office.net.constants.NON_RETRYABLE_HTTP_STATUS_CODE)) {

    return true;
  }
  if (httpStatus == 200) {

    if (this.contentType_ == null) {




      return true;
    }






    return this.isSuccessfulWithMissingContent();
  }
  return false;
};



office.net.Response.prototype.getFrameworkDetailedError_ = function () {
  if (this.errorCode_ == goog.net.ErrorCode.HTTP_ERROR &&
      this.httpStatusCode_ == 500) {


    return null;
  }
  return null;
};



office.net.Response.prototype.isSuccessfulWithMissingContent = function () {
  return false;





















};



office.net.Response.parseObject = function (text, opt_parser) {
  var parser = opt_parser || office.net.Response.DEFAULT_PARSER_;
  var object = /** @type {?Object} */ ((text && parser.parse(
      text.replace(/^[^[{]+/, ''))) || null);
  goog.asserts.assert(typeof object == 'object',
      'The server response should be null, an object, or an array.');
  return object;
};
