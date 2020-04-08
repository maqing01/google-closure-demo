goog.provide('office.localstore.idb.RequestTracker');

goog.require('goog.object');



/**
 * A tracker for IndexedDB requests to aid with logging and debugging.
 * @constructor
 * @struct
 */
office.localstore.idb.RequestTracker = function() {
  /**
   * A map from pending request IDs to string descriptions of the requests.
   * @private {!Object.<number, string>}
   */
  this.pendingRequests_ = {};

  /** @private {number} */
  this.requestErrorCount_ = 0;

  /** @private {number} */
  this.requestSuccessCount_ = 0;

  /**
   * The ID for the next request added to the tracker. This is incremented for
   * every new request.
   * @private {number}
   */
  this.nextRequestId_ = 0;
};


/**
 * Adds a new request to the tracker.
 * @param {string} description A string description of the request.
 * @return {number} The unique ID of the request.
 */
office.localstore.idb.RequestTracker.prototype.addRequest = function(
    description) {
  var requestId = this.nextRequestId_++;
  this.pendingRequests_[requestId] = description;
  return requestId;
};


/**
 * Extends the given debug context object with information about the tracked
 * requests.
 * @param {!Object} context
 */
office.localstore.idb.RequestTracker.prototype.extendDebugContext = function(
    context) {
  var pendingRequests = goog.object.getValues(this.pendingRequests_);
  context['pendingRequestCount'] = pendingRequests.length;
  context['pendingRequests'] = pendingRequests.toString();
  context['requestErrorCount'] = this.requestErrorCount_;
  context['requestSuccessCount'] = this.requestSuccessCount_;
};


/**
 * Records an error result for the given request.
 * @param {number} requestId
 */
office.localstore.idb.RequestTracker.prototype.recordError = function(
    requestId) {
  this.requestErrorCount_++;
  delete this.pendingRequests_[requestId];
};


/**
 * Records success for the given request.
 * @param {number} requestId
 */
office.localstore.idb.RequestTracker.prototype.recordSuccess = function(
    requestId) {
  this.requestSuccessCount_++;
  delete this.pendingRequests_[requestId];
};


/**
 * @return {boolean} Whether there are pending requests.
 */
office.localstore.idb.RequestTracker.prototype.hasPendingRequests = function() {
  return goog.object.getValues(this.pendingRequests_).length > 0;
};
