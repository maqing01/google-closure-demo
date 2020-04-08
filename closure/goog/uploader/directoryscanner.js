

/**
 * @fileoverview Class for scanning a directory.
 *
 * @author andyehou@google.com (Andy Hou)
 */

goog.provide('apps.uploader.DirectoryScanner');

goog.require('goog.string');



/**
 * Recursively scans a list of items to gather the contained files. The browser
 * must support DataTransferItem.webkitGetAsEntry().
 * @param {Object} items The list of items to scan.
 * @param {function(!Array.<!File>, !Array.<string>)} callback The
 *     callback that is called when scanning is finished with an array of Files.
 * @constructor
 */
apps.uploader.DirectoryScanner = function(items, callback) {
  /**
   * Callback this is called when scanning is finished with an array of Files.
   * @type {function(!Array.<!File>, !Array.<string>)}
   * @private
   */
  this.callback_ = callback;

  /**
   * An array of Files found.
   * @type {!Array.<!File>}
   * @private
   */
  this.files_ = [];

  /**
   * An array of paths indicating directories.
   * @type {!Array.<string>}
   * @private
   */
  this.directoryPaths_ = [];

  /**
   * An array of DirectoryEntry objects found but yet to be scanned.
   * @type {!Array.<!DirectoryEntry>}
   * @private
   */
  this.unscannedDirectories_ = [];

  /**
   * The number of directory read operations in progress.
   * @type {number}
   * @private
   */
  this.directoryOps_ = 0;

  /**
   * The number of file load operations in progress.
   * @type {number}
   * @private
   */
  this.fileOps_ = 0;

  /**
   * True if scanning has been stopped.
   * @type {boolean}
   * @private
   */
  this.scanStopped_ = false;

  /**
   * The number of simultaneous directory read operations to use.
   * @type {number}
   * @private
   */
  this.MAX_SIMULTANEOUS_DIRECTORY_OPS_ = 1;

  this.initialize_(items);
};


/**
 * The path separator used when processing paths.
 * @type {string}
 * @private
 */
apps.uploader.DirectoryScanner.PATH_SEPARATOR_ = '/';


// ----------------------------------------------------------------------------
// Public Methods
// ----------------------------------------------------------------------------


/**
 * Starts or continues scanning.
 */
apps.uploader.DirectoryScanner.prototype.start = function() {
  this.scanStopped_ = false;
  this.continueScan_();
};


/**
 * Stops scanning. Scanning may be resumed later by calling start again.
 */
apps.uploader.DirectoryScanner.prototype.stop = function() {
  this.scanStopped_ = true;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Initializes scanning.
 * @param {Object} items The list of items to scan.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.initialize_ = function(items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item['kind'] != 'file') {
      continue;
    }
    var entry = item['webkitGetAsEntry']();
    if (entry.isFile) {
      this.files_.push(item['getAsFile']());
    } else {
      this.unscannedDirectories_.push(entry);
      this.directoryPaths_.push(this.getPathFromEntry_(entry));
    }
  }
};


/**
 * Starts or continues a scan.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.continueScan_ = function() {
  if (this.scanStopped_) {
    return;
  }
  while (this.directoryOps_ < this.MAX_SIMULTANEOUS_DIRECTORY_OPS_ &&
      this.unscannedDirectories_.length > 0) {
    this.directoryOps_++;
    var entry = this.unscannedDirectories_.shift();
    var reader = entry.createReader();
    reader.readEntries(goog.bind(this.handleDirectorySuccess_, this, reader),
        goog.bind(this.handleDirectoryError_, this));
  }
  this.checkScanFinished_();
};


/**
 * Called when a directory is successfully read.
 * @param {!DirectoryReader} reader
 * @param {!Array.<!Entry>} entries The list of entries that were read.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.handleDirectorySuccess_ =
    function(reader, entries) {
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.isFile) {
      this.fileOps_++;
      entry.file(goog.bind(this.handleFileSuccess_, this, entry['fullPath']),
          goog.bind(this.handleFileError_, this));
    } else {
      this.unscannedDirectories_.push(entry);
      this.directoryPaths_.push(this.getPathFromEntry_(entry));
    }
  }
  if (entries.length == 0 || this.scanStopped_) {
    this.directoryOps_--;
    this.continueScan_();
  } else {
    // There might be more files than were returned in the initial request.
    // Read again until readEntries returns an empty array.
    reader.readEntries(goog.bind(this.handleDirectorySuccess_, this, reader),
        goog.bind(this.handleDirectoryError_, this));
  }
};


/**
 * Extracts the path from the specified File API Entry, appending a path
 * separator and removing and preceding path separator.
 * @param {!Entry} entry The Entry from which to extract the path.
 * @return {string} The path.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.getPathFromEntry_ =
    function(entry) {
  var fullPath = entry['fullPath'];

  // Append path separator if needed.
  if (!goog.string.endsWith(
      fullPath, apps.uploader.DirectoryScanner.PATH_SEPARATOR_)) {
    fullPath += apps.uploader.DirectoryScanner.PATH_SEPARATOR_;
  }

  // Strip first-char path separator if needed.
  return this.maybeStripPrecedingPathSeparator_(fullPath);
};


/**
 * Called when an error occurs while reading a directory.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.handleDirectoryError_ = function() {
  this.directoryOps_--;
  this.continueScan_();
};


/**
 * Called when the File object is successfully loaded.
 * @param {string} path The relative path of the file.
 * @param {File} file The File that was loaded.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.handleFileSuccess_ = function(
    path, file) {
  this.fileOps_--;
  // Remove the '/' from the start of the path if necessary. A relative path
  // should not start with '/'.
  path = this.maybeStripPrecedingPathSeparator_(path);

  file['relativePath'] = path;
  this.files_.push(file);
  this.checkScanFinished_();
};


/**
 * Removes the preceding separator from the specified path, if any.
 * @param {string} path The path from which to remove any preceding separator.
 * @return {string} The specified path with any preceding path separator
 *     removed.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.maybeStripPrecedingPathSeparator_ =
    function(path) {
  if (path && goog.string.startsWith(
      path, apps.uploader.DirectoryScanner.PATH_SEPARATOR_)) {
    path = path.substring(1);
  }
  return path;
};


/**
 * Called when an error occurs while loading a file.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.handleFileError_ = function() {
  this.fileOps_--;
  this.checkScanFinished_();
};


/**
 * Checks if scanning is finished.
 * @private
 */
apps.uploader.DirectoryScanner.prototype.checkScanFinished_ = function() {
  if (this.directoryOps_ == 0 && this.fileOps_ == 0 &&
      this.unscannedDirectories_.length == 0) {
    this.callback_(this.files_, this.directoryPaths_);
  }
};
