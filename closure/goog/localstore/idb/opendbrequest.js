goog.provide('office.localstore.idb.OpenDbRequest');

goog.require('office.localstore.idb.Request');
goog.require('office.localstore.idb.RequestTracker');
goog.require('office.localstore.idb.TransactionStatusRecorder');
goog.require('office.localstore.idb.unsavedChangesBit');
goog.require('office.offline.optin');



/**
 * A wrapper around an IDBOpenDBRequest to add logging and timeouts around IDB
 * requests.
 * @param {!IDBOpenDBRequest} request The underlying IndexedDB request.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @param {string} debugString The debug description of this request.
 * @param {function()=} opt_timeoutCallback The timeout callback. If not
 *     provided the request will never timeout.
 * @param {number=} opt_timeoutMs The timeout to use in ms. If unspecified,
 *     request will never time out.
 * @param {string=} opt_csiConstant The CSI constant to use for reporting the
 *     request timing. If unspecified, timing won't be reported.
 * @constructor
 * @struct
 * @extends {office.localstore.idb.Request}
 */
office.localstore.idb.OpenDbRequest = function(request, errorReporter,
    debugString, opt_timeoutCallback, opt_timeoutMs, opt_csiConstant) {
  goog.base(this, request, errorReporter, debugString,
      new office.localstore.idb.TransactionStatusRecorder(),
      new office.localstore.idb.RequestTracker(), opt_timeoutCallback,
      true /* opt_logTimeout */, opt_timeoutMs, opt_csiConstant);

  /** @private {?function(this:null, !Event)} */
  this.blockedCallback_ = null;

  /** @private {?function(this:null, !Event)} */
  this.upgradeNeededCallback_ = null;

  request.onblocked = errorReporter.protectFunction(
      this.onBlocked_, this, true /* opt_rethrow */);
  request.onupgradeneeded = errorReporter.protectFunction(
      this.onUpgradeNeeded_, this, true /* opt_rethrow */);
};
goog.inherits(office.localstore.idb.OpenDbRequest, office.localstore.idb.Request);


/**
 * @param {!Event} e
 * @private
 */
office.localstore.idb.OpenDbRequest.prototype.onBlocked_ = function(e) {
  this.disposeTimer();

  if (this.blockedCallback_) {
    this.blockedCallback_(e);
  }
};


/**
 * @param {!Event} e
 * @private
 */
office.localstore.idb.OpenDbRequest.prototype.onUpgradeNeeded_ = function(e) {
  this.disposeTimer();

  //if (e['dataLoss'] && e['dataLoss'] != 'none') {
  //  var context = {};
  //  context['dataLoss'] = e['dataLoss'];
  //  context['dataLossMessage'] = e['dataLossMessage'];
  //  context['optinBackup'] = office.offline.optin.hasOptInSecretInWebStorage();
  //  context['requestContext'] = this.getDebugString();
  //  context['unsavedChanges'] =
  //      office.localstore.idb.unsavedChangesBit.get(this.getErrorReporter());
  //  this.getErrorReporter().info(
  //      Error('upgradeNeeded after dataLoss'), context);
  //}

  if (this.upgradeNeededCallback_) {
    this.upgradeNeededCallback_(e);
  }
};


/** @override */
office.localstore.idb.OpenDbRequest.prototype.nullOutCallbacks = function(
    request) {
  goog.base(this, 'nullOutCallbacks', request);

  var openDbRequest = /** @type {!IDBOpenDBRequest} */ (request);
  openDbRequest.onblocked = goog.nullFunction;
  openDbRequest.onupgradeneeded = goog.nullFunction;
};


/**
 * @param {function(this:null, !Event)} callback
 */
office.localstore.idb.OpenDbRequest.prototype.setBlockedCallback = function(
    callback) {
  if (this.blockedCallback_) {
    throw Error('Blocked callback already set');
  }
  this.blockedCallback_ = callback;
};


/**
 * @param {function(this:null, !Event)} callback
 */
office.localstore.idb.OpenDbRequest.prototype.setUpgradeNeededCallback = function(
    callback) {
  if (this.upgradeNeededCallback_) {
    throw Error('Upgrade needed callback already set');
  }
  this.upgradeNeededCallback_ = callback;
};
