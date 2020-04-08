/**
 * @fileoverview Contains the definition of the InternalClipboard class.


 */

goog.provide('office.clipboard.InternalClipboard');

goog.require('office.clipboard.BaseClipboard');
goog.require('office.clipboard.Clip');
goog.require('goog.async.Deferred');
goog.require('goog.functions');



/**
 * A clipboard used to store application specific in-memory representations of
 * a copied clip.
 * @param {!Array.<string>} mimeTypes The application specific MIME types.
 * @param {string=} opt_prefix Non-empty prefix string for clip handles.
 * @extends {office.clipboard.BaseClipboard}
 * @constructor
 * @struct
 */
office.clipboard.InternalClipboard = function(mimeTypes, opt_prefix) {
  goog.base(this, mimeTypes, opt_prefix);

  /**
   * A mapping of mime type to clip data.
   * @type {!Object}
   * @protected
   */
  this.clipDataMap = {};

  /**
   * The guid of the copied clip.
   * @private {string}
   */
  this.guid_ = '';

  /**
   * Digests by handle. Stores any digests used to obtain the handle.
   * @private {!Object.<!Array.<!office.clipboard.Digest>>}
   */
  this.digests_ = {};
};
goog.inherits(office.clipboard.InternalClipboard, office.clipboard.BaseClipboard);


/** @override */
office.clipboard.InternalClipboard.prototype.setClipInternal =
    function(clip, guid, handle) {
  // If a new clip is being set on this clipboard, clear all representations of
  // the current clip.
  if (!guid || this.guid_ != guid) {
    this.clipDataMap = {};
  }
  this.clipDataMap[clip.getMimeType()] = clip.getData();
  this.guid_ = guid;
};


/** @override */
office.clipboard.InternalClipboard.prototype.getClipInternal =
    function(mimeType, handle, timeout, guid) {
  var data = null;
  var digests = this.digests_[handle];
  var currentData = this.clipDataMap[mimeType] || null;
  if (!guid || this.guid_ == guid ||
      (digests && this.matchesDigests(digests, currentData))) {
    data = currentData;
  }
  return goog.async.Deferred.succeed(new office.clipboard.Clip(mimeType, data));
};


/** @override */
office.clipboard.InternalClipboard.prototype.getClipHandleInternal =
    function(digests) {
  var handle = goog.base(this, 'getClipHandleInternal', digests);
  this.digests_[handle] = digests;
  return handle;
};


/** @override */
office.clipboard.InternalClipboard.prototype.finishInternal =
    function(handle, guid) {
  delete this.digests_[handle];
  goog.base(this, 'finishInternal', handle, guid);
};


/**
 * Test if clip data matches any of the given digests. Implement this to support
 * matching clips by digests.
 * @param {!Array.<!office.clipboard.Digest>} digests The digests.
 * @param {*} data The clip data.
 * @protected
 * @return {boolean} Whether the clip matches.
 */
office.clipboard.InternalClipboard.prototype.matchesDigests =
    goog.functions.FALSE;
