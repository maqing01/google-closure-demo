/**
 * @fileoverview Contains the definition of the
 * office.localstore.DocumentFileLocation class.

 */

goog.provide('office.localstore.DocumentFileLocation');


/**
 * The top-level directory that files are synced under in the new directory
 * format.
 * @type {string}
 * @private
 */
office.localstore.DocumentFileLocation.DIRECTORY_ = 'documents';


/**
 * Returns the directory associated with the given document id.
 * @param {string} docId The id of the document the file is associated with.
 * @return {!Array.<string>} The array of paths that make up the directory.
 */
office.localstore.DocumentFileLocation.getDirectory = function(docId) {
  return [office.localstore.DocumentFileLocation.DIRECTORY_, docId];
};


/**
 * Returns the parent directory of all document files.
 * @return {!Array.<string>} The array of paths that make up the directory.
 */
office.localstore.DocumentFileLocation.getParentDirectory = function() {
  return [office.localstore.DocumentFileLocation.DIRECTORY_];
};


/**
 * Extracts the document id from the given directory path.
 * @param {!Array.<string>} directory The path of the directory.
 * @return {?string} The documentId corresponding to the given directory or null
 *     if the given directory does not correspond to a specific document.
 */
office.localstore.DocumentFileLocation.extractDocumentId = function(directory) {
  if (directory.length < 2) {
    return null;
  }
  return directory[0] == office.localstore.DocumentFileLocation.DIRECTORY_ ?
      directory[1] : null;
};
