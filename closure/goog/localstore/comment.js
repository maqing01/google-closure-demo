goog.provide('office.localstore.Comment');
goog.provide('office.localstore.Comment.Property');
goog.provide('office.localstore.Comment.State');

goog.require('office.localstore.DocumentLockRequirement');
goog.require('office.localstore.Record');



/**
 * @param {string} docId The id of the document this comment is associated with.
 * @param {string} id The comment's id. Unique within the document.
 * @param {boolean} isNew Whether this is a new object, not yet persisted in
 *     local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.Comment = function(docId, id, isNew) {
  goog.base(this, office.localstore.Record.Type.COMMENT, isNew);
  this.setProperty(office.localstore.Comment.Property.DOC_ID, docId);
  this.setProperty(office.localstore.Comment.Property.ID, id);
  this.setProperty(office.localstore.Comment.Property.STATE,
      office.localstore.Comment.State.CLEAN);
};
goog.inherits(office.localstore.Comment, office.localstore.Record);


/**
 * Property names.
 * @enum {string}
 */
office.localstore.Comment.Property = {
  DATA: '11',
  DOC_ID: '12',
  ID: '13',
  STATE: '14'
};


/**
 * Possible comment states.
 * @enum {number}
 */
office.localstore.Comment.State = {
  CLEAN: 1,
  DIRTY: 2
};


/** @override */
office.localstore.Comment.prototype.getDocumentLockRequirement = function() {
  return new office.localstore.DocumentLockRequirement(this.getDocumentId(),
      office.localstore.DocumentLockRequirement.Level.OWNER);
};


/**
 * @return {string} The id of the document this comment is associated with.
 */
office.localstore.Comment.prototype.getDocumentId = function() {
  return this.getStringProperty(office.localstore.Comment.Property.DOC_ID);
};


/**
 * @return {string} The comment id.
 */
office.localstore.Comment.prototype.getId = function() {
  return this.getStringProperty(office.localstore.Comment.Property.ID);
};


/**
 * @return {Object} The comment data.
 */
office.localstore.Comment.prototype.getData = function() {
  return this.getNullableObjectProperty(office.localstore.Comment.Property.DATA);
};


/**
 * Sets the comment data.
 * @param {Object} data The comment data.
 */
office.localstore.Comment.prototype.setData = function(data) {
  this.setProperty(office.localstore.Comment.Property.DATA, data);
};


/**
 * @return {office.localstore.Comment.State} The comment's state.
 */
office.localstore.Comment.prototype.getState = function() {
  return /** @type {office.localstore.Comment.State} */ (this.getNumberProperty(
      office.localstore.Comment.Property.STATE));
};


/**
 * Sets the comment's state.
 * @param {office.localstore.Comment.State} state The comment's state.
 */
office.localstore.Comment.prototype.setState = function(state) {
  this.setProperty(office.localstore.Comment.Property.STATE, state);
};
