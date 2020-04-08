/**
 * @fileoverview Contains the definition of an OfflineStorageAdapter that can
 * interact with fonts.

 */

goog.provide('office.fonts.FontOfflineStorageAdapter');

goog.require('office.fonts.FontFaceCssInfo');
goog.require('office.fonts.FontUtil');
goog.require('office.localstore.FontMetadata');
goog.require('office.storage.FetchResult');
goog.require('office.storage.LocalFile');
goog.require('office.storage.OfflineStorageAdapter');
goog.require('goog.async.Deferred');
goog.require('goog.object');



/**
 * The storage adapter responsible for fetching and syncing fonts.
 * @param {!office.localstore.WebFontsCapability} webFontsCapability
 * @param {!office.localstore.LocalStore} localStore The local store.
 * @param {!office.localstore.FileSyncer} fileSyncer The file syncer.
 * @param {!office.debug.ErrorReporterApi} errorReporter The error reporter.
 * @implements {office.storage.OfflineStorageAdapter}
 * @constructor
 * @struct
 */
office.fonts.FontOfflineStorageAdapter = function(
    webFontsCapability, localStore, fileSyncer, errorReporter) {
  /**
   * @type {!office.localstore.WebFontsCapability}
   * @private
   */
  this.webFontsCapability_ = webFontsCapability;

  /**
   * The local store.
   * @type {!office.localstore.LocalStore}
   * @private
   */
  this.localStore_ = localStore;

  /**
   * The file syncer.
   * @type {!office.localstore.FileSyncer}
   * @private
   */
  this.fileSyncer_ = fileSyncer;

  /**
   * The error reporter.
   * @type {!office.debug.ErrorReporterApi}
   * @private
   */
  this.errorReporter_ = errorReporter;

  /**
   * Cached font metadata, updated during successful fetch or sync,
   * keyed by fontFamily.
   * @type {!Object.<!office.fonts.FontMetadata>}
   * @private
   */
  this.cachedFontMetadata_ = {};
};


/**
 * The directory for storing fonts in local storage.
 * @type {string}
 */
office.fonts.FontOfflineStorageAdapter.FONT_DIRECTORY = 'fonts';


/** @override */
office.fonts.FontOfflineStorageAdapter.prototype.fetch = function(fetchRequest) {
  var fetchRequestId = /** @type {!office.fonts.FontFetchRequestId} */
      (fetchRequest.getId());
  var fontFamily = fetchRequestId.getFontFamily();
  var deferredFetchResult = new goog.async.Deferred();
  var cachedData = this.cachedFontMetadata_[fontFamily];
  if (cachedData) {
    var fetchResult = new office.storage.FetchResult(fetchRequestId, cachedData);
    deferredFetchResult.callback(fetchResult);
  } else {
    this.webFontsCapability_.readFontMetadata(
        [fontFamily],
        goog.bind(
            this.handleFetchResult_, this, fetchRequestId, deferredFetchResult),
        goog.bind(deferredFetchResult.errback, deferredFetchResult,
            'Failed to read fontmetadata for ' + fontFamily));
  }
  return deferredFetchResult;
};


/**
 * Processes the result of reading font metadata record. In case of success the
 * record is converted to office.fonts.FontMetadata, cached and returned as part
 * of FetchResult. In case of failure the error callback is called on deferred.
 * @param {!office.fonts.FontFetchRequestId} fetchRequestId The fetch request id.
 * @param {!goog.async.Deferred} deferredFetchResult The deferred object to use
 *     for return values. If there were errors from fetching, the errback will
 *     be called. Otherwise a non-nullable {@code office.storage.FetchResult} will
 *     be created and passed.
 * @param {Array.<office.localstore.FontMetadata>} fontMetadataRecords Font
 *     metadata records loaded from localstore.
 * @private
 */
office.fonts.FontOfflineStorageAdapter.prototype.handleFetchResult_ = function(
    fetchRequestId, deferredFetchResult, fontMetadataRecords) {
  // Expecting only one fontFamily here.
  if (fontMetadataRecords && fontMetadataRecords[0]) {
    var record = /** @type {!office.localstore.FontMetadata} */
        (fontMetadataRecords[0]);
    var fontMetadata = office.fonts.FontUtil.createFontMetadataFromRecord(
        record, this.errorReporter_);
    this.cachedFontMetadata_[fetchRequestId.getFontFamily()] = fontMetadata;
    var fetchResult = new office.storage.FetchResult(
        fetchRequestId, fontMetadata);
    deferredFetchResult.callback(fetchResult);
  } else {
    deferredFetchResult.errback('Failed to read fontmetadata.');
  }
};


/** @override */
office.fonts.FontOfflineStorageAdapter.prototype.sync = function(fetchResult) {
  if (!this.localStore_.isWritable()) {
    return goog.async.Deferred.succeed(fetchResult);
  }

  var fontMetadata = /** @type {!office.fonts.FontMetadata} */
      (fetchResult.getResult());
  var fetchRequestId = /** @type {!office.fonts.FontFetchRequestId} */
      (fetchResult.getId());
  var fontFaces = fontMetadata.getFontFaceMap()[fetchRequestId.getFontFamily()];
  // Stores all font files that need to be synced.
  var localFilesMap = {};

  var urlToFileIdMap = fontMetadata.getUrlToFileIdMap();
  var deferredFetchResult = new goog.async.Deferred();
  for (var i = 0; i < fontFaces.length; i++) {
    var sources = fontFaces[i].getSources();
    for (var s = 0; s < sources.length; s++) {
      var source = sources[s];
      if (!source.isLocal()) {
        var fileId = urlToFileIdMap[source.getUrl()];
        if (!fileId) {
          deferredFetchResult.errback('Bad url ' + source.getUrl());
          return deferredFetchResult;
        }
        // Do not set the fonts directory on the local files themselves, instead
        // have the file syncer to sync all of the given font files in the fonts
        // directory.
        localFilesMap[fileId] = new office.storage.LocalFile(
            fileId,
            source.getUrl(),
            '' /* directory */);
      }
    }
  }

  // The deleteMissing option is false when syncing font faces files because
  // the preexisting files shouldn't be deleted from the file system since fonts
  // are not synced all at once.
  this.fileSyncer_.syncFiles(
      localFilesMap,
      [office.fonts.FontOfflineStorageAdapter.FONT_DIRECTORY],
      false /* deleteMissing */,
      goog.bind(this.handleSyncResult_, this, fetchResult,
          deferredFetchResult, fontMetadata));
  return deferredFetchResult;
};


/**
 * Processes the result of syncing remote font files to the filesystem.
 * @param {!office.storage.FetchResult} remoteFetchResult The fetch result that
 *     was synced.
 * @param {!goog.async.Deferred} deferredFetchResult The deferred object to use
 *     for return values. If there were errors from either syncing or writing
 *     values to storage, the errback will be called, passing any optional error
 *     data. Otherwise a non-nullable {@code office.storage.FetchResult} will be
 *     created and passed.
 * @param {!office.fonts.FontMetadata} fontMetadata The fontMetadata object.
 * @param {!office.localstore.FileSyncResult} fileSyncResult The syncing result.
 * @private
 */
office.fonts.FontOfflineStorageAdapter.prototype.handleSyncResult_ = function(
    remoteFetchResult, deferredFetchResult, fontMetadata, fileSyncResult) {
  if (fileSyncResult.hasUnexpectedFailures() || fileSyncResult.hasFailures()) {
    //  Have a common way to determine after initialization
    // that the user is not actually opted-in and handle these issues at a
    // higher level of abstraction.
    // In case of a sync error, fallback to using the remote fetch result.
    deferredFetchResult.callback(remoteFetchResult);
    return;
  }

  var updatedFontMetadata = /** @type {!office.fonts.FontMetadata} */
      (goog.object.unsafeClone(fontMetadata));

  var fetchRequestId = /** @type {!office.fonts.FontFetchRequestId} */
      (remoteFetchResult.getId());
  var fontFaces =
      updatedFontMetadata.getFontFaceMap()[fetchRequestId.getFontFamily()];
  var urlToFileIdMap = fontMetadata.getUrlToFileIdMap();
  for (var i = 0; i < fontFaces.length; i++) {
    var sources = fontFaces[i].getSources();
    for (var j = 0; j < sources.length; j++) {
      var source = sources[j];
      var fileId = urlToFileIdMap[source.getUrl()];
      if (!source.isLocal() && fileId) {
        // Replace a remote source to a local source.
        sources[j] = new office.fonts.FontFaceCssInfo.Source(
            /** @type {string} */ (fileSyncResult.getLocalUrl(fileId)),
            false /* isLocal */,
            source.getFormat());
      }
    }
  }
  var fontMetadataRecord = this.createRecordFromFontMetadata_(
      updatedFontMetadata);
  this.localStore_.write(
      [fontMetadataRecord],
      goog.bind(this.handleFontMetadataWritten_, this, fetchRequestId,
          deferredFetchResult, updatedFontMetadata),
      goog.bind(deferredFetchResult.errback, deferredFetchResult,
          'Failed to write updated fontMetadata for ' +
          fetchRequestId.getFontFamily()));
};


/**
 * Processes the result of writing updated font metadata to local store after
 * the font files were synced.
 * @param {!office.fonts.FontFetchRequestId} fetchRequestId The fetch request id.
 * @param {!goog.async.Deferred} deferredFetchResult The deferred object to use
 *     for return values.
 * @param {!office.fonts.FontMetadata} fontMetadata The updated fontMetadata.
 * @private
 */
office.fonts.FontOfflineStorageAdapter.prototype.handleFontMetadataWritten_ =
    function(fetchRequestId, deferredFetchResult, fontMetadata) {
  this.cachedFontMetadata_[fetchRequestId.getFontFamily()] = fontMetadata;
  var fetchResult = new office.storage.FetchResult(fetchRequestId, fontMetadata);
  deferredFetchResult.callback(fetchResult);
};


/**
 * Creates office.localstore.FontMetadata from office.fonts.FontMetadata.
 * @param {!office.fonts.FontMetadata} fontMetadata Font metadata.
 * @return {!office.localstore.FontMetadata} The record.
 * @private
 */
office.fonts.FontOfflineStorageAdapter.prototype.createRecordFromFontMetadata_ =
    function(fontMetadata) {
  // Expecting one fontFamily only.
  for (var fontFamily in fontMetadata.getFontFaceMap()) {
    var fontFaceRecords = [];
    var fontFaces = fontMetadata.getFontFaceMap()[fontFamily];
    for (var i = 0; i < fontFaces.length; i++) {
      var fontFaceCssInfo = fontFaces[i];
      var sourceRecords = [];
      for (var j = 0; j < fontFaceCssInfo.getSources().length; j++) {
        var source = fontFaceCssInfo.getSources()[j];
        sourceRecords.push(new office.localstore.FontMetadata.Url(
            source.getFormat(), source.isLocal(), source.getUrl()));
      }
      fontFaceRecords.push(new office.localstore.FontMetadata.FontFace(
          fontFaceCssInfo.getFontFamily(),
          fontFaceCssInfo.isMenuFont(),
          fontFaceCssInfo.getStyle(),
          fontFaceCssInfo.getWeight(),
          sourceRecords));
    }
    return new office.localstore.FontMetadata(
        fontFamily,
        fontMetadata.getVersion(),
        fontFaceRecords,
        true /* isNew */);
  }
  throw Error('Can not create FontMetadata from invalid record');
};
