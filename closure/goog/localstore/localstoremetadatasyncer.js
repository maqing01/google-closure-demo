

/**
 * @fileoverview Listens for changes to metadata and writes them to local
 * storage.

 */

goog.provide('office.localstore.LocalStoreMetadataSyncer');

goog.require('office.info.Document');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');



/**
 * Listens for changes to metadata and writes them to local storage.
 * @param {!office.info.Document} documentInfo The document info object.
 * @param {!office.localstore.LocalStore} localStore The local storage object.
 * @param {!office.localstore.Document} localStoreDocument The local storage
 *     document object.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.LocalStoreMetadataSyncer = function(documentInfo, localStore,
    localStoreDocument) {
  goog.base(this);

  /**
   * @type {!office.info.Document}
   * @private
   */
  this.documentInfo_ = documentInfo;

  /**
   * @type {!office.localstore.LocalStore}
   * @private
   */
  this.localStore_ = localStore;

  /**
   * @type {!office.localstore.Document}
   * @private
   */
  this.localStoreDocument_ = localStoreDocument;

  /**
   * @private {!goog.events.EventHandler.<
   *     !office.localstore.LocalStoreMetadataSyncer>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(documentInfo, office.info.Document.EventType.TITLE_CHANGE,
          this.handleTitleChange_).
      listen(documentInfo, office.info.Document.EventType.DOCOS_KEYDATA_CHANGE,
          this.handleDocosKeyDataChange_);
};
goog.inherits(office.localstore.LocalStoreMetadataSyncer, goog.Disposable);


/**
 * Handles a title change event by writing the new title into local storage.
 * @param {!office.info.Document.Event} titleChangeEvent The title change event.
 * @private
 */
office.localstore.LocalStoreMetadataSyncer.prototype.handleTitleChange_ =
    function(titleChangeEvent) {
  this.localStoreDocument_.setTitle(this.documentInfo_.getTitle());
  this.localStoreDocument_.setLastSyncedTimestampToNowIfModified();
  this.localStoreDocument_.setLastModifiedClientTimestamp(
      titleChangeEvent.fromServer ? null : goog.now());
  this.localStore_.write([this.localStoreDocument_], goog.nullFunction);
};


/**
 * Handles a docos key data change event by writing the new data into local
 * storage.
 * @param {!office.info.Document.Event} docosKeyDataChangeEvent The change event.
 * @private
 */
office.localstore.LocalStoreMetadataSyncer.prototype.handleDocosKeyDataChange_ =
    function(docosKeyDataChangeEvent) {
  this.localStoreDocument_.setDocosKeyData(
      /** @type {!Array} */ (this.documentInfo_.getDocosKeyData()));
  this.localStoreDocument_.setLastSyncedTimestampToNowIfModified();
  this.localStore_.write([this.localStoreDocument_], goog.nullFunction);
};


/** @override */
office.localstore.LocalStoreMetadataSyncer.prototype.disposeInternal =
    function() {
  goog.base(this, 'disposeInternal');

  delete this.documentInfo_;
  delete this.localStore_;
  delete this.localStoreDocument_;
  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;
};
