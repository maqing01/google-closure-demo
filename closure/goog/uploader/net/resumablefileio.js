

/**
 * @fileoverview An extension to {@link apps.uploader.net.FileIo} which uses
 *     Gears as the underlying mechanism for uploading files.
 *
 * @author wescarr@google.com (Wes Carr)
 */


goog.provide('apps.uploader.net.ResumableFileIo');
goog.provide('apps.uploader.net.ResumableFileIo.State');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');
goog.require('goog.Timer');
goog.require('goog.log');
goog.require('goog.math.Range');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.net.XmlHttp');
goog.require('goog.structs.Map');



/**
 * Creates a new ResumableFileIo object.
 * @param {apps.uploader.File} file The file to upload.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.ResumableFileIo = function(file) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The request object. It may be used for the transfer, but it may also be the
   * request used for querying the server. What this request performs depends on
   * current state. As only one request is active at a time, we can use one
   * field here.
   * @type {goog.net.XhrIo}
   * @protected
   */
  this.request = null;

  /**
   * Progress confirmed by the server with a 308 response.
   * @type {number}
   * @protected
   */
  this.serverProgress = 0;

  /**
   * State of the object.
   * @type {apps.uploader.net.ResumableFileIo.State}
   * @private
   */
  this.state_ = apps.uploader.net.ResumableFileIo.State.DEFAULT;

  /**
   * Current backoff delay (ms), or null if there is no backoff in progress.
   * @type {number?}
   * @private
   */
  this.currentAutoRetryDelay_ = null;

  /**
   * Whether the upload will be resumed automatically in case of error.
   * @type {boolean}
   * @private
   */
  this.autoRetry_ = false;

  /**
   * Handler ID of currently scheduled function.
   * @type {number?}
   * @private
   */
  this.timerHandler_ = null;
};
goog.inherits(apps.uploader.net.ResumableFileIo, apps.uploader.net.FileIo);


/**
 * Possible states for the ResumableFileIo object.
 * @enum {string}
 */
apps.uploader.net.ResumableFileIo.State = {

  /** Initial state. */
  DEFAULT: 'default',

  /** Sending file contents. */
  TRANSFER: 'transfer',

  /** Sending status query after error. */
  QUERY: 'query',

  /** No XHR request running, upload paused. */
  PAUSED: 'paused'
};


/**
 * Named logger for this class.
 * @type {goog.log.Logger}
 * @protected
 * @override
 */
apps.uploader.net.ResumableFileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.ResumableFileIo');


/**
 * Sets whether the upload will be resumed automatically if an error occurs.
 * @param {boolean} autoRetry New auto-retry flag.
 */
apps.uploader.net.ResumableFileIo.prototype.setAutoRetry = function(autoRetry) {
  this.autoRetry_ = autoRetry;
};


/**
 * @return {boolean} Whether the upload will be resumed automatically if an
 *     error occurs.
 */
apps.uploader.net.ResumableFileIo.prototype.isAutoRetry = function() {
  return this.autoRetry_;
};


/**
 * @return {number?} Current backoff delay (ms), or null if there is no backoff
 *     in progress.
 */
apps.uploader.net.ResumableFileIo.prototype.getCurrentAutoRetryDelay =
    function() {
  return this.currentAutoRetryDelay_;
};


/**
 * @return {boolean} Whether the upload is paused or not.
 */
apps.uploader.net.ResumableFileIo.prototype.isPaused = function() {
  return this.state_ == apps.uploader.net.ResumableFileIo.State.PAUSED;
};


/**
 * @return {boolean} Whether there is a backoff in progress.
 */
apps.uploader.net.ResumableFileIo.prototype.isBackoff = function() {
  return this.currentAutoRetryDelay_ != null;
};


/**
 * Aborts the current upload request.
 * @override
 */
apps.uploader.net.ResumableFileIo.prototype.abort = function() {
  this.abortInternal_();
  this.state_ = apps.uploader.net.ResumableFileIo.State.DEFAULT;
};


/**
 * Aborts the current upload request and cancels whatever function was scheduled
 * to be called in future.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.abortInternal_ = function() {
  goog.log.info(this.logger, 'aborting...');
  this.unschedule_();
  if (this.request) {
    this.request.abort();
    this.request = null;
  }
};


/**
 * Starts an upload request to the specified URL. If {@code recovered} flag was
 * set during object creation, it will first send a query request.
 * @param {string} url The URL to which the file will be sent.
 * @protected
 * @override
 */
apps.uploader.net.ResumableFileIo.prototype.sendInternal = function(url) {
  var headers = new goog.structs.Map();
  headers.set('X-HTTP-Method-Override', 'PUT');
  headers.set('Content-Type', 'application/octet-stream');
  // headers.set('X-GUploader-No-308', 'yes');

  var MAX_CHUNK_SIZE = 100 * 1024 * 1024;
  var fileSize = this.getFile().getBytesTotal();
  var firstByte = this.getFile().getBytesTransferred();
  var lastByte = Math.min(firstByte + MAX_CHUNK_SIZE, fileSize) - 1;

  // A 0-byte file needs to be uploaded in full.
  var slice = fileSize ? new goog.math.Range(firstByte, lastByte) : null;

  if (firstByte <= lastByte) {
    //  Remove this check when GSE supports Content-Range headers
    // or there exists a better solution for local uploads without a GFE.
    // http://cs/google3/java/com/google/gse/HttpConnection.java&l=1544
    if (firstByte != 0 || lastByte != fileSize - 1) {
      // Must send Content-Range header if sending a slice.
      headers.set('Content-Range',
          'bytes ' + firstByte + '-' + lastByte + '/' + fileSize);
    }
  }

  this.sendRequest(url, headers, slice);
  this.state_ = apps.uploader.net.ResumableFileIo.State.TRANSFER;
};


/**
 * Pauses the upload by aborting current XHR request. Does nothing if the upload
 * is already paused.
 * @throws {Error} If the upload is not started.
 * @see #isPaused
 */
apps.uploader.net.ResumableFileIo.prototype.pause = function() {
  if (this.state_ == apps.uploader.net.ResumableFileIo.State.DEFAULT) {
    throw Error('Cannot pause an upload that is not started');
  }
  this.abortInternal_();
  this.state_ = apps.uploader.net.ResumableFileIo.State.PAUSED;
  goog.log.info(this.logger, 'Paused file ' + this.getFile());
};


/**
 * Resumes the upload.
 * @throws {Error} If the upload is not paused.
 * @see #isPaused
 */
apps.uploader.net.ResumableFileIo.prototype.resume = function() {
  if (!this.isPaused()) {
    throw Error('Cannot resume an upload that is not paused');
  }
  this.currentAutoRetryDelay_ = null;
  this.sendQueryRequest_();
  goog.log.info(this.logger, 'Manually resuming file ' + this.getFile());
};


/**
 * Schedules a function to be executed in future. The function will be executed
 * in context of this object.
 * @param {Function} fn Function to be executed.
 * @param {number} delay Delay in ms.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.schedule_ = function(fn, delay) {
  this.unschedule_();
  this.timerHandler_ = goog.Timer.callOnce(
      function() {
        this.timerHandler_ = null;
        fn.call(this);
      },
      delay,
      this);
};


/**
 * Cancels whatever was previously scheduled using #schedule_.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.unschedule_ = function() {
  if (this.timerHandler_ != null) {
    goog.Timer.clear(this.timerHandler_);
    this.timerHandler_ = null;
  }
};


/**
 * Sends the query request. The server is supposed to return which bytes it has
 * already received.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.sendQueryRequest_ = function() {
  this.request = new goog.net.XhrIo();
  this.getHandler().listen(this.request,
      goog.net.EventType.READY_STATE_CHANGE, this.handleReadyStateChange);

  this.state_ = apps.uploader.net.ResumableFileIo.State.QUERY;
  goog.log.info(this.logger, 'Sending query request.');
  this.request.send(this.getFile().getSessionUrl(), 'POST', '',
      {'X-HTTP-Method-Override': 'PUT',
       'Content-Range': 'bytes */' + this.getFile().getBytesTotal()});
};


/**
 * Handler for the httprequest object's 'onreadystatechange' callback.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.handleReadyStateChange =
    function() {
  switch (this.getRequestReadyState()) {
    case goog.net.XmlHttp.ReadyState.LOADING:
    case goog.net.XmlHttp.ReadyState.LOADED:
    case goog.net.XmlHttp.ReadyState.INTERACTIVE:
    case goog.net.XmlHttp.ReadyState.UNINITIALIZED:
      break;
    case goog.net.XmlHttp.ReadyState.COMPLETE:
      this.handleReadyStateComplete();
      break;
    default:
      // We should never get here.
      this.handleError(apps.uploader.ErrorCode.EXCEPTION,
                       'Unknown request state');
      break;
  }
};


/**
 * Handles request state change to COMPLETE.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.handleReadyStateComplete =
    function() {
  // Save the response, for success and error cases.
  var responseText = this.getRequestResponseText();
  this.setResponseText(responseText);
  var status = this.getRequestStatus();
  var statusText = this.getRequestStatusText();

  switch (status) {
    case 308:
      this.handleResumeIncompleteResponse_();
      break;
    case 200:
      this.handleSuccess(responseText);
      break;
    case 408:
    case 500:
    case 502:
    case 503:
    case 504:
      if (this.autoRetry_) {
        goog.log.fine(this.logger,
            'Handling retryable HTTP ' + status + ' error');
        this.handleRetryableError();
      } else {
        this.handleError(apps.uploader.ErrorCode.NETWORK_ERROR, statusText);
      }
      break;
    default:
      this.handleError(apps.uploader.ErrorCode.NETWORK_ERROR, statusText);
      break;
  }
};


/**
 * Handles an error that is retryable. 503s and network errors fall into this
 * category.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.handleRetryableError = function() {
  var states = apps.uploader.net.ResumableFileIo.State;  // for brevity
  switch (this.state_) {
    case states.TRANSFER:
      this.sendQueryRequest_();
      break;
    case states.QUERY:
      this.backoff_(goog.bind(this.sendQueryRequest_, this));
      break;
    default:
      this.handleError(apps.uploader.ErrorCode.EXCEPTION,
          '');
      break;
  }
};


/**
 * Handles 308 Resume Incomplete status by parsing Range header and sending
 * appropriate slice of data.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.handleResumeIncompleteResponse_ =
    function() {
  goog.log.fine(this.logger, 'Handling 308 (Resume Incomplete)');

  var madeProgress = false;

  var rangeHeader = this.getRequestResponseHeader('Range');
  if (rangeHeader) {
    // Server acknowledged some data, so we send only remaining bytes. Check
    // what should be transmitted.
    var parseResults = /^bytes=(\d+)-(\d+)$/.exec(rangeHeader);
    if (!parseResults) {
      this.handleError(apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE,
                       ': ' + rangeHeader);
    }
    var serverRangeStart = Number(parseResults[1]);
    var serverRangeEnd = Number(parseResults[2]);

    // Progress resets the backoff delay.
    if (serverRangeEnd >= this.serverProgress) {
      this.currentAutoRetryDelay_ = null;
      madeProgress = true;
    }
    this.serverProgress = serverRangeEnd + 1;
    this.onProgress(serverRangeEnd + 1);
  } else {
    if (this.state_ == apps.uploader.net.ResumableFileIo.State.QUERY) {
      // Server did not send Range header, whole file needs to be transmitted.
      this.serverProgress = 0;
      this.onProgress(0);
    } else {
      // The server may have sent a Range header, but we're unable to read it.
      // This happens with cross-domain requests in Chrome. We need to send a
      // query request to the session url, which is always on the same domain,
      // in order to read the Range header.
      //  We can remove these hacks when this bug is fixed:
      // http://code.google.com/p/chromium/issues/detail?id=87338
      goog.log.info(this.logger, 'Could not read Range header.');
      this.sendQueryRequest_();
      return;
    }
  }

  // Send the next part of data.
  if (madeProgress) {
    this.sendInternal(this.getLastUri());
  } else {
    this.backoff_(goog.bind(this.sendInternal, this, this.getLastUri()));
  }
};


/**
 * Delays calling a function by the current auto retry delay and doubles the
 * delay with a maximum delay of 1 minute.
 * @param {Function} callback The function to call.
 * @private
 */
apps.uploader.net.ResumableFileIo.prototype.backoff_ = function(callback) {
  if (this.currentAutoRetryDelay_ == null) {
    this.currentAutoRetryDelay_ = 5000;
    this.dispatchEvent(apps.uploader.net.EventType.BACKOFF);
  } else {
    this.currentAutoRetryDelay_ *= 2;
    if (this.currentAutoRetryDelay_ >= 60000) {
      this.currentAutoRetryDelay_ = 60000;
    }
  }
  goog.log.fine(this.logger,
      'Backoff for ' + this.currentAutoRetryDelay_ / 1000 + ' s');
  this.schedule_(callback, this.currentAutoRetryDelay_);
};


/**
 * @override
 */
apps.uploader.net.ResumableFileIo.prototype.handleSuccess =
    function(responseText) {
  apps.uploader.net.ResumableFileIo.superClass_.handleSuccess.call(this,
      responseText);
  this.state_ = apps.uploader.net.ResumableFileIo.State.DEFAULT;
  this.currentAutoRetryDelay_ = null;
};


/**
 * @override
 */
apps.uploader.net.ResumableFileIo.prototype.handleError =
    function(errorCode, error) {
  apps.uploader.net.ResumableFileIo.superClass_.handleError.call(
      this, errorCode, error);
  this.state_ = apps.uploader.net.ResumableFileIo.State.DEFAULT;
  this.currentAutoRetryDelay_ = null;
};


/**
 * @return {number} The request's ready state.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.getRequestReadyState = function() {
  return this.request.getReadyState();
};


/**
 * @param {string} key The name of the header to retreive.
 * @return {?string} The requested response header.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.getRequestResponseHeader =
    function(key) {
  return this.request.getResponseHeader(key) || null;
};


/**
 * @return {string} The request's response text.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.getRequestResponseText =
    function() {
  return this.request.getResponseText();
};


/**
 * @return {number} The request's HTTP status.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.getRequestStatus = function() {
  // If an X-HTTP-Status-Code-Override header is provided, we return
  // the value of that header.
  var response_code_override_header;
  try {
    // response_code_override_header =
    //     this.getRequestResponseHeader('X-HTTP-Status-Code-Override');

  } catch (ignored) {
    // If the X-HTTP-Status-Code-Override header is not set, then that header is
    // excluded from Access-Control-Expose-Headers and an error is thrown by
    // getResponseHeader(). In that case, we ignore the error and return the
    // base request status instead.
    response_code_override_header = null;
  }

  var response_code_override = parseInt(response_code_override_header, 10);
  if (isFinite(response_code_override)) {
    return response_code_override;
  }

  // Otherwise, return the actual response code.
  return this.request.getStatus();
};


/**
 * @return {string} The request's status text.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.getRequestStatusText = function() {
  return this.request.getStatusText();
};


/**
 * @param {string} url The destination url.
 * @param {goog.structs.Map=} opt_headers Map of headers to add to the request.
 * @param {goog.math.Range} opt_range The file slice range to send.
 * @protected
 */
apps.uploader.net.ResumableFileIo.prototype.sendRequest = goog.abstractMethod;
