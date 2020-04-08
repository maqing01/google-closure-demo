
// All rights reserved.

/**
 * @fileoverview Manages XHRs.
 * @author agrieve@google.com (Andrew Grieve)
 */

goog.provide('wireless.net.Xhr');

goog.require('goog.asserts');
goog.require('goog.debug.Trace');
goog.require('goog.log');
goog.require('goog.tweak');



goog.tweak.registerString('net.FailXhrs',
    'Causes all XHRs made through wireless.net.Xhr to instantly fail.', '', {
        restartRequired: false,
        validValues: ['', 'Timeout', 'Open Failed', '404', '500']
    });


goog.tweak.registerBoolean('net.PauseXhrs',
    'Causes all XHRs wireless.net.Xhr to be queued. As soon as it is ' +
    'disabled, they will be sent.', false, {
        restartRequired: false,
        callback: function(tweak) {
          if (!tweak.getValue()) {
            for (var f; f = wireless.net.Xhr.pausedXhrCallbacks_.pop(); ) {
              f();
            }
          }
        }
    });


goog.tweak.registerNumber('n.xtv',
    'Sets how long to wait for XHRs before considering them to have timed ' +
    'out (in seconds).', 0, {
        restartRequired: false,
        validValues: [0, 2, 5, 10, 20, 30, 60]
    });

goog.tweak.registerNumber('n.xct',
    'Sets how long to wait between updates for XHRs before considering them ' +
    'to have timed out (in seconds).', 0, {
        restartRequired: false,
        validValues: [0, 2, 5, 10, 20, 30, 60]
    });


/**
 * Wrapper around XMLHttpRequest that achieves the following:
 *   -Easy timeouts,
 *
 *   -Use navigator.onLine to prevent sending a request while offline.
 *   -Use dynamic timeouts, where the timer resets after each call to
 *    onreadystatechange
 *   -Add onprogress callbacks so that batched responses can be processed
 *    earlier
 * @param {function(!wireless.net.Xhr)} onComplete On compete callback. Called
 *     when the XHR finishes (finished or failed).
 * @param {number=} opt_timeoutMs How long to wait until aborting the XHR and
 *     declaring a timeout. No timeouts will be used if not set.
 * @param {number=} opt_chunkTimeoutMs How long to wait in between updates until
 *     aborting the XHR and declaring a timeout. No dynamic timeouts will be
 *     used if not set.
 * @constructor
 */
wireless.net.Xhr = function(onComplete, opt_timeoutMs, opt_chunkTimeoutMs) {
  /**
   * The user-specified callback to call when the response finishes.
   * @type {function(!wireless.net.Xhr)}
   * @private
   */
  this.onCompleteCallback_ = onComplete;

  /**
   * How long to wait until aborting the XHR and declaring a timeout.
   * @type {number}
   * @private
   */
  this.timeoutMs_ = opt_timeoutMs || 0;

  /**
   * How long to wait in betwen updates until aborting the XHR and declaring a
   * timeout.
   * @type {number}
   * @private
   */
  this.chunkTimeoutMs_ = opt_chunkTimeoutMs || 0;
};


/**
 * Whether to record the amount of time from sending the request to the start of
 * data received, and from the start of the request to the end. This data will
 * be logged as impressions by the Superpudu team in order to try and find the
 * distribution of network latencies. The end goal of this is to implement
 * smarter timeout logic.
 * @type {boolean}
 */
wireless.net.Xhr.RECORD_TIMINGS = false;


// Taken from goog.net.Xhr, but including the file causes a bit of bloat due
// to some static initialization within it.
/**
* Status constants for XMLHTTP, matches:
* http://msdn.microsoft.com/library/default.asp?url=/library/
*   en-us/xmlsdk/html/0e6a34e4-f90c-489d-acff-cb44242fafc6.asp
* @enum {number}
*/
wireless.net.Xhr.ReadyState = {
  /**
  * Constant for when xmlhttprequest.readyState is uninitialized
  */
  UNINITIALIZED: 0,

  /**
  * Constant for when xmlhttprequest.readyState is loading.
  */
  LOADING: 1,

  /**
  * Constant for when xmlhttprequest.readyState is loaded.
  */
  LOADED: 2,

  /**
  * Constant for when xmlhttprequest.readyState is in an interactive state.
  */
  INTERACTIVE: 3,

  /**
  * Constant for when xmlhttprequest.readyState is completed
  */
  COMPLETE: 4
};


/**
 * Status of the xhr.
 * @enum {number}
 */
wireless.net.Xhr.StatusCode = {
  /**
   * Constant for when the request times out.
   */
  TIMED_OUT: -1,

  /**
   * Constant to represent a failed xhr.open().
   */
  OPEN_FAILED: -2,

  /**
   * Constant to represent not being initialized yet.
   */
  NOT_INITIALIZED: -3,

  /**
   * Constant to represent an active xhr.
   */
  INITIALIZED: -4,

  /**
   * Constant for when the network goes offline.
   */
  OFFLINE: -5
};


/**
 * The Content-Type HTTP header name
 * @type {string}
 */
wireless.net.Xhr.CONTENT_TYPE_HEADER = 'Content-Type';


/**
 * The Content-Type HTTP header value for a url-encoded form
 * @type {string}
 */
wireless.net.Xhr.FORM_CONTENT_TYPE =
    'application/x-www-form-urlencoded;charset=utf-8';


/**
 * Headers with form-urlencoded content-type header set.
 * @type {!Object.<string>}
 */
wireless.net.Xhr.FORM_POST_HEADERS = {};
wireless.net.Xhr.FORM_POST_HEADERS[wireless.net.Xhr.CONTENT_TYPE_HEADER] =
    wireless.net.Xhr.FORM_CONTENT_TYPE;


if (goog.tweak.getRegistry()) {
  /**
   * Contains functions to call in order to resume their XHRs.
   * @type {!Array.<function()>}
   * @private
   */
  wireless.net.Xhr.pausedXhrCallbacks_ = [];
}


/**
 * Returns whether the given response code indicates success.
 * @param {number} status The xhr.status response code.
 * @return {boolean} Whether the response code indicates success.
 */
wireless.net.Xhr.isSuccessfulStatus = function(status) {
  // It is possible to get a "0" status from an XMLHttpRequest as a result of a
  // failed fetch even when the readyState is 4 (complete). Reproducible when
  // toggling on/off the airport of a macbook using iPhone 2.2 simulator. There
  // are dependencies that require this case to be a failure, so be cautious if
  // changing this to support file:// requests.
  return (status > 199 && status < 300) ||
      status == 304; // Http Cache
};


/**
 * @param {number} size The size to make human readable.
 * @return {string|number} The formatted size as either 123 or 12.2kb.
 * @private
 */
wireless.net.Xhr.makeSizeReadable_ = function(size) {
  /** @type {string|number} */
  var sizeRet = size;
  if (size > 999) {
    sizeRet = Math.round(size / 102.4) / 10 + 'kb';
  }
  return sizeRet;
};


/**
 * Applies the given wrapper function to onReadyStateChange_ to protect the
 * callback entry point (by wrapping it in a try/catch block).
 * @param {function(!Function):!Function} wrapper .
 */
wireless.net.Xhr.protectCallbackEntryPoint = function(wrapper) {
  wireless.net.Xhr.prototype.onReadyStateChange_ =
      wrapper(wireless.net.Xhr.prototype.onReadyStateChange_);
};


/**
 * Handle offline events and terminate in progress XHRs if necessary. Webkit
 * (Safari 5.1.7) does not automatically kill in-progress XHRs, so we have to do
 * this ourselves.
 * @private
 */
wireless.net.Xhr.prototype.onNavigatorOffline_ = function() {
  if (this.isActive()) {
    this.doFinishedCallback_(wireless.net.Xhr.StatusCode.OFFLINE,
        true /* should abort */);
  }
};


/**
 * @type {goog.log.Logger}
 * @private
 */
wireless.net.Xhr.prototype.logger_ =
    goog.log.getLogger('wireless.net.Xhr');


/**
 * The url of the pending/completed request.
 * @type {string}
 */
wireless.net.Xhr.prototype.url;


/**
 * The current status of the XHR.
 * @type {(wireless.net.Xhr.StatusCode|number)}
 */
wireless.net.Xhr.prototype.status = wireless.net.Xhr.StatusCode.NOT_INITIALIZED;


/**
 * How long the request took to complete, in milliseconds.
 * @type {number|undefined}
 */
wireless.net.Xhr.prototype.durationMs;


/**
 * The longest amount of time between calls to onReadyStateChange_, after it
 * has started to receive data. It ignores the time before receiving data since
 * the server may have variable processing time.
 * @type {number}
 */
wireless.net.Xhr.prototype.longestUpdateIntervalMs;


/**
 * The time between sending the XHR and the first callback where responseText is
 * not empty.
 * @type {number}
 */
wireless.net.Xhr.prototype.timeUntilFirstDataReceivedMs;


/**
 * The underlying XMLHttpRequest.
 * @type {XMLHttpRequest|undefined}
 * @private
 */
wireless.net.Xhr.prototype.xhr_;


/**
 * The timeout ID for the timeout timer.
 * @type {number}
 * @private
 */
wireless.net.Xhr.prototype.timeoutId_;


/**
 * The start time of the request, used to calculate the request duration.
 * @type {number}
 * @private
 */
wireless.net.Xhr.prototype.startTimeMs_;


/**
 * The time of the previous call to onReadyStateChange_.
 * @type {number}
 * @private
 */
wireless.net.Xhr.prototype.lastUpdateMs_;


/**
 * The user-specified callback to call when the response is updated.
 * @type {function(!wireless.net.Xhr)|undefined}
 * @private
 */
wireless.net.Xhr.prototype.onUpdateCallback_;


/**
 * Sends an XHR.
 * @param {string} url The url to request.
 * @param {string} method Either 'POST' or 'GET'.
 * @param {?string} content The body of the request to send.
 * @param {!Object} headers The headers of the request to send.
 */
wireless.net.Xhr.prototype.send = function(url, method, content, headers) {
  goog.asserts.assert(!this.isActive(),
      'xhr send called when already in progress.');
  goog.log.info(this.logger_, 'Start of ' + method + ' request of length ' +
      wireless.net.Xhr.makeSizeReadable_((content || '').length) +
      ' to ' + url);

  this.status = wireless.net.Xhr.StatusCode.INITIALIZED;
  if (wireless.net.Xhr.RECORD_TIMINGS) {
    this.startTimeMs_ = goog.now();
    this.lastUpdateMs_ = 0;
    this.longestUpdateIntervalMs = 0;
    this.timeUntilFirstDataReceivedMs = 0;
  }
  var trace = goog.debug.Trace.startTracer('XHR');
  /** @preserveTry */
  try {
    this.url = url;
    var xhr = new XMLHttpRequest();
    this.xhr_ = xhr;
    //goog.debug.Trace.addComment('XHR constructor');

    var simulateFailureReason = goog.tweak.getString('net.FailXhrs');
    if (simulateFailureReason == 'Open Failed') {
      throw Error('Simulating open failed.');
    } else if (simulateFailureReason) {
      window.setTimeout(goog.bind(this.maybeApplyFailXhrsTweak_, this), 0);
    } else {
      xhr.open(method, url, true /* async */);
      //goog.debug.Trace.addComment('XHR.open()');

      for (var key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }

      xhr.onreadystatechange = goog.bind(this.onReadyStateChange_, this);
      xhr.onprogress = goog.bind(this.onProgress_, this);
      if (xhr.upload) {
        xhr.upload.onprogress = goog.bind(this.onProgress_, this);
      }
      this.startTimeout_();
      xhr.send(content);
    }
    //goog.debug.Trace.addComment('XHR.send()');
  } catch (e) {
    goog.log.error(this.logger_, 'Exception in xhr.open or xhr.send', e);
    this.doFinishedCallback_(wireless.net.Xhr.StatusCode.OPEN_FAILED);
  }
  goog.debug.Trace.stopTracer(trace);
};


/**
 * @param {function(!wireless.net.Xhr)} onUpdate On update callback.
 */
wireless.net.Xhr.prototype.setOnUpdateCallback = function(onUpdate) {
  this.onUpdateCallback_ = onUpdate;
};


/**
 * @return {function(!wireless.net.Xhr)|undefined} The onUpdate callback.
 */
wireless.net.Xhr.prototype.getOnUpdateCallback = function() {
  return this.onUpdateCallback_;
};


/**
 * @param {function(!wireless.net.Xhr)} onComplete On compete callback.
 */
wireless.net.Xhr.prototype.setOnCompleteCallback = function(onComplete) {
  this.onCompleteCallback_ = onComplete;
};


/**
 * @return {function(!wireless.net.Xhr)} The onComplete callback.
 */
wireless.net.Xhr.prototype.getOnCompleteCallback = function() {
  return this.onCompleteCallback_;
};


/**
 * Returns whether the request has finished and was successful.
 * @return {boolean}
 */
wireless.net.Xhr.prototype.isSuccess = function() {
  return wireless.net.Xhr.isSuccessfulStatus(this.status);
};


/**
 * Returns true iff the request is in progress.
 * @return {boolean}
 */
wireless.net.Xhr.prototype.isActive = function() {
  return this.status == wireless.net.Xhr.StatusCode.INITIALIZED;
};


/**
 * Return true iff the response terminated because of a timeout.
 * @return {boolean}
 */
wireless.net.Xhr.prototype.wasTimeout = function() {
  return this.status == wireless.net.Xhr.StatusCode.TIMED_OUT;
};


/**
 * Returns the underlying XMLHttpRequest object.
 * @return {(XMLHttpRequest|undefined)}
 */
wireless.net.Xhr.prototype.getXmlHttpRequest = function() {
  return this.xhr_;
};


/**
 * @return {string} Returns the response text.
 */
wireless.net.Xhr.prototype.getResponseText = function() {
  goog.asserts.assert(this.xhr_,
      'Cannot call getResponseText() outside when no request is active.');
  return this.xhr_.responseText;
};


/**
 * Simulates an XHR error if the FailXhr tweak is enabled.
 * @return {boolean|undefined} Returns whether an error was simulated.
 * @private
 */
wireless.net.Xhr.prototype.maybeApplyFailXhrsTweak_ = function() {
  var simulateFailureReason = goog.tweak.getString('net.FailXhrs');
  if (simulateFailureReason) {
    var statusCode = +simulateFailureReason ||
        wireless.net.Xhr.StatusCode.TIMED_OUT;
    goog.log.info(this.logger_,
        'Failing XHR due to FailXhr tweak. Status code: ' + statusCode);
    this.doFinishedCallback_(statusCode, true /* should abort */);
    return true;
  }
  return undefined;
};


/**
 * Cleans up the xhr and then calls the onCompleteCallback.
 * @param {number} status The status to set for the request.
 * @param {boolean} opt_shouldAbort True if xhr.abort() should be called.
 * @private
 */
wireless.net.Xhr.prototype.doFinishedCallback_ =
    function(status, opt_shouldAbort) {
  goog.asserts.assert(this.xhr_, 'Xhr.doFinishedCallback_ called twice.');
  window.clearTimeout(this.timeoutId_);
  this.xhr_.onreadystatechange = goog.nullFunction;
  if (opt_shouldAbort) {
    this.xhr_.abort();
  }
  this.status = status;
  if (wireless.net.Xhr.RECORD_TIMINGS) {
    this.durationMs = goog.now() - this.startTimeMs_;
  }
  if (this.logger_.isLoggable(goog.log.Level.WARNING)) {
    if (!this.isSuccess() && status > 0) {
      goog.log.warning(this.logger_, 'Failed XHR Response:');
      goog.log.warning(this.logger_,
          String(this.getResponseText()).substr(0, 10240));
    }
  }

  // Detect new xhr being sent out within callback. Only nullify this.xhr_ when
  // no new xhr was sent.
  var priorXhr = this.xhr_;
  this.onCompleteCallback_(this);
  if (this.xhr_ == priorXhr) {
    this.xhr_ = null;
  }
};


/**
 * Callback for the xhr.onprogress, if we have actually made progress towards
 * loading more of the XHR, reset the timeout.
 * @param {ProgressEvent} e The event triggering the callback.
 * @private
 */
wireless.net.Xhr.prototype.onProgress_ = function(e) {
  this.startChunkTimeout_();
};


/**
 * Callback for the xhr.onreadystatechange.
 * @param {boolean=} opt_triggeredByTweak Whether the function is being called
 *     by PauseTweaks being turned off.
 * @private
 */
wireless.net.Xhr.prototype.onReadyStateChange_ =
    function(opt_triggeredByTweak) {
  if (goog.tweak.getBoolean('net.PauseXhrs')) {
    wireless.net.Xhr.pausedXhrCallbacks_.push(
        goog.bind(this.onReadyStateChange_, this, true /* triggeredByTweak */));
    return;
  }
  if (this.isActive()) {
    // This will apply when FailXhrs is enabled when an XHR is in-flight.
    if (this.maybeApplyFailXhrsTweak_()) {
      return;
    }
    var readyState = this.xhr_.readyState;
    if (readyState == wireless.net.Xhr.ReadyState.INTERACTIVE ||
        readyState == wireless.net.Xhr.ReadyState.COMPLETE) {
      if (wireless.net.Xhr.RECORD_TIMINGS) {
        // Update the longestUpdateIntervalMs & timeUntilFirstDataReceivedMs.
        var now = goog.now();
        if (this.lastUpdateMs_) {
          var updateDelta = now - this.lastUpdateMs_;
          this.longestUpdateIntervalMs =
              Math.max(this.longestUpdateIntervalMs, updateDelta);
        } else {
          this.timeUntilFirstDataReceivedMs = now - this.startTimeMs_;
        }
        this.lastUpdateMs_ = now;
      }

      if (this.logger_.isLoggable(goog.log.Level.FINE)) {
        goog.log.fine(this.logger_, 'Received ' +
            wireless.net.Xhr.makeSizeReadable_(this.xhr_.responseText.length) +
            ' of response. ' + (updateDelta ?
                'update interval was: ' + updateDelta :
                'time-to-first was: ' + this.timeUntilFirstDataReceivedMs) +
            'ms');
      }

      // Reset timeout for the next update. We do this from onProgress_ as well,
      // but those events are not always available.
      this.startChunkTimeout_();

      if (this.onUpdateCallback_ &&
          wireless.net.Xhr.isSuccessfulStatus(this.xhr_.status)) {
        if (wireless.net.Xhr.RECORD_TIMINGS) {
          this.durationMs = goog.now() - this.startTimeMs_;
        }
        this.onUpdateCallback_(this);
      }

      // Check if it is finished.
      if (readyState == wireless.net.Xhr.ReadyState.COMPLETE) {
        goog.log.info(this.logger_, 'XHR finished with status: ' +
            this.xhr_.status + ' size: ' +
            wireless.net.Xhr.makeSizeReadable_(this.xhr_.responseText.length));
        this.doFinishedCallback_(this.xhr_.status);
      }
    }
  } else if (!opt_triggeredByTweak) {
    goog.log.warning(this.logger_,
        'onReadyStateChange_ called when not active');
  }
};


/**
 * Starts the timeout timer, if a timeout interval is set.
 * @private
 */
wireless.net.Xhr.prototype.startTimeout_ = function() {
  var timeoutMs = goog.tweak.getNumber('n.xtv') * 1000 ||
      this.timeoutMs_;
  if (timeoutMs) {
    this.timeoutId_ = window.setTimeout(goog.bind(this.onTimeout_, this),
        timeoutMs);
  }
};

/**
 * Starts the update timeout timer, if an update timeout interval is set.
 * @private
 */
wireless.net.Xhr.prototype.startChunkTimeout_ = function() {
  var timeoutMs = goog.tweak.getNumber('n.xct') * 1000 ||
      this.chunkTimeoutMs_;
  if (timeoutMs) {
    if (this.timeoutId_) {
      window.clearTimeout(this.timeoutId_);
    }
    this.timeoutId_ = window.setTimeout(goog.bind(this.onTimeout_, this),
        timeoutMs);
  }
};


/**
 * Callback for the timeout timer.
 * @private
 */
wireless.net.Xhr.prototype.onTimeout_ = function() {
  if (this.isActive()) {
    goog.log.info(this.logger_, 'XHR timed out');
    this.doFinishedCallback_(wireless.net.Xhr.StatusCode.TIMED_OUT,
        true /* shouldAbort */);
  }
};
