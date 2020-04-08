

/**
 * @fileoverview Docs unified MIME clipboard errors.
 *

 */

goog.provide('office.clipboard.ClipboardError');

goog.require('goog.debug.Error');



/**
 * Create error.
 *
 * @param {!office.clipboard.ClipboardError.Code} code The error code.
 * @param {string=} opt_message Optional clarifying message.
 * @constructor
 * @struct
 * @extends {goog.debug.Error}
 */
office.clipboard.ClipboardError = function(code, opt_message) {
  goog.base(this, opt_message || '' + code);


  /**
   * The error code.
   * @type {!office.clipboard.ClipboardError.Code}
   */
  this.errorCode = code;
};
goog.inherits(office.clipboard.ClipboardError, goog.debug.Error);


/**
 * Clipboard error codes.
 * @enum {number}
 */
office.clipboard.ClipboardError.Code = {

  /**
   * Attempt to use a MIME type not supported by the clipboard.
   */
  MIMETYPE_UNKNOWN: 1,

  /**
   * Attempt to use an unknown handle.
   */
  HANDLE_UNKNOWN: 2,

  /**
   * Error computing digests.
   */
  DIGEST_COMPUTE_ERROR: 3,

  /**
   * Generic error.
   */
  GENERIC_ERROR: 4
};

