goog.provide('apps.uploader.FileInfo2');
goog.provide('apps.uploader.FlashFileInfo2');

goog.require('apps.uploader.File.State');
goog.require('goog.dispose');



/**
 * @param {apps.uploader.File} file The file to be contained.
 * @constructor
 */
apps.uploader.FileInfo2 = function(file) {

  /**
   * The file whose information is contained in this object.
   * @type {apps.uploader.File}
   */
  this.file = file;
};


/**
 * Upload session.
 * @type {apps.uploader.Session}
 */
apps.uploader.FileInfo2.prototype.session = null;


/**
 * File I/O object.
 * @type {apps.uploader.net.FileIo}
 */
apps.uploader.FileInfo2.prototype.fileIo = null;


/**
 * Upload recovery.
 * @type {apps.uploader.Recovery}
 */
apps.uploader.FileInfo2.prototype.recovery = null;


/**
 * HTML5 Blob object.  The File object derives from Blob.
 * @type {Blob}
 */
apps.uploader.FileInfo2.prototype.blob = null;


/**
 * File is drag-and-dropped.
 * @type {boolean}
 */
apps.uploader.FileInfo2.prototype.isFileDropped = false;


/**
 * File  upload state.
 * @type {apps.uploader.File.State}
 */
apps.uploader.FileInfo2.prototype.state = apps.uploader.File.State.DEFAULT;


/**
 * Resets the state of the file info so that the file can be uploaded again.
 * Preserves info required to upload the file. Overridden in subclasses.
 */
apps.uploader.FileInfo2.prototype.resetTransferState = function() {
  goog.dispose(this.session);
  this.session = null;
  goog.dispose(this.fileIo);
  this.fileIo = null;
  goog.dispose(this.recovery);
  this.recovery = null;
  this.state = apps.uploader.File.State.DEFAULT;
};


/**
 * A specialized container that gathers information about a file backed by a
 * Flash file object.
 * @param {apps.uploader.File} file The file to be contained.
 * @constructor
 * @extends {apps.uploader.FileInfo2}
 */
apps.uploader.FlashFileInfo2 = function(file) {
  apps.uploader.FileInfo2.call(this, file);
};
goog.inherits(apps.uploader.FlashFileInfo2, apps.uploader.FileInfo2);


/**
 * A Flash file object.
 * @type {Object}
 */
apps.uploader.FlashFileInfo2.prototype.flashFile = null;


/**
 * The id of the Flash element which knows about this file
 * @type {string}
 */
apps.uploader.FlashFileInfo2.prototype.flashId = '';
