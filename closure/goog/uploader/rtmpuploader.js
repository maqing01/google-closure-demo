

/**
 * @fileoverview An uploader that handles the session management for RTMP webcam
 *     uploads. Exposes two public methods.
 *
 * 1) startRtmpUpload - creates the RTMP session.
 * 2) queryRtmpUpload - queries the RTMP session.
 *
 * These methods will cause the RtmpUploader to fire an
 * apps.uploader.RtmpUploader.RtmpEvent with the status and RTMP url.
 *
 * @author andyehou@google.com (Andy Hou)
 */


goog.provide('apps.uploader.RtmpUploader');
goog.provide('apps.uploader.RtmpUploader.EventType');
goog.provide('apps.uploader.RtmpUploader.RtmpEvent');

goog.require('apps.uploader.Session');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.object');



/**
 * Creates a new RtmpUploader object.
 * @param {string} sessionServerUrl The URL that the create session request
 *     is sent to.
 * @param {string=} opt_magicWord Must be set to 'rtmp' in order to work. We
 *     require this string to be passed in, rather than hardcoding it here,
 *     because we do not want to publicly leak the string 'rtmp' in the JS
 *     (having variables with rtmp in them is fine since they will be renamed
 *     by the JS compiler).  we can stop requiring this parameter
 *     after webcam video uploads have launced.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
apps.uploader.RtmpUploader = function(sessionServerUrl, opt_magicWord) {
  goog.events.EventTarget.call(this);

  /**
   * The URL that the create session request is sent to.
   * @type {string}
   * @private
   */
  this.startUrl_ = sessionServerUrl;

  /**
   * Must be set to 'rtmp' in order for the create session request to work and
   * to read the create session response.
   * @type {string}
   * @private
   */
  this.rtmp_ = opt_magicWord || '';

  /**
   * The URL that the query session request is sent to. Will be undefined until
   * the create session response is read.
   * @type {string|undefined}
   * @private
   */
  this.queryUrl_ = undefined;

  /**
   * The URL that the RTMP requests are sent to. Will be undefined until the
   * create session response is read.
   * @type {string|undefined}
   * @private
   */
  this.rtmpUrl_ = undefined;

  /**
   * Custom data of the session finalization.
   * @type {Object|undefined}
   * @private
   */
  this.finalizationData_ = undefined;

  /**
   * Extra HTTP headers to be sent with the upload request.
   * @private {!Object}
   */
  this.extraHeaders_ = {};

  /**
   * Event handler for this object.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(apps.uploader.RtmpUploader, goog.events.EventTarget);


/**
  * The logger used by this object.
  *  Rename this to RtmpUploader after launch.
  * @type {goog.log.Logger}
  * @private
  */
apps.uploader.RtmpUploader.prototype.logger_ =
    goog.log.getLogger('apps.uploader.Uploader');


/**
 * Event types fired by the RtmpUploader.
 * @enum {string}
 */
apps.uploader.RtmpUploader.EventType = {
  /**
   * Fired when the RTMP session has been created successfully or failed,
   * or when an RTMP query comes back or failed.
   * Event type: {@link apps.uploader.RtmpUploader.RtmpEvent}.
   */
  RTMP_STATUS: 'status'
};


/**
 * A class of events dispatched by the RTMP uploader.
 * @param {boolean} isSuccess True if the RTMP session is successful.
 * @param {string=} opt_url The RTMP url.
 * @param {string=} opt_uploadId The Scotty upload id.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.RtmpUploader.RtmpEvent = function(isSuccess, opt_url,
                                                opt_uploadId) {
  goog.events.Event.call(this,
                         apps.uploader.RtmpUploader.EventType.RTMP_STATUS,
                         this);

  /**
   * True if the RTMP session status is successful. False if the status is not
   * successful or an error occured while querying the status.
   * @type {boolean}
   */
  this.isSuccess = isSuccess;

  /**
   * The RTMP url.
   * @type {string|undefined}
   */
  this.url = opt_url;


  /**
   * The scotty upload Id.
   * @type {string|undefined}
   */
  this.uploadId = opt_uploadId;
};
goog.inherits(apps.uploader.RtmpUploader.RtmpEvent, goog.events.Event);


/**
 * Sets the create session request url.
 * @param {string} url The url to send the create session request to.
 */
apps.uploader.RtmpUploader.prototype.setSessionServerUrl = function(url) {
  this.startUrl_ = url;
};


/**
 * @return {string|undefined} The URL that the RTMP requests are sent to.
 *   Will be undefined until the create session response is read.
 */
apps.uploader.RtmpUploader.prototype.getRtmpUrl = function() {
  return this.rtmpUrl_;
};


/**
 * @return {Object|undefined} The finalization data.
 */
apps.uploader.RtmpUploader.prototype.getFinalizationData = function() {
  return this.finalizationData_;
};


/**
 * Sets the extra HTTP headers to be sent with upload requests.
 * @param {!Object} extraHeaders The headers map.
 */
apps.uploader.RtmpUploader.prototype.setExtraHeaders = function(extraHeaders) {
  this.extraHeaders_ = extraHeaders;
};


/**
 * Creates a new RTMP Rupio session.
 * @param {string} filename The filename to use in the create session request.
 *     Should end with ".flv" for the content type from extension to be correct.
 * @param {goog.structs.Map.<string,string>=} opt_metadata The metadata to
 *     include in the create session request.
 */
apps.uploader.RtmpUploader.prototype.startRtmpUpload =
    function(filename, opt_metadata) {
  // Create the XHR object.
  var xhr = new goog.net.XhrIo();
  xhr.setWithCredentials(true);
  this.eventHandler_.
      listen(xhr, goog.net.EventType.SUCCESS, this.handleStartSuccess_).
      listen(xhr, goog.net.EventType.ERROR, this.handleStartError_);

  // Create the request.
  var request = {
    'protocolVersion': apps.uploader.Session.PROTOCOL_VERSION,
    'createSessionRequest': {
      'fields': [{
        'external': {
          'name': 'file',
          'filename': filename
        }
      }]
    }
  };
  request['createSessionRequest']['fields'][0]['external'][this.rtmp_] = {};

  // Add metadata to the request.
  if (opt_metadata) {
    apps.uploader.Session.addMetadata(request, opt_metadata);
  }

  // Create the request headers.
  var requestHeaders = {};
  goog.object.extend(requestHeaders, this.extraHeaders_);
  goog.object.extend(requestHeaders,
      apps.uploader.Session.createSessionHeaders('scotty ' + this.rtmp_));

  // Send the request.
  var requestJson = goog.json.serialize(request);
  goog.log.fine(this.logger_,
      'Sending ' + this.rtmp_ + ' create session request to: ' +
                    this.startUrl_ + '\n' + requestJson);
  xhr.send(this.startUrl_, 'POST', requestJson, requestHeaders);
};


/**
 * Called when the create session request is successful.
 * @param {goog.events.Event} event The {@link goog.net.EventType.SUCCESS}
 *     event.
 * @private
 */
apps.uploader.RtmpUploader.prototype.handleStartSuccess_ = function(event) {
  try {
    var response = event.target.getResponseText();
    goog.log.fine(this.logger_,
        'Got ' + this.rtmp_ + ' create session response:\n' +
                      response);
    var json = goog.json.unsafeParse(response);
    if (json['sessionStatus'] != undefined) {
      var status = json['sessionStatus'];
      var rtmpInfo = status['externalFieldTransfers'][0][this.rtmp_ + 'Info'];
      this.queryUrl_ = rtmpInfo['http_url'];
      this.rtmpUrl_ = rtmpInfo[this.rtmp_ + '_url'];
      this.dispatchEvent(new apps.uploader.RtmpUploader.RtmpEvent(
          true, this.rtmpUrl_, status['upload_id']));
    } else {
      this.handleStartError_();
    }
  } catch (e) {
    this.handleStartError_();
  }
};


/**
 * Called when an error occurs during the create session request.
 * @private
 */
apps.uploader.RtmpUploader.prototype.handleStartError_ = function() {
  this.dispatchEvent(new apps.uploader.RtmpUploader.RtmpEvent(false));
};


/**
 * Queries the RTMP session.
 * @throws {Error} if the query URL is undefined.
 */
apps.uploader.RtmpUploader.prototype.queryRtmpUpload = function() {
  if (!this.queryUrl_) {
    throw Error('Query URL is undefined.');
  }

  // Create the XHR object.
  var xhr = new goog.net.XhrIo();
  this.eventHandler_.
      listen(xhr, goog.net.EventType.SUCCESS, this.handleQuerySuccess_).
      listen(xhr, goog.net.EventType.ERROR, this.handleQueryError_);

  // Send the request.
  goog.log.fine(this.logger_, 'Sending ' + this.rtmp_ + ' query request to: ' +
                    this.queryUrl_);
  xhr.send(this.queryUrl_, 'GET');
};


/**
 * Called when the query session request is successful.
 * @param {goog.events.Event} event The {@link goog.net.EventType.SUCCESS}
 *     event.
 * @private
 */
apps.uploader.RtmpUploader.prototype.handleQuerySuccess_ = function(event) {
  try {
    var response = event.target.getResponseText();
    goog.log.fine(this.logger_,
        'Got ' + this.rtmp_ + ' query response:\n' + response);
    var json = goog.json.unsafeParse(response);
    if (json['sessionStatus'] != undefined) {
      // Try to read the customer specific finalization data.
      try {
        this.finalizationData_ = json['sessionStatus']['additionalInfo'][
            'uploader_service.GoogleRupioAdditionalInfo']['completionInfo'][
            'customerSpecificInfo'];
      } catch (e) {
        // Ignore this error as the finalization data may not have been set.
      }
      this.dispatchEvent(new apps.uploader.RtmpUploader.RtmpEvent(true));
    } else {
      this.handleQueryError_();
    }
  } catch (e) {
    this.handleQueryError_();
  }
};


/**
 * Called when an error occurs during the query session request.
 * @private
 */
apps.uploader.RtmpUploader.prototype.handleQueryError_ = function() {
  this.dispatchEvent(new apps.uploader.RtmpUploader.RtmpEvent(false));
};


/** @inheritDoc */
apps.uploader.RtmpUploader.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
};
