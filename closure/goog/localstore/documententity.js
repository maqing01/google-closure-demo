/**
 * @fileoverview A record for storing an id-addressable document object.

 */

goog.provide('office.localstore.DocumentEntity');
goog.provide('office.localstore.DocumentEntity.Property');

goog.require('office.localstore.Record');



/**
 * An entity record for storing an id-addressable document object.
 * @param {string} entityId The entity's id.
 * @param {string} documentId The document's id.
 * @param {string} entityType The entity's type.
 * @param {*} data The entity's data.
 * @param {boolean} isNew Whether this is a new object, not yet persisted in
 *     the local store.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.DocumentEntity = function(entityId, documentId, entityType,
    data, isNew) {
  goog.base(this, office.localstore.Record.Type.DOCUMENT_ENTITY, isNew);

  this.setProperty(office.localstore.DocumentEntity.Property.ENTITY_ID,
      entityId);
  this.setProperty(office.localstore.DocumentEntity.Property.DOCUMENT_ID,
      documentId);
  this.setProperty(office.localstore.DocumentEntity.Property.ENTITY_TYPE,
      entityType);
  this.setProperty(office.localstore.DocumentEntity.Property.DATA, data);
};
goog.inherits(office.localstore.DocumentEntity, office.localstore.Record);


/**
 * Property names.
 * @enum {string}
 */
office.localstore.DocumentEntity.Property = {
  DOCUMENT_ID: '11',
  ENTITY_TYPE: '12',
  ENTITY_ID: '13',
  DATA: '14'
};


/**
 * Gets the entity's id.
 * @return {string} The entity's id.
 */
office.localstore.DocumentEntity.prototype.getId = function() {
  return /** @type {string} */ (
      this.getProperty(office.localstore.DocumentEntity.Property.ENTITY_ID));
};


/**
 * Gets the containing document's id.
 * @return {string} The containing document's id.
 */
office.localstore.DocumentEntity.prototype.getDocumentId = function() {
  return /** @type {string} */ (
      this.getProperty(office.localstore.DocumentEntity.Property.DOCUMENT_ID));
};


/**
 * Gets the entity's type.
 * @return {string} The containing document's id.
 */
office.localstore.DocumentEntity.prototype.getType = function() {
  return /** @type {string} */ (
      this.getProperty(office.localstore.DocumentEntity.Property.ENTITY_TYPE));
};


/**
 * Gets the entity's data.
 * @return {*} The entity's data.
 */
office.localstore.DocumentEntity.prototype.getData = function() {
  return this.getNullableProperty(office.localstore.DocumentEntity.Property.DATA);
};


/**
 * Sets the entity's data.
 * @param {*} data The entity's data.
 */
office.localstore.DocumentEntity.prototype.setData = function(data) {
  this.setProperty(office.localstore.DocumentEntity.Property.DATA, data);
};
