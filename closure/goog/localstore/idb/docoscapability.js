goog.provide('office.localstore.idb.DocosCapability');

goog.require('office.localstore.Comment');
goog.require('office.localstore.DocosCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.IndexName');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.asserts');
goog.require('goog.log');



/**
 * Concrete implementation of the docos capability using an IndexedDB database
 * at version 4.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @param {!office.localstore.idb.StorageObjectReaderWriter}
 *     storageObjectReaderWriter
 * @constructor
 * @struct
 * @extends {office.localstore.DocosCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.DocosCapability = function(
    db, idbUtil, storageObjectReaderWriter) {
  goog.base(this);

  /**
   * @type {!office.localstore.idb.DocsDatabase}
   * @private
   */
  this.db_ = db;

  /**
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;

  /**
   * The object used for reading and writing LocalStore data to IndexedDB.
   * @type {!office.localstore.idb.StorageObjectReaderWriter}
   * @private
   */
  this.storageObjectReaderWriter_ = storageObjectReaderWriter;
};
goog.inherits(office.localstore.idb.DocosCapability,
    office.localstore.DocosCapability);


/**
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.idb.DocosCapability.prototype.logger_ =
    goog.log.getLogger('office.localstore.idb.DocosCapability');


/**
 * The key path for the comment store index which indexes over the comment state
 * and document id.
 * @type {string}
 */
office.localstore.idb.DocosCapability.COMMENTS_STATE_INDEX_KEY_PATH =
    'stateIndex';


/**
 * Object store key for comments.
 * @type {string}
 */
office.localstore.idb.DocosCapability.IDB_KEY = 'cmtKey';


/**
 * Indices for the elements in the comments key path. Key path has the form:
 * [docId, id].
 * @enum {number}
 * @private
 */
office.localstore.idb.DocosCapability.CommentsKeyPathIndex_ = {
  DOC_ID: 0,
  ID: 1
};


/**
 * Indices for the elements in the comments state index key path. Key path has
 * the form: [state, docId].
 * @enum {number}
 */
office.localstore.idb.DocosCapability.CommentsStateIndexKeyPathIndex = {
  STATE: 0,
  DOC_ID: 1
};


/**
 * @return {!office.localstore.idb.DocsDatabase}
 * @protected
 */
office.localstore.idb.DocosCapability.prototype.getDb = function() {
  return this.db_;
};


/**
 * @return {!office.localstore.idb.StorageObjectReaderWriter}
 * @protected
 */
office.localstore.idb.DocosCapability.prototype.getStorageObjectReaderWriter =
    function() {
  return this.storageObjectReaderWriter_;
};


/** @override */
office.localstore.idb.DocosCapability.prototype.readComments = function(
    docId, state, id, resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.COMMENTS],
      'Error reading comments.', opt_errorCallback);

  var lowerBound;
  var upperBound;
  var index;
  if (!goog.isNull(state)) {
    goog.asserts.assert(goog.isNull(id),
        'id shouldn\'t be provided when state is.');

    lowerBound = !goog.isNull(docId) ? [state, docId] : [state];
    upperBound = !goog.isNull(docId) ? [state, docId] : [state, []];
    index = office.localstore.idb.IndexName.COMMENTS_STATE;
  } else {
    goog.asserts.assertString(docId,
        'docId should be provided when state is not.');

    lowerBound = !goog.isNull(id) ? [docId, id] : [docId];
    upperBound = !goog.isNull(id) ? [docId, id] : [docId, []];
  }

  this.idbUtil_.iterateIdbCursor(
      transaction,
      office.localstore.idb.StoreName.COMMENTS,
      goog.bind(this.createCommentFromStore_, this),
      resultCallback,
      lowerBound,
      upperBound,
      index,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/**
 * Creates a comment from an object in the comment store.
 * @param {!Object} obj The object from the comment store.
 * @return {!office.localstore.Comment} The new comment object.
 * @private
 */
office.localstore.idb.DocosCapability.prototype.createCommentFromStore_ =
    function(obj) {
  var keyPath = office.localstore.idb.DocosCapability.IDB_KEY;
  var CommentsKeyPathIndex =
      office.localstore.idb.DocosCapability.CommentsKeyPathIndex_;
  var comment = new office.localstore.Comment(
      obj[keyPath][CommentsKeyPathIndex.DOC_ID],
      obj[keyPath][CommentsKeyPathIndex.ID],
      false /* isNew */);
  var indexKeyPath =
      office.localstore.idb.DocosCapability.COMMENTS_STATE_INDEX_KEY_PATH;
  var CommentsStateIndexKeyPathIndex =
      office.localstore.idb.DocosCapability.CommentsStateIndexKeyPathIndex;
  comment.setState(
      obj[indexKeyPath][CommentsStateIndexKeyPathIndex.STATE]);
  comment.setData(obj[office.localstore.Comment.Property.DATA]);
  comment.markAsInitialized();
  return comment;
};


/** @override */
office.localstore.idb.DocosCapability.prototype.pushMissingDocosDocumentId =
    function(documentId, resultCallback, opt_errorCallback) {
  resultCallback();
};


/** @override */
office.localstore.idb.DocosCapability.prototype.removeMissingDocosDocumentIds =
    function(documentIds, resultCallback, opt_errorCallback) {
  resultCallback();
};


/** @override */
office.localstore.idb.DocosCapability.prototype.getObjectStoreNamesForOperation =
    function(operation) {
  return [office.localstore.idb.StoreName.COMMENTS];
};


/** @override */
office.localstore.idb.DocosCapability.prototype.performOperation = function(
    operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateCommentOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      this.writeComment_(updateCommentOperation,
          transaction.getObjectStore(office.localstore.idb.StoreName.COMMENTS));
      break;
    case office.localstore.Operation.Type.DELETE_RECORD:
      var deleteCommentOperation =
          /** @type {!office.localstore.DeleteRecordOperation} */ (operation);
      this.deleteComment_(deleteCommentOperation,
          transaction.getObjectStore(office.localstore.idb.StoreName.COMMENTS));
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Persists the comment to IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateCommentOperation
 * @param {!office.localstore.idb.ObjectStore} commentStore
 * @private
 */
office.localstore.idb.DocosCapability.prototype.writeComment_ = function(
    updateCommentOperation, commentStore) {
  var commentKey = updateCommentOperation.getKey();
  var commentId = commentKey[1];
  if (updateCommentOperation.isNew()) {
    goog.log.info(this.logger_, 'Writing new comment record, id ' + commentId);
    this.writeNewComment_(updateCommentOperation, commentStore);
  } else {
    goog.log.info(this.logger_, 'Updating comment record, id ' + commentId);
    this.updateComment_(updateCommentOperation, commentStore);
  }
};


/**
 * @param {!office.localstore.UpdateRecordOperation} updateCommentOperation
 * @param {!office.localstore.idb.ObjectStore} commentStore
 * @private
 */
office.localstore.idb.DocosCapability.prototype.writeNewComment_ = function(
    updateCommentOperation, commentStore) {
  var modifications = updateCommentOperation.getModifications();
  var DocosCapability = office.localstore.idb.DocosCapability;
  var commentObj = {};
  commentObj[DocosCapability.IDB_KEY] = updateCommentOperation.getKey();
  commentObj[DocosCapability.COMMENTS_STATE_INDEX_KEY_PATH] = [
    modifications[office.localstore.Comment.Property.STATE],
    modifications[office.localstore.Comment.Property.DOC_ID]
  ];
  commentObj[office.localstore.Comment.Property.DATA] =
      modifications[office.localstore.Comment.Property.DATA];
  commentStore.put(commentObj);
};


/**
 * updates a comment in IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateCommentOperation
 * @param {!office.localstore.idb.ObjectStore} commentStore
 * @private
 */
office.localstore.idb.DocosCapability.prototype.updateComment_ = function(
    updateCommentOperation, commentStore) {
  var modifications = updateCommentOperation.getModifications();
  var commentKey = updateCommentOperation.getKey();
  var modificationsToWrite = {};
  if (office.localstore.Comment.Property.STATE in modifications) {
    modificationsToWrite[
        office.localstore.idb.DocosCapability.COMMENTS_STATE_INDEX_KEY_PATH] = [
      modifications[office.localstore.Comment.Property.STATE],
      commentKey[0] /* DOC_ID */
    ];
    delete modifications[office.localstore.Comment.Property.STATE];
  }

  for (var property in modifications) {
    modificationsToWrite[property] = modifications[property];
  }

  this.storageObjectReaderWriter_.saveModifications(
      commentKey, modificationsToWrite, commentStore);
};


/**
 * Deletes a comment from IndexedDB.
 * @param {!office.localstore.DeleteRecordOperation} deleteCommentOperation The
 *    delete comment operation.
 * @param {!office.localstore.idb.ObjectStore} commentStore The comment object
 *     store.
 * @private
 */
office.localstore.idb.DocosCapability.prototype.deleteComment_ = function(
    deleteCommentOperation, commentStore) {
  var commentKey = deleteCommentOperation.getKey();
  goog.log.info(this.logger_, 'Deleting comment record, id ' + commentKey[1]);
  commentStore.deleteKey(commentKey);
};
