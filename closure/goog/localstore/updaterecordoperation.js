/**
 * @fileoverview The update record operation.

 */

goog.provide('office.localstore.UpdateRecordOperation');

goog.require('office.localstore.Operation');
goog.require('office.localstore.RecordOperation');
goog.require('goog.array');



/**
 * Operation that captures all of the data needed to create or update a Record
 * with its modified property list. The operation will only save a record's
 * modified properties, not any other data being stored inside the record
 * outside of the standard property structure.
 * @param {?office.localstore.StorageCapability.KeyType} key The key that uniquely
 *     identifies the record. Null for singleton records.
 * @param {!office.localstore.Record} record The record to update.
 * @param {!Array.<string>=} opt_nullableProperties Properties which are allowed
 *     or expected to be null.
 * @param {office.localstore.Operation.Type=} opt_operationType An operation type
 *     to use other than UPDATE_RECORD. Subclasses should pass this as a param.
 * @constructor
 * @extends {office.localstore.RecordOperation}
 */
office.localstore.UpdateRecordOperation = function(key, record,
    opt_nullableProperties, opt_operationType) {
  var operationType =
      opt_operationType || office.localstore.Operation.Type.UPDATE_RECORD;
  goog.base(this, operationType, key, record.getRecordType());

  /**
   * Whether the record needs to be created.
   * @type {boolean}
   * @private
   */
  this.isNew_ = record.isNew();

  /**
   * A map of modified properties and their new values. We can't just store the
   * raw modifications array, because we would lose unmodified sub-properties
   * of mapped property types.
   * @type {!Object}
   * @private
   */
  this.modifications_ = {};

  var rawModifications = record.getModifications();
  var nullableProperties = opt_nullableProperties || [];
  for (var propertyName in rawModifications) {
    this.modifications_[propertyName] =
        goog.array.contains(nullableProperties, propertyName) ?
            record.getNullableProperty(propertyName) :
            record.getProperty(propertyName);
  }
};
goog.inherits(office.localstore.UpdateRecordOperation,
    office.localstore.RecordOperation);


/**
 * @return {boolean} Whether the operation should create a new record rather
 *     than update an existing one.
 */
office.localstore.UpdateRecordOperation.prototype.isNew = function() {
  return this.isNew_;
};


/**
 * @return {!Object} The property modifications.
 */
office.localstore.UpdateRecordOperation.prototype.getModifications =
    function() {
  return this.modifications_;
};
