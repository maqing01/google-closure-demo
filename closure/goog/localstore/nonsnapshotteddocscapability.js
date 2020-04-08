/**
 * @fileoverview Base class for the capability used to track non-snapshotted
 * documents.

 */

goog.provide('office.localstore.NonSnapshottedDocsCapability');

goog.require('office.localstore.AbstractStorageCapability');



/**
 * Base class for the capability used to track non-snapshotted ocuments.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.NonSnapshottedDocsCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.NonSnapshottedDocsCapability,
    office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.NonSnapshottedDocsCapability.prototype.getSupportedRecordTypes =
    function() {
  return [];
};


/**
 * Adds a document id to the non-snapshotted document ids list in storage.
 * @param {string} documentId The new doc id to add to storage.
 * @param {function()} resultCallback Callback for when the document id is
 *     pushed.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.NonSnapshottedDocsCapability.prototype.
    pushNonSnapshottedDocumentId = goog.abstractMethod;


/**
 * Removes the given ids from the non-snapshotted document ids list in storage.
 * @param {!Array.<string>} documentIds The doc ids to remove.
 * @param {function()} resultCallback Callback for the document ids.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.NonSnapshottedDocsCapability.prototype.
    removeNonSnapshottedDocumentIds = goog.abstractMethod;
