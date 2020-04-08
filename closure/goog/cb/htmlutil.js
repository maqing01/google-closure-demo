

/**
 * @fileoverview Static utility functions for dealing with HTML for clipboards.

 */

goog.provide('office.clipboard.HtmlUtil');


/**
 * The meta tag to use for specifying a charset encoding.
 * @type {string}
 */
office.clipboard.HtmlUtil.CHARSET_META_TAG = '<meta charset="utf-8">';


/**
 * Adds IE-specific wrapping to the HTML. IE10+ strips list tags if there are
 * list items without paragraph tags. Ensure that the guid is not stripped by
 * wrapping the HTML in a <b> tag. See b/11266398 for details.
 * @param {string} html
 * @return {string} The updated html.
 */
office.clipboard.HtmlUtil.wrapForIE = function(html) {
  return '<b style="font-weight:normal">' + html + '<br></b>';
};


// NOTE: The elements used for stripping can not overlap between different
// cases where the HTML may be nested.
/**
 * Gets the start of an HTML element that will prevent stripping of the
 * element's attribute and its direct children. This should be used for the
 * container element of the clipboard.
 * This is needed for Webkit browsers because the Webkit contentEditable
 * sanitizer in Chrome 17+ removes the id set on an unnecessary span tag but
 * preserves it for the b tag. Additionally, there are other times during paste
 * that the sanitizer strips content. Another known case is list tags without
 * any list items, even if they contain other lists.
 *
 * @param {string} id The id to add to the element.
 * @return {string} The start of the element to prevent stripping.
 */
office.clipboard.HtmlUtil.getContainerPreventStripElementStart = function(id) {
  return '<b style="font-weight:normal;" id="' + id + '">';
};


/**
 * Gets the end of an HTML element that will prevent stripping of the
 * element's attribute and its direct children. This should be used for the
 * container element of the clipboard.
 * @return {string} The end of the element to prevent stripping.
 * @see {office.clipboard.HtmlUtil#getContainerPreventStripElementStart}
 */
office.clipboard.HtmlUtil.getContainerPreventStripElementEnd = function() {
  return '</b>';
};


/**
 * Gets the start of an HTML element that will prevent stripping of the
 * element's attribute and its direct children. This should be used for list
 * elements.
 * @return {string} The start of the element to prevent stripping.
 */
office.clipboard.HtmlUtil.getListPreventStripElementStart = function() {
  return '<i style="font-style:normal">';
};


/**
 * Gets the end of an HTML element that will prevent stripping of the
 * element's attribute and its direct children. This should be used for list
 * elements.
 * @return {string} The end of the element to prevent stripping.
 * @see {office.clipboard.HtmlUtil#getListPreventStripElementStart}
 */
office.clipboard.HtmlUtil.getListPreventStripElementEnd = function() {
  return '</i>';
};
