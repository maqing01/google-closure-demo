/**
 * @fileoverview Base class for the docos capability.

 */

goog.provide('office.localstore.DocosCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Comment');
goog.require('office.localstore.Record');



/**
 * Base class for the user capability which manages reading and writing the
 * office.localstore.Comment record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DocosCapability = function() {
  goog.base(this);
};
goog.inherits(
    office.localstore.DocosCapability, office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.DocosCapability.prototype.getSupportedRecordTypes = function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.COMMENT];
};


/**
 * Fetches some comment objects for storage. Comments can be read in the
 * following combinations with the following (docId, state, id) combinations:
 * <ul>
 * <li>(docId, null, null): Reads all comments on a document.</li>
 * <li>(docId, null, id): Reads an individual comment on a document.</li>
 * <li>(null, state, null): Reads all comments in a given state.</li>
 * <li>
 *   (docId, state, null): Reads all comments on a document in a given state.
 * </li>
 * </ul>
 * Any other parameter combination is invalid and will result in an error.
 * @param {?string} docId If set, restricts only to this document ID.
 * @param {?office.localstore.Comment.State} state If set, restricts only to
 *     comments in this state.
 * @param {?string} id If set, restricts only to this comment ID.
 * @param {function(!Array.<!office.localstore.Comment>)} resultCallback
 *     Callback to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocosCapability.prototype.readComments = goog.abstractMethod;


/**
 * Adds a document id to the missing docos document ids list in storage.
 * @param {string} documentId The new doc id to add to storage.
 * @param {function()} resultCallback Callback for when the document id is
 *     pushed.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocosCapability.prototype.pushMissingDocosDocumentId =
    goog.abstractMethod;


/**
 * Removes the given ids from the missing docos document ids list in storage.
 * @param {!Array.<string>} documentIds The doc ids to remove.
 * @param {function()} resultCallback Callback for the document ids.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocosCapability.prototype.removeMissingDocosDocumentIds =
    goog.abstractMethod;


/**
 * Creates a comment object.  Must be written to the database using write()
 * before any record of it will be seen there.
 * @param {string} documentId The id of the document this comment is associated
 *     with.
 * @param {string} id The new comment's id.
 * @return {!office.localstore.Comment} The new comment object.
 */
office.localstore.DocosCapability.prototype.createComment =
    function(documentId, id) {
  return new office.localstore.Comment(documentId, id, true /* isNew */);
};


/** @override */
office.localstore.DocosCapability.prototype.getKeyForRecord = function(record) {
  var comment = /** @type {!office.localstore.Comment} */ (record);
  return [comment.getDocumentId(), comment.getId()];
};
