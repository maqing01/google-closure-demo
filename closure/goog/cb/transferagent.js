

/**
 * @fileoverview Clip transfer agent.
 *

 */
goog.provide('office.clipboard.TransferAgent');



/**
 * Transfer agent for transferring clip data between a MIMEClipboard and the
 * actual clip storage (e.g. the native clipboard).
 * @interface
 */
office.clipboard.TransferAgent = function() {};


/**
 * Sets clipboard data.
 * @param {string} mimeType The data MIME type.
 * @param {string} data The serialized clipboard data as string.
 */
office.clipboard.TransferAgent.prototype.setData = goog.abstractMethod;


/**
 * @param {string} mimeType The data MIME type.
 * @return {!goog.async.Deferred} Serialized clipboard data. The deferred will
 *     yield null if there is no data for the given MIME type.
 */
office.clipboard.TransferAgent.prototype.getData = goog.abstractMethod;


/**
 * @return {!Array.<string>} The MIME types.
 */
office.clipboard.TransferAgent.prototype.getMimeTypes = goog.abstractMethod;


/**
 * Tests if a MIME type would be ignored during write. The method is used to
 * decide whether we need to generate content of a particular type, based on
 * the information available at the time. Note that the value is indeed only
 * a hint -- the write may be ignored despite this method yielding false.
 * However, a true value guarantees the data would be ignored.
 * The default implementation always returns false.
 * @param {string} mimeType The data MIME type.
 * @return {boolean} True if writes of this MIME type are ignored.
 */
office.clipboard.TransferAgent.prototype.getIgnoredHint = goog.abstractMethod;


/**
 * Flushes any cached reads.
 */
office.clipboard.TransferAgent.prototype.flushCache = goog.abstractMethod;
