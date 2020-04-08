/**
 * @fileoverview Base class for the document entity capability.

 */

goog.provide('office.localstore.DocumentEntityCapability');

goog.require('office.localstore.AbstractStorageCapability');
goog.require('office.localstore.Record');



/**
 * Base class for the user capability which manages reading and writing the
 * office.localstore.DocumentEntity record.
 * @constructor
 * @struct
 * @extends {office.localstore.AbstractStorageCapability}
 */
office.localstore.DocumentEntityCapability = function() {
  goog.base(this);
};
goog.inherits(office.localstore.DocumentEntityCapability,
    office.localstore.AbstractStorageCapability);


/**
 * Indices of each element in the document entity's key.
 * @enum {number}
 */
office.localstore.DocumentEntityCapability.DocumentEntityKeyIndices = {
  DOCUMENT_ID: 0,
  ENTITY_TYPE: 1,
  ENTITY_ID: 2
};


/** @override */
office.localstore.DocumentEntityCapability.prototype.getSupportedRecordTypes =
    function() {
  // This capability is considered frozen. New record types should never be
  // added.
  return [office.localstore.Record.Type.DOCUMENT_ENTITY];
};


/**
 * Reads a document entity from storage.
 * @param {string} entityId The entity's id.
 * @param {string} documentId The document's id.
 * @param {string} entityType The entity's type.
 * @param {function(office.localstore.DocumentEntity)} resultCallback
 *     Callback to deliver the result.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentEntityCapability.prototype.readDocumentEntity =
    goog.abstractMethod;


/**
 * Reads all the document entities from storage for a given document id and
 * entity type.
 * @param {string} documentId The document's id.
 * @param {string} entityType The entity's type.
 * @param {function(!Array.<!office.localstore.DocumentEntity>)} resultCallback
 *     Callback to deliver the result.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentEntityCapability.prototype.readDocumentEntities =
    goog.abstractMethod;


/**
 * Reads all the document entities from storage for the given list of entity
 * ids, document id and entity type.  When done, the resultCallback will be
 * called. If there is at least one error, the opt_errorCallback will be called
 * and the resultCallback will not be called. If an id doesn't exist, it is not
 * considered as an error, it will just not be part of the result.
 * @param {!Array.<string>} entityIds The array of ids to fetch.
 * @param {string} documentId The document's id.
 * @param {string} entityType The entity's type.
 * @param {function(!Array.<!office.localstore.DocumentEntity>)} resultCallback
 *     Callback to deliver the result.
 * @param {function(!office.localstore.LocalStoreError)=} opt_errorCallback
 *     Callback for handling errors.
 */
office.localstore.DocumentEntityCapability.prototype.readDocumentEntitiesByIds =
    goog.abstractMethod;


/** @override */
office.localstore.DocumentEntityCapability.prototype.getKeyForRecord =
    function(record) {
  // This key should be considered frozen for the DocumentEntity record type.
  // No changes should be made to it or its components.
  var documentEntity = /** @type {!office.localstore.DocumentEntity} */ (record);
  return [documentEntity.getDocumentId(), documentEntity.getType(),
    documentEntity.getId()];
};
