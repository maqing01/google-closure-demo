

/**
 * @fileoverview Docs unified MIME clipboard digests.
 * Design: go/office-unified-clipboard.
 *

 */

goog.provide('office.clipboard.Digest');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');



/**
 * A clip digest is an identifier for the logical content of a  clip, such as a
 * hash of the unformatted text content of a clip, or some unique string
 * embedded in clips that are logically the same.
 *
 * @param {!office.clipboard.Digest.Type} type The digest type.
 * @param {!goog.async.Deferred|string} value The digest value.
 * @constructor
 * @struct
 */
office.clipboard.Digest = function(type, value) {

  /**
   * @type {!office.clipboard.Digest.Type}
   * @private
   */
  this.type_ = type;

  /**
   * @type {!goog.async.Deferred|string}
   * @private
   */
  this.value_ = value;
};


/**
 * Convenience method for matching digests. The arguments is a list of type and
 * matcher function. Digest types are matched in argument order, i.e. the
 * argument order determines the matching priority of the digest types. The
 * matcher function is called with the digest value, and should either return a
 * handle or null if the digest does not match. The method does not allow
 * deferred digest values.
 *
 * Example:
 *   guidMatcherFn = function (guid) {
 *     return this.guid_ == guid ? this.newClipHandle(guid) : null};
 *   textMatcherFn = function (text) {
 *     return this.text_ == text ? this.newClipHandle(this.guid_) : null};
 *   matchDigests(digests,
 *     office.clipboard.Digest.Type.GUID, guidMatcherFn,
 *     office.clipboard.Digest.Type.TEXT, textMatcherFn);
 *
 * @param {!Array.<!office.clipboard.Digest>} digests The digests.
 * @param {...(!office.clipboard.Digest.Type|(function(string): ?string))}
 *     typesAndMatchers Digest types and matchers.
 * @return {?string} Matching handle, or null if no handle matched.
 */
office.clipboard.Digest.matchDigests = function(digests, typesAndMatchers) {
  goog.asserts.assert((arguments.length - 1) % 2 == 0, 'Bad arguments.');
  var digestMap = {};
  for (var i = 0, digest; digest = digests[i]; i++) {
    var value = digest.getValue();
    var type = digest.getType();
    goog.asserts.assert(!(value instanceof goog.async.Deferred),
        'Deferred value no allowed.');
    if (!digestMap[type]) {
      digestMap[type] = [];
    }
    digestMap[type].push(value);
  }
  for (var i = 1, type; type = arguments[i]; i += 2) {
    var digestsOfType = digestMap[type];
    if (digestsOfType) {
      for (var j = 0, length = digestsOfType.length; j < length; j++) {
        /** @type {function(string): ?string} */
        var matchingFn = arguments[i + 1];
        var handle = matchingFn(digestsOfType[j]);
        if (handle != null) {
          return handle;
        }
      }
    }
  }
  return null;
};


/**
 * @return {!office.clipboard.Digest.Type} type The digest type.
 */
office.clipboard.Digest.prototype.getType = function() {
  return this.type_;
};


/**
 * @return {!goog.async.Deferred|string} type The digest value.
 */
office.clipboard.Digest.prototype.getValue = function() {
  return this.value_;
};


/**
 * Types of clipboard digests.
 * @enum {number}
 */
office.clipboard.Digest.Type = {
  /** Globally unique string. */
  GUID: 1,
  /**
   * Hash code of the content as text. The Code is computed using
   * goog.string.hashCode().
   */
  TEXT_HASH: 2,
  /** Cloudboard content hash compatible with cloudboard.Ui.hashClipping(). */
  CLOUDBOARD_HASH: 3,

  /** Clip as plain text. */
  TEXT: 4
};
