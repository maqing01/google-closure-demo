

/**
 * @fileoverview Delegating clipboard.
 * Design: go/office-unified-clipboard.
 *

 */

goog.provide('office.clipboard.DelegatingClipboard');

goog.require('office.clipboard.Clip');
goog.require('office.clipboard.ClipboardError');
goog.require('office.clipboard.MimeClipboard');
goog.require('goog.array');
goog.require('goog.async.Deferred');
goog.require('goog.object');



/**
 * The DelegatingClipboard aggregates a set of constituent clipboards, each of
 * which typically supports a single MIME type. The DelegatingClipboard allows
 * setting and requesting the same clip in different MIME types, and it
 * uses digests to match clips across MIME types when getClip() is called.
 *
 * Among the delegated clipboards, one is designated as the primary clipboard,
 * and the contents of the other clipboards are matched to this clipboard. That
 * is, any clip returned from a non-primary clipboard is guaranteed to match
 * (via digests, non-transitively) the clip on the primary clipboard. To match
 * user expectations, the primary clipboard is typically the native clipboard.
 *
 * If several clipboards support a particular MIME type, the clip will be
 * primarily retrieved from the primary clipboard, then the other clipboards
 * in the listed order. A setClip operation affects all clipboards supporting
 * the type.
 *
 * @param {!office.clipboard.MimeClipboard} primaryClipboard The primary
 *     clipboard.
 * @param {!Array.<!office.clipboard.MimeClipboard>=} opt_clipboards The other
 *     clipboards.
 * @constructor
 * @struct
 * @implements {office.clipboard.MimeClipboard}
 */
office.clipboard.DelegatingClipboard = function(primaryClipboard,
    opt_clipboards) {

  /**
   * Array of clipboards. The 0th clipboard is the primary clipboard.
   * @type {!Array.<!office.clipboard.MimeClipboard>}
   * @private
   */
  this.clipboards_ = [];

  /**
   * Map from MIME type to clipboards supporting the type. The map value is
   * a list of indexes into the clipboards_ array.
   * @type {!Object.<string, !Array.<number>>}
   * @private
   */
  this.clipboardIxByMime_ = {};

  /**
   * Map from handle to clipboard context for handles currently in use.
   * @type {!Object.<string, !office.clipboard.DelegatingClipboardContext_>}
   * @private
   */
  this.contexts_ = {};

  this.addClipboard(primaryClipboard);
  if (opt_clipboards) {
    for (var i = 0; i < opt_clipboards.length; i++) {
      this.addClipboard(opt_clipboards[i]);
    }
  }
};


/**
 * Adds a (non-primary) clipboard.
 * @param {!office.clipboard.MimeClipboard} clipboard The clipboard to add.
 */
office.clipboard.DelegatingClipboard.prototype.addClipboard =
    function(clipboard) {
  var cbIndex = this.clipboards_.length;
  this.clipboards_.push(clipboard);
  var mimeTypes = clipboard.getMimeTypes();
  for (var i = 0; i < mimeTypes.length; i++) {
    var type = mimeTypes[i];
    if (!this.clipboardIxByMime_[type]) {
      this.clipboardIxByMime_[type] = [cbIndex];
    } else {
      this.clipboardIxByMime_[type].push(cbIndex);
    }
  }
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.setClip = function(
    clip, opt_handle) {
  this.checkHandle_(opt_handle);
  var targetClipboards = this.getTargetClipboards_(clip.getMimeType());
  for (var i = 0, len = targetClipboards.length; i < len; i++) {
    var targetClipboard = this.clipboards_[targetClipboards[i]];
    var mappedHandle = this.mapHandle_(opt_handle, targetClipboards[i],
        goog.bind(function(handle, guid) {
          // For unmapped handles, allocate a new handle on the target cb.
          return this.isDefaultHandle_(handle) ? null :
              targetClipboard.newClipHandle(guid);
        }, this));
    targetClipboard.setClip(clip, mappedHandle);
  }
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.getClip =
    function(mimeType, opt_handle, opt_timeout) {
  this.checkHandle_(opt_handle);
  var targetCbIx = this.getTargetClipboards_(mimeType)[0];
  if (targetCbIx > 0) {
    // Target is non-primary; look up clip by matching against primary.
    var mappedHandle = this.mapHandle_(opt_handle, targetCbIx,
        goog.bind(function(handle, guid) {
          // For unmapped handles, find a matching handle using digests.
          var matchDigests = this.clipboards_[0].getDigests(handle);
          return this.clipboards_[targetCbIx].getClipHandle(matchDigests);
        }, this));
    if (this.isDefaultHandle_(mappedHandle)) {
      return goog.async.Deferred.succeed(new office.clipboard.Clip(mimeType,
          null /* data */));
    } else {
      var targetClipboard = this.clipboards_[targetCbIx];
      // We need to finish the matched handle if caller is not using handles.
      var finishFn = this.isDefaultHandle_(opt_handle) ? goog.bind(
          targetClipboard.finish, targetClipboard, mappedHandle) : null;
      return this.mapResultClip_(targetClipboard.getClip(
          mimeType, mappedHandle, opt_timeout), opt_handle || null, finishFn);
    }
  } else {
    return this.mapResultClip_(this.clipboards_[0].getClip(
        mimeType, opt_handle, opt_timeout), opt_handle || null, null);
  }
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.getMimeTypes = function() {
  var allMimeTypes = /** @type {!Array.<string>} */
      (goog.object.getKeys(this.clipboardIxByMime_));
  goog.array.sort(allMimeTypes);
  return allMimeTypes;
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.getClipHandle =
    function(opt_digests) {
  return this.useHandle_(this.clipboards_[0].getClipHandle(opt_digests));
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.newClipHandle =
    function(opt_guid) {
  var guid = goog.isDefAndNotNull(opt_guid) ?
      opt_guid :
      office.clipboard.MimeClipboard.newGuid();
  return this.useHandle_(this.clipboards_[0].newClipHandle(guid), guid);
};


/** @override */
office.clipboard.DelegatingClipboard.prototype.finish = function(handle) {
  this.checkHandle_(handle);
  var context = this.contexts_[handle];
  for (var clipboardIx in context.handles) {
    this.clipboards_[clipboardIx].finish(context.handles[clipboardIx]);
  }
  delete this.contexts_[handle];
};


/**
 * Retrieves digests for the clip. Only digests for the primary clipboard are
 * returned. This is typically what is needed, and it avoids needless digest
 * matching operations to retrieve the digests of the secondary clipboards.
 *
 * @param {?string=} opt_handle Handle to the source clip, if unspecified/null
 *     the most recent clip is used.
 * @return {!Array.<!office.clipboard.Digest>} The clip digests.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 * @override
 */
office.clipboard.DelegatingClipboard.prototype.getDigests = function(opt_handle) {
  this.checkHandle_(opt_handle);
  return this.clipboards_[0].getDigests(opt_handle);
};


/**
 * Maps delegated clipboard handle to target clipboard handle.
 *
 * @param {string|null|undefined} handle The delegated clipboard handle.
 * @param {number} clipboardIx The index of the target clipboard.
 * @param {function((string|null|undefined), ?string): ?string} mappingFn
 *     Function for mapping handle without prior mapping. Called with delegated
 *     clipboard handle and associated guid (if any). Should return the mapped
 *     handle, or null for the default (most recent) handle.
 * @return {?string} Mapped handle valid for the target clipboard.
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.mapHandle_ =
    function(handle, clipboardIx, mappingFn) {
  if (clipboardIx == 0) {
    // The primary clipboard handles need no mapping.
    return handle || null;
  } else if (this.isDefaultHandle_(handle)) {
    // The default handle cannot be tabulated in context.handle as the clip it
    // points to may vary across calls. Just return a new mapping each time.
    return mappingFn(handle, null /* No guid for the default handle */);
  } else {
    var context = this.contexts_[/** @type {string} */ (handle)];
    var mappedHandle = context.handles[clipboardIx];
    if (!goog.isDef(mappedHandle)) {
      mappedHandle = mappingFn(handle, context.guid);
      context.handles[clipboardIx] = /** @type {string} */ (mappedHandle);
    }
    return mappedHandle;
  }
};


/**
 * Gets target clipboards based on MIME type.
 * @param {string} mimeType The MIME type.
 * @return {!Array.<number>} List of matching clipboards as indexes into the
 *     clipboards_ array.
 * @throws {office.clipboard.ClipboardError} If mimeType is not known.
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.getTargetClipboards_ =
    function(mimeType) {
  var targetClipboards = this.clipboardIxByMime_[mimeType];
  if (!targetClipboards) {
    throw new office.clipboard.ClipboardError(
        office.clipboard.ClipboardError.Code.MIMETYPE_UNKNOWN);
  }
  return targetClipboards;
};


/**
 * Maps the getClip result from a target clipboard to a result of this
 * clipboard.
 * @param {!goog.async.Deferred} deferred The deferred result to map.
 * @param {?string} delegatedHandle The handle to the clip on this clipboard.
 * @param {?function()} cleanupFn Optional cleanup function.
 * @return {!goog.async.Deferred} The mapped deferred result.
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.mapResultClip_ =
    function(deferred, delegatedHandle, cleanupFn) {
  var mappedDeferred = new goog.async.Deferred(null, this);
  deferred.addErrback(
      /**
       * @param {*=} opt_result Optional errback result.
       */
      function(opt_result) {
        cleanupFn && cleanupFn();
        mappedDeferred.errback(opt_result);
      });
  deferred.addCallback(
      /**
       * @param {!office.clipboard.Clip} result The result.
       */
      function(result) {
        cleanupFn && cleanupFn();
        mappedDeferred.callback(result);
      });
  return mappedDeferred;
};


/**
 * Marks a handle as being in use.
 * @param {string} handle The handle to mark.
 * @param {?string=} opt_guid Optional guid for new handle.
 * @return {string} The handle (for chaining).
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.useHandle_ =
    function(handle, opt_guid) {
  if (!this.contexts_[handle]) {
    this.contexts_[handle] =
        new office.clipboard.DelegatingClipboardContext_(opt_guid);
    this.contexts_[handle].handles[0] = handle;
  }
  return handle;
};


/**
 * Tests whether a handle is the default handle, i.e. undefined or null.
 * @param {string|null|undefined} handle The handle to test.
 * @return {boolean} Whether the handle is the default handle.
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.isDefaultHandle_ =
    function(handle) {
  return !goog.isDefAndNotNull(handle);
};


/**
 * Tests whether a handle is valid for this clipboard.
 * @param {string|null|undefined} handle The handle to test.
 * @throws {office.clipboard.ClipboardError} If handle is not known.
 * @private
 */
office.clipboard.DelegatingClipboard.prototype.checkHandle_ = function(handle) {
  if (!this.isDefaultHandle_(handle) &&
      !this.contexts_[/** @type {string} */ (handle)]) {
    throw new office.clipboard.ClipboardError(
        office.clipboard.ClipboardError.Code.HANDLE_UNKNOWN);
  }
};



/**
 * Context for a clip. Stores current GUID and any mapped handles.
 *
 * @param {?string=} opt_guid Optional GUID for the context.
 * @constructor
 * @struct
 * @private
 */
office.clipboard.DelegatingClipboardContext_ = function(opt_guid) {

  /**
   * Optional guid of the context.
   * @type {?string}
   */
  this.guid = opt_guid || null;


  /**
   * Mapped handles in this context. The handle mapped for the i:th clipboard
   * is keyed by i; if there is no such entry the handle is not yet mapped.
   * @type {!Object.<string>}
   */
  this.handles = {};
};
