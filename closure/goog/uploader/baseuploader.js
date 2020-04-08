goog.provide('apps.uploader.BaseUploader');

goog.require('apps.uploader.Directory');
goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.FileEvent');
goog.require('apps.uploader.FileInfo2');
goog.require('apps.uploader.FileMessageEvent');
goog.require('apps.uploader.Recovery');
goog.require('apps.uploader.Session');
goog.require('apps.uploader.Version');
goog.require('apps.uploader.common.Stats');
goog.require('apps.uploader.net.EventType');
goog.require('apps.uploader.net.FileIo');
goog.require('goog.array');
goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.log');
goog.require('goog.net.XhrIo');
goog.require('goog.storage.CollectableStorage');
goog.require('goog.storage.EncryptedStorage');
goog.require('goog.storage.ExpiringStorage');
goog.require('goog.storage.RichStorage');
goog.require('goog.storage.mechanism.mechanismfactory');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.structs.Queue');
goog.require('goog.uri.utils');
goog.require('office.apiFlagUtil');
goog.require('office.ui.ButterManager');
goog.require('controls.ButterBar');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
apps.uploader.BaseUploader = function() {
  goog.events.EventTarget.call(this);

  /**
   * Maintains the list of files selected by the user for upload.
   * @type {!Array.<!apps.uploader.File>}
   * @protected
   */
  this.fileList = [];

  /**
   * Maintains a mapping of apps.uploader.File ids to corresponding FileInfo2
   * objects.
   * @type {!goog.structs.Map}
   * @private
   */
  this.fileInfoMap_ = new goog.structs.Map();

  /**
   * Maintains a map of group id to related upload ids.
   * @type {!Object}
   * @private
   */
  this.relatedUploads_ = {};

  /**
   * Maintains a list of files that are already part of another group.
   * @type {!Object}
   * @private
   */
  this.groupedUploads_ = {};

  /**
   * Keeps track of the start time for an upload session.
   * @type {!Object}
   * @private
   */
  this.uploadSessionStart_ = {};

  /**
   * The list of files queued for upload
   * @type {!goog.structs.Queue}
   * @private
   */
  this.uploadQueue_ = new goog.structs.Queue();

  /**
   * Event handler for the uploader.
   * @type {!goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);

  /**
   * Stats for this uploader. Recovers on creation from local storage.
   * @type {!apps.uploader.common.Stats}
   * @private
   */
  this.stats_ = new apps.uploader.common.Stats(
      apps.uploader.Version.CLIENT_VERSION);
  this.registerDisposable(this.stats_);

  try {
    // Attach an UNLOAD event to this handler.
    this.eventHandler_.listen(window,
                              goog.events.EventType.UNLOAD,
                              this.handleWindowUnload_);
  } catch (e) {
    // This exception is expected if this is called from a Chrome packaged app,
    // because 'unload' listeners are not allowed in that context.
    goog.log.info(this.logger, 'Failed to add unload listener', e);
  }

  // Report stats if we've recovered them.
  this.stats_.report();
};
goog.inherits(apps.uploader.BaseUploader, goog.events.EventTarget);


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.BaseUploader.prototype.logger =
    goog.log.getLogger('apps.uploader.BaseUploader');


/**
 * TRUE iff the user is allowed to add files.
 * @type {boolean}
 * @protected
 */
apps.uploader.BaseUploader.prototype.allowAddingFiles = true;


/**
 * Specifies whether attempts can be made to recover interrupted uploads.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.allowRecovery_ = false;


/**
 * Callback that is invoked right before any file that is recoverable is
 * about to be uploaded.
 * @type {function(string): goog.async.Deferred}
 * @private
 */
// Note: Without goog.partial(), the compiler treats this field as a
// function and requires that @return and @param annotations be added.
// Using goog.partial() makes it clear that this is an overridable callback.
apps.uploader.BaseUploader.prototype.recoveryCallback_ = goog.partial(
    function(uploadId) {
      return goog.async.Deferred.succeed(true);
    });


/**
 * Storage used for upload recovery.
 * @type {!goog.storage.ExpiringStorage|undefined}
 * @private
 */
apps.uploader.BaseUploader.prototype.recoveryStorage_;


/**
 * URL used to managed sessions on the server.
 * @type {string}
 * @private
 */
apps.uploader.BaseUploader.prototype.sessionServerUrl_ = '';


/**
 * The number of files currently being uploaded.
 * @type {number}
 * @private
 */
apps.uploader.BaseUploader.prototype.currentUploadCount_ = 0;


/**
 * The maximum number of simultaneous file uploads allowed.
 * @type {number}
 * @private
 */
apps.uploader.BaseUploader.prototype.maxSimultaneousUploads_ = 1;


/**
 * Indicates whether files should be queued for upload immediately after
 * selected.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.autoUploadFiles_ = true;


/**
 * Indicates whether this uploader supports multi-selection in file picker.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.multiSelect_ = true;


/**
 * A list of allowed file types that the user can select when choosing files
 * for upload from the native file picker.
 * @type {Array.<string>}
 * @private
 */
apps.uploader.BaseUploader.prototype.fileTypes_ = null;


/**
 * Specifies whether users should be able to select directories for upload.
 * This is applicable only to uploaders that support directory uploading
 * and is ignored otherwise.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.allowDirectories_ = false;


/**
 * Specifies whether files should be ordered alphabetically before they're added
 * to the uploader.  This only affects uploaders that support multiselect.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.alphabeticalOrdering_ = false;


/**
 * Whether to strip hosts from URLs and post data to a relative URL.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.useRelativeUrls_ = false;


/**
 * If set, downsampling options to apply to images that are uploaded through
 * this uploader.  The options specify the resolution to downsample images to,
 * the JPEG quality to use, etc.  Mutually exclusive with {@link
 * #downsamplingOptionsFn_}.
 * @type {!apps.uploader.ImageProcessorOptions|undefined}
 * @private
 */
apps.uploader.BaseUploader.prototype.downsamplingOptions_;


/**
 * If set, the function to create the downsampling options for a particular
 * file.  Mutually exclusive with {@link #downsamplingOptions_}.
 * @type {!function(apps.uploader.File):
 *     (!apps.uploader.ImageProcessorOptions|undefined)|undefined}
 * @private
 */
apps.uploader.BaseUploader.prototype.downsamplingOptionsFn_;


/**
 * Minimum byte size of images before client-side rescale of images is
 * considered.  Defaults to 50k.
 * @type {number}
 * @private
 */
apps.uploader.BaseUploader.prototype.minImageByteCountForRescale_ = 51200;


/**
 * Whether drag and drop of directories should be allowed.
 * @type {boolean}
 * @private
 */
apps.uploader.BaseUploader.prototype.allowDndDirectories_ = false;


// ----------------------------------------------------------------------------
// Public Methods - Get and set options.
// ----------------------------------------------------------------------------


/**
 * Sets the URL used to manage upload sessions.
 * @param {string} url The session server URL.
 */
apps.uploader.BaseUploader.prototype.setSessionServerUrl = function(url) {
  this.sessionServerUrl_ = url;
};


/**
 * Returns the URL used to manage upload sessions.
 * @return {string} The session server URL.
 */
apps.uploader.BaseUploader.prototype.getSessionServerUrl = function() {
  return this.sessionServerUrl_;
};


/**
 * Sets whether the files should be queued for upload automatically.
 * @param {boolean} auto The new value of this flag. If {@code false}, uploads
 *     must be triggered manually using {@link #queueUpload}.
 */
apps.uploader.BaseUploader.prototype.setAutoUploadFiles = function(auto) {
  this.autoUploadFiles_ = auto;
};


/**
 * @return {boolean} {@code true} if the file is queued for upload immediately
 *     after selecting it.
 */
apps.uploader.BaseUploader.prototype.getAutoUploadFiles = function() {
  return this.autoUploadFiles_;
};


/**
 * Sets the maximum number of simulatenous uploads allowed. Increasing the count
 * while files are uploading will start new uploads. Decreasing the count will
 * not be inforced until the current count falls below the new max count.
 * @param {number} count The new max number of uploads allowed.
 */
apps.uploader.BaseUploader.prototype.setMaxSimultaneousUploads =
    function(count) {
  this.maxSimultaneousUploads_ = Math.max(1, count);
  // Fill the new count
  this.fillMaxUploads_();
};


/**
 * Returns the maximum number of simulataneous uploads allowed.
 * @return {number} The number of uploads.
 */
apps.uploader.BaseUploader.prototype.getMaxSimultaneousUploads = function() {
  return this.maxSimultaneousUploads_;
};


/**
 * Sets whether this uploader should support file multi-selection.
 * @param {boolean} multiSelect {@code true} if the multi-selection support is
 *     advised.
 */
apps.uploader.BaseUploader.prototype.setMultiSelect = function(multiSelect) {
  this.multiSelect_ = multiSelect;
};


/**
 * @return {boolean} {@code true} if this uploader supports multi-selection in
 *     file picker.
 */
apps.uploader.BaseUploader.prototype.isMultiSelect = function() {
  return this.multiSelect_;
};


/**
 * Sets which file types are allowed to be selected by the user when browsing
 * for files. Each element in the array must be a file extension, eg:
 * {@code ['.txt', '.png']}. Note that the user may be able to turn off the
 * restriction and select any file type.
 * @param {Array.<string>} types An array of acceptable file types or null to
 *     allow all file types.
 */
apps.uploader.BaseUploader.prototype.setAllowedFileTypes = function(types) {
  this.fileTypes_ = types;
};


/**
 * @return {Array.<string>} A list of allowed file types.
 */
apps.uploader.BaseUploader.prototype.getAllowedFileTypes = function() {
  return this.fileTypes_;
};


/**
 * Sets whether or not directories should be able to be uploaded.
 * @param {boolean} allow True if directories should be able to be selected.
 */
apps.uploader.BaseUploader.prototype.setAllowDirectories = function(allow) {
  this.allowDirectories_ = allow;
};


/**
 * @return {boolean} True if directories should be able to be selected and
 *     the uploader is capable of uploading directories.
 */
apps.uploader.BaseUploader.prototype.getAllowDirectories = function() {
  return this.allowDirectories_ && this.isDirectoryUploadSupported();
};


/**
 * Sets whether multiselect-enabled uploaders should sort newly added items
 * alphabetically by filename before they're added to the data model.
 * @param {boolean} alphabetical Whether files should be sorted alphabetically.
 */
apps.uploader.BaseUploader.prototype.setAlphabeticalOrdering =
    function(alphabetical) {
  this.alphabeticalOrdering_ = alphabetical;
};


/**
 * Returns true if items to upload should be added in filename alphabetical
 * order if they're added in multiselect-enabled uploaders.
 * @return {boolean} True, if alphabetical ordering is enabled.
 */
apps.uploader.BaseUploader.prototype.isAlphabeticalOrdering = function() {
  return this.alphabeticalOrdering_;
};


/**
 * Whether to strip the scheme and host from Rupio URLs so that all POSTs are
 * made relatively to the page we're rendered on.
 * @param {boolean} value True, if schemes and hosts should be stripped.
 */
apps.uploader.BaseUploader.prototype.setUseRelativeUrls = function(value) {
  this.useRelativeUrls_ = value;
};


/**
 * Sets the options to use when downsampling images uploaded through this
 * uploader.  If set to undefined, no downsampling will occur.
 * @param {!apps.uploader.ImageProcessorOptions|undefined} options Downsampling
 *     options.
 */
apps.uploader.BaseUploader.prototype.setDownsamplingOptions =
    function(options) {
  if (this.downsamplingOptionsFn_) {
    // Cannot set both downsampling options and the function.
    throw new Error();
  }
  this.downsamplingOptions_ = options;
};


/**
 * Sets the function to create the downsampling options for a particular file.
 * @param {!function(apps.uploader.File):
 *     (!apps.uploader.ImageProcessorOptions|undefined)} func The function to
 *     create downsampling options.
 */
apps.uploader.BaseUploader.prototype.setDownsamplingOptionsFunction = function(
    func) {
  if (this.downsamplingOptions_) {
    // Cannot set both downsampling options and the function.
    throw new Error();
  }
  this.downsamplingOptionsFn_ = func;
};


/**
 * Returns the downsampling options for a particular file, or undefined if
 * downsampling should not occur.
 * @param {apps.uploader.File} file The file.
 * @return {!apps.uploader.ImageProcessorOptions|undefined} Downsampling
 *     options.
 * @protected
 */
apps.uploader.BaseUploader.prototype.getDownsamplingOptions = function(file) {
  if (this.downsamplingOptionsFn_) {
    return this.downsamplingOptionsFn_(file);
  }
  return this.downsamplingOptions_;
};


/**
 * Sets the minimum byte size of an image before client-side resampling is
 * considered.  If an image byte size is smaller, client-side resampling will
 * not occur.
 * @param {number} minImageByteCountForRescale Minimum file size, in bytes.
 */
apps.uploader.BaseUploader.prototype.setMinImageByteCountForRescale = function(
    minImageByteCountForRescale) {
  this.minImageByteCountForRescale_ = minImageByteCountForRescale;
};


/**
 * Gets the minimum byte size of an image before client-side resampling is
 * considered.  If an image byte size is smaller, than resampling will be
 * handled by the backend.
 * @return {number} minImageByteCountForRescale Minimum file size, in bytes.
 */
apps.uploader.BaseUploader.prototype.getMinImageByteCountForRescale =
    function() {
  return this.minImageByteCountForRescale_;
};


/**
 * Sets a secret key unique to each user. This is currently used to create a
 * protected local storage for upload recovery data persistence, but does not
 * have to be limited to this.
 * @param {string} userKey The secret user key.
 */
apps.uploader.BaseUploader.prototype.setUserKey = function(userKey) {
  if (this.allowRecovery_ && this.isRecoverySupported()) {
    var mechanism = goog.storage.mechanism.mechanismfactory.create(
        'up-recovery');
    if (mechanism) {
      this.recoveryStorage_ = new goog.storage.EncryptedStorage(
          mechanism, userKey);
    }
  }
};


/**
 * Sets whether upload recovery attempts are allowed.
 * @param {boolean} allowRecovery Whether uploads can be recovered.
 */
apps.uploader.BaseUploader.prototype.setAllowRecovery = function(
    allowRecovery) {
  this.allowRecovery_ = allowRecovery;
};


/**
 * Sets a callback that is invoked right before any file that is recoverable
 * is about to be uploaded.  The upload ID of the recoverable upload session
 * will be passed to the callback.  The callback must return a deferred result
 * that ultimately yields true or false.  Recovery will only attempted if it
 * yields true; a new upload will be started if it yields false.
 * @param {function(string): goog.async.Deferred} recoveryCallback The callback
 *     that will be invoked right before any file that is recoverable is about
 *     to be uploaded.
 */
apps.uploader.BaseUploader.prototype.setRecoveryCallback = function(
    recoveryCallback) {
  this.recoveryCallback_ = recoveryCallback;
};


/**
 * Sets whether the user is allowed to add more files.  Should be overridden if
 * additional functionality is needed.
 * @param {boolean} allowAddingFiles TRUE iff the user is allowed to add files.
 */
apps.uploader.BaseUploader.prototype.setAllowAddingFiles = function(
    allowAddingFiles) {
  this.allowAddingFiles = allowAddingFiles;
};


/**
 * Sets whether directores are allowed to be drag and dropped.
 * @param {boolean} allow True if directories are allowed to be drag and
 *     dropped.
 */
apps.uploader.BaseUploader.prototype.setAllowDndDirectories = function(allow) {
  this.allowDndDirectories_ = allow;
};


/**
 * Gets whether directores are allowed to be drag and dropped.
 * @return {boolean} True if directories are allowed to be drag and dropped.
 */
apps.uploader.BaseUploader.prototype.getAllowDndDirectories = function() {
  return this.allowDndDirectories_;
};


// ----------------------------------------------------------------------------
// Public Methods
// ----------------------------------------------------------------------------


/**
 * Gets this uploader's event handler.
 * @return {!goog.events.EventHandler} The event handler.
 */
apps.uploader.BaseUploader.prototype.getHandler = function() {
  return this.eventHandler_;
};


/** @override */
apps.uploader.BaseUploader.prototype.dispatchEvent = function(event) {
  try {
    return apps.uploader.BaseUploader.superClass_.dispatchEvent.call(
        this, event);
  } catch (e) {
    goog.log.warning(this.logger, 'Event listener threw exception.', e);
  }
};


/**
 * Returns the file object, given a file id.
 * @param {string} id The file id.
 * @return {apps.uploader.File} The file object.
 */
apps.uploader.BaseUploader.prototype.getFile = function(id) {
  var fileInfo = /** @type {apps.uploader.FileInfo2} */ (
                 this.fileInfoMap_.get(id));
  return fileInfo ? fileInfo.file : null;
};


/**
 * Returns a file info object for given file. If the appropriate file info
 * object does not exist, it creates a new one.
 * @param {apps.uploader.File} file The file object.
 * @return {apps.uploader.FileInfo2} The corresponding file info object.
 */
apps.uploader.BaseUploader.prototype.getFileInfo = function(file) {
  var fileInfo = /** @type {apps.uploader.FileInfo2} */ (
                 this.fileInfoMap_.get(file.getId()));
  if (!fileInfo) {
    fileInfo = this.createFileInfo(file);
    this.fileInfoMap_.set(file.getId(), fileInfo);
  }
  return fileInfo;
};


/**
 * Queues a file for upload. If the maximum number of uploads allowed has not
 * been reached, the upload is started immediately.
 * @param {apps.uploader.File} file The file to upload.
 */
apps.uploader.BaseUploader.prototype.queueUpload = function(file) {
  // Does not queue a file if:
  // 1. It's already in the upload queue (queue check).
  // 2. The upload process has already begun (session check).
  // 3. It's not in the DEFAULT state (cancel check).
  if (this.uploadQueue_.contains(file) || this.getSession(file) ||
      this.getFileState(file) != apps.uploader.File.State.DEFAULT) {
    return;
  }
  // Don't queue Directories...only files are uploaded.
  if (!(file instanceof apps.uploader.Directory)) {
    this.uploadQueue_.enqueue(file);
  }
  this.setFileState(file, apps.uploader.File.State.IN_QUEUE);
  this.fillMaxUploads_();
};


/**
 * Returns the session associated with a given file.
 * @param {apps.uploader.File} file The file to look up.
 * @return {apps.uploader.Session?} The session for a given file.
 */
apps.uploader.BaseUploader.prototype.getSession = function(file) {
  return this.getFileInfo(file).session;
};


/**
 * Returns the file I/O object associated with a given file.
 * @param {apps.uploader.File} file The file to look up.
 * @return {apps.uploader.net.FileIo} The file I/O object.
 */
apps.uploader.BaseUploader.prototype.getFileIo = function(file) {
  return this.getFileInfo(file).fileIo;
};


/**
 * Returns the file I/O object associated with a given file.
 * @deprecated Use getFileIo() instead.
 */
apps.uploader.BaseUploader.prototype.getUpload =
    apps.uploader.BaseUploader.prototype.getFileIo;


/**
 * Cancels a file upload. The file will remain in the file list and can be
 * retried later. If the session is not deleted the upload can be resumed.
 * @param {apps.uploader.File} file The file being uploaded to cancel.
 * @param {boolean=} opt_keepSession Don't delete the session.
 */
apps.uploader.BaseUploader.prototype.cancelUpload = function(
    file, opt_keepSession) {
  // Make sure the file is in a cancelable state
  switch (this.getFileState(file)) {
    case apps.uploader.File.State.SUCCESS:
    case apps.uploader.File.State.ERROR:
    case apps.uploader.File.State.CANCEL:
      return;
  }

  var io = this.getFileIo(file);
  var session = this.getSession(file);
  var recovery = this.getFileInfo(file).recovery;
  var endTime = goog.now();
  var keepSession = opt_keepSession || false;

  if (session) {
    // Make sure that we don't start upload when the session response arrives.
    this.eventHandler_.unlisten(
        session,
        apps.uploader.Session.EventType.START_SUCCESS,
        this.onSessionStart_,
        false,
        this);
  }

  // We need to check it, because the upload is cancellable even before the
  // actual upload request begins.
  if (io) {
    io.abort();
    this.getFileInfo(file).fileIo = null;
    if (!keepSession) {
      this.sendExplicitCancel_(file);
    }
  }

  if (recovery) {
    recovery.cancel();
    this.getFileInfo(file).recovery = null;
  }

  // Remove the file from the upload queue.
  this.uploadQueue_.remove(file);

  // Send stats on canceled upload.
  this.reportStats_(file, apps.uploader.common.Stats.EventType.CANCEL);

  // Send group data.
  this.collectGroupData_(file, endTime);

  this.getFileInfo(file).session = null;
  this.setFileError(file, apps.uploader.ErrorCode.ABORT);
  this.setFileState(file, apps.uploader.File.State.CANCEL);

  // Cancel all entries recursively if file is a directory.
  if (file instanceof apps.uploader.Directory) {
    var directory = (/** @type {apps.uploader.Directory} */ (file));
    var entries = file.getEntries();
    for (var i = 0; i < entries.length; i++) {
      this.cancelUpload(entries[i], keepSession);
    }
  }
};


/**
 * @return {number} The number of files contained by this uploader.
 */
apps.uploader.BaseUploader.prototype.getNumFiles = function() {
  return this.fileList.length;
};


/**
 * Returns true if the specified file is queued for upload.
 * @param {apps.uploader.File} file The file to check.
 * @return {boolean} True if the file is queued, false otherwise.
 */
apps.uploader.BaseUploader.prototype.isInUploadQueue = function(file) {
  return this.uploadQueue_.contains(file);
};


/**
 * @return {Array.<apps.uploader.File>} A defense-cloned array of all files
 *     that are currently queued for upload.
 */
apps.uploader.BaseUploader.prototype.getQueuedFiles = function() {
  return this.uploadQueue_.getValues();
};


/**
 * @return {number} The number of files currently queued for upload.
 */
apps.uploader.BaseUploader.prototype.getNumQueuedFiles = function() {
  return this.uploadQueue_.getCount();
};


/**
 * Adds a user selected file to the list of files managed by the uploader.
 * @param {apps.uploader.File} file The file to add to the uploader.
 */
apps.uploader.BaseUploader.prototype.addFile = function(file) {
  // Store in internal file lists.
  this.fileList.push(file);
  if (!this.fileInfoMap_.get(file.getId())) {
    this.fileInfoMap_.set(file.getId(), this.createFileInfo(file));
  }

  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.FILE_ADDED, file));

  // Do any post processing.
  this.addFileInternal(file);
};


/**
 * Retries uploading a file using a new upload session.
 * @param {apps.uploader.File} file The file to be retried.
 * @return {boolean} true if the file is allowed to be retried.
 */
apps.uploader.BaseUploader.prototype.retryUpload = function(file) {
  // Check that the file can be retried.
  if (!file.canRetry()) {
    return false;
  }

  // Reset state on the file.
  this.getFileInfo(file).resetTransferState();
  file.resetTransferState();

  // Reupload the file.
  this.queueUpload(file);

  return true;
};


/**
 * Removes from the file list all the files that are not actively being
 * uploaded.
 */
apps.uploader.BaseUploader.prototype.clearFileList = function() {
  goog.array.forEach(
      goog.array.clone(this.fileList),
      function(f) {
        switch (this.getFileState(f)) {
          case apps.uploader.File.State.DEFAULT:
          case apps.uploader.File.State.SUCCESS:
          case apps.uploader.File.State.PARTIAL_ERROR:
          case apps.uploader.File.State.ERROR:
          case apps.uploader.File.State.CANCEL:
            this.removeFile(f);
            break;
        }
      },
      this);
};


/**
 * Cancels all uploads that are in a cancellable state.
 * @param {boolean=} opt_keepSessions Don't delete sessions.
 */
apps.uploader.BaseUploader.prototype.cancelAllUploads = function(
    opt_keepSessions) {
  var keepSessions = opt_keepSessions || false;

  // Cancel the uploads that have not started yet first. Otherwise they would
  // get started when the in-progress uploads get cancelled.
  goog.array.forEach(
      goog.array.clone(this.fileList),
      function(file) {
        switch (this.getFileState(file)) {
          case apps.uploader.File.State.DEFAULT:
          case apps.uploader.File.State.IN_QUEUE:
            this.cancelUpload(file, keepSessions);
            break;
        }
      }, this);

  // Cancel the in-progress uploads. Logic for determining whether the file can
  // be cancelled as a function of state is encapsulated in cancelUpload().
  goog.array.forEach(
      goog.array.clone(this.fileList),
      function(file) {
        this.cancelUpload(file, keepSessions);
      }, this);
};


/**
 * Sets an upload error for a file control.
 * @param {apps.uploader.File} file The file.
 * @param {apps.uploader.ErrorCode} errorCode Error code.
 * @param {string=} opt_errorMessage Error message.
 */
apps.uploader.BaseUploader.prototype.setFileError = function(file,
    errorCode, opt_errorMessage) {
  file.setError(errorCode, opt_errorMessage);
};


/**
 * Sets the upload state for a file control. If the upload state is final, it
 * runs the next upload in the queue, unless the upload counter is at maximum.
 * @param {apps.uploader.File} file The file.
 * @param {apps.uploader.File.State} state The upload state.
 */
apps.uploader.BaseUploader.prototype.setFileState = function(file, state) {
  var prevState = this.getFileState(file);
  if (state != prevState && apps.uploader.File.isSupportedState(state)) {
    this.getFileInfo(file).state = state;
    // Set whether the file can be retried.
    //  Move this logic into File once it knows its own state.
    file.setCanRetry(this.isRetrySupported() &&
        !(file instanceof apps.uploader.Directory) &&
        (state == apps.uploader.File.State.ERROR ||
            state == apps.uploader.File.State.CANCEL));
    // Dispatch or dismiss messages.
    var message = '';
    if (state == apps.uploader.File.State.ERROR ||
        state == apps.uploader.File.State.CANCEL) {
      message =
          apps.uploader.ErrorCode.getMessageFromCode(file.getLastErrorCode());
    }
    this.dispatchEvent(new apps.uploader.FileMessageEvent(file, message));
    // State changed.
    goog.log.info(this.logger, 'File state changed from [' + prevState +
                     '] to [' + state + ']. ' + file);
    this.dispatchEvent(new apps.uploader.FileEvent(
        apps.uploader.EventType.UPLOAD_STATE_CHANGED, file));
    if (apps.uploader.BaseUploader.isActivelyUploading(prevState) &&
        !apps.uploader.BaseUploader.isActivelyUploading(state)) {
      // Clear out the blob, to free the memory
      file.setAlternateBlob(undefined);

      // Transition to final state detected.
      this.currentUploadCount_--;
      this.nextUpload();
    }
  }
};


/**
 * Gets the upload state for a file control.
 * @param {apps.uploader.File} file The file.
 * @return {apps.uploader.File.State} state The upload state.
 */
apps.uploader.BaseUploader.prototype.getFileState = function(file) {
  return this.getFileInfo(file).state;
};


/**
 * Resets the uploader to its initial state by removing all files.
 */
apps.uploader.BaseUploader.prototype.reset = function() {
  goog.array.forEach(goog.array.clone(this.fileList), this.removeFile, this);
};


/**
 * Identifies if the uploader is uploading or has files queued.
 * @return {boolean} True if the uploader does not have any queued or
 *     current uploads.
 */
apps.uploader.BaseUploader.prototype.hasNoQueuedOrCurrentUploads = function() {
  return this.uploadQueue_.isEmpty() && (this.currentUploadCount_ == 0);
};


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Returns the client ID to be reported to the upload server.
 * @return {string} the client ID.
 */
apps.uploader.BaseUploader.prototype.getClientId = goog.abstractMethod;


/**
 * Installs the uploader. This must be called after the construction, and
 * should ultimately result in the uploader becoming initialized, possibly
 * asynchronously.
 *  Make the overlay element obligatory when the upload manager
 *              is cleaned up and we can always specify one. It can always
 *              be ignored by an uploader implementation.
 * @param {Element=} opt_overlayElement Button-like element to be overlayed.
 *     Obligatory for uploaders like Flash, XHR and HTMLForm, so that the
 *     file selection dialog can be popped up from a user action.
 */
apps.uploader.BaseUploader.prototype.install = goog.abstractMethod;


/**
 * Uninstalls the uploader.
 * @param {Element=} opt_overlayElement Element from which the overlay
 *     should be removed, if a button was overlayed during installation.
 */
apps.uploader.BaseUploader.prototype.uninstall = goog.abstractMethod;


/**
 * Returns whether the uploader has initialized. If the uploader depends on
 * an applet, this should say if the applet has loaded and is ready to use.
 * @return {boolean} the client ID.
 */
apps.uploader.BaseUploader.prototype.isInitialized = goog.abstractMethod;


/**
 * Identifies if this uploader is capable of uploading directories.
 * @return {boolean} True if this uploader is capable of uploading directories.
 */
apps.uploader.BaseUploader.prototype.isDirectoryUploadSupported = function() {
  return false;
};


/**
 * Whether a separate link is required in the UI for directory upload. Some
 * uploaders that rely on platform-specific dialogs need to show an entirely
 * different dialog for directory uploads. This is only meaningful for uploaders
 * that support directory upload.
 * @return {boolean} True if a separate link is required in the UI for directory
 *     upload.
 */
apps.uploader.BaseUploader.prototype.isSeparateDirectoryUploadLinkRequired =
    function() {
  return false;
};


/**
 * @return {boolean} Returns true if the upload mechanism supports external
 *     file drag and drop.
 */
apps.uploader.BaseUploader.prototype.isDragDropSupported = function() {
  return false;
};


/**
 * @return {boolean} Returns true if the upload mechanism supports resuming
 *     an upload after the connection breaks.
 */
apps.uploader.BaseUploader.prototype.isResumable = function() {
  return false;
};


/**
 * @return {boolean} Returns true if the upload mechanism supports upload
 *     recovery, i.e., resuming an upload after browser crash or restart.
 */
apps.uploader.BaseUploader.prototype.isRecoverySupported = function() {
  return false;
};


/**
 * Queues, for upload, all files that haven't been queued yet.
 */
apps.uploader.BaseUploader.prototype.queueAllFiles = function() {
  goog.array.forEach(this.getFiles(), this.queueFilesRecursively, this);
};


/**
 * @return {!Array.<apps.uploader.File>} A defense-cloned array of all files
 *     contained by this uploader. To modify this list, use methods like
 *     #removeFile and #addMoreFiles.
 */
apps.uploader.BaseUploader.prototype.getFiles = function() {
  return goog.array.clone(this.fileList);
};


/**
 * Removes a file from the file list.
 * @param {apps.uploader.File} file The file to be removed.
 */
apps.uploader.BaseUploader.prototype.removeFile = function(file) {
  // Cancel file if it's uploading
  this.cancelUpload(file);
  this.fileInfoMap_.remove(file.getId());
  // Remove from fileList
  goog.array.remove(this.fileList, file);
  // Dispatch event
  this.dispatchEvent(
      new apps.uploader.FileEvent(apps.uploader.EventType.FILE_REMOVED, file));
};


/**
 * Adds a new file item to the list. If the mechanism supports it, this is done
 * interactively. This method is abstract.
 * @param {boolean=} opt_replace Whether to replace existing file items that
 *     were not yet queued for upload with the newly selected ones.
 */
apps.uploader.BaseUploader.prototype.addFileItems = goog.abstractMethod;


/**
 * Binds a control (component or element) to trigger a file dialog
 * for the user to choose files to upload.
 * NOTE: This method is experimental and will likely change.  Please contact
 * scotty-team@google.com if you think you need to use this.
 * @param {goog.ui.Component|Element} control An element or component which
 *     should trigger #addFileItems if it is clicked on.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 */
apps.uploader.BaseUploader.prototype.bindAddFileItemsControl = function(
    control, opt_disableTabStop) {
};


/**
 * Unbinds a control from triggering a file dialog trigger.
 * NOTE: This method is experimental and will likely change.  Please contact
 * scotty-team@google.com if you think you need to use this.
 * @param {goog.ui.Component|Element} control An element or component to
 *     unbind.
 */
apps.uploader.BaseUploader.prototype.unbindAddFileItemsControl = function(
    control) {
};


/**
 * Resizes and repositions the overlay that is used to capture clicks and
 * display a "file open" dialog, based on the current size and position of
 * the overlay target. This is useful if the overlay target moves or
 * changes size. If there are multiple overlays, each one will be resized
 * and repositioned according to its overlay target. This method has no
 * effect if the upload mechanism does not use an overlay.
 */
apps.uploader.BaseUploader.prototype.resizeAndPositionOverlayContainer =
    function() {
};


/**
 * Generates an image preview for a given file. Currently the file has to be an
 * image.
 * @param {apps.uploader.File} file The file to generate a preview from.
 * @param {number} width The preview image width.
 * @param {number} height The preview image height.
 * @param {number=} opt_quality The preview image quality. A number between 0
 *     and 100, higher being better.
 * @param {boolean=} opt_cropping If true, the preview image will clip the
 *     aspect ratio so that the entire image is filled.
 * @return {boolean} True if a preview has been started.
 */
apps.uploader.BaseUploader.prototype.startImagePreview = function(file,
    width, height, opt_quality, opt_cropping) {
  // We do not support image previews by default.
  return false;
};


/**
 * Pauses a file being uploaded (in state TRANSFER).
 * This method is optional and may not have any effect.
 * @param {apps.uploader.File} file The file to pause.
 */
apps.uploader.BaseUploader.prototype.pauseFile = function(file) {
};


/**
 * Resumes a file being uploaded (in state TRANSFER).
 * This method is optional and may not have any effect.
 * @param {apps.uploader.File} file The file to resume.
 */
apps.uploader.BaseUploader.prototype.resumeFile = function(file) {
};


/**
 * Checks if a file is paused.
 * @param {apps.uploader.File} file The file to check.
 * @return {boolean} True if the file is paused.
 */
apps.uploader.BaseUploader.prototype.isPaused = function(file) {
  return false;
};


/**
 * Checks if a file is backing off due to a retryable error.
 * @param {apps.uploader.File} file The file to check.
 * @return {boolean} True if the file is backing off.
 */
apps.uploader.BaseUploader.prototype.isBackoff = function(file) {
  return false;
};


/**
 * Returns true if we are allowed to generate an image preview.
 * @param {apps.uploader.File} file The file to check.
 * @return {boolean} True if we are allowed to generate an image preview.
 */
apps.uploader.BaseUploader.prototype.isPreviewAllowed = function(file) {
  return false;
};


// ----------------------------------------------------------------------------
// Public Static Functions
// ----------------------------------------------------------------------------


/**
 * Checks if the upload state is final.  Used externally -- gsearch before
 * changing.
 * @param {apps.uploader.File.State} state The state to be checked.
 * @return {boolean} {@code true} Whether the upload is considered done when it
 *     reaches given state.
 */
apps.uploader.BaseUploader.isUploadStateFinal = function(state) {
  return goog.array.contains([
    apps.uploader.File.State.SUCCESS,
    apps.uploader.File.State.ERROR,
    apps.uploader.File.State.CANCEL
  ], state);
};


/**
 * Checks if the upload state is one that is actively uploading.
 * @param {apps.uploader.File.State} state The state to be checked.
 * @return {boolean} {@code true} Whether the upload is considered done when it
 *     reaches given state.
 */
apps.uploader.BaseUploader.isActivelyUploading = function(state) {
  return goog.array.contains([
    apps.uploader.File.State.RECOVERY,
    apps.uploader.File.State.START,
    apps.uploader.File.State.TRANSFER
  ], state);
};


// ----------------------------------------------------------------------------
// Protected Methods
// ----------------------------------------------------------------------------


/**
 * Recursively queues files.  The file is queued, and if the file is a
 * directory, its entries are also queued recursively.
 * @param {apps.uploader.File} file The file to queue.
 * @protected
 */
apps.uploader.BaseUploader.prototype.queueFilesRecursively = function(file) {
  this.queueUpload(file);
  if (file instanceof apps.uploader.Directory) {
    var entries = /** @type {apps.uploader.File} */ (file).getEntries();
    for (var i = 0; i < entries.length; i++) {
      this.queueFilesRecursively(entries[i]);
    }
  }
};


/**
 * Queues the upload if it is supposed to start automatically.
 * @param {apps.uploader.File} file The file to be considered to upload.
 * @protected
 */
apps.uploader.BaseUploader.prototype.queueUploadInternal = function(file) {
  if (this.autoUploadFiles_) {
    this.queueFilesRecursively(file);
  }
};


/**
 * Utility function for identifying it the passed argument is an element,
 * which may be the element itself, or a goog.ui.Component.
 * @param {goog.ui.Component|Element} control An element or component.
 * @return {boolean} True if the passed argument is an Element.
 * @protected
 */
apps.uploader.BaseUploader.prototype.isElement = function(control) {
  // Instanceof Element doesn't work everywhere, and
  // Instanceof goog.ui.Component brings in a dep we're not interested in.
  // So instead, just check for a commonly supported property.
  return !!control.tagName;
};


/**
 * Utility function for getting an element from whatever is passed to
 * #(un)bindAddFileItemsControl, which may be the element itself, or a
 * goog.ui.Component.
 * @param {goog.ui.Component|Element} control An element or component which
 *     should trigger #addFileItems if it is clicked on.
 * @return {Element} The element of the passed argument.
 * @protected
 */
apps.uploader.BaseUploader.prototype.extractElement = function(control) {
  // We check for the presence of tagName, which most safely indicates that the
  // parameter is an Element across browsers.  Otherwise it is a component, can
  // we can call getElement() on it.
  return /** @type {Element} */ (this.isElement(control) ?
      control : control.getElement());
};


// ----------------------------------------------------------------------------
// Protected Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Creates a new file info object. Meant to be overridden in subclasses.
 * @param {apps.uploader.File} file A file object.
 * @return {!apps.uploader.FileInfo2} New FileInfo object corresponding to given
 *     file.
 * @protected
 */
apps.uploader.BaseUploader.prototype.createFileInfo = function(file) {
  return new apps.uploader.FileInfo2(file);
};


/**
 * Starts the upload process for the next file in the upload queue. No-op if the
 * running upload counter is at maximum.
 * @protected
 */
apps.uploader.BaseUploader.prototype.nextUpload = function() {
  if (this.hasNoQueuedOrCurrentUploads()) {
    this.dispatchEvent(apps.uploader.EventType.ALL_FILES_COMPLETED);
  }

  if (this.atMaxUploads_() || this.uploadQueue_.isEmpty()) {
    return;
  }

  if (goog.string.isEmpty(this.sessionServerUrl_)) {
    throw Error('session server url has not been set');
  }

  // Get next file in line
  var file = /** @type {apps.uploader.File} */ (this.uploadQueue_.dequeue());
  if (!(file instanceof apps.uploader.Directory)) {
    // Directories don't get uploaded, only files do.
    // Update upload count.
    this.currentUploadCount_++;

    // Check if we can recover the upload.
    if (this.recoveryStorage_) {
      var hash = this.getRecoveryHash_(file);
      var wrapper = null;
      var url = null;

      try {
        wrapper = this.recoveryStorage_.getWrapper(hash);
        url = goog.storage.RichStorage.Wrapper.unwrapIfPossible(wrapper);
      } catch (e) {
        // If this fails, it should not affect the upload.
      }

      if (wrapper && goog.isString(url)) {
        var uploadId = goog.uri.utils.getParamValue(url, 'upload_id');

        if (uploadId) {
          // Invoke the recovery callback and get a deferred result.
          var deferred = this.recoveryCallback_(uploadId);

          // Recover the upload if the deferred result is true.  Start a new
          // upload if it is false or if the recovery callback encountered
          // an error.
          var successFunction = function(result) {
            if (result) {
              this.recoverUpload_(
                  file,
                  url,
                  goog.storage.ExpiringStorage.getCreationTime(
                      /** @type {!Object} */(wrapper)));
            } else {
              this.startUploadSession(file);
            }
          };
          var errorFunction = goog.bind(this.startUploadSession, this, file);
          deferred.addCallbacks(successFunction, errorFunction, this);

          return;
        }
      }
    }
    this.startUploadSession(file);
  }
};


/**
 * Starts the upload process for a particular file, by creating and starting
 * a {@link apps.uploader.Session}. If the file already has an upload URL, no
 * session is started; instead, the session is immediately given a {@code OPEN}
 * state, and the actual upload is launched.
 * @param {apps.uploader.File} file The file to upload.
 * @protected
 */
apps.uploader.BaseUploader.prototype.startUploadSession = function(file) {

  // Create session request for file
  var session = this.createAndSetupSession_(file);
  this.getFileInfo(file).session = session;
  var url = file.getUploadUrl();
  if (url) {
    session.setState(apps.uploader.Session.State.OPEN);
  }

  // Announce session before starting it
  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.FILE_SESSION_CREATED, file, this));

  // Check if we can start the transfer immediately.
  if (url) {
    this.startUpload_(file, url);
    return;
  }

  // Start the session querying the session server.
  session.start(this.sessionServerUrl_);
  this.setFileState(file, apps.uploader.File.State.START);
};


/**
 * Factory method for creating file I/O objects.
 * @param {apps.uploader.File} file The file to upload.
 * @return {!apps.uploader.net.FileIo} The file upload request.
 * @protected
 */
apps.uploader.BaseUploader.prototype.createFileIo = function(file) {
  return new apps.uploader.net.FileIo(file);
};


/**
 * Called when a file upload has successfully completed.
 * @param {goog.events.Event} event The event.
 * @protected
 */
apps.uploader.BaseUploader.prototype.onUploadSuccess = function(event) {
  var fileIo = event.target;
  var file = fileIo.getFile();
  var session = this.getSession(file);
  var endTime = goog.now();

  // Update upload state
  try {
    session.processFinalizationResponse(fileIo.getResponseText());
    var sessionState = session.getState();
    var finalizationStatus = session.getFinalizationStatus();
    var success =
        sessionState == apps.uploader.Session.State.FINALIZED &&
        (finalizationStatus ==
             apps.uploader.Session.FinalizationStatus.SUCCESS ||
         finalizationStatus ==
             apps.uploader.Session.FinalizationStatus.QUEUED);
    if (success) {
      this.setFileState(file, apps.uploader.File.State.SUCCESS);
    } else {
      this.setFileError(file, apps.uploader.ErrorCode.SERVER_REJECTED);
      this.setFileState(file, apps.uploader.File.State.ERROR);
    }
  } catch (ex) {
    // Most probably, the response is not valid JSON. It means that something is
    // seriously screwed up.
    goog.log.error(this.logger, 'Invalid response to the upload request', ex);
    this.setFileError(file, apps.uploader.ErrorCode.SERVER_INVALID_RESPONSE);
    this.setFileState(file, apps.uploader.File.State.ERROR);
  }

  // Clean up the recovery storage.
  if (this.recoveryStorage_) {
    this.recoveryStorage_.remove(this.getRecoveryHash_(file));
    if (this.recoveryStorage_ instanceof goog.storage.CollectableStorage &&
        this.getFileState(file) == apps.uploader.File.State.SUCCESS) {
      this.recoveryStorage_.collect();
    }
  }

  // Send stats for a successful upload.
  this.reportStats_(file, apps.uploader.common.Stats.EventType.SUCCESS);
  this.collectGroupData_(file, endTime);
};


/**
 * Called by addFile. This method is responsible for any post handling of
 * adding a file. By default this method will queue a file for uploading.
 * @param {apps.uploader.File} file The file added to the uploader.
 * @protected
 */
apps.uploader.BaseUploader.prototype.addFileInternal = function(file) {
  this.queueUploadInternal(file);
};


/**
 * Overridden by subclasses.
 * @return {boolean} True if this uploader supports retying a canceled or
 *     failed upload.
 * @protected
 */
apps.uploader.BaseUploader.prototype.isRetrySupported = function() {
  return false;
};


/**
 * @return {apps.uploader.Session.TransferMechanism} Transfer mechanism.
 * @protected
 */
apps.uploader.BaseUploader.prototype.getTransferMechanism = function() {
  return apps.uploader.Session.TransferMechanism.FORM_POST;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Handles the unload event for the uploader.
 * @private
 */
apps.uploader.BaseUploader.prototype.handleWindowUnload_ = function() {
  this.clearFileList();  // Removes inactive uploads.
  for (var i = 0; i < this.fileList.length; i++) {
    var file = this.fileList[i];
    if (file && file.getStatsUrl() && file.getUploadId()) {
      this.stats_.collect(file.getStatsUrl(),
                          file.getUploadId(),
                          apps.uploader.common.Stats.EventType.UNLOAD,
                          '',
                          goog.now());
    }
  }
  this.stats_.store();
};


/**
 * Returns true if the current number of simultaneous uploads is at the maximum
 * allowed.
 * @return {boolean} Whether or not the upload count is saturated.
 * @private
 */
apps.uploader.BaseUploader.prototype.atMaxUploads_ = function() {
  return (this.currentUploadCount_ >= this.maxSimultaneousUploads_);
};


/**
 * This method continues to start uploads until the maximum number of
 * simultaneous uploads has been reached.
 * @private
 */
apps.uploader.BaseUploader.prototype.fillMaxUploads_ = function() {
  while (!this.atMaxUploads_() && !this.uploadQueue_.isEmpty()) {
    this.nextUpload();
  }
};


/**
 * Starts the recovery process for a particular file. If the file upload can't
 * be recovered, it starts a regular upload session.
 * @param {apps.uploader.File} file The file to upload.
 * @param {string} url The upload URL.
 * @param {number=} opt_lastTime Time of the last upload attempt.
 * @private
 */
apps.uploader.BaseUploader.prototype.recoverUpload_ = function(
    file, url, opt_lastTime) {
  var uploader = this;
  var fileInfo = this.getFileInfo(file);
  if (!fileInfo.fileIo) {
    fileInfo.fileIo = this.createFileIo(file);
  }
  var recovery = new apps.uploader.Recovery(fileInfo, url, opt_lastTime);
  this.eventHandler_.
      listen(recovery, apps.uploader.Recovery.EventType.SUCCESS,
          goog.bind(this.startUploadSession, this, file)).
      listen(recovery, apps.uploader.Recovery.EventType.ERROR_QUERYING,
          goog.bind(this.startUploadSession, this, file)).
      listen(recovery, apps.uploader.Recovery.EventType.ERROR_HASHING,
          goog.bind(this.startUploadSession, this, file)).
      listen(recovery, apps.uploader.Recovery.EventType.HASHING,
          function() {
            uploader.dispatchEvent(new apps.uploader.FileEvent(
                apps.uploader.EventType.FILE_HASHING_STARTED, file, uploader));
          });
  fileInfo.recovery = recovery;
  recovery.start();

  this.setFileState(file, apps.uploader.File.State.RECOVERY);
};


/**
 * Starts the upload for given file. Called after successful session creation.
 * @param {apps.uploader.File} file The file to upload.
 * @param {string} url The upload URL.
 * @private
 */
apps.uploader.BaseUploader.prototype.startUpload_ = function(file, url) {
  // Don't start the upload if the user aborted while the session was being
  // established.
  if (file.getLastErrorCode() == apps.uploader.ErrorCode.ABORT) {
    return;
  }

  // Keep the destination URLs in recovery storage for 10 days.
  if (this.recoveryStorage_) {
    var hash = this.getRecoveryHash_(file);
    try {
      // This might fail when storage quota is exhausted.
      this.recoveryStorage_.set(hash, file.getSessionUrl(),
          goog.now() + 864000000);
    } catch (e) {}
  }

  var fileInfo = this.getFileInfo(file);
  if (!fileInfo.fileIo) {
    fileInfo.fileIo = this.createFileIo(file);
  }
  var fileIo = fileInfo.fileIo;
  this.setFileState(file, apps.uploader.File.State.TRANSFER);

  var et = apps.uploader.net.EventType;
  this.eventHandler_.
      listen(fileIo, et.SUCCESS, this.onUploadSuccess).
      listen(fileIo, et.ERROR, this.onUploadError_).
      listen(fileIo, et.PROGRESS, this.onUploadProgress_).
      listen(fileIo, et.BACKOFF, this.onUploadBackoff_);

  // Store this upload in the proper group.
  if (!this.groupedUploads_[file.getId()]) {
    // If this upload isn't grouped already, it's the start of a new group.
    // Add all files selected into a new group.
    var groupId = file.getUploadId();
    var selectedFiles = [];
    this.uploadSessionStart_[groupId] = goog.now();
    for (var i = 0; i < this.fileList.length; i++) {
      var fileToAdd = this.fileList[i];
      if (fileToAdd && !this.groupedUploads_[fileToAdd.getId()]) {
        this.groupedUploads_[fileToAdd.getId()] = groupId;
        selectedFiles.push(fileToAdd);
      }
    }
    this.relatedUploads_[groupId] = selectedFiles;
  }

  // Send the select and start events for this upload.
  this.reportStats_(file,
                    apps.uploader.common.Stats.EventType.SELECT,
                    '' + (file.getRetryCount() || ''),
                    file.getSelectionTime());
  this.reportStats_(file,
                    apps.uploader.common.Stats.EventType.START);

  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.FILE_IO_CREATED, file, this));

  fileIo.send(url);
};


/**
 * Reports event data to the client stats server for an upload.
 * @param {apps.uploader.File} file The file being uploaded.
 * @param {apps.uploader.common.Stats.EventType} eventType The event being
 *     reported.
 * @param {string=} opt_message Optional message to report.
 * @param {number=} opt_time Optional timestamp of the event.
 * @private
 */
apps.uploader.BaseUploader.prototype.reportStats_ = function(file, eventType,
    opt_message, opt_time) {
  var time = opt_time || goog.now();
  var reportUrl = file.getStatsUrl();
  var uploadId = file.getUploadId();
  if (reportUrl && uploadId) {
    this.stats_.collect(reportUrl,
                        uploadId,
                        eventType,
                        opt_message,
                        time);
    this.stats_.report();
  }
};


/**
 * Reports related upload data to the client stats server.
 * @param {apps.uploader.File} file The file being uploaded.
 * @param {number} uploadEndTime The time this upload finished.
 * @private
 */
apps.uploader.BaseUploader.prototype.collectGroupData_ = function(file,
    uploadEndTime) {
  var groupId = this.groupedUploads_[file.getId()];
  if (!groupId) {
    return;
  }

  var relatedFiles = this.relatedUploads_[groupId];
  if (relatedFiles.length < 2 ||
      relatedFiles[relatedFiles.length - 1] != file) {
    // No need to send stats for a single file upload, or if this is not the
    // last upload in this group.
    return;
  }

  var reportUrl = relatedFiles[0].getStatsUrl();
  var totalSize = 0;
  if (reportUrl) {
    var uploadIds = [];
    for (var i in relatedFiles) {
      if (relatedFiles[i] != null && relatedFiles[i].getUploadId() != null) {
        uploadIds.push(relatedFiles[i].getUploadId());
        totalSize += relatedFiles[i].getBytesTotal();
      }
    }

    var latency =
        parseInt(uploadEndTime - this.uploadSessionStart_[groupId], 10);
    this.stats_.groupUploads(reportUrl, uploadIds, latency, totalSize);
    this.stats_.report();
  }
};


/**
 * Produces an upload identifier for upload recovery. The identifier depends
 * on the upload destination and on file metadata hash. Same file uploaded to
 * the same upload service should result in the same hash value.
 * @param {apps.uploader.File} file The file to upload.
 * @return {string} The upload identifier.
 * @private
 */
apps.uploader.BaseUploader.prototype.getRecoveryHash_ = function(file) {
  return this.sessionServerUrl_ + ':' + file.getInfoHash();
};


/**
 * Creates an upload session object, and sets up default success and error
 * handlers.
 * @param {apps.uploader.File} file The file to include in this upload session.
 * @return {!apps.uploader.Session} The session object.
 * @private
 */
apps.uploader.BaseUploader.prototype.createAndSetupSession_ = function(file) {
  var session = new apps.uploader.Session(file, this.getTransferMechanism());
  session.setClientId(this.getClientId());
  if (this.useRelativeUrls_) {
    session.setUseRelativeUrls(true);
  }
  this.eventHandler_.
      listen(session, apps.uploader.Session.EventType.START_SUCCESS,
          this.onSessionStart_).
      listen(session, apps.uploader.Session.EventType.START_ERROR,
          this.onSessionError_);
  return session;
};




/**
 * Called when the {@link apps.uploader.Session} for a file has been
 * successfully created. This method starts the actual file upload for the file
 * associated with the session.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.BaseUploader.prototype.onSessionStart_ = function(event) {
  var session = event.target;
  var file = session.getFile();
  var url = file.getUploadUrl();
  if (url) {
    // insertimage接口灰度
    if(url.indexOf('/insertimage/') !== -1){
        url = office.apiFlagUtil.getUrl(url);
    }
    this.startUpload_(file, url);
  } else {
    throw Error('no upload URL for ' + file);
  }
};


/**
 * Called when there is an error creating the {@link apps.uploader.Session} for
 * a file.
 * @param {apps.uploader.SessionEvent} event The event.
 * @private
 */
apps.uploader.BaseUploader.prototype.onSessionError_ = function(event) {
  var file = event.target.getFile();
  goog.log.warning(this.logger,
      'SessionError: ' + file.getLastErrorCode() + ' ' +
                      file.getLastErrorMessage() + ' ' + file);
  // Getting 'invalid JSON String:' errors in safari. May be due to empty string
  // callback. Check goog.json.parse for details.
  // Update upload state.
  this.setFileState(file, apps.uploader.File.State.ERROR);
};


/**
 * Called when there is a change in the bytes transferred during a file upload.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.BaseUploader.prototype.onUploadProgress_ = function(event) {
  var file = event.target.getFile();
  // Update upload progress
  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.UPLOAD_PROGRESS, file));

  //  Add sending of progress stats here.
};


/**
 * Called if there is an error when attempting to upload a file.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.BaseUploader.prototype.onUploadError_ = function(event) {
  var request = event.target;
  var file = request.getFile();

  //接口更新之后，报错有code 和 message
  var requestText = request && request.getResponseText && request.getResponseText();
  if(requestText){
      try{
        var errResp = JSON.parse(requestText);
        office.ui.ButterManager.getInstance().postMessage(office.ui.ButterManager.createItem( errResp['code'] && errResp['code'] != 0 && errResp['message'] || '请求失败',
            controls.ButterBar.Type.ERROR, false, 1500));
      }catch(e){
        office.ui.ButterManager.getInstance().postMessage(office.ui.ButterManager.createItem( '请求失败',
          controls.ButterBar.Type.ERROR, false, 1500));
      }
  }else{
    office.ui.ButterManager.getInstance().postMessage(office.ui.ButterManager.createItem( '请求失败',
          controls.ButterBar.Type.ERROR, false, 1500));
  }

  var endTime = goog.now();

  goog.log.warning(this.logger, 'UploadError:' + file.getLastErrorCode() + ' ' +
                      file.getLastErrorMessage() + ' ' + file);
  var session = this.getSession(file);
  try {
    session.processFinalizationResponse(request.getResponseText());
  } catch (ex) {
    // This is normal if the upload request is never sent or does not complete.
    goog.log.warning(this.logger, 'Invalid response to the upload request: ',
                         request.getResponseText());
  }
  // Update upload state.
  this.setFileState(file, apps.uploader.File.State.ERROR);

  // Send stats for an error in the upload.
  this.reportStats_(file, apps.uploader.common.Stats.EventType.ERROR,
                    file.getLastErrorMessage(), goog.now());

  // Send group data.
  this.collectGroupData_(file, endTime);

  // Avoid getting stuck in an error state.
  if (this.recoveryStorage_) {
    this.recoveryStorage_.remove(this.getRecoveryHash_(file));
  }
};


/**
 * Called when the upload encounters a retryable error.
 * @param {goog.events.Event} event The event.
 * @private
 */
apps.uploader.BaseUploader.prototype.onUploadBackoff_ = function(event) {
  var file = event.target.getFile();
  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.UPLOAD_BACKOFF, file));
};


/**
 * Sends an explicit cancel (DELETE) request to the session url. This is
 * necessary because sometime the browser does not actually abort the fileio in
 * progress. The explicit cancel request will notification the agent that the upload
 * has been cancelled.
 * @param {apps.uploader.File} file The file to send the explicit cancel for.
 * @private
 */
apps.uploader.BaseUploader.prototype.sendExplicitCancel_ = function(file) {
  var sessionUrl = file.getSessionUrl();
  if (!sessionUrl) {
    return;
  }

  // Just fire and forget.
  var request = new goog.net.XhrIo();
  request.send(sessionUrl, 'DELETE');
};
