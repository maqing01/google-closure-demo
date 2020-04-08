/**
 * @fileoverview A proxy used to write the local store document including its
 * model and any other records related to the document, but may be created
 * before the document is itself created.  This allows model pieces and other
 * to-be-stored records associated with the document to be accumulated before
 * the main body of the client storage library is loaded.
 */

goog.provide('office.localstore.DocumentWriterProxy');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.functions');
goog.require('goog.log');



/**
 * Queue of unwritten changes associated with a document.
 * @param {string} documentId The document id.
 * @param {!office.localstore.StartupHintsProcessor=} opt_startupHintsProcessor
 *     A startup hints processor.
 * @param {!Array.<!goog.async.Deferred>=} opt_localStorePrerequisites
 *     Prerequisites that must be complete before we switch to local storage.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.DocumentWriterProxy = function(documentId,
    opt_startupHintsProcessor, opt_localStorePrerequisites) {
  goog.base(this);

  /** @private {string} */
  this.documentId_ = documentId;

  /**
   * The jobset the current document should be recorded as being part of.
   * @private {?string}
   */
  this.jobset_ = office.flag.getInstance().getString(office.flag.Flags.JOBSET);

  /**
   * Whether the current document is on the feature fast track or not.
   * @private {boolean}
   */
  this.isFastTrack_ =
      office.flag.getInstance().getBoolean(office.flag.Flags.FAST_TRACK);

  /**
   * Whether the document is only partially synced.
   * @private {?boolean}
   */
  this.isPartiallySynced_ = null;

  /**
   * The access level for the user specified by userId_.
   * @private {?office.localstore.Document.AccessLevel}
   */
  this.accessLevel_ = null;

  /**
   * User object, once it has been registered.
   * @private {office.localstore.User}
   */
  this.localStoreUser_ = null;

  /**
   * The startup hints processor to use to process any startup hints set on
   * the proxy.
   * @private {office.localstore.StartupHintsProcessor}
   */
  this.startupHintsProcessor_ = opt_startupHintsProcessor || null;

  /**
   * The deferred result of an invocation of the startupHintsProcessor_.
   * The document should not be allowed to be written to storage until the
   * startup hints have all been processed.
   * @private {goog.async.Deferred}
   */
  this.startupHintsResult_ = null;

  /**
   * The raw startup hints to be processed once local storage is available.
   * @private {Object}
   */
  this.startupHints_ = null;

  /**
   * The document entity records to be written alongside the local document.
   * @private {Array.<!office.localstore.Record>}
   */
  this.documentEntities_ = null;

  /**
   * Callback for handling local store errors generated while writing.
   * @private {?function(!office.localstore.LocalStoreError)}
   */
  this.writeErrorCallback_ = null;

  /**
   * @private {boolean}
   */
  this.hasSwitchedToLocalStorage_ = false;

  /** @private {?string} */
  this.title_ = null;

  /**
   * The document's last modified timestamp in server time.
   * @private {number}
   */
  this.lastModifiedServerTimestamp_ = 0;

  /** @private {?boolean} */
  this.modelNeedsResync_ = null;

  /**
   * Whether {@link discardAndIgnoreAllUpdates} was ever called.
   * @private {boolean}
   */
  this.discarded_ = false;

  /** @private {Array} */
  this.docosKeyData_ = null;

  /**
   * Whether Docos key data is missing for this document.
   * @private {boolean}
   */
  this.docosKeyDataMissing_ = false;

  /**
   * Whether the document is created on the server. Null if this is unknown or
   * doesn't need to change.
   * @private {?boolean}
   */
  this.isCreated_ = null;

  /**
   * Document object, once it has been registered.
   * @private {office.localstore.Document}
   */
  this.localStoreDocument_ = null;

  /**
   * Local store object, once it has been registered.
   * @private {office.localstore.LocalStore}
   */
  this.localStore_ = null;

  /**
   * Deferred controlling when we switch to local storage.
   * @private {!goog.async.Deferred}
   */
  this.isUsingLocalStorage_ = new goog.async.Deferred();
  var prereq = opt_localStorePrerequisites || [];
  for (var i = 0; i < prereq.length; i++) {
    this.isUsingLocalStorage_.awaitDeferred(prereq[i]);
  }
  this.isUsingLocalStorage_.addCallback(
      goog.bind(this.switchToLocalStorage_, this));
};
goog.inherits(office.localstore.DocumentWriterProxy, goog.Disposable);


/**
 * @type {goog.log.Logger}
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.logger =
    goog.log.getLogger('office.localstore.DocumentWriterProxy');


/**
 * Determines if {@link discardAndIgnoreAllUpdates} was ever called.
 * @return {boolean} whether {@link discardAndIgnoreAllUpdates} was ever called.
 */
office.localstore.DocumentWriterProxy.prototype.wasDiscarded = function() {
  return this.discarded_;
};


/**
 * Commits the changes to local storage, assuming it is available. If it is not
 * available, this does nothing. This method can always be called safely.
 * @return {!goog.async.Deferred} A deferred which will fire once any writes
 *     triggered by this call are completed.  Will fire immediately if no
 *     writes are required.
 */
office.localstore.DocumentWriterProxy.prototype.flush = function() {
  //  Return if not all the prerequisites were fired. This can be
  // done after Taco will use the bulk syncer for warm start.
  goog.log.fine(this.logger, 'flush()');
  var deferred = new goog.async.Deferred();

  if (this.discarded_ || !this.localStoreDocument_) {
    goog.log.fine(
        this.logger, 'No local store document registered, flush() abandoned.');
    deferred.callback(true);
    return deferred;
  }

  if (this.title_) {
    this.localStoreDocument_.setTitle(this.title_);
    // Clear the title here since all the further title changes would go
    // through the meta data syncer.
    // TODO(nikolasco) move this functionality into the
    // LocalStoreMetadataSyncer.
    this.title_ = null;
  }
  if (this.lastModifiedServerTimestamp_ > 0) {
    this.localStoreDocument_.setLastModifiedServerTimestamp(
        this.lastModifiedServerTimestamp_);
    this.lastModifiedServerTimestamp_ = 0;
  }
  if (goog.isDefAndNotNull(this.modelNeedsResync_)) {
    this.localStoreDocument_.setModelNeedsResync(this.modelNeedsResync_);
    this.modelNeedsResync_ = null;
  }
  //if (this.jobset_) {
  //  this.localStoreDocument_.setJobset(this.jobset_);
  //  this.jobset_ = null;
  //}
  this.localStoreDocument_.setIsFastTrack(this.isFastTrack_);
  this.localStoreDocument_.setLastSyncedTimestampToNowIfModified();
  if (this.docosKeyData_) {
    this.localStoreDocument_.setDocosKeyData(this.docosKeyData_);
    this.docosKeyData_ = null;
  }
  if (goog.isDefAndNotNull(this.isCreated_)) {
    this.localStoreDocument_.setIsCreated(this.isCreated_);
    this.isCreated_ = null;
  }
  if (goog.isDefAndNotNull(this.accessLevel_)) {
    this.localStoreDocument_.setAccessLevel(
        this.localStoreUser_.getId(), this.accessLevel_);
    this.accessLevel_ = null;
  }
  if (goog.isDefAndNotNull(this.isPartiallySynced_)) {
    this.localStoreDocument_.setIsPartiallySynced(this.isPartiallySynced_);
    this.isPartiallySynced_ = null;
  }

  var startupHintsFiredBeforeWrite =
      this.startupHintsResult_ && this.startupHintsResult_.hasFired();

  // Write the document before invoking the startup hints processor. We do this
  // so the model data can be written as soon as possible after flush is
  // invoked, rather than waiting an arbitrary amount of time for the startup
  // hint processors to finish.
  goog.log.fine(this.logger, 'flush(): writing document.');
  this.writeDocument_(deferred);

  if (this.startupHintsProcessor_ && this.startupHints_ &&
      !this.startupHintsResult_) {
    goog.log.fine(this.logger, 'flush(): processing startup hints.');
    this.startupHintsResult_ = this.startupHintsProcessor_.processStartupHints(
        this.localStoreDocument_, this.startupHints_);
    this.startupHints_ = null;
  }

  // If the startup hints have already been processed, then the regular write
  // to the document, above, is all that's necessary. If processing is still
  // pending, then queue up another document write.
  if (this.startupHintsResult_ && !startupHintsFiredBeforeWrite) {
    var startupHintsWriteDeferred = new goog.async.Deferred();

    // Make anyone else waiting on the callback to the flush also wait until
    // the startup hints have been written to storage.
    deferred.awaitDeferred(startupHintsWriteDeferred);

    // Write the document again after the startup hints processor has completed.
    // We don't care if the hint processor succeeded or failed, just that it's
    // finished before continuing.
    this.startupHintsResult_.addBoth(goog.functions.lock(
        goog.bind(this.writeDocument_, this, startupHintsWriteDeferred)));
  }

  if (this.docosKeyDataMissing_) {
    var docosCapability = this.localStore_.getDocosCapability();
    if (docosCapability) {
      docosCapability.pushMissingDocosDocumentId(
          this.documentId_, goog.nullFunction /* resultCallback */);
    }
    this.docosKeyDataMissing_ = false;
  }

  return deferred;
};


/**
 * Writes the document to storage.
 * @param {!goog.async.Deferred} deferred The deferred result to call back when
 *     the deferred write has succeeded.
 * @private
 */
office.localstore.DocumentWriterProxy.prototype.writeDocument_ = function(
    deferred) {
  goog.log.fine(this.logger, 'writeDocument_()');
  this.localStore_.write([this.localStoreDocument_],
      goog.bind(this.maybeWriteDocumentEntities_, this, deferred),
      this.writeErrorCallback_ || undefined);
};


/**
 * Writes the pending document entities to storage if there are any.
 * @param {!goog.async.Deferred} deferred The deferred result to call back when
 *     the deferred write has succeeded.
 * @private
 */
office.localstore.DocumentWriterProxy.prototype.maybeWriteDocumentEntities_ =
    function(deferred) {
  if (this.documentEntities_) {
    var documentEntities = this.documentEntities_;
    this.documentEntities_ = null;
    this.localStore_.write(documentEntities,
        goog.bind(deferred.callback, deferred, true),
        this.writeErrorCallback_ || undefined);
  } else {
    deferred.callback(true);
  }
};


/**
 * @return {office.localstore.LocalStore} The local storage object.
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.getLocalStore = function() {
  return this.localStore_;
};


/**
 * @return {office.localstore.Document} The document object.
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.getLocalStoreDocument =
    function() {
  return this.localStoreDocument_;
};


/**
 * @return {string} The document ID.
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.getDocumentId = function() {
  return this.documentId_;
};


/**
 * Registers the local storage library once it has loaded.  Once this call has
 * been made, all mutations queued by this proxy and all mutations provided to
 * it in future will be passed on to the real document and local storage
 * objects.
 * @param {!office.localstore.LocalStore} localStore The local storage object.
 * @param {!office.localstore.Document} localStoreDocument The document.
 * @param {!office.localstore.User} localStoreUser The user. Used when setting
 *     access level on the document.
 */
office.localstore.DocumentWriterProxy.prototype.registerLocalStorage = function(
    localStore, localStoreDocument, localStoreUser) {
  goog.log.fine(this.logger, 'registerLocalStorage()');
  goog.asserts.assert(!this.discarded_, 'Local storage may not be registered ' +
      'after discardAndIgnoreAllUpdates has been called');
  goog.asserts.assert(!this.localStore_, 'Local storage may only be ' +
      'registered once.');
  this.localStore_ = localStore;
  this.localStoreDocument_ = localStoreDocument;
  this.localStoreUser_ = localStoreUser;

  // Switch to local storage.
  this.isUsingLocalStorage_.callback(true);
};


/**
 * Switches to using local storage, including the storage of queued data.
 * @return {!goog.async.Deferred} A deferred which fires when any writes
 *     required to switch to local storage are complete.
 * @private
 */
office.localstore.DocumentWriterProxy.prototype.switchToLocalStorage_ =
    function() {
  goog.log.info(this.logger, 'Switching to local storage.');
  this.switchToLocalStorageInternal();
  this.hasSwitchedToLocalStorage_ = true;

  // Returning the deferred result of flush() will cause the callback chain of
  // isUsingLocalStorage_ to pause until the flush is complete.  This is true
  // any time one of a deferred's callbacks itself returns a deferred.


  //    TODO(jcai): comment this to avoid to write document to local storage.
  return this.flush();
};


/**
 * @return {!goog.async.Deferred} A deferred indicating whether this proxy has
 *     started storing its mutations in local storage yet.
 */
office.localstore.DocumentWriterProxy.prototype.isUsingLocalStorage = function() {
  return this.isUsingLocalStorage_;
};


/**
 * @return {boolean} Whether we switched to local storage.
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.hasSwitchedToLocalStorage =
    function() {
  return this.hasSwitchedToLocalStorage_;
};


/**
 * Clients are expected to override this to switch over to using local storage.
 * That might include associating pending mutations and/or document-specific
 * metadata changes. It will only be called once, after there is a local storage
 * document associated (i.e. {@link getDocument} will return non-null). It must
 * be synchronous.
 * @protected
 */
office.localstore.DocumentWriterProxy.prototype.switchToLocalStorageInternal =
    goog.abstractMethod;


/**
 * Discards any updates that may have accumulated and prevents any new updates
 * from accumulating.
 */
office.localstore.DocumentWriterProxy.prototype.discardAndIgnoreAllUpdates =
    function() {
  goog.log.info(this.logger, 'Discarding proxy.');
  goog.asserts.assert(!this.localStore_, 'Proxy can not be discarded after ' +
      'local storage has been registered.');
  this.discarded_ = true;
  // Discard docos key data as it might be a bit large.
  this.docosKeyData_ = null;
};


/**
 * Sets the document's title.
 * @param {string} title The title.
 */
office.localstore.DocumentWriterProxy.prototype.setTitle = function(title) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setTitle(title);
  } else {
    this.title_ = title;
  }
};


/**
 * Sets the document's last modified timestamp in server time.
 * @param {?number} lastModifiedTimestamp A timestamp in ms since the epoch or
 *     null if no change should be made.
 */
office.localstore.DocumentWriterProxy.prototype.setLastModifiedServerTimestamp =
    function(lastModifiedTimestamp) {
  if (lastModifiedTimestamp == null) {
    return;
  }

  var timestamp = /** @type {number} */ (lastModifiedTimestamp);
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setLastModifiedServerTimestamp(timestamp);
  } else {
    this.lastModifiedServerTimestamp_ = timestamp;
  }
};


/**
 * Sets the model needs resync bit on the document.
 * @param {boolean} modelNeedsResync
 */
office.localstore.DocumentWriterProxy.prototype.setModelNeedsResync = function(
    modelNeedsResync) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setModelNeedsResync(modelNeedsResync);
  } else {
    this.modelNeedsResync_ = modelNeedsResync;
  }
};


/**
 * Sets the document's docos key data.
 * @param {!Array} docosKeyData The docos key data.
 */
office.localstore.DocumentWriterProxy.prototype.setDocosKeyData =
    function(docosKeyData) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setDocosKeyData(docosKeyData);
  } else {
    this.docosKeyData_ = docosKeyData;
  }
};


/**
 * Sets whether the document has been created on the server.
 * @param {boolean} isCreated Whether the document has been created on the
 *     server.
 */
office.localstore.DocumentWriterProxy.prototype.setIsCreated = function(
    isCreated) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setIsCreated(isCreated);
  } else {
    this.isCreated_ = isCreated;
  }
};


/**
 * @param {string} jobset The jobset.
 */
office.localstore.DocumentWriterProxy.prototype.setJobset = function(jobset) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setJobset(jobset);
  } else {
    this.jobset_ = jobset;
  }
};


/**
 * Sets a user's access level.
 * @param {office.localstore.Document.AccessLevel} accessLevel The access level.
 */
office.localstore.DocumentWriterProxy.prototype.setAccessLevel = function(
    accessLevel) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setAccessLevel(
        this.localStoreUser_.getId(), accessLevel);
  } else {
    this.accessLevel_ = accessLevel;
  }
};


/**
 * Sets the startup hints to be processed by the startup hints processor, if
 * one was provided.
 * @param {!Object} startupHints The startup hints to process once the local
 *     document is available.
 */
office.localstore.DocumentWriterProxy.prototype.setStartupHints = function(
    startupHints) {
  if (this.localStoreDocument_ && this.startupHintsProcessor_) {
    if (this.startupHintsResult_) {
      throw Error('Cannot process startup hints twice for the same document.');
    }
    this.startupHintsResult_ = this.startupHintsProcessor_.processStartupHints(
        this.localStoreDocument_, startupHints);
  } else if (this.startupHintsProcessor_) {
    if (this.startupHints_) {
      throw Error('Startup hints were already set.');
    }
    this.startupHints_ = startupHints;
  }
};


/**
 * Sets document entity records to be written alongside the local document
 * record the next time that flush() is called. Once the records are written,
 * they will be cleared and not written a second time if flush() is called
 * repeatedly.
 * @param {!Array.<office.localstore.Record>} documentEntities The entities to
 *     write.
 */
office.localstore.DocumentWriterProxy.prototype.setDocumentEntities =
    function(documentEntities) {
  // Unlike the other setters, which alter the document record, this one simply
  // sets records that ought to be written along with the document the next
  // time flush() is called.
  this.documentEntities_ = documentEntities;
};


/**
 * Sets the callback used for handling local store write errors.
 * @param {!function(!office.localstore.LocalStoreError)} writeErrorCallback The
 *     callback for handling local store errors generated while writing.
 */
office.localstore.DocumentWriterProxy.prototype.setWriteErrorCallback =
    function(writeErrorCallback) {
  this.writeErrorCallback_ = writeErrorCallback;
};


/**
 * Marks docos key data as missing.
 */
office.localstore.DocumentWriterProxy.prototype.markDocosKeyDataMissing =
    function() {
  this.docosKeyDataMissing_ = true;
};


/**
 * Sets the fast track status of the document.
 * @param {boolean} isFastTrack The fast track status.
 */
office.localstore.DocumentWriterProxy.prototype.setIsFastTrack = function(
    isFastTrack) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setIsFastTrack(isFastTrack);
  } else {
    this.isFastTrack_ = isFastTrack;
  }
};


/**
 * Sets the bit that indicates whether the document is only partially synced.
 * @param {boolean} isPartiallySynced
 */
office.localstore.DocumentWriterProxy.prototype.setIsPartiallySynced =
    function(isPartiallySynced) {
  if (this.localStoreDocument_) {
    this.localStoreDocument_.setIsPartiallySynced(isPartiallySynced);
  } else {
    this.isPartiallySynced_ = isPartiallySynced;
  }
};
