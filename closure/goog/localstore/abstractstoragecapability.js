goog.provide('office.localstore.AbstractStorageCapability');

goog.require('office.localstore.DeleteRecordOperation');
goog.require('office.localstore.DocumentLockOperation');
goog.require('office.localstore.Operation');
goog.require('office.localstore.StorageCapability');
goog.require('office.localstore.UpdateRecordOperation');
goog.require('goog.array');
goog.require('goog.events.EventTarget');



/**
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 * @implements {office.localstore.StorageCapability}
 */
office.localstore.AbstractStorageCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.AbstractStorageCapability,
    goog.events.EventTarget);


/** @override */
office.localstore.AbstractStorageCapability.prototype.getSupportedRecordTypes =
    goog.abstractMethod;


/** @override */
office.localstore.AbstractStorageCapability.prototype.createOperationsForRecord =
    function(record) {
  if (!this.isRecordTypeSupported(record.getRecordType())) {
    throw Error('Cannot create operations for an unsupported record type ' +
        record.getRecordType());
  }

  return this.createOperationsForRecordInternal(record);
};


/**
 * Creates operations for the specified record, which is guaranteed to be
 * of a type that is supported by the capability. The default implementation
 * provides a basic record property operation. Subclasses should override to
 * provide more complex behavior.
 * @param {!office.localstore.Record} record
 * @param {!Array.<string>=} opt_nullableProperties Properties which are allowed
 *     or expected to be null.
 * @return {!Array.<office.localstore.Operation>} The operations to execute in
 *     order to persist the record.
 * @protected
 */
office.localstore.AbstractStorageCapability.prototype.
    createOperationsForRecordInternal =
        function(record, opt_nullableProperties) {
  var key = this.getKeyForRecord(record);
  var operations = [];
  if (record.isToBeDeleted()) {
    operations.push(
        new office.localstore.DeleteRecordOperation(key, record.getRecordType()));
  } else {
    operations.push(new office.localstore.UpdateRecordOperation(
        key, record, opt_nullableProperties));
  }

  var documentLockRequirement = record.getDocumentLockRequirement();
  if (documentLockRequirement) {
    operations.push(new office.localstore.DocumentLockOperation(
        documentLockRequirement.getDocId(),
        documentLockRequirement.getLevel()));
  }

  return operations;
};


/** @override */
office.localstore.AbstractStorageCapability.prototype.getKeyForRecord =
    function(record) {
  throw Error(
      'Key cannot be obtained for record of type ' + record.getRecordType());
};


/**
 * @param {office.localstore.Record.Type} recordType
 * @return {boolean} Whether the specified record type is supported.
 * @protected
 */
office.localstore.AbstractStorageCapability.prototype.isRecordTypeSupported =
    function(recordType) {
  return goog.array.indexOf(this.getSupportedRecordTypes(), recordType) >= 0;
};


/**
 * Returns whether the operation is supported by the capability. The default
 * implementation allows any record operation on the record types supported by
 * the capability. Subclasses should override this to return true to any
 * operation that the capability itself could have generated.
 * @param {!office.localstore.Operation} operation
 * @return {boolean} Whether the specified operation is supported by the
 *     capability.
 * @protected
 */
office.localstore.AbstractStorageCapability.prototype.isOperationSupported =
    function(operation) {
  if (office.localstore.Operation.isRecordOperation(operation)) {
    var recordOperation =
        /** @type {!office.localstore.RecordOperation} */ (operation);
    return this.isRecordTypeSupported(recordOperation.getRecordType());
  }
  return false;
};
