
/**
 * @fileoverview Contains the definition of the office.localstore.ProfileData
 *     class.

 */

goog.provide('office.localstore.ProfileData');

goog.require('office.localstore.Record');



/**
 * Construct a new ProfileData object.
 *
 * Subclasses of ProfileData will map to one record in the ProfileData object
 * store with a specific dataType. The dataType property is used as the record
 * key in the ProfileData object store.
 * @param {office.localstore.Record.Type} type The record type.
 * @param {string} dataType The data type.
 * @param {boolean} isNew Whether this is a new object, not yet persisted in
 *     local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.ProfileData = function(type, dataType, isNew) {
  goog.base(this, type, isNew);
  this.setProperty(
      office.localstore.ProfileData.Property.DATA_TYPE, dataType);
};
goog.inherits(office.localstore.ProfileData, office.localstore.Record);


/**
 * Properties in v5 of the schema.
 * @enum {string}
 */
office.localstore.ProfileData.Property = {
  DATA_TYPE: '11'
};
