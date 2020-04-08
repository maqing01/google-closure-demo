

/**
 * @fileoverview An interface for providing content for the AppClipboard.

 */

goog.provide('office.clipboard.ClipboardContentProvider');



/**
 * An interface for providing content for the AppClipboard. Classes
 * implementing this interface will provide an object that contains the content
 * for the AppClipboard.
 * @interface
 */
office.clipboard.ClipboardContentProvider = function() {};


/**
 * @return {!Array.<!office.clipboard.Clip>} The application clipboard content.
 */
office.clipboard.ClipboardContentProvider.prototype.getClips =
    goog.abstractMethod;


/**
 * @param {boolean=} opt_withContext Whether to generate the context for a
 *     selection within a model (ex. the paragraph containing the selection in
 *     the case of a Braille context). If not specified, no context is used and
 *     the original selection is preserved. The HTML clip returned will only
 *     have context if both opt_withContext is true and the current selection
 *     does not span multiple paragraphs or have multiple ranges.
 *     TODO (joshgiles): Consider always returning a context when requested.
 * @return {office.clipboard.Clip} The clipboard html content, which will either
 *     have MIME type DOCS_HTML_CLIP or DOCS_HTML_CONTEXT.
 */
office.clipboard.ClipboardContentProvider.prototype.getHtmlClip =
    goog.abstractMethod;
