

goog.provide('office.net.XhrRequest');

goog.require('office.net.RequestInternal');
goog.require('office.net.Response');
goog.require('goog.asserts');
goog.require('goog.events.EventHandler');
goog.require('goog.log');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.string');
goog.require('goog.uri.utils');




office.net.XhrRequest = function(uri, urlPrefix, content, scottyContent,
    serviceLevel, successFunction, errorFunction, errorNetStateFn,
    externalServerRequest, responseType, isExpectFlaky, timeout, method,
    jsonParser) {
  goog.base(this, uri, urlPrefix, content, scottyContent,
      serviceLevel, successFunction, errorFunction, errorNetStateFn,
      externalServerRequest, responseType, isExpectFlaky, timeout, method,
      jsonParser);


  this.xhrIo_ = null;


  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(office.net.XhrRequest, office.net.RequestInternal);



office.net.XhrRequest.prototype.sendInternal = function(requestUrlState) {
  goog.asserts.assert(this.xhrIo_ == null,
      'Resending request when previous attempt is still in progress.');

  this.xhrIo_ = new goog.net.XhrIo();


  this.eventHandler_.listenOnce(this.xhrIo_, goog.net.EventType.COMPLETE,
      goog.bind(this.handleXhrComplete_, this));


  this.xhrIo_.setTimeoutInterval(this.getTimeout());

  if (this.getResponseType() != office.net.Response.ResponseType.TEXT) {
    var xhrResponseType =
        office.net.XhrRequest.getXhrResponseType_(this.getResponseType());


    this.xhrIo_.setResponseType(xhrResponseType);
  }




  var modifiedUri = goog.uri.utils.appendParamsFromMap(
      this.getUrlPrefix() + this.getUri(), requestUrlState.getInfoParamsMap());

  var headers = requestUrlState.getHeaders();
  var content;
  if (this.getScottyContent()) {









    content = this.getScottyContent().getBlob();
    goog.asserts.assert(goog.isDefAndNotNull(content),
        'unable to translate scotty content to blob content');





    var contentType = content.type;
    if (!contentType || contentType.length == 0) {
      contentType = 'application/binary';
    }

    headers[goog.net.XhrIo.CONTENT_TYPE_HEADER] = contentType;
  } else {
    content = this.getContent();
  }

  this.xhrIo_.send(modifiedUri, this.getMethod(), content, headers);
};



office.net.XhrRequest.prototype.handleXhrComplete_ = function(evt) {
  goog.log.fine(this.logger, 'handleXhrComplete_() for ' + this.getUri());

  this.handleRequestComplete(this.extractResponse_());

};



office.net.XhrRequest.prototype.extractResponse_ = function() {
  var xhr = /** @type {!goog.net.XhrIo} */ (this.xhrIo_);
  var rawResponse = '';
  var contentType = null;
  try {
    if (xhr.getResponseType() == goog.net.XhrIo.ResponseType.DEFAULT) {
      rawResponse = xhr.getResponseText();
    } else {
      rawResponse = xhr.getResponse();
    }
    contentType = xhr.getResponseHeader('Content-Type');
  } catch (err) {


  }

  return new office.net.Response(
      rawResponse,
      office.net.XhrRequest.getResponseType_(xhr.getResponseType()),
      contentType,
      xhr.getStatus(),
      xhr.getLastErrorCode(),
      this.parseHeaders_(xhr.getAllResponseHeaders()),
      this.getLogContext(),
      this.getJsonParser());
};



office.net.XhrRequest.prototype.parseHeaders_ = function(headersString) {
  var headersObject = {};
  var headersArray = headersString.split('\r\n');
  for (var i = 0; i < headersArray.length; i++) {
    if (goog.string.isEmptySafe(headersArray[i])) {
      continue;
    }
    var keyValue = headersArray[i].split(': ');
    if (keyValue.length != 2) {
      goog.log.warning(this.logger,
          'Not able to parse response header ' + headersArray[i]);
      continue;
    }
    headersObject[keyValue[0]] = keyValue[1];
  }
  return headersObject;
};



office.net.XhrRequest.prototype.reset = function() {
  if (this.xhrIo_) {
    this.xhrIo_.dispose();
    this.xhrIo_ = null;
  }
};



office.net.XhrRequest.prototype.disposeInternal = function() {
  goog.dispose(this.eventHandler_);

  goog.base(this, 'disposeInternal');
};



office.net.XhrRequest.getResponseType_ = function(xhrResponseType) {
  switch (xhrResponseType) {
    case goog.net.XhrIo.ResponseType.ARRAY_BUFFER:
      return office.net.Response.ResponseType.ARRAY_BUFFER;
    case goog.net.XhrIo.ResponseType.BLOB:
      return office.net.Response.ResponseType.BLOB;
    case goog.net.XhrIo.ResponseType.DOCUMENT:
      return office.net.Response.ResponseType.DOCUMENT;
    case goog.net.XhrIo.ResponseType.TEXT:
      return office.net.Response.ResponseType.TEXT;
    case goog.net.XhrIo.ResponseType.DEFAULT:
      return office.net.Response.ResponseType.TEXT;
    default:
      throw Error('Unsupported Xhr Response Type - ' + xhrResponseType);
  }
};



office.net.XhrRequest.getXhrResponseType_ = function(responseType) {
  switch (responseType) {
    case office.net.Response.ResponseType.ARRAY_BUFFER:
      return goog.net.XhrIo.ResponseType.ARRAY_BUFFER;
    case office.net.Response.ResponseType.BLOB:
      return goog.net.XhrIo.ResponseType.BLOB;
    case office.net.Response.ResponseType.DOCUMENT:
      return goog.net.XhrIo.ResponseType.DOCUMENT;
    default:
      return goog.net.XhrIo.ResponseType.DEFAULT;
  }
};
