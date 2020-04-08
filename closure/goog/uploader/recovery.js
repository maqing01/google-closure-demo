

/**
 * @fileoverview Upload recovery support.
 * @author azzie@google.com (Marcin Marszalek)
 */

goog.provide('apps.uploader.Recovery');
goog.provide('apps.uploader.Recovery.EventType');

goog.require('apps.uploader.FileInfo2');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.fs');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.XhrIo');
goog.require('goog.uri.utils');



/**
 * A recovery session.
 * @param {apps.uploader.FileInfo2} fileInfo File to be recovered.
 * @param {string} sessionUrl The session URL.
 * @param {number=} opt_lastTime Time of the last upload attempt.
 * @extends {goog.events.EventTarget}
 * @constructor
 */
apps.uploader.Recovery = function(fileInfo, sessionUrl, opt_lastTime) {
  goog.events.EventTarget.call(this);

  /**
   * File to be recovered.
   * @type {apps.uploader.File}
   * @private
   */
  this.file_ = fileInfo.file;

  /**
   * File I/O mechanism.
   * @type {apps.uploader.net.FileIo}
   * @private
   */
  this.fileIo_ = fileInfo.fileIo;

  /**
   * The session URL.
   * @type {string}
   * @private
   */
  this.sessionUrl_ = sessionUrl;

  /**
   * Time of the last upload attempt.
   * @type {?number}
   * @private
   */
  this.lastTime_ = opt_lastTime || null;

  /**
   * The partial MD5 hash of the remote content.
   * @type {?string}
   * @private
   */
  this.remoteMd5_ = null;

  /**
   * First byte of the remote content (zero-based index).
   * @type {?number}
   * @private
   */
  this.remoteRangeStart_ = null;

  /**
   * One after the last byte of the remote content (zero-based index).
   * @type {?number}
   * @private
   */
  this.remoteRangeEnd_ = null;

  /**
   * The partial MD5 hash of the local content.
   * @type {?string}
   * @private
   */
  this.localMd5_ = null;

  /**
   * Whether we are currently recovering a file.
   * @type boolean
   * @private
   */
  this.recovering_ = false;

  /**
   * Whether the upload session was successfully recovered.
   * @type boolean
   * @private
   */
  this.recovered_ = false;

  /**
   * The logger used by this object.
   * @type {goog.log.Logger}
   * @protected
   */
  this.logger = goog.log.getLogger('apps.uploader.Recovery');
};
goog.inherits(apps.uploader.Recovery, goog.events.EventTarget);


/**
 * Events dispatched by recovery.
 * @enum {string}
 */
apps.uploader.Recovery.EventType = {
  /** The recovery was started and the upload service is being queried. */
  QUERYING: goog.events.getUniqueId('querying'),
  /** The query has succeeded and the file content is being hashed. */
  HASHING: goog.events.getUniqueId('hashing'),
  /** The hashing has succeeded, file information has been set
      and the upload can be resumed. */
  SUCCESS: goog.events.getUniqueId('success'),
  /** The query has failed, the URL is not recognized as resumable,
      the upload can be started normally. */
  ERROR_QUERYING: goog.events.getUniqueId('error_querying'),
  /** The hashing has failed, there was a hash mismatch,
      the upload can be started normally. */
  ERROR_HASHING: goog.events.getUniqueId('error_hashing'),
  /** The user has canceled the upload. */
  CANCELED: goog.events.getUniqueId('canceled')
};


/**
 * Starts the recovery process.
 */
apps.uploader.Recovery.prototype.start = function() {
  if (this.recovering_) {
    goog.log.error(this.logger, 'A recovery process is already running');
    return;
  }
  this.recovering_ = true;
  var xhr = new goog.net.XhrIo();
  goog.events.listen(xhr, goog.net.EventType.COMPLETE, goog.bind(function() {
    if (!this.recovering_) {
      // Cancelled.
      return;
    }
    if (xhr.getStatus() == 308) {
      var remoteRange = xhr.getResponseHeader('Range');
      this.remoteMd5_ = xhr.getResponseHeader('X-Range-MD5') || null;
      //  Ideally, we would have all the information in headers
      // and would not need all this hacky parsing.
      var response = xhr.getResponseText();
      var status = null;
      var info = null;
      try {
        var json = goog.json.unsafeParse(response);
        status = json['sessionStatus'];
        info = status['externalFieldTransfers'][0]['formPostInfo'] ||
               status['externalFieldTransfers'][0]['putInfo'];
      } catch (e) {
        // Invalid response, ignore. Error will be reported below.
      }
      if (remoteRange && this.remoteMd5_ && status && info) {
        var parsedRemoteRange = /^bytes=(\d+)-(\d+)$/.exec(remoteRange);
        if (parsedRemoteRange) {
          this.remoteRangeStart_ = Number(parsedRemoteRange[1]);
          this.remoteRangeEnd_ = Number(parsedRemoteRange[2]) + 1;
          //  One could check the total file size as well.
          if (this.remoteRangeStart_ == 0 && this.remoteRangeEnd_ > 0) {
            this.fileIo_.computeMd5(
                this.remoteRangeEnd_, goog.bind(function(hash) {
              if (!this.recovering_) {
                // Cancelled.
                return;
              }
              this.localMd5_ = hash;
              if (this.localMd5_ == this.remoteMd5_) {
                //  Refactor, so there is no code duplication
                // or inconsistency between this and status parsing in
                // session.js.
                this.file_.setSessionUrl(info['url'] || this.sessionUrl_);
                this.file_.setCrossDomainUrl(info['cross_domain_url']);
                this.file_.setBytesTransferred(
                    /** @type {number} */ (this.remoteRangeEnd_));
                this.file_.setUploadId(status['upload_id'] ||
                    goog.uri.utils.getParamValue(this.sessionUrl_,
                                                 'upload_id'));
                this.file_.setCorrelationId(status['correlation_id']);
                this.recovered_ = true;
                this.recovering_ = false;
                this.dispatchEvent(apps.uploader.Recovery.EventType.SUCCESS);
                // Done, the caller should resume the recovered upload.
                return;
              }
              this.recovering_ = false;
              goog.log.info(this.logger,
                  'Hash mismatch, local: ' + this.localMd5_ +
                  ', remote: ' + this.remoteMd5_);
              this.dispatchEvent(
                  apps.uploader.Recovery.EventType.ERROR_HASHING);
            }, this));
            this.dispatchEvent(apps.uploader.Recovery.EventType.HASHING);
            // Done, wait for the hashing to finish.
            return;
          }
        }
      }
    }
    this.recovering_ = false;
    goog.log.info(this.logger, 'Query error, status: ' + xhr.getStatus());
    this.dispatchEvent(apps.uploader.Recovery.EventType.ERROR_QUERYING);
  }, this));
  xhr.send(this.sessionUrl_, 'POST', '', {
    'X-HTTP-Method-Override': 'PUT',
    'Content-Range': 'bytes */' + this.file_.getBytesTotal()
  });
  this.dispatchEvent(apps.uploader.Recovery.EventType.QUERYING);
};


/**
 * Cancels the recovery process.
 */
apps.uploader.Recovery.prototype.cancel = function() {
  this.recovering_ = false;
  this.dispatchEvent(apps.uploader.Recovery.EventType.CANCELED);
};


/**
 * @return {string} The recovery session URL.
 */
apps.uploader.Recovery.prototype.getSessionUrl = function() {
  return this.sessionUrl_;
};


/**
 * @return {?number} Time of the last upload attempt.
 */
apps.uploader.Recovery.prototype.getLastTime = function() {
  return this.lastTime_;
};


/**
 * @return {?number} Length of the remote partial content or null if not known.
 */
apps.uploader.Recovery.prototype.getRemoteLength = function() {
  return this.remoteRangeEnd_;
};


/**
 * @return {?string} Remote partial MD5 content hash or null if not available.
 */
apps.uploader.Recovery.prototype.getRemoteMd5 = function() {
  return this.remoteMd5_;
};


/**
 * @return {?string} Local partial MD5 content hash or null if not available.
 */
apps.uploader.Recovery.prototype.getLocalMd5 = function() {
  return this.localMd5_;
};


/**
 * @return {boolean} True if the upload session was recovered successfully.
 */
apps.uploader.Recovery.prototype.isRecovered = function() {
  return this.recovered_;
};
