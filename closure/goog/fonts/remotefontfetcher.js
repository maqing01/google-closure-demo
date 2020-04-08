/**
 * @fileoverview Contains the definition of the RemoteFontFetcher class.


 */

goog.provide('office.fonts.RemoteFontFetcher');

goog.require('office.fonts.FontConverterUtil');
goog.require('office.fonts.FontMetadata');
goog.require('office.net.ServiceLevel');
goog.require('office.storage.FetchResult');
goog.require('office.storage.FetchResultCollection');
goog.require('office.storage.RemoteFetcher');
goog.require('goog.async.Deferred');



/**
 * A class responsible for loading font metadata from the server.
 * @param {office.net.RequestBuilderService} requestBuilderService The request
 *     builder service. It is still valuable to have a remote font fetcher
 *     without the ability to request additional fonts from the server in order
 *     to load metadata sent down on the page.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @param {Object} json The webfonts data from the page to pre-populate the
 *     cache in the form of JSON.
 * @param {string=} opt_docId The document id. This should always be provided
 *     for editors (but is not needed for the bulk syncer).
 * @constructor
 * @struct
 * @implements {office.storage.RemoteFetcher}
 */
office.fonts.RemoteFontFetcher = function(
    requestBuilderService, errorReporter, json, opt_docId) {
  /**
   * The request builder service.
   * @type {office.net.RequestBuilderService}
   * @private
   */
  this.requestBuilderService_ = requestBuilderService;

  /**
   * The error reporter.
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * The document id.
   * @type {?string}
   * @private
   */
  this.docId_ = opt_docId || null;

  /**
   * The requested fonts.
   * @type {!Object.<!office.fonts.FontMetadata>}
   * @private
   */
  this.cache_ = {};
  this.populateCache_(json);
};


/** @override */
office.fonts.RemoteFontFetcher.prototype.fetch = function(requests) {
  var ids = [];
  var fontsToRequest = [];
  var results = [];
  for (var i = 0; i < requests.length; i++) {
    var requestId = /** @type {!office.fonts.FontFetchRequestId} */
        (requests[i].getId());
    ids.push(requestId);
    var fontFamily = requestId.getFontFamily();
    var data = this.cache_[fontFamily];
    if (data) {
      results.push(new office.storage.FetchResult(requestId, data));
    } else {
      fontsToRequest.push(fontFamily);
    }
  }

  // We don't need to worry about guarding against incoming requests for the
  // same font because the FontProcessor deduplicates all requests before
  // calling this method.
  var deferred = new goog.async.Deferred();
  if (fontsToRequest.length) {
    if (this.requestBuilderService_) {
      var requestBuilder = this.requestBuilderService_.
          newRequestBuilder('/font/getdata').
          setServiceLevel(office.net.ServiceLevel.RETRY).
          setSuccessFunction(goog.bind(
              this.handleFontMetadataRequest_, this, deferred, ids, results)).
          setErrorFunction(goog.bind(
              this.handleRequestError_, this, deferred, fontsToRequest)).
          setContent(['families', fontsToRequest.join(',')]);
      if (this.docId_) {
        // Include 'id' param if one exists for jobset forwarding. This is
        // NECESSARY for editors (not the bulksyncer) because of b/6269266.
        // Specifically, this request includes the X-Rel-Id header and without a
        // DocId, is routed based upon the requesting user rather than the
        // document-creator. If there is a mismatch in protocol numbers between
        // jobsets (Scary is sufficiently "ahead" of corp to no longer support
        // the current corp protocol number), an error occurs asking for a
        // reload.
        requestBuilder.withParams('id', this.docId_);
      }
      requestBuilder.buildAndSend();
    }
  } else {
    deferred.callback(
        new office.storage.FetchResultCollection(results, [] /* failedIds */));
  }

  return deferred;
};


/**
 * Populates the cache from the given json object.
 * @param {Object} json The json containing the metadata from the server.
 * @private
 */
office.fonts.RemoteFontFetcher.prototype.populateCache_ = function(json) {
  if (!json) {
    return;
  }
  var fontMetadata = this.convertJsonToMetadata_(json);
  for (var fontFamily in fontMetadata) {
    this.cache_[fontFamily] = fontMetadata[fontFamily];
  }
};


/**
 * Converts the json response object into an array of font metadata objects.
 * @param {!Object} json The json response from the webfonts metadata request.
 * @return {!Object.<!office.fonts.FontMetadata>} The map of font family names to
 *     font metadata encapsulated in the json.
 * @private
 */
office.fonts.RemoteFontFetcher.prototype.convertJsonToMetadata_ = function(
    json) {
  var fontMetadata = {};
  var jsonMetadataMap = json['fmm'] || {};
  for (var fontFamily in jsonMetadataMap) {
    var data = jsonMetadataMap[fontFamily];
    var fontFaces = {};
    fontFaces[fontFamily] =
        office.fonts.FontConverterUtil.convertJsonToFontFaceCssInfos(data);
    fontMetadata[fontFamily] = new office.fonts.FontMetadata(
        fontFaces, data['version'], this.errorReporter_);
  }
  return fontMetadata;
};


/**
 * Handles the response for a webfonts metadata request. The response will
 * contain metadata for the whole flight of fonts that were requested on a
 * single XHR.
 * @param {!goog.async.Deferred} deferred The deferred for the whole flight.
 * @param {!Array.<!office.fonts.FontFetchRequestId>} ids The font fetch request
 *     ids.
 * @param {!Array.<!office.storage.FetchResult>} results The fetch results.
 * @param {!office.net.Response} response The response.
 * @private
 */
office.fonts.RemoteFontFetcher.prototype.handleFontMetadataRequest_ =
    function(deferred, ids, results, response) {
  var responseObject = response.getObject();
  if (!responseObject) {
    deferred.errback('');
    return;
  }

  var fontMetadataMap = this.convertJsonToMetadata_(responseObject);
  var idMap = {};
  var foundResultMap = {};
  for (var i = 0; i < ids.length; i++) {
    idMap[ids[i].getFontFamily()] = ids[i];
    foundResultMap[ids[i].getFontFamily()] = false;
  }

  for (var fontFamily in fontMetadataMap) {
    var fontMetadata = fontMetadataMap[fontFamily];
    this.cache_[fontFamily] = fontMetadata;
    if (!idMap[fontFamily]) {
      this.errorReporter_.log(new Error(
          'Font metadata for an unexpected font family was received.'));
      continue;
    }
    results.push(
        new office.storage.FetchResult(idMap[fontFamily], fontMetadata));
  }

  // Determine the set of ids which were not found on the server.
  for (var i = 0; i < results.length; i++) {
    var fontFamily = results[i].getId().getFontFamily();
    foundResultMap[fontFamily] = true;
  }
  var notFoundIds = [];
  for (var i = 0; i < ids.length; i++) {
    if (!foundResultMap[ids[i].getFontFamily()]) {
      notFoundIds.push(ids[i]);
    }
  }

  deferred.callback(
      new office.storage.FetchResultCollection(results, notFoundIds));
};


/**
 * Handles the request error.
 * @param {!goog.async.Deferred} deferred The deferred for the whole flight.
 * @param {!Array.<string>} fontsToRequest The font families to fetch.
 * @param {!office.net.NetEvent} netEvent The net event.
 * @private
 */
office.fonts.RemoteFontFetcher.prototype.handleRequestError_ =
    function(deferred, fontsToRequest, netEvent) {
  deferred.errback(Error('Error fetching font metadata, http status code:' +
      netEvent.httpStatus + ', fonts: ' + fontsToRequest.join(',')));
};
