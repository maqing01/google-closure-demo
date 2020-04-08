goog.provide('office.localstore.idb.StorageObjectReaderWriter');

goog.require('office.localstore.ProfileData');
goog.require('office.localstore.idb.DatabaseUtil');
/** @suppress {extraRequire} */
goog.require('office.localstore.idb.KeyType');
goog.require('office.localstore.idb.StoreName');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Class for reading and writing LocalStore-specific data to IndexedDB.
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil The indexedDB util.
 * @constructor
 * @struct
 */
office.localstore.idb.StorageObjectReaderWriter = function(idbUtil) {
  /**
   * The indexedDB util.
   * @type {!office.localstore.idb.DatabaseUtil}
   * @private
   */
  this.idbUtil_ = idbUtil;
};


/**
 * IDB property names.
 * @enum {string}
 * @private
 */
office.localstore.idb.StorageObjectReaderWriter.IdbPropertyName_ = {
  DOCUMENT_IDS: 'documentIds'
};


/**
 * Updates an object in the store with the specified modifications. Only called
 * when it has been determined that a row already exists to be updated. This
 * should only be called if the property keys in the modifications list exactly
 * match the keys in the store.
 * @param {office.localstore.idb.KeyType} key The key of the object
 *     to update.
 * @param {Object} modifications The list of modifications to write, keyed by
 *     property name.
 * @param {!office.localstore.idb.ObjectStore} store
 * @param {!Array.<string>=} opt_nullableProperties Properties which are allowed
 *     or expected to be null.
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.saveModifications =
    function(key, modifications, store, opt_nullableProperties) {
  if (modifications) {
    var request = this.idbUtil_.getCursorRequest(store, key);
    request.setSuccessCallback(goog.bind(this.applyModificationsToObject_, this,
        modifications, opt_nullableProperties || []));
  }
};


/**
 * Replaces the object read from storage with a modified version based on the
 * new values in the given modifications object.
 * @param {!Object} modifications The modifications to make to the record.
 * @param {!Array.<string>} nullableProperties Properties which are allowed
 *     or expected to be null.
 * @param {!Event} e The success event.
 * @private
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.
    applyModificationsToObject_ = function(
        modifications, nullableProperties, e) {
  var request = e.target;
  office.localstore.idb.DatabaseUtil.verifyRequestDone(request);
  var cursor = request.result;
  if (cursor) {
    var currentObj = cursor.value;
    // Verify that the result is from a cursor request.
    goog.asserts.assert(goog.isDef(currentObj),
        'Could not find object to update.');

    for (var propertyName in modifications) {
      var value = modifications[propertyName];
      if (goog.array.contains(nullableProperties, propertyName)) {
        currentObj[propertyName] = goog.isDefAndNotNull(value) ? value : null;
      } else {
        goog.asserts.assert(goog.isDefAndNotNull(value),
            'Property %s was unexpectedly null or undefined', propertyName);
        currentObj[propertyName] = value;
      }
    }

    cursor.update(currentObj);
  } else {
    throw Error('Could not find object to update.');
  }
};


/**
 * Adds a document id to a document ids list in the ProfileData store.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {string} dataType The data type in the ProfileData store.
 * @param {string} documentId The new doc id to add to storage.
 * @param {function()} resultCallback Callback for when the document id is
 *     pushed.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.
    pushProfileDataDocumentId = function(
        db, dataType, documentId, resultCallback, opt_errorCallback) {
  var transaction = db.openTransaction(
      [office.localstore.idb.StoreName.PROFILE_DATA],
      '', opt_errorCallback,
      true /* opt_allowWrite */);

  var adapter = this;
  this.readProfileDataDocumentIds(db, dataType, function(storedIds) {
    if (!goog.array.contains(storedIds, documentId)) {
      storedIds.push(documentId);

      var record = adapter.createProfileDataDocumentIdsRecord_(dataType,
          storedIds);
      transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA).
          put(record);
      transaction.setCompletionCallback(resultCallback);
    } else {
      resultCallback();
    }
  } /* readCallback */, transaction);
};


/**
 * Removes the given ids from a list document ids list in the ProfileData
 * store.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {string} dataType The data type in the ProfileData store.
 * @param {!Array.<string>} documentIds The doc ids to remove.
 * @param {function()} resultCallback Callback for the document ids.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.
    removeProfileDataDocumentIds = function(
        db, dataType, documentIds, resultCallback, opt_errorCallback) {
  var transaction = db.openTransaction(
      [office.localstore.idb.StoreName.PROFILE_DATA],
      '', opt_errorCallback,
      true /* opt_allowWrite */);

  var adapter = this;
  this.readProfileDataDocumentIds(db, dataType, function(storedIds) {
    for (var i = 0; i < documentIds.length; i++) {
      goog.array.remove(storedIds, documentIds[i]);
    }

    var record = adapter.createProfileDataDocumentIdsRecord_(dataType,
        storedIds);
    transaction.getObjectStore(office.localstore.idb.StoreName.PROFILE_DATA).
        put(record);
    transaction.setCompletionCallback(resultCallback);
  } /* readCallback */, transaction);
};


/**
 * Reads a document ids list in the ProfileData store and calls the given
 * callbacks.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {string} dataType The data type in the ProfileData store.
 * @param {function(!Array.<string>)} readCallback The callback for the document
 *     ids read.
 * @param {!office.localstore.idb.Transaction} transaction The transaction.
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.
    readProfileDataDocumentIds = function(
        db, dataType, readCallback, transaction) {
  var request = transaction.getObjectStore(
      office.localstore.idb.StoreName.PROFILE_DATA).get(dataType);

  var adapter = this;
  request.setSuccessCallback(function(e) {
    var docIds = e.target.result;
    var documentIdsKey =
        office.localstore.idb.StorageObjectReaderWriter.IdbPropertyName_.
            DOCUMENT_IDS;
    var storedIds = (docIds && docIds[documentIdsKey]) ?
        docIds[documentIdsKey] :
        [];
    readCallback(storedIds);
  });
};


/**
 * Creates a record of document IDs to store in the ProfileData store.
 * @param {string} dataType The data type in the ProfileData store.
 * @param {!Array.<string>} storedIds The list of ids to store.
 * @return {!Object} Object to store.
 * @private
 */
office.localstore.idb.StorageObjectReaderWriter.prototype.
    createProfileDataDocumentIdsRecord_ = function(dataType, storedIds) {
  var record = {};
  record[office.localstore.ProfileData.Property.DATA_TYPE] = dataType;
  record[office.localstore.idb.StorageObjectReaderWriter.IdbPropertyName_.
      DOCUMENT_IDS] = storedIds;
  return record;
};
