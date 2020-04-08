

/**
 * @fileoverview Events triggered by the uploader library.
 *
 * @author bleper@google.com (Bartosz Leper)
 */

goog.provide('apps.uploader.EventType');
goog.provide('apps.uploader.FileEvent');
goog.provide('apps.uploader.FileListEvent');
goog.provide('apps.uploader.FileMessageEvent');
goog.provide('apps.uploader.FilePreviewEvent');
goog.provide('apps.uploader.UploaderEvent');

goog.require('goog.events.Event');


/**
 * Event types fired by the UI classes.
 * @enum {string}
 */
apps.uploader.EventType = {
  /**
   * A {@link apps.uploader.File} instance has been added to the file list.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  FILE_ADDED: 'fileadded',

  /**
   * A {@link apps.uploader.File} instance has been removed from the file list.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  FILE_REMOVED: 'fileremoved',

  /**
   * Fired as soon as files have been selected or dropped. Fired before
   * FILES_SELECTED and before any processing is done. Does not contain the
   * files selected since this may take some processing to determine.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link goog.events.Event}.
   */
  FILES_SCAN_STARTED: 'filesscanstarted',

  /**
   * Fired when file scanning is finished. Will always be fired after a
   * corresponding FILES_SCAN_STARTED event. FILES_SELECTED may be fired after
   * this event or it may not (if selected directories were empty or all files
   * were filtered). If FILES_SELECTED is fired, it will be after this event.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link goog.events.Event}.
   */
  FILES_SCAN_FINISHED: 'filesscanfinished',

  /**
   * User selected some files. Fired by {@link apps.uploader.BaseUploader}
   * and descendants.
   * Event type: {@link apps.uploader.FileListEvent}.
   */
  FILES_SELECTED: 'filesselected',

  /**
   * All {@link apps.uploader.File} instances in a batch addFiles() operation
   * have been added to the file list. This will alert clients that all files
   * in a multi-select (browse or drag-and-drop) context have been queued and
   * added (so they may then take appropriate actions).
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileListEvent}.
   */
  ALL_FILES_ADDED: 'allfilesadded',

  /**
   * The {@link apps.uploader.Session} associated with a given file has been
   * created. This event is fired by {@link apps.uploader.BaseUploader} and
   * descendants right before the session info is sent to the upload server.
   * Event type: {@link apps.uploader.FileEvent}
   */
  FILE_SESSION_CREATED: 'filesessioncreated',

  /**
   * The {@link goog.crypt.BlobHasher} associated with a given file has been
   * created and file checksum has started being computed. This event is fired
   * by {@link apps.uploader.BaseUploader}.
   * Event type: {@link apps.uploader.FileEvent}
   */
  FILE_HASHING_STARTED: 'filehashingstarted',

  /**
   * The {@link apps.uploader.netFileIo} associated with a given file has been
   * created. This event is fired right before the upload of the file begins.
   * Event type: {@link apps.uploader.FileEvent}
   */
  FILE_IO_CREATED: 'fileiocreated',

  /**
   * @deprecated Use FILE_IO_CREATED instead.
   */
  FILE_UPLOAD_CREATED: 'fileiocreated',

  /**
   * All uploads have been processed, regardless of success state.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link goog.events.Event}.
   */
  ALL_FILES_COMPLETED: 'allfilescompleted',

  /**
   * Upload state of a file item changed. Fired by
   * {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  UPLOAD_STATE_CHANGED: 'uploadstatechanged',

  /**
   * Upload made progress. Fired by
   * {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  UPLOAD_PROGRESS: 'uploadprogress',

  /**
   * Upload encountered a retryable error (e.g., broken network connection,
   * transient server error) and will retry with exponential backoff. This event
   * is fired when the first error is encountered. It will not be fired
   * again for additional errors unless some progress has been made and then
   * another retryable error occurs.
   * Note: Fired by {@link apps.uploader.XhrUploader} only. Not supported by
   * other upload mechanisms.
   * Event type: {@link apps.uploader.FileEvent}
   */
  UPLOAD_BACKOFF: 'uploadbackoff',

  /**
   * Indicates a file item's status message should be changed.
   * Fired by {@link apps.uploader.BaseUploader} and descendants.
   * Event type: {@link apps.uploader.FileMessageEvent}.
   */
  UPLOAD_MESSAGE_CHANGED: 'uploadmessagechanged',

  /**
   * Indicates downsampling for a file has started.  Currently fired by
   * {@link apps.uploader.XhrUploader}.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  FILE_DOWNSAMPLING_STARTED: 'filedownsamplingstarted',

  /**
   * Indicates downsampling for a file is completed.  Currently fired by
   * {@link apps.uploader.XhrUploader}.
   * Event type: {@link apps.uploader.FileEvent}.
   */
  FILE_DOWNSAMPLING_COMPLETED: 'filedownsamplingcompleted',

  /**
   * Indicates a file item's image preview is available. Currently fire by
   * {@link apps.uploader.FlashUploader}.
   * Event type: {@link apps.uploader.FilePreviewEvent}.
   */
  FILE_PREVIEW_READY: 'filepreviewready',

  /**
   * Dispatched when there is an error generating a file preview. Currently
   * fired by {@link apps.uploader.FlashUploader}.
   * Even type: {@link apps.uploader.FileEvent}.
   */
  FILE_PREVIEW_ERROR: 'filepreviewerror',

  /**
   * Event identifying that the uploader is being installed.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  UPLOADER_INSTALLING: 'uploaderinstalling',

  /**
   * Event identifying that the uploader is being uninstalled.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  UPLOADER_UNINSTALLING: 'uploaderuninstalling',

  /**
   * Event identifying that the uploader applet has been inserted into the DOM.
   * Applet stands for Java applets, Flash and Silverlight applications, etc.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  APPLET_INSERTED_IN_DOM: 'appletinsertedindom',

  /**
   * Event identifying that the uploader applet failed to load, e.g., due to
   * missing applet file or network error. Applet stands for Java applets,
   * Flash and Silverlight applications, etc.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  APPLET_FAILED_TO_LOAD: 'appletfailedtoload',

  /**
   * Event identifying that the uploader was not given the security permissions
   * necessary to execute properly.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  UPLOADER_WITHOUT_PERMISSION: 'uploaderwithoutpermission',

  /**
   * Event identifying that the uploader applet was loading too slowly, or has
   * loaded but has failed to communicate with the uploader JavaScript code.
   * Applet stands for Java applets, Flash and Silverlight applications, etc.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  APPLET_TIMED_OUT: 'applettimedout',

  /**
   * Event identifying that the uploader applet loaded successfully, but has
   * failed to initialize, e.g., crashed when configuring itself. Applet stands
   * for Java applets, Flash and Silverlight applications, etc.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  APPLET_FAILED_TO_INITIALIZE: 'appletfailedtoinitialize',

  /**
   * Event identifying that the uploader is ready to use, e.g., applet loaded
   * successfully, with permissions to execute properly, and has initialized
   * correctly.
   * Event type: {@link apps.uploader.UploaderEvent}.
   */
  UPLOADER_READY: 'uploaderready'
};



/**
 * A class for events dispatched by uploaders when file list changes.
 * @param {apps.uploader.EventType} type The event type.
 * @param {Array.<apps.uploader.File>} files Files that were affected.
 * @param {Object=} opt_target Target of this event.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.FileListEvent = function(type, files, opt_target) {
  goog.events.Event.call(this, type, opt_target);

  /**
   * Files that were affected by this event.
   * @type {Array.<apps.uploader.File>}
   */
  this.files = files;
};
goog.inherits(apps.uploader.FileListEvent, goog.events.Event);



/**
 * A class for events dispatched when an individual file is affected.
 * @param {string} type The event type.
 * @param {apps.uploader.File} file The affected file.
 * @param {Object=} opt_target Target of this event.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.FileEvent = function(type, file, opt_target) {
  goog.events.Event.call(this, type, opt_target);

  /**
   * File affected by this event.
   * @type {apps.uploader.File}
   */
  this.file = file;
};
goog.inherits(apps.uploader.FileEvent, goog.events.Event);



/**
 * A class for UPLOAD_MESSAGE_CHANGED events.
 * @param {apps.uploader.File} file The affected file.
 * @param {string} message The message to be shown, empty if the message is to
 *     be hidden.
 * @param {Object=} opt_target Target of this event.
 * @constructor
 * @extends {apps.uploader.FileEvent}
 */
apps.uploader.FileMessageEvent = function(file, message, opt_target) {
  apps.uploader.FileEvent.call(this,
      apps.uploader.EventType.UPLOAD_MESSAGE_CHANGED, file, opt_target);

  /**
   * Message to be shown, or empty to hide.
   * @type {string}
   */
  this.message = message;
};
goog.inherits(apps.uploader.FileMessageEvent, apps.uploader.FileEvent);



/**
 * A class for FILE_PREVIEW_READY events.
 * @param {apps.uploader.File} file The affected file.
 * @param {string} preview The file preview image data uri.
 * @param {Object=} opt_data Additional data about the preview such as
 *     dimensions or image quality.
 * @param {Object=} opt_target Target of this event.
 * @constructor
 * @extends {apps.uploader.FileEvent}
 */
apps.uploader.FilePreviewEvent = function(file, preview, opt_data, opt_target) {
  apps.uploader.FileEvent.call(this,
      apps.uploader.EventType.FILE_PREVIEW_READY, file, opt_target);

  /**
   * Preview image data uri.
   * @type {string}
   */
  this.preview = preview;

  /**
   * Additional info about the preview image.
   * @type {Object}
   */
  this.previewInfo = opt_data || null;
};
goog.inherits(apps.uploader.FilePreviewEvent, apps.uploader.FileEvent);



/**
 * A class for events dispatched when a whole uploader is affected.
 * @param {string} type The event type.
 * @param {apps.uploader.BaseUploader} uploader The affected uploader.
 * @param {Object=} opt_target Target of this event.
 * @constructor
 * @extends {goog.events.Event}
 */
apps.uploader.UploaderEvent = function(type, uploader, opt_target) {
  goog.events.Event.call(this, type, opt_target);

  /**
   * Uploader affected by this event.
   * @type {apps.uploader.BaseUploader}
   */
  this.uploader = uploader;
};
goog.inherits(apps.uploader.UploaderEvent, goog.events.Event);
