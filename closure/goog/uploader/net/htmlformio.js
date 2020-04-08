goog.provide('apps.uploader.net.HtmlFormFileIo');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.common.utils');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');
goog.require('goog.Timer');
goog.require('goog.fx.Animation');
goog.require('goog.fx.Animation.EventType');
goog.require('goog.fx.easing');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.ErrorCode');
goog.require('goog.net.EventType');
goog.require('goog.net.IframeIo');
goog.require('goog.net.XhrIo');



/**
 * Creates a new HtmlFormFileIo object.
 * @param {apps.uploader.File} file The file to upload.
 * @param {HTMLFormElement} form The Html Form associated with the file.
 * @param {number} opt_uploadSpeed The upload speed in KBps to use initially
 *     for updating the progress bar.
 * @constructor
 * @extends {apps.uploader.net.FileIo}
 */
apps.uploader.net.HtmlFormFileIo = function(file, form, opt_uploadSpeed) {
  apps.uploader.net.FileIo.call(this, file);

  /**
   * The Html Form associated with the file.
   * @type {HTMLFormElement}
   * @private
   */
  this.form_ = form;

  /**
   * The {@link goog.net.IframeIo} request object being used for the transfer.
   * @type {goog.net.IframeIo?}
   * @private
   */
  this.request_ = null;

  /**
   * The interval (in milliseconds) to send status query requests to the server
   * while the file is uploading.
   * @type {number}
   * @private
   */
  this.statusCheckInterval_ = 15000;

  /**
   * Time to wait before sending the first status query.
   * @type {number}
   * @private
   */
  this.firstStatusCheckInterval_ = 5000;

  /**
   * The progress animation duration should be slightly longer than the status
   * check interval to make the animation smoother. This is the additional time
   * in milliseconds that the animation duration should extend beyond the
   * status check interval.
   * @type {number}
   * @private
   */
  this.animationSmoothingTime_ = 500;

  /**
   * The progress bar animation.
   * @type {goog.fx.Animation}
   * @private
   */
  this.progressAnimation_ = null;

  /**
   * Approximate upload speed that was most recently observed. This is
   * used to update the progress bar.
   * Value is in bytes per millisecond (or KBps).
   * @type {number}
   * @private
   */
  this.uploadSpeed_ = opt_uploadSpeed || 0;

  /**
   * Bytes transferred as reported by the last status query. Used to update
   * the upload speed.
   * @type {number}
   * @private
   */
  this.lastTransferred_ = 0;

  /**
   * Time the last status query was received. Used to update the upload speed.
   * @type {number}
   * @private
   */
  this.lastStatusTime_ = 0;
};
goog.inherits(apps.uploader.net.HtmlFormFileIo, apps.uploader.net.FileIo);


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.net.HtmlFormFileIo.prototype.logger =
    goog.log.getLogger('apps.uploader.net.HtmlFormFileIo');


/**
 * Returns the upload speed.
 * @return {number} The approximate upload speed in KBps.
 */
apps.uploader.net.HtmlFormFileIo.prototype.getUploadSpeed = function() {
  return this.uploadSpeed_;
};


/**
 * Aborts the current upload request.
 * @override
 */
apps.uploader.net.HtmlFormFileIo.prototype.abort = function() {
  this.request_.abort();
};


/**
 * Starts an upload request to the specified url.
 * @param {string} url The url to which the file will be sent.
 * @protected
 * @override
 */
apps.uploader.net.HtmlFormFileIo.prototype.sendInternal = function(url) {
  var request = this.createIo_();
  this.request_ = request;
  // Setup callbacks
  this.getHandler().
      listen(request, goog.net.EventType.SUCCESS, this.handleIframeSuccess_).
      listen(request, goog.net.EventType.ERROR, function(event) {
        if (!apps.uploader.common.utils.isSameOrigin(
                url, window.location.href)) {
          // For cross-domain uploads, we need to make a query request to get
          // the response.
          this.sendFinalStatusQuery_();
        } else {
          this.handleIframeError_(event);
        }
      });


   //add api session
  var token = goog.uri.utils.getParamValue(window.location.href,
      'API-SESSION-TOKEN');
  if (!!token) {
    url = goog.uri.utils.appendParam(url, 'API-SESSION-TOKEN', token);
  }

  request.sendFromForm(this.form_, url);

  // Setup timer to make the first status query.
  if (this.statusCheckInterval_ > 0) {
    goog.Timer.callOnce(this.sendIntermediateStatusQuery_,
                        this.firstStatusCheckInterval_,
                        this);
  }
  this.lastStatusTime_ = new Date().getTime();
};


/**
 * Creates a new {goog.net.IFrameIo} instance used for uploading files.
 * @return {!goog.net.IframeIo} The Iframe uploader.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.createIo_ = function() {
  return new goog.net.IframeIo();
};


/**
 * Handles request successes.
 * @param {goog.events.Event} event The success event.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.handleIframeSuccess_ =
    function(event) {
  try {
    var response = event.target.getResponseText();
    var json = response && goog.json.unsafeParse(response);

    // Session status does not exist on upload errors.  In this case, don't
    // update the bytes total.  Code later in the upload handling will pull
    // out the error reason and report it to clients.
    var sessionStatus = json['sessionStatus'];
    if (sessionStatus) {
      var external_field = sessionStatus['externalFieldTransfers'][0];
      var file = this.getFile();
      if (file.getBytesTotal() == null) {
        file.setBytesTotal(external_field['bytesTotal']);
        file.setIsBytesTotalAnEstimate(false);
      }
    }
  } catch (e) {
    goog.log.error(this.logger, 'Error while setting file size on success', e);
  }
  this.handleSuccess(event.target.getResponseText() || '');
};


/**
 * Handles request errors and generates an appropriate FileIo error.
 * @param {goog.events.Event} event The error event.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.handleIframeError_ =
    function(event) {
  this.handleError(
      apps.uploader.ErrorCode.mapErrorCode(event.target.getLastErrorCode()),
      event.target.getLastError());
};


/**
 * Sends a status query request to the server.
 * @param {function(goog.events.Event)} successCallback Function to call if the
 *     status query is successful.
 * @param {function(goog.events.Event)} errorCallback Function to call if the
 *     status query fails.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.sendStatusQueryInternal_ = function(
    successCallback, errorCallback) {
  var xhr = new goog.net.XhrIo();
  this.getHandler().
      listen(xhr, goog.net.EventType.SUCCESS, successCallback).
      listen(xhr, goog.net.EventType.ERROR, errorCallback);
  try {
    // Status query always goes to the session url.
    var queryUrl = this.getFile().getSessionUrl();
    xhr.send(queryUrl, 'GET');
  } catch (e) {
    goog.log.warning(this.logger, 'Error while sending status query', e);
  }
};


/**
 * Sends a status query to update the file progress.
 * Should only by called while the file is still uploading.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.sendIntermediateStatusQuery_ =
    function() {
  if (!this.request_.isActive()) {
    return;
  }
  this.sendStatusQueryInternal_(
      goog.bind(this.handleIntermediateStatusQuerySuccess_, this),
      goog.bind(this.handleIntermediateStatusQueryError_, this));
};


/**
 * Sends a status query to get the final status.
 * Should only be called after the file has finished uploading.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.sendFinalStatusQuery_ = function() {
  this.sendStatusQueryInternal_(
      goog.bind(this.handleIframeSuccess_, this),
      goog.bind(this.handleIframeError_, this));
};


/**
 * Handles a successful status query. Updates the file progress.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.
    handleIntermediateStatusQuerySuccess_ = function(event) {
  if (!this.request_.isActive()) {
    return;
  }
  try {
    // Read the response.
    var response = event.target.getResponseText();
    var json = goog.json.unsafeParse(response);
    var externalField = json['sessionStatus']['externalFieldTransfers'][0];
    var transferred = externalField['bytesTransferred'];
    var file = this.getFile();
    if (file.getBytesTotal() == null) {
      if (externalField['bytesTotal'] > 0) {
        // While the upload is in progress, the bytes total the server sends
        // is actually an estimate.
        file.setBytesTotal(externalField['bytesTotal']);
        file.setIsBytesTotalAnEstimate(true);
      } else {
        goog.log.warning(this.logger,
            'Status query response missing bytes total.');
        goog.Timer.callOnce(this.sendIntermediateStatusQuery_,
                            this.statusCheckInterval_,
                            this);
        return;
      }
    }
    var total = file.getBytesTotal();
    if (this.progressAnimation_ != null) {
      this.progressAnimation_.stop(false);
    }

    // Update the upload speed. We either use the previous value stored in the
    // uploader if this is the first status query, or we calculate the upload
    // speed ourselves.
    var timeNow = new Date().getTime();
    if (this.lastTransferred_ > 0 || this.uploadSpeed_ == 0) {
      this.uploadSpeed_ = Math.round((transferred - this.lastTransferred_) /
          (timeNow - this.lastStatusTime_));
    }
    this.lastTransferred_ = transferred;
    this.lastStatusTime_ = timeNow;

    // Animate the progress bar over an interval slightly longer than the
    // status check interval.
    var duration = this.statusCheckInterval_ + this.animationSmoothingTime_;
    // Start from the current progress bar position so the animation is smooth.
    var start = file.getBytesTransferred();
    // End at the estimated position taking the reported bytes transferred and
    // approximate upload speed into account.
    var end = Math.round(transferred + duration * this.uploadSpeed_);
    // If the upload is estimated to complete before the next status query
    // is sent, adjust the end and duration so that the progress bar hits 100%
    // just as the upload completes.
    if (end > total) {
      end = total;
      duration = Math.round((total - transferred) / this.uploadSpeed_) +
          this.animationSmoothingTime_;
    }
    this.progressAnimation_ = new goog.fx.Animation(
        [start], [end], duration, goog.fx.easing.inAndOut);
    this.getHandler().listen(this.progressAnimation_,
        goog.fx.Animation.EventType.ANIMATE, goog.bind(function(e) {
          this.onProgress(Math.round(e.x));
        }, this));
    this.progressAnimation_.play();
    // goog.log.info(this.logger,
    //     Math.round(transferred / total * 100) +
    //     '% transferred. Animating from ' + Math.round(start / total * 100) +
    //     '% to ' + Math.round(end / total * 100) + '% over next ' +
    //     Math.round(duration / 1000) + ' seconds. Upload speed is ' +
    //     this.uploadSpeed_ + 'KBps');
  } catch (e) {
    goog.log.warning(this.logger, 'Error while processing status query', e);
  }
  if (this.request_.isActive()) {
    goog.Timer.callOnce(this.sendIntermediateStatusQuery_,
                        this.statusCheckInterval_,
                        this);
  }
};


/**
 * Handles a non-successful status query.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.net.HtmlFormFileIo.prototype.
    handleIntermediateStatusQueryError_ = function(event) {
  goog.log.warning(this.logger, 'Status query reports error.');
  if (this.request_.isActive()) {
    goog.Timer.callOnce(this.sendIntermediateStatusQuery_,
                        this.statusCheckInterval_,
                        this);
  }
};


/** @override */
apps.uploader.net.HtmlFormFileIo.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.progressAnimation_);
};
