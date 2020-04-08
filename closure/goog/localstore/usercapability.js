goog.provide('office.localstore.UserCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Operation');
goog.require('office.localstore.Record');
goog.require('office.localstore.User');



/**
 * Base class for the user capability which manages reading and writing the
 * office.localstore.User record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.UserCapability = function() {
  goog.base(this);
};
goog.inherits(
    office.localstore.UserCapability, office.localstore.AbstractStorageCapability);


/** @override */
office.localstore.UserCapability.prototype.getSupportedRecordTypes = function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.USER];
};


/**
 * Gets all opted in users from the database.
 * @param {function(!Array.<!office.localstore.User>)} resultCallback
 *     Callback used to deliver the results.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.UserCapability.prototype.readUsers = goog.abstractMethod;


/**
 * Creates a new user object.  Must be written to the database using write()
 * before any record of it will be seen there.
 * @param {string} id The new user's id.
 * @return {!office.localstore.User} The new user object.
 */
office.localstore.UserCapability.prototype.createUser = function(id) {
  return new office.localstore.User(id, true /* isNew */);
};


/** @override */
office.localstore.UserCapability.prototype.createOperationsForRecordInternal =
    function(record,  opt_nullableProperties) {
  if (record.isToBeDeleted()) {
    throw Error('User deletion is not implemented.');
  }

  return goog.base(this, 'createOperationsForRecordInternal', record,
      opt_nullableProperties);
};


/** @override */
office.localstore.UserCapability.prototype.getKeyForRecord = function(record) {
  var user = /** @type {!office.localstore.User} */ (record);
  return user.getId();
};


/** @override */
office.localstore.UserCapability.prototype.isOperationSupported =
    function(operation) {
  return goog.base(this, 'isOperationSupported', operation) &&
      operation.getType() != office.localstore.Operation.Type.DELETE_RECORD;
};
