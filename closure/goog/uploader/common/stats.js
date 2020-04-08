
/**
 * @fileoverview Collects, stores, and reports stats about file uploads.
 */

goog.provide('apps.uploader.common.Stats');
goog.provide('apps.uploader.common.Stats.EventType');

goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');
goog.require('goog.json');
goog.require('goog.log');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.object');
goog.require('goog.storage.Storage');
goog.require('goog.storage.mechanism.mechanismfactory');



/**
 * Collects, stores, and reports stats about file uploads.
 * @param {string} clientVersion The client version string to report.
 * @constructor
 * @extends {goog.Disposable}
 */
apps.uploader.common.Stats = function(clientVersion) {
  /**
   * The client version string to report.
   * @type {string}
   * @private
   */
  this.clientVersion_ = clientVersion;

  /**
   * Collected data to be reported to the server. If a stats request is
   * currently in flight, this only contains the new data collected since the
   * request was made.
   * A map from report url to a map of upload id to UploadData objects.
   * @type {Object}
   * @private
   */
  this.data_ = {};

  /**
   * Collected data that is currently in flight to the server. Will be empty
   * if there is no stats request currently in flight.
   * A map from report url to a map of upload id to UploadData objects
   * @type {Object}
   * @private
   */
  this.pendingData_ = {};

  /**
   * Local storage for stats data.
   * @type {goog.storage.Storage?}
   * @private
   */
  this.dataStorage_ = null;

  /**
   * Event handler for this class.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler();
  this.registerDisposable(this.eventHandler_);

  // Initialize persistent storage.
  var mechanism = goog.storage.mechanism.mechanismfactory.create(
      apps.uploader.common.Stats.STORAGE_NAMESPACE);
  if (mechanism) {
    this.dataStorage_ = new goog.storage.Storage(mechanism);
    this.recover();
  }
};
goog.inherits(apps.uploader.common.Stats, goog.Disposable);


/**
 * Types of events that can occur during file upload that we want to report.
 * @enum {string}
 */
apps.uploader.common.Stats.EventType = {
  /** File selected by user. Should be the first event for HTTP uploads. */
  SELECT: 'select',
  /** Upload has started. Should be the second event for HTTP uploads. */
  START: 'start',
  /** Progress has been made. May occur multiple times per file. */
  PROGRESS: 'progress',
  /** An error occured. May occur multiple times per file. */
  ERROR: 'error',
  /** File successfully uploaded. No more events should follow. */
  SUCCESS: 'success',
  /** Upload was cancelled by user. No more events should follow. */
  CANCEL: 'cancel',
  /** Upload was cancelled due to page unload. No more events should follow. */
  UNLOAD: 'unload',

  /** Upload was marked for finalization by user. */
  WEBCAM_FINALIZE: 'webcam_finalize',
  /** Webcam recording has started. */
  WEBCAM_START_RECORD: 'webcam_start_record',
  /** Webcam recording has ended. */
  WEBCAM_STOP_RECORD: 'webcam_stop_record',
  /** Webcam playback has started. */
  WEBCAM_START_PLAY: 'webcam_start_play',
  /** Webcam playback was stopped. */
  WEBCAM_STOP_PLAY: 'webcam_stop_play',
  /** Webcam saw a fatal error, e.g., flash crash. */
  WEBCAM_FATAL_ERROR: 'webcam_fatal_error'
};


/**
 * Class to hold upload events and related uploads for a single upload.
 * @constructor
 * @private
 */
apps.uploader.common.Stats.UploadData_ = function() {

  /**
   * A list of all events that occurred for a single upload.
   * @type {!Array.<Object>}
   */
  this.uploadEvents = [];

  /**
   * @type {Object}
   */
  this.relatedUploads = null;
};


/**
 * @type {string}
 */
apps.uploader.common.Stats.STORAGE_NAMESPACE = 'upload';


/**
 * @type {string}
 */
apps.uploader.common.Stats.STORAGE_KEY = 'stats';


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.common.Stats.prototype.logger_ =
    goog.log.getLogger('apps.uploader.common.Stats');


/**
 * Collects data about an event that occurred on a file.
 * @param {string?} reportUrl The url to report the stats to.
 * @param {string?} uploadId The upload id of the file.
 * @param {apps.uploader.common.Stats.EventType} type The type of event.
 * @param {string=} opt_message An optional message with details about what
 *     happened to the file.
 * @param {number=} opt_timestamp The time that the event occured in
 *     milliseconds past epoch.
 */
apps.uploader.common.Stats.prototype.collect = function(reportUrl, uploadId,
     type, opt_message, opt_timestamp) {
  if (!reportUrl || !uploadId) {
    return;
  }

  var timestamp = opt_timestamp || goog.now();
  goog.log.info(this.logger_, 'Collect: ' + uploadId + ', ' + type + ', ' +
      opt_message + ', ' + timestamp);

  var event = {
    'time': timestamp,
    'type': type
  };
  if (opt_message) {
    event['details'] = opt_message;
  }

  if (!this.data_[reportUrl]) {
    this.data_[reportUrl] = {};
  }

  if (!this.data_[reportUrl][uploadId]) {
    this.data_[reportUrl][uploadId] =
        new apps.uploader.common.Stats.UploadData_();
  }

  this.data_[reportUrl][uploadId].uploadEvents.push(event);
};


/**
 * Collects data about uploads that are in the same session.
 * @param {string?} reportUrl The url to report the stats to.
 * @param {Array.<string>} uploadIds The related upload ids.
 * @param {number=} opt_latency The time it took in milliseconds to upload
 *     all the files in the session.
 * @param {number=} opt_totalSize The total size in bytes of all files in
 *     the session.
 */
apps.uploader.common.Stats.prototype.groupUploads = function(reportUrl,
    uploadIds, opt_latency, opt_totalSize) {
  if (!uploadIds || uploadIds.length <= 1) {
    return;
  }

  var groupId = uploadIds[0];
  goog.log.info(this.logger_, 'Grouped uploads with group id: ' + groupId);

  var relatedUploads = {
    'upload_id': uploadIds
  };

  if (opt_latency) {
    relatedUploads['latency_ms'] = opt_latency;
  }

  if (opt_totalSize) {
    relatedUploads['total_size'] = opt_totalSize;
  }

  if (!this.data_[reportUrl]) {
    this.data_[reportUrl] = {};
  }

  if (!this.data_[reportUrl][groupId]) {
    this.data_[reportUrl][groupId] =
        new apps.uploader.common.Stats.UploadData_();
  }

  this.data_[reportUrl][groupId].relatedUploads = relatedUploads;
};


/**
 * Reports collected data to the server.
 */
apps.uploader.common.Stats.prototype.report = function() {
  // Check if there is no data to report.
  if (goog.object.isEmpty(this.data_)) {
    return;
  }

  for (var reportUrl in this.data_) {
    if (goog.object.isEmpty(this.data_[reportUrl])) {
      continue;
    }

    var reportJson =
        goog.json.serialize(this.generateReport_(this.data_[reportUrl]));
    goog.log.info(this.logger_, 'Sending stats report:\n' + reportJson);

    this.pendingData_[reportUrl] = this.data_[reportUrl];
    this.data_[reportUrl] = {};
    var request = this.createRequest();
    this.eventHandler_.listen(request,
                              goog.net.EventType.SUCCESS,
                              goog.bind(
                                  this.handleReportSuccess_,
                                  this,
                                  reportUrl));
    this.eventHandler_.listen(request,
                              goog.net.EventType.ERROR,
                              goog.bind(
                                  this.handleReportError_,
                                  this,
                                  reportUrl));
    request.send(reportUrl, 'POST', reportJson);
  }
};


/**
 * Converts a data object into a report object to be sent to the server.
 * @param {Object} data The data object. Keys are upload ids, values are lists
 *     of events.
 * @return {!Object} A new report object. Structure matches the report proto.
 * @private
 */
apps.uploader.common.Stats.prototype.generateReport_ = function(data) {
  var uploadEvents = [];
  var relatedUploads = [];
  for (var uploadId in data) {
    if (data[uploadId].uploadEvents && data[uploadId].uploadEvents.length > 0) {
      uploadEvents.push({
          'upload_id': uploadId,
          'events': data[uploadId].uploadEvents,
          'client_version': this.clientVersion_
      });
    } else {
      // Data is in a malformed state. Do nothing with it.
    }

    if (data[uploadId].relatedUploads) {
      relatedUploads.push(data[uploadId].relatedUploads);
    }
  }

  var report = {};
  if (uploadEvents.length > 0) {
    report['upload_events'] = uploadEvents;
  }
  if (relatedUploads.length > 0) {
    report['related_uploads'] = relatedUploads;
  }
  return report;
};


/**
 * Merges two data objects by copying all the mappings in source into target.
 * If a mapping already exists in target, then the events for that mapping in
 * source are concatenated to the mapping in target.
 * @param {Object} target The data object that will be modified to include the
 *     merged stats.
 * @param {Object} source The data object that will be copied from. It will
 *     remain unchanged.
 * @private
 */
apps.uploader.common.Stats.prototype.mergeStats_ = function(target, source) {
  for (var uploadId in source) {
    if (target[uploadId]) {
      target[uploadId].uploadEvents =
          target[uploadId].uploadEvents.concat(source[uploadId].uploadEvents);
      if (source[uploadId].relatedUploads) {
        // Just overwrite related uploads. Theoretically, they should be the
        // same anyway.
        target[uploadId].relatedUploads = source[uploadId].relatedUploads;
      }
    } else {
      target[uploadId] = source[uploadId];
    }
  }
};


/**
 * Creates a new XHR request object for sending the stats report.
 * Needed for testing.
 * @return {!goog.net.XhrIo} The request object.
 * @protected
 */
apps.uploader.common.Stats.prototype.createRequest = function() {
  return new goog.net.XhrIo();
};


/**
 * Called when a report was successfully sent.
 * @param {string} reportUrl The url to report stats to.
 * @private
 */
apps.uploader.common.Stats.prototype.handleReportSuccess_ = function(
    reportUrl) {
  this.pendingData_[reportUrl] = {};
};


/**
 * Called when an error occurred while sending a report.
 * @param {string} reportUrl The url to report stats to.
 * @private
 */
apps.uploader.common.Stats.prototype.handleReportError_ = function(reportUrl) {
  // Merge new data into old data to maintain the chronological order of events.
  this.mergeStats_(this.pendingData_[reportUrl], this.data_[reportUrl]);
  this.data_[reportUrl] = this.pendingData_[reportUrl];
  this.pendingData_[reportUrl] = {};
};


/**
 * @return {boolean} True if local storage is available.
 */
apps.uploader.common.Stats.prototype.isStorageAvailable = function() {
  return !!this.dataStorage_;
};


/**
 * Backs up data to persistent storage. This may cause some stats to be
 * duplicated, as pending data is being sent to the server as it's being stored.
 */
apps.uploader.common.Stats.prototype.store = function() {
  if (this.isStorageAvailable()) {
    var previousData = null;
    try {
      previousData = (
          /** @type {Object} */
          (this.dataStorage_.get(apps.uploader.common.Stats.STORAGE_KEY)));
    } catch (err) {
      return;
    }

    // Append pending data to previous data.
    if (!previousData) {
      previousData = {};
    }
    for (var reportUrl in this.pendingData_) {
      var uploadEvents = previousData[reportUrl] || {};
      this.mergeStats_(uploadEvents, this.pendingData_[reportUrl]);
      previousData[reportUrl] = uploadEvents;
    }

    // Append current data to previous data.
    for (var reportUrl in this.data_) {
      var uploadEvents = previousData[reportUrl] || {};
      this.mergeStats_(uploadEvents, this.data_[reportUrl]);
      previousData[reportUrl] = uploadEvents;
    }
    this.dataStorage_.set(apps.uploader.common.Stats.STORAGE_KEY, previousData);
    this.pendingData_ = {};
    this.data_ = {};
  }
};


/**
 * Recovers data from persistent storage.
 */
apps.uploader.common.Stats.prototype.recover = function() {
  if (this.isStorageAvailable()) {
    try {
      this.data_ = (
          /** @type {Object} */
          (this.dataStorage_.get(apps.uploader.common.Stats.STORAGE_KEY)));

      this.validateStorage_();

      if (this.data_) {
        // Wipe local storage.
        this.dataStorage_.remove(apps.uploader.common.Stats.STORAGE_KEY);
      } else {
        this.data_ = {};
      }
    } catch (err) {
      // Error while reading from local storage.
      this.data_ = {};
    }
  }
};


/**
 * Validates data to make sure it is the format we expect.
 * @private
 */
apps.uploader.common.Stats.prototype.validateStorage_ = function() {
  if (!this.data_) {
    return;
  }

  // Check to make sure
  if (!(this.data_ instanceof Object)) {
    this.data_ = {};  // Ensure local storage will get wiped.
    return;
  }

  // Data should be reportUrls to a map of uploadIds and UploadDatas.
  for (var reportUrl in this.data_) {
    if (!(this.data_[reportUrl] instanceof Object)) {
      delete this.data_[reportUrl];
      continue;
    }

    var uploadIdMap = this.data_[reportUrl];
    for (var uploadId in uploadIdMap) {
      if (!(uploadIdMap[uploadId].uploadEvents)) {
        delete uploadIdMap[uploadId];
      }
    }
  }
};


/**
 * Clears data in persistent storage.
 * Needed for testing.
 * @protected
 */
apps.uploader.common.Stats.prototype.clear = function() {
  if (this.isStorageAvailable()) {
    this.dataStorage_.set(apps.uploader.common.Stats.STORAGE_KEY, {});
  }
};
