goog.provide('office.localstore.Operation');



/**
 * Base class for localstore write operations.
 * @param {office.localstore.Operation.Type} type
 * @constructor
 * @struct
 */
office.localstore.Operation = function(type) {
  /**
   * @type {office.localstore.Operation.Type}
   * @private
   */
  this.type_ = type;
};


/**
 * Type enum for operations.
 * @enum {string}
 */
office.localstore.Operation.Type = {
  APPEND_COMMANDS: goog.events.getUniqueId('append-commands'),
  DELETE_RECORD: goog.events.getUniqueId('delete-record'),
  DOCUMENT_LOCK: goog.events.getUniqueId('document-lock'),
  PENDING_QUEUE_CLEAR: goog.events.getUniqueId('pq-clear'),
  PENDING_QUEUE_CLEAR_SENT: goog.events.getUniqueId('pq-clear-sent'),
  PENDING_QUEUE_CLEAR_SENT_BUNDLE: goog.events.getUniqueId('pq-clear-sent-bundle'),
  PENDING_QUEUE_DELETE_COMMANDS: goog.events.getUniqueId('pq-delete-commands'),
  PENDING_QUEUE_MARK_SENT_BUNDLE: goog.events.getUniqueId('pq-mark-sent'),
  PENDING_QUEUE_WRITE_COMMANDS: goog.events.getUniqueId('pq-write-commands'),
  UNSTAGE_COMMANDS: goog.events.getUniqueId('unstage-commands'),
  UPDATE_APPLICATION_METADATA: goog.events.getUniqueId('update-application-metadata'),
  UPDATE_RECORD: goog.events.getUniqueId('update-record'),
  WRITE_TRIX_DOC: goog.events.getUniqueId('write-trix')
};


/**
 * @return {office.localstore.Operation.Type}
 */
office.localstore.Operation.prototype.getType = function() {
  return this.type_;
};


/**
 * @param {!office.localstore.Operation} operation
 * @return {boolean} Whether the specified operation is a basic record
 *     operation that only deals with standard record-level properties.
 */
office.localstore.Operation.isRecordOperation = function(operation) {
  var type = operation.getType();
  return type == office.localstore.Operation.Type.UPDATE_RECORD ||
      type == office.localstore.Operation.Type.DELETE_RECORD;
};
