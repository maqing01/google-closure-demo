

/**
 * @fileoverview Base class for adapters capable of reading and writing
 *  impression records to or from a particular version of a IndexedDB database.


 */

goog.provide('office.localstore.idb.ImpressionCapability');

goog.require('office.localstore.ImpressionBatch');
goog.require('office.localstore.ImpressionCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.idb.IdbStorageCapability');
goog.require('office.localstore.idb.StoreName');



/**
 * Concrete implementation of the impression capability using an IndexedDB
 * database.
 * @param {!office.localstore.idb.DocsDatabase} db
 * @param {!office.localstore.idb.DatabaseUtil} idbUtil
 * @constructor
 * @struct
 * @extends {office.localstore.ImpressionCapability}
 * @implements {office.localstore.idb.IdbStorageCapability}
 */
office.localstore.idb.ImpressionCapability = function(db, idbUtil) {
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
};
goog.inherits(office.localstore.idb.ImpressionCapability,
    office.localstore.ImpressionCapability);


/**
 * The key of the impressions object store.
 * @type {string}
 */
office.localstore.idb.ImpressionCapability.IMPRESSIONS_KEY_NAME = 'iKey';


/** @override */
office.localstore.idb.ImpressionCapability.prototype.readImpressionBatches =
    function(resultCallback, opt_errorCallback) {
  var transaction = this.db_.openTransaction(
      [office.localstore.idb.StoreName.IMPRESSIONS],
      'Error reading impressions.' /* errorMessage */, opt_errorCallback);
  this.idbUtil_.iterateIdbCursor(transaction,
      office.localstore.idb.StoreName.IMPRESSIONS,
      goog.bind(this.createImpressionBatchFromStore, this),
      resultCallback,
      undefined /* opt_lowerBound */,
      undefined  /* opt_upperBound */,
      undefined /* opt_index */,
      undefined /* opt_reverse */,
      undefined /* opt_keyedCursor */,
      true /* opt_abandonTransactionOnResult */);
};


/**
 * Creates a new impression batch, given a database object.
 * @param {!Object} obj The object from the impressions store.
 * @return {!office.localstore.ImpressionBatch} The new impression batch.
 */
office.localstore.idb.ImpressionCapability.prototype.
    createImpressionBatchFromStore = function(obj) {
  var batch = new office.localstore.ImpressionBatch(
      obj[office.localstore.idb.ImpressionCapability.IMPRESSIONS_KEY_NAME][0],
      obj[office.localstore.idb.ImpressionCapability.IMPRESSIONS_KEY_NAME][1],
      obj[office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_ARRAY],
      false /* isNew */);
  batch.markAsInitialized();
  return batch;
};


/** @override */
office.localstore.idb.ImpressionCapability.prototype.
    getObjectStoreNamesForOperation = function(operation) {
  return [office.localstore.idb.StoreName.IMPRESSIONS];
};


/** @override */
office.localstore.idb.ImpressionCapability.prototype.performOperation =
    function(operation, transaction) {
  switch (operation.getType()) {
    case office.localstore.Operation.Type.UPDATE_RECORD:
      var updateRecordOperation =
          /** @type {!office.localstore.UpdateRecordOperation} */ (operation);
      if (updateRecordOperation.isNew()) {
        this.writeImpressionBatch_(updateRecordOperation,
            transaction.getObjectStore(
                office.localstore.idb.StoreName.IMPRESSIONS));
      } else {
        throw Error('Impressions may not be updated.');
      }
      break;
    case office.localstore.Operation.Type.DELETE_RECORD:
      var deleteRecordOperation =
          /** @type {!office.localstore.DeleteRecordOperation} */ (operation);
      this.idbUtil_.deleteFromStore(
          transaction.getObjectStore(office.localstore.idb.StoreName.IMPRESSIONS),
          deleteRecordOperation.getKey());
      break;
    default:
      throw Error('Operation type ' + operation.getType() + ' not supported.');
  }
};


/**
 * Writes a new impression batch to IndexedDB.
 * @param {!office.localstore.UpdateRecordOperation} updateRecordOperation
 * @param {!office.localstore.idb.ObjectStore} impressionStore
 * @private
 */
office.localstore.idb.ImpressionCapability.prototype.writeImpressionBatch_ =
    function(updateRecordOperation, impressionStore) {
  var modifications = updateRecordOperation.getModifications();
  var Property = office.localstore.ImpressionBatch.Property;
  var batchObj = {};
  batchObj[office.localstore.idb.ImpressionCapability.IMPRESSIONS_KEY_NAME] = [
    modifications[Property.DOCUMENT_ID],
    modifications[Property.IMPRESSION_BATCH_TIME]
  ];
  batchObj[office.localstore.ImpressionBatch.Property.IMPRESSION_BATCH_ARRAY] =
      modifications[Property.IMPRESSION_BATCH_ARRAY];
  impressionStore.put(batchObj);
};
