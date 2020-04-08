goog.provide('office.localstore.ApplicationMetadata');

goog.require('office.localstore.Record');



/**
 * @param {office.localstore.Document.Type} docType The document type.
 * @param {boolean} isNew Whether this is a new object, not yet persisted
 *     in any form in local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.ApplicationMetadata = function(docType, isNew) {
  goog.base(this, office.localstore.Record.Type.APPLICATION_METADATA, isNew);

  this.setProperty(office.localstore.ApplicationMetadata.Property.DOC_TYPE,
      docType);

  /**
   * @type {!Array.<!office.commands.Command>}
   * @private
   */
  this.initialCommands_ = [];
};
goog.inherits(office.localstore.ApplicationMetadata, office.localstore.Record);


/**
 * Property names.
 * @enum {string}
 */
office.localstore.ApplicationMetadata.Property = {
  DOC_TYPE: '11',
  INITIAL_COMMANDS: '12',
  JOBSET: '13',
  DOCOS_KEY_DATA: '14'
};


/**
 * Whether the initial commands field is modified.
 * @type {boolean}
 * @private
 */
office.localstore.ApplicationMetadata.prototype.areInitialCommandsModified_ =
    false;


/**
 * Gets the document type.
 * @return {office.localstore.Document.Type} The document type.
 */
office.localstore.ApplicationMetadata.prototype.getDocumentType = function() {
  return /** @type {office.localstore.Document.Type} */ (this.getStringProperty(
      office.localstore.ApplicationMetadata.Property.DOC_TYPE));
};


/**
 * Gets the jobset.
 * @return {?string} The document type.
 */
office.localstore.ApplicationMetadata.prototype.getJobset = function() {
  return this.getNullableStringProperty(
      office.localstore.ApplicationMetadata.Property.JOBSET);
};


/**
 * Sets the jobset.
 * @param {string} jobset The jobset.
 */
office.localstore.ApplicationMetadata.prototype.setJobset = function(jobset) {
  this.setProperty(office.localstore.ApplicationMetadata.Property.JOBSET,
      jobset);
};


/**
 * Gets the initial commands.
 * @return {!Array.<!office.commands.Command>} The initial commands.
 */
office.localstore.ApplicationMetadata.prototype.getInitialCommands = function() {
  return this.initialCommands_;
};


/**
 * Sets the initial commands.
 * @param {!Array.<!office.commands.Command>} initialCommands The initial
 *     commands.
 */
office.localstore.ApplicationMetadata.prototype.setInitialCommands = function(
    initialCommands) {
  this.initialCommands_ = initialCommands.concat();
  this.areInitialCommandsModified_ = true;
};


/**
 * Whether there are new initial commands.
 * @return {boolean} Whether there are new initial commands.
 */
office.localstore.ApplicationMetadata.prototype.hasNewInitialCommands =
    function() {
  return this.areInitialCommandsModified_;
};


/**
 * Sets the Docos key data.
 * @param {!Array} docosKeyData The docos key data.
 */
office.localstore.ApplicationMetadata.prototype.setDocosKeyData = function(
    docosKeyData) {
  this.setProperty(office.localstore.ApplicationMetadata.Property.DOCOS_KEY_DATA,
      docosKeyData);
};


/**
 * Gets the Docos key data.
 * @return {Array} The docos key data.
 */
office.localstore.ApplicationMetadata.prototype.getDocosKeyData = function() {
  return this.getNullableArrayProperty(
      office.localstore.ApplicationMetadata.Property.DOCOS_KEY_DATA);
};


/** @override */
office.localstore.ApplicationMetadata.prototype.commitInternal =
    function() {
  goog.base(this, 'commitInternal');
  this.areInitialCommandsModified_ = false;
};


/** @override */
office.localstore.ApplicationMetadata.prototype.isModified = function() {
  return this.areInitialCommandsModified_ || goog.base(this, 'isModified');
};
