goog.provide('office.localstore.idb.DocumentCommandsStorageObject');

// Need to require DocumentPartId so it's added as a dependency. Otherwise
// some binaries have no explicit dependency on it and fail to compile
// (currently Trix).
//  Remove once Trix acquires an explicit dependency.
/** @suppress {extraRequire} */
goog.require('office.localstore.DocumentPartId');
/** @suppress {extraRequire} */
goog.require('office.localstore.idb.KeyType');
goog.require('goog.Disposable');
goog.require('goog.asserts');



/**
 * Version 1 of a storage object helper class for the IndexedDB
 * DocumentCommands object store. Used to unify some of the code between the
 * CommandBasedDocumentAdapter and the TrixDocumentAdapter, since they each
 * write to the same IDB DocumentCommands table.
 * @param {!Object} rawObject A storage object that contains the appropriate
 *     values already populated, because it came from the DocumentCommands IDB
 *     store, or because it was created via the create method, below.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.idb.DocumentCommandsStorageObject = function(rawObject) {
  goog.base(this);

  /**
   * An object suitable for storage in IndexedDB.
   * @type {!Object}
   * @private
   */
  this.storageObject_ = rawObject;

  //  Consider adding some asserts that the object has the
  // correct required data present.
};
goog.inherits(
    office.localstore.idb.DocumentCommandsStorageObject, goog.Disposable);


/**
 * A key value which is higher than any valid key in the document commands
 * table according to the idb key order system.
 * @type {office.localstore.idb.KeyType}
 */
office.localstore.idb.DocumentCommandsStorageObject.HIGH_KEY = [[]];


/**
 * A key value which is lower than any valid key in the document commands
 * table according to the idb key order system.
 * @type {office.localstore.idb.KeyType}
 */
office.localstore.idb.DocumentCommandsStorageObject.LOW_KEY = -1;


/**
 * Keys used for the data members stored in the DocumentCommands store's
 * objects.
 * @enum {string}
 */
office.localstore.idb.DocumentCommandsStorageObject.StorageKey = {
  COMMANDS: 'c',
  TIMESTAMP: 't'
};


/**
 * Index of each member of the compound key for the store.
 * @enum {number}
 * @private
 */
office.localstore.idb.DocumentCommandsStorageObject.KeyIndex_ = {
  DOC_ID: 0,
  PART_ID: 1,
  REVISION: 2,
  CHUNK_INFO: 3
};


/**
 * The key of the document commands and companion staging object stores.
 * @type {string}
 */
office.localstore.idb.DocumentCommandsStorageObject.DOCUMENT_COMMANDS_KEY_NAME =
    'cpath';


/**
 * @return {Array|Object} The serialized commands, if available, or
 * an object, if the commands storage object is part of a Trix document.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getCommands =
    function() {
  return this.storageObject_[
      office.localstore.idb.DocumentCommandsStorageObject.StorageKey.COMMANDS] ||
         null;
};


/**
 * @return {?number} The timestamp, if available.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getTimestamp =
    function() {
  return this.storageObject_[
      office.localstore.idb.DocumentCommandsStorageObject.StorageKey.TIMESTAMP];
};


/**
 * @return {string} The doc id.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getDocId =
    function() {
  return this.getKey_()[
      office.localstore.idb.DocumentCommandsStorageObject.KeyIndex_.DOC_ID];
};


/**
 * @return {number|string} The part id.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getPartId =
    function() {
  return this.getKey_()[
      office.localstore.idb.DocumentCommandsStorageObject.KeyIndex_.PART_ID];
};


/**
 * @return {number} The revision.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getRevision =
    function() {
  return this.getKey_()[
      office.localstore.idb.DocumentCommandsStorageObject.KeyIndex_.REVISION];
};


/**
 * @return {*} The chunk info.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getChunkInfo =
    function() {
  return this.getKey_()[
      office.localstore.idb.DocumentCommandsStorageObject.KeyIndex_.CHUNK_INFO];
};


/**
 * @return {!Object} The unwrapped storage object suitable for storing into
 *     IndexedDB.
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getStorableObject =
    function() {
  return this.storageObject_;
};


/**
 * @return {!Array} The IDB storage key for the object.
 * @private
 */
office.localstore.idb.DocumentCommandsStorageObject.prototype.getKey_ =
    function() {
  var DocumentCommandsStorageObject =
      office.localstore.idb.DocumentCommandsStorageObject;
  var key = this.storageObject_[
      DocumentCommandsStorageObject.DOCUMENT_COMMANDS_KEY_NAME];
  goog.asserts.assertArray(key, 'Missing storage key.');
  return key;
};


/**
 * Creates a DocumentCommands-storable storage object.
 * @param {string} docId The doc id.
 * @param {!office.localstore.DocumentPartId} partId The document part id. For
 *     command-based documents like Vodka, this should always be 0. For
 *     part-based documents, like Trix which is partitioned by worksheet number,
 *     the part identifier should be passed here.
 * @param {number} revision The revision number.
 * @param {*} chunkInfo Chunk data for the object.
 * @param {?number} timestamp The timestamp of the chunk.
 * @param {Array|Object=} opt_commands An array of the serialized commands in
 *     the chunk, or an object representing the commands data.
 * @return {!office.localstore.idb.DocumentCommandsStorageObject} A wrapped
 *     storage object.
 */
office.localstore.idb.DocumentCommandsStorageObject.create = function(docId,
    partId, revision, chunkInfo, timestamp, opt_commands) {
  goog.asserts.assertString(docId);
  goog.asserts.assert(goog.isNumber(partId) || goog.isString(partId));
  goog.asserts.assertNumber(revision);

  var key = [docId, partId, revision, chunkInfo];

  var storageObject = {};
  storageObject[office.localstore.idb.DocumentCommandsStorageObject.
      DOCUMENT_COMMANDS_KEY_NAME] = key;
  storageObject[
      office.localstore.idb.DocumentCommandsStorageObject.StorageKey.TIMESTAMP] =
      timestamp;
  if (opt_commands) {
    storageObject[office.localstore.idb.DocumentCommandsStorageObject.StorageKey.
        COMMANDS] = opt_commands;
  }
  return new office.localstore.idb.DocumentCommandsStorageObject(storageObject);
};


/**
 * Gets an array suitable for constructing the lower bound of a key range
 * for all objects with the specified doc id.
 * @param {string} docId The doc ID.
 * @param {number|string|office.localstore.DocumentPartId=} opt_secondKeyElement
 *     Optional second key element, usually a part id or the sync start
 *     timestamp used for the staging tables.
 * @return {!Array} The lower bound for a key range for a query based on the
 *     doc id.
 */
office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeLowerBound =
    function(docId, opt_secondKeyElement) {
  return goog.isDefAndNotNull(opt_secondKeyElement) ?
      [docId, opt_secondKeyElement] : [docId];
};


/**
 * Gets an array suitable for constructing the upper bound of a key range for
 * all objects with the specified doc id.
 * @param {string} docId The doc ID.
 * @param {number|string|office.localstore.DocumentPartId=} opt_secondKeyElement
 *     Optional second key element, usually a part id or the sync start
 *     timestamp used for the staging tables.
 * @return {!Array} The upper bound for a key range for a query based on the doc
 *     id.
 */
office.localstore.idb.DocumentCommandsStorageObject.getKeyRangeUpperBound =
    function(docId, opt_secondKeyElement) {
  return goog.isDefAndNotNull(opt_secondKeyElement) ?
      [docId, opt_secondKeyElement, []] : [docId, []];
};


/** @override */
office.localstore.idb.DocumentCommandsStorageObject.prototype.disposeInternal =
    function() {
  delete this.storageObject_;

  goog.base(this, 'disposeInternal');
};
