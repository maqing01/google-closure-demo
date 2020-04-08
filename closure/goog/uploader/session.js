goog.provide('apps.uploader.Session');
goog.provide('apps.uploader.Session.EventType');
goog.provide('apps.uploader.Session.FinalizationStatus');
goog.provide('apps.uploader.Session.State');
goog.provide('apps.uploader.Session.TransferMechanism');
goog.provide('apps.uploader.SessionEvent');

goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.Version');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.dispose');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.object');
goog.require('goog.structs');



/**
 * An upload session for a single file.
 * @param {apps.uploader.File} file The file to be uploaded in this session.
 * @param {apps.uploader.Session.TransferMechanism} transferMechanism for the
 * session.
 * @extends {goog.events.EventTarget}
 * @constructor
 */
apps.uploader.Session = function(file, transferMechanism) {
  goog.events.EventTarget.call(this);

  /**
   * File to be uploaded in this session.
   * @type apps.uploader.File
   * @private
   */
  this.file_ = file;

  /**
   * Session state.
   * @type apps.uploader.Session.State
   * @private
   */
  this.state_ = apps.uploader.Session.State.INITIALIZING;

  /**
   * Status of the session finalization. Null if unknown.
   * @type {apps.uploader.Session.FinalizationStatus?}
   * @private
   */
  this.finalizationStatus_ = null;

  /**
   * Custom data of the session finalization.
   * @type {Object}
   * @private
   */
  this.finalizationData_ = null;

  /**
   * Client ID (aka upload mechanism) to be reported to the server.
   * @type string?
   * @private
   */
  this.clientId_ = null;

  /**
   * Indicates the transfer mechanism of the file uploads.
   * @type {apps.uploader.Session.TransferMechanism}
   * @private
   */
  this.transferMechanism_ = transferMechanism;

  /**
   * Event handler for this session.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(apps.uploader.Session, goog.events.EventTarget);


/**
 * Transfer mechanisms.
 * @enum {number}
 */
apps.uploader.Session.TransferMechanism = {
  FORM_POST: 0,
  PUT: 1,
  RTMP: 2
};


/**
 * Events dispatched by sessions.
 * @enum {string}
 */
apps.uploader.Session.EventType = {
  /** The session was successfully created on the server. */
  START_SUCCESS: 'startsuccess',
  /** There was an error creating the session on the server. */
  START_ERROR: 'starterror'
};


/**
 * State of upload session. This consists of states mentioned in Rupio
 * specification, plus a client-specific "initializing" state. Note to future
 * maintainers: the values of this enumeration serve as values of sessionState
 * column of File table in local Gears database, so be careful when modifying
 * them.
 * @enum {string}
 */
apps.uploader.Session.State = {
  /** The session is created, but the server has not acknowledged it yet. */
  INITIALIZING: 'INITIALIZING',
  /** The session is open on the server side. */
  OPEN: 'OPEN',
  /** An error occurred, session broken. Nothing can be done to save it. */
  FAILED: 'FAILED',
  /** The session is finalized. The finalization still could failed, though. */
  FINALIZED: 'FINALIZED'
};


/**
 * Possible status values of the session finalization. Note to future
 * maintainers: the values of this enumeration serve as values of
 * sessionFinalizationStatus column of File table in local Gears database, so be
 * careful when modifying them.
 * @enum {string}
 */
apps.uploader.Session.FinalizationStatus = {
  /** The session finalized successfully. */
  SUCCESS: 'SUCCESS',
  /** The session failed to finalize. */
  FAILURE: 'FAILURE',
  /** The upload was rejected by the upload agent. */
  REJECTED: 'REJECTED',
  /**
   * The upload was received but the upload agent could not be contacted.
   * The processing pipeline will attempt to contact the upload agent again
   * in the future.  This status code is somewhat ambiguous; it is neither
   * a full success nor a full failure.
   */
  QUEUED: 'QUEUED'
};


/**
 * Names of extra headers to send.
 * @enum {string}
 * @private
 */
apps.uploader.Session.Headers_ = {
  CLIENT_INFO: 'X-Client-Info'
};


/**
 * Keys for the CLIENT_INFO header (whose value is a semicolon separated list
 * of key=value pairs).
 * @enum {string}
 * @private
 */
apps.uploader.Session.ClientInfoKey_ = {
  MECHANISM: 'mechanism',
  CLIENT_VERSION: 'clientVersion'
};


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.Session.prototype.logger_ =
    goog.log.getLogger('apps.uploader.Session');


/**
 * RUPIO protocol version reported to the server.
 * @type {string}
 */
apps.uploader.Session.PROTOCOL_VERSION = '0.8';


/**
 * Whether to strip hosts from URLs and post data to a relative URL.
 * @type {boolean}
 * @private
 */
apps.uploader.Session.prototype.useRelativeUrls_ = false;


/**
 * Returns the file uploaded in this session.
 * @return {apps.uploader.File} The file.
 */
apps.uploader.Session.prototype.getFile = function() {
  return this.file_;
};


/**
 * Sets session's state.
 * @param {apps.uploader.Session.State} state New session state.
 */
apps.uploader.Session.prototype.setState = function(state) {
  this.state_ = state;
};


/**
 * Returns session's state.
 * @return {apps.uploader.Session.State} Session's state.
 */
apps.uploader.Session.prototype.getState = function() {
  return this.state_;
};


/**
 * Sets the status of session finalization.
 * @param {?apps.uploader.Session.FinalizationStatus} status The new status, or
 *     null if finalization status is unknown.
 */
apps.uploader.Session.prototype.setFinalizationStatus = function(status) {
  this.finalizationStatus_ = status;
};


/**
 * @return {?apps.uploader.Session.FinalizationStatus} Status of the session
 *     finalization, or null if finalization status is unknown.
 */
apps.uploader.Session.prototype.getFinalizationStatus = function() {
  return this.finalizationStatus_;
};


/**
 * Sets custom data provided as part of the session finalization.
 * @param {Object} data The data to be set.
 */
apps.uploader.Session.prototype.setFinalizationData = function(data) {
  this.finalizationData_ = data;
};


/**
 * @return {Object} Custom data provided as part of the session finalization.
 */
apps.uploader.Session.prototype.getFinalizationData = function() {
  return this.finalizationData_;
};


/**
 * Sets the client ID (aka upload mechanism) to be reported to the upload
 *     server.
 * @param {string?} id The new client ID.
 */
apps.uploader.Session.prototype.setClientId = function(id) {
  this.clientId_ = id;
};


/**
 * @return {string?} The client ID (aka upload mechanism) to be reported to the
 *     upload server.
 */
apps.uploader.Session.prototype.getClientId = function() {
  return this.clientId_;
};


/**
 * Whether to strip the scheme and host from Rupio URLs so that all POSTs are
 * made relatively to the page we're rendered on.
 * @param {boolean} value True, if schemes and hosts should be stripped.
 */
apps.uploader.Session.prototype.setUseRelativeUrls = function(value) {
  this.useRelativeUrls_ = value;
};


/**
 * Attempts to create a server-side session and retrieve upload information
 * for the file in this session.
 * @param {string} sessionServerUrl The URL used to manage sessions on a server.
 */
apps.uploader.Session.prototype.start = function(sessionServerUrl) {
  var xhr = this.createAndSetupXhr(goog.bind(this.handleStartSuccess, this),
                                   goog.bind(this.handleStartError, this));
  var request = this.createSessionRequest_();
  // Attempt to send the request
  try {
    // Add client info header.
    var extraHeaders = {};
    goog.object.extend(extraHeaders, this.getFile().getExtraHeaders());
    goog.object.extend(extraHeaders,
        apps.uploader.Session.createSessionHeaders(this.clientId_));

    var requestJson = goog.json.serialize(request);
    goog.log.fine(this.logger_, 'Sending create session request to: ' +
                      sessionServerUrl + '\n' + requestJson);
    xhr.send(sessionServerUrl, 'POST', requestJson, extraHeaders);
  } catch (e) {
    goog.log.error(this.logger_, 'Failed to send create session request', e);
    throw e;
  }
};


/**
 * @param {string?} clientId The client id (upload mechanism) to report.
 * @return {!Object} the headers to send in the create session request.
 */
apps.uploader.Session.createSessionHeaders = function(clientId) {
  var headers = {};
  headers[apps.uploader.Session.Headers_.CLIENT_INFO] =
      apps.uploader.Session.ClientInfoKey_.MECHANISM + '=' + clientId + '; ' +
      apps.uploader.Session.ClientInfoKey_.CLIENT_VERSION + '=' +
      apps.uploader.Version.CLIENT_VERSION;
  return headers;
};


/**
 * Creates and setups a XHR object.
 * @param {function(goog.events.Event)} successHandler Function to be called
 *     upon success; the success event will be passed as a parameter to it.
 * @param {function(goog.events.Event)} errorHandler Function to be called upon
 *     failure; the failure event will be passed as a parameter to it.
 * @return {!goog.net.XhrIo} The xhr object.
 */
apps.uploader.Session.prototype.createAndSetupXhr = function(successHandler,
                                                             errorHandler) {
  var xhr = new goog.net.XhrIo();
  xhr.setWithCredentials(true);
  this.eventHandler_.
      listen(xhr, goog.net.EventType.SUCCESS, successHandler).
      listen(xhr, goog.net.EventType.ERROR, errorHandler);
  return xhr;
};


/**
 * Handles session creation response successfully received from server.
 * @param {goog.events.Event} event The {@link goog.net.EventType.SUCCESS}
 *     event.
 * @protected
 */
apps.uploader.Session.prototype.handleStartSuccess = function(event) {
  try {
    var response = event.target.getResponseText();
    goog.log.fine(this.logger_, 'Got create session response:\n' + response);
    var json = goog.json.unsafeParse(response);
    // Success.
    var status = {};

    json['sessionStatus'] = status;
    if (json['sessionStatus'] != undefined) {
      var status = json['sessionStatus'];
      var infoMember;
      var TransferMechanism = apps.uploader.Session.TransferMechanism;
      switch (this.transferMechanism_) {
        case TransferMechanism.FORM_POST:
          infoMember = 'formPostInfo';
          break;
        case TransferMechanism.PUT:
          infoMember = 'putInfo';
          break;
        default:
          infoMember = 'formPostInfo';
          break;
      }
      //this.setState(status['state']);
      //var correlationId = status['correlation_id'];
      //var dropZoneLabel = status['drop_zone_label'];

//      var externalField = status['externalFieldTransfers'][0];
//      var url = externalField[infoMember]['url'];
//      if (this.useRelativeUrls_) {
//        url = goog.Uri.parse(url).setScheme('').setDomain('').toString();
//      }
//      var cross_domain_url = externalField[infoMember]['cross_domain_url'];
//      var contentType = externalField['content_type'];

      var file = this.getFile();
      var containingId = json['containing_id'];
      var path = json['upload_path'];
      //file.setSessionUrl('/d/import/upload/' + containingId);
      file.setSessionUrl(path + containingId);
//      file.setCrossDomainUrl(cross_domain_url);
//      file.setUploadId(uploadId);
      //file.setCorrelationId(correlationId);
//      file.setContentType(contentType);
//      file.setDropZoneLabel(dropZoneLabel);
//      file.setStatsUrl(event.target.getResponseHeader('X-GUploader-Stats-URL'));
//      file.setIntermediateResponseHeaders(event.target.getAllResponseHeaders());

      this.dispatchEvent(apps.uploader.Session.EventType.START_SUCCESS,
          /** @type {goog.net.XhrIo} */(event.target));
    // Rejection.
    } else if (json['errorMessage'] != undefined) {
      var error = json['errorMessage'];
      var uploadId = error['upload_id'];
      var file = this.getFile();
      file.setUploadId(uploadId);
      this.setAdditionalInfo_(error);
      this.handleStartError(event,
                            apps.uploader.ErrorCode.SERVER_REJECTED);
    // Invalid JSON response.
    } else {
      this.handleStartError(event,
          apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE);
    }
  // Probably invalid JSON response.
  } catch (e) {
    goog.log.warning(this.logger_,
        'Invalid response to the create session request', e);
    this.handleStartError(event,
                          apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE);
  }
};


/**
 * Processes finalization response body that should come from the upload request
 * itself (out of scope of session management requests). Updates session state
 * and finalization status accordingly.
 * @param {string} response The response body to be processed.
 */
apps.uploader.Session.prototype.processFinalizationResponse =
    function(response) {
  var json = goog.json.unsafeParse(response);
  // Success.
  if (json['sessionStatus'] != undefined) {
    this.setState(json['sessionStatus']['state']);
    this.setAdditionalInfo_(json['sessionStatus']);
  // Error.
  } else if (json['errorMessage'] != undefined) {
    this.setState(apps.uploader.Session.State.FAILED);
    this.setAdditionalInfo_(json['errorMessage']);
  }
};


/**
 * Sets the finalizationStatus_ and finalizationData_ from the given JSON
 * object.
 * @param {Object} json Object containing additional info field.
 * @private
 */
apps.uploader.Session.prototype.setAdditionalInfo_ = function(json) {
  this.finalizationStatus_ = json['status'];
  this.finalizationData_ = json['additionalData'];
};


/**
 * Handles errors related to session creation.
 * @param {goog.events.Event} event The {@link goog.net.EventType.ERROR}
 *     event.
 * @param {apps.uploader.ErrorCode} opt_errorCode The error code.
 * @param {string} opt_errorMessage The error message.
 * @protected
 */
apps.uploader.Session.prototype.handleStartError = function(event,
    opt_errorCode, opt_errorMessage) {
  this.setState(apps.uploader.Session.State.FAILED);
  if (!opt_errorCode) {
    opt_errorCode = apps.uploader.ErrorCode.mapErrorCode(
        event.target.getLastErrorCode());
    opt_errorMessage = event.target.getLastError();
  }
  this.file_.setError(opt_errorCode, opt_errorMessage);
  this.dispatchEvent(apps.uploader.Session.EventType.START_ERROR,
      /** @type {goog.net.XhrIo} */(event.target));
};


/**
 * Dispatches an event (or event like object).
 * @param {string|Object|goog.events.Event} e Event object.
 * @param {goog.net.XhrIo} opt_request The associated xhr request.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false this will also return false.
 * @override
 */
apps.uploader.Session.prototype.dispatchEvent = function(e, opt_request) {
  if (goog.isString(e)) {
    e = new apps.uploader.SessionEvent(e, this, opt_request);
  } else {
    e.request = opt_request;
  }
  try {
    return apps.uploader.Session.superClass_.dispatchEvent.call(this, e);
  } catch (ex) {
    goog.log.error(this.logger_, 'Event listener threw exception.', ex);
  }
};


/**
 * Creates the JSON session request object for the current session.
 * @return {!Object} The JSON request object.
 * @private
 */
apps.uploader.Session.prototype.createSessionRequest_ = function() {
    var request = {
      'protocolVersion': apps.uploader.Session.PROTOCOL_VERSION,
      'createSessionRequest': {
        'fields': []
      }
    };

    // Put information about the file into the message.
    this.requestFileHelper_(request, this.getFile());

    return request;
};


/**
 * A helper method used for creating the JSON session request object. This
 * method adds external and internal meta data fields to the request.
 * @param {Object} request The request object being created.
 * @param {apps.uploader.File} file The file to be added to the request object.
 * @private
 */
apps.uploader.Session.prototype.requestFileHelper_ = function(request, file) {
  this.requestExternalFieldHelper_(request['createSessionRequest'], file);
  // Add internal field meta data
  apps.uploader.Session.addMetadata(request, file.getMetaData());
};


/**
 * A helper method used for creating the JSON session request object. This
 * method adds an external field for the given file to the request.
 * @param {Object} request The request object being created.
 * @param {apps.uploader.File} file The file to be added to the request object.
 * @private
 */
apps.uploader.Session.prototype.requestExternalFieldHelper_ = function(request,
                                                                       file) {
  // Add external field data
  var field = {'external': {
                 'name': 'file',
                 'filename': file.getBaseName()}};
  var method;
  var TransferMechanism = apps.uploader.Session.TransferMechanism;
  switch (this.transferMechanism_) {
    case TransferMechanism.FORM_POST:
      method = 'formPost';
      break;
    case TransferMechanism.PUT:
      method = 'put';
      break;
    default:
      method = 'formPost';
      break;
  }

  field['external'][method] = {};
  var size = file.getBytesTotal();
  if (size != null && !file.isBytesTotalAnEstimate()) {
    field['external']['size'] = size;
  }
  request['fields'].push(field);
};


/**
 * A helper method used for creating the JSON session request object. This
 * method adds metadata to the request as internal fields.
 * @param {Object} request The request object being created.
 * @param {goog.structs.Map.<string,string>} metadata The metadata being added.
 */
apps.uploader.Session.addMetadata = function(request, metadata) {
  goog.structs.forEach(
      metadata,
      function(value, key) {
        request['createSessionRequest']['fields'].push({
            'inlined': {
               'name': key,
               'content': value,
               'contentType': 'text/plain'
            }
        });
      });
};


/**
 * Overrides the built-in {@code toString} method for debugging.
 * @return {string} The string representation of a session object.
 * @override
 */
apps.uploader.Session.prototype.toString = function() {
  return 'Session(state:' + this.getState() + ')';
};


/** @override */
apps.uploader.Session.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
};


/**
 * @param {string} type The event type.
 * @param {Object} opt_target Reference to the object that is the target of
 *     this event.
 * @param {Object|goog.net.XhrIo} opt_request The request object
 *     that triggered the event.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.SessionEvent = function(type,
                                      opt_target,
                                      opt_request) {
  goog.events.Event.call(this, type, opt_target);

  /**
   * The request associated with the event.
   * @type {Object|goog.net.XhrIo}
   */
  this.request = opt_request || null;
};
goog.inherits(apps.uploader.SessionEvent, goog.events.Event);
