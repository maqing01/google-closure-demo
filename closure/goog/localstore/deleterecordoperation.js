/**
 * @fileoverview The delete record operation.

 */

goog.provide('office.localstore.DeleteRecordOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.RecordOperation');



/**
 * Operation that captures all of the data necessary to delete a Record from
 * storage.
 * @param {?office.localstore.StorageCapability.KeyType} key The key that uniquely
 *     identifies the record. Null for singleton records.
 * @param {office.localstore.Record.Type} recordType The record type.
 * @constructor
 * @extends {office.localstore.RecordOperation}
 */
office.localstore.DeleteRecordOperation = function(key, recordType) {
  goog.base(this, office.localstore.Operation.Type.DELETE_RECORD, key,
      recordType);
};
goog.inherits(office.localstore.DeleteRecordOperation,
    office.localstore.RecordOperation);
