/**
 * @fileoverview Abstract base class for writing Records to storage.

 */
goog.provide('office.localstore.RecordOperation');

goog.require('office.localstore.Operation');



/**
 * Abstract base class for writing Records to storage.
 * @param {office.localstore.Operation.Type} operationType
 * @param {?office.localstore.StorageCapability.KeyType} key The unique identifier
 *     for the record. Null for singleton records.
 * @param {office.localstore.Record.Type} recordType The type of the record being
 *     changed.
 * @constructor
 * @extends {office.localstore.Operation}
 */
office.localstore.RecordOperation = function(operationType, key, recordType) {
  goog.base(this, operationType);

  /**
   * The primary key for the record.
   * @type {?office.localstore.StorageCapability.KeyType}
   * @private
   */
  this.key_ = key;

  /**
   * The record type.
   * @type {office.localstore.Record.Type}
   * @private
   */
  this.recordType_ = recordType;
};
goog.inherits(office.localstore.RecordOperation, office.localstore.Operation);


/**
 * @return {office.localstore.Record.Type} The record type.
 */
office.localstore.RecordOperation.prototype.getRecordType = function() {
  return this.recordType_;
};


/**
 * @return {office.localstore.StorageCapability.KeyType} The key with which to
 *     identify this record.
 */
office.localstore.RecordOperation.prototype.getKey = function() {
  if (goog.isNull(this.key_)) {
    throw Error('Cannot getKey of operation for singleton record.');
  }
  return this.key_;
};
