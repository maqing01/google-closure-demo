
// All Rights Reserved.

/**
 * @fileoverview Encaspulates information about user selected directories as
 * well as information regarding the state of files the directory contains
 * during upload.
 *
 * @author natescottdavis@google.com (Nathan Davis)
 */

goog.provide('apps.uploader.Directory');

goog.require('apps.uploader.File');



/**
 * Directory object that contains other file entries.
 * @param {string} opt_path Full or partial file path.
 * @param {number} opt_size Recursive sum size (in bytes) of all the the files
 *     in the directory.
 * @param {string} opt_relativeDirectoryPath The relative path of the
 *     directory from which this file was selected (if this file was selected as
 *     part of a single directory selection). For example, if the user selects
 *     the directory "/home/dir", and "/home/dir/foo/file.txt" is contained (and
 *     consequently selected), this value will be "dir/foo/".
 * @param {string} opt_selectionId The selection identifier, which
 *     for some uploaders, maps to an absolute file path known only to the
 *     plugin (for security purposes).
 * @param {number} opt_fileCount The total (recursive) number of files contained
 *     in this directory.
 * @param {number=} opt_modifiedTime The time in milliseconds that the directory
 *     was last modified according to the OS.
 * @constructor
 * @extends {apps.uploader.File}
 */
apps.uploader.Directory = function(opt_path, opt_size,
    opt_relativeDirectoryPath, opt_selectionId, opt_fileCount,
    opt_modifiedTime) {
  apps.uploader.File.call(this, opt_path, opt_size, opt_relativeDirectoryPath,
      opt_selectionId, opt_modifiedTime);

  /**
   * The total number of file entries (recursive) contained in this directory.
   * @type {number|undefined}
   * @private
   */
  this.fileCount_ = opt_fileCount;

  /**
   * Entries contained (to be uploaded) in this directory.
   * @type {!Array.<!apps.uploader.File>}
   * @private
   */
  this.entries_ = [];

  /**
   * Name to index key value pairs for entry names and their associated index
   * in this.entries_.  The purpose of this index is to enable fast lookups of
   * entries by name.
   * @type {!Object}
   * @private
   */
  this.entriesNameIndex_ = {};

  /**
   * Directory indicator entries contained in this directory, for reference but
   * not to be uploaded.
   * @type {!Array.<!apps.uploader.File>}
   * @private
   */
  this.directoryIndicatorEntries_ = [];
};
goog.inherits(apps.uploader.Directory, apps.uploader.File);


/**
 * Adds a file (or directory) entry to this directory.  Note that this method
 * only establishes a parent-child relationship between the directory and the
 * entry, and the fileCount_ and size_ properties are not updated.  The size
 * and file count information is determined previously (by the client mechanism)
 * and thus does not need to be changed here.
 * @param {!apps.uploader.File} entry The file or directory contained in this
 *     directory.
 */
apps.uploader.Directory.prototype.addEntry = function(entry) {
  if (!entry.isDirectoryIndicator()) {
    this.entries_.push(entry);
    this.entriesNameIndex_[entry.getBaseName()] = this.entries_.length - 1;
  } else {
    this.directoryIndicatorEntries_.push(entry);
  }
};


/**
 * Removes a file or directory entry from this directory. The entry to be
 * removed can be arbitrarily deep (it doesn't need to be a top level entry).
 * This directory does not need to be the top level directory, but can also be
 * a subdirectory arbitrarily deep.
 * @param {!apps.uploader.File} entry The file or directory to remove from this
 *     directory.
 * @return {boolean} True if the file or directory was successfully removed.
 */
apps.uploader.Directory.prototype.removeEntry = function(entry) {
  // Compute the path of the entry to be removed relative to this directory.
  var path = entry.getName();
  var thisPath = this.getName();
  for (var i = 0; i < path.length && i < thisPath.length; i++) {
    if (path.charAt(i) != thisPath.charAt(i)) {
      break;
    }
  }
  var relativePath = path.substring(i + 1);
  var removed = this.removeEntryRec_(relativePath);

  if (removed) {
    // Update the stats on the top level directory (which is not necessarily
    // this directory).
    var topLevelDirectory = this.getDirectoryToUpdateOnChange() || this;
    topLevelDirectory.computeStats();
  }

  return removed;
};


/**
 * Removes a file or directory with the given relative path from this
 * directory.
 * @param {!string} path The path (relative to this directory) of the file or
 *     directory to remove.
 * @return {boolean} True if the file or directory was successfully removed.
 * @private
 */
apps.uploader.Directory.prototype.removeEntryRec_ = function(path) {
  var firstSeparator = path.indexOf(apps.uploader.File.PATH_SEPARATOR);
  var match = firstSeparator >= 0 ? path.substring(0, firstSeparator) : path;
  for (var i = 0; i < this.entries_.length; i++) {
    var entry = this.entries_[i];
    if (entry.getBaseName() == match) {
      if (entry instanceof apps.uploader.Directory) {
        if (firstSeparator < 0) {
          // Found a directory that matches, remove it.
          this.removeEntryAt_(i);
          return true;
        } else {
          // Found a directory that matches, but we need to look inside.
          var relativePath = path.substring(firstSeparator + 1);
          return entry.removeEntryRec_(relativePath);
        }
      } else {
        // Found a file that matches, remove it.
        this.removeEntryAt_(i);
        return true;
      }
    }
  }
  return false;
};


/**
 * Removes the entry at the given index.
 * @param {number} index The index in this.entries_ to remove.
 * @private
 */
apps.uploader.Directory.prototype.removeEntryAt_ = function(index) {
  var entry = this.entries_[index];
  this.entries_.splice(index, 1);

  // Update the entry name to index mapping.
  delete this.entriesNameIndex_[entry.getBaseName()];
  for (var i = index; i < this.entries_.length; i++) {
    var name = this.entries_[i].getBaseName();
    this.entriesNameIndex_[name]--;
  }
};


/**
 * Gets the top-level entry specified by the given base name if it exists.
 * @param {string} baseName The base name of the entry.
 * @return {?apps.uploader.File} The entry if it exists, or null if not.
 */
apps.uploader.Directory.prototype.getEntry = function(baseName) {
  var index = this.entriesNameIndex_[baseName];
  if (index != undefined) {
    return this.entries_[index];
  }
  return null;
};


/**
 * Gets all of the top-level entries of this directory.
 * @return {!Array.<!apps.uploader.File>} The list of all entries contained in
 *     this directory.
 */
apps.uploader.Directory.prototype.getEntries = function() {
  return this.entries_;
};


/**
 * Gets all of the top-level directory indicator entries in this directory.
 * @return {!Array.<!apps.uploader.File>} The list of all directory indicator
 *     entries contained in this directory.
 */
apps.uploader.Directory.prototype.getDirectoryIndicatorEntries = function() {
  return this.directoryIndicatorEntries_;
};


/**
 * Computes the number of files and total size of this directory.  These values
 * can be obtained by calling the getBytesTotal and getFileCount methods.
 */
apps.uploader.Directory.prototype.computeStats = function() {
  var fileCount = 0;
  var bytesTotal = 0;
  var entries = this.entries_;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry instanceof apps.uploader.Directory) {
      var dirEntry = /** @type {apps.uploader.Directory} */ (entry);
      dirEntry.computeStats();
      fileCount += dirEntry.getFileCount();
    } else {
      fileCount += 1;
    }
    bytesTotal += entry.getBytesTotal();
  }
  this.setBytesTotal(bytesTotal);
  this.setFileCount(fileCount);
};


/**
 * Sets the total number of file entries (including subdirectories) contained
 * in this directory.
 * @param {number} fileCount The total number of file entries contained in this
 *     directory.
 */
apps.uploader.Directory.prototype.setFileCount = function(fileCount) {
  this.fileCount_ = fileCount;
};


/**
 * Gets the total number of file entries (including subdirectories) contained
 * in this directory.
 * @return {number|undefined} The total number of file entries contained in this
 *     directory.
 */
apps.uploader.Directory.prototype.getFileCount = function() {
  return this.fileCount_;
};

