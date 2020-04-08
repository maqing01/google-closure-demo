/**
 * @fileoverview A native clipboard for browsers which understands DOM.
 *

 */

goog.provide('office.clipboard.BrowserSystemClipboard');

goog.require('office.clipboard.Clip');
goog.require('office.clipboard.ClipboardError');
goog.require('office.clipboard.MimeType');
goog.require('office.clipboard.SystemClipboard');
goog.require('office.html.HtmlTextConverter');
goog.require('goog.dom');



/**
 * Clipboard that supports clips as HTML strings. HTML clips are stored on the
 * browser native clipboard. This class uses a office.clipboard.TransferAgent
 * instance to interface with the browser native clipboard.
 * @param {!office.clipboard.TransferAgent} transferAgent The transfer agent
 *     to access the native clip data.
 * @param {office.clipboard.SystemClipboard.TextMode} textMode The text mode.
 * @param {!Array.<string>=} opt_mimeTypes The additional MIME types supported.
 *     The content for each MIME type must be a string.
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @struct
 * @extends {office.clipboard.SystemClipboard}
 */
office.clipboard.BrowserSystemClipboard = function(
    transferAgent, textMode, opt_mimeTypes, opt_domHelper) {
  var customMimeTypes = opt_mimeTypes || [];
  goog.base(this,
      transferAgent,
      textMode,
      new office.html.HtmlTextConverter(),
      customMimeTypes,
      [office.clipboard.MimeType.DOCS_HTML_DOM]);

  /**
   * The DOM helper.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.dom_ = opt_domHelper || goog.dom.getDomHelper();
};
goog.inherits(office.clipboard.BrowserSystemClipboard,
    office.clipboard.SystemClipboard);


/** @override */
office.clipboard.BrowserSystemClipboard.prototype.getClipOptNativeMimeTypes =
    function(mimeType, handle, timeout, guid) {
  switch (mimeType) {
    case office.clipboard.MimeType.DOCS_HTML_DOM:
      return this.getTransferAgent().
          getData(office.clipboard.MimeType.DOCS_HTML_DOM).addCallback(
              goog.bind(this.getElementClip_, this, handle, mimeType, guid));
    default:
      throw new office.clipboard.ClipboardError(
          office.clipboard.ClipboardError.Code.MIMETYPE_UNKNOWN,
          'Unhandled MIME type ' + mimeType);
  }
};


/**
 * Gets a clip from the transfer agent element with matching guids. Note that
 * guids are not matched if the guid is an empty string.
 * @param {string} handle The handle.
 * @param {string} mimeType The requested clip mimetype.
 * @param {string} guid The guid to match.
 * @param {!Element} element The element.
 * @return {!goog.async.Deferred} The deferred containing the DOM element clip.
 * @private
 */
office.clipboard.BrowserSystemClipboard.prototype.getElementClip_ =
    function(handle, mimeType, guid, element) {
  var html = element && element.innerHTML;
  var imageFn = goog.bind(function(imageHtml) {
    var imageElement = null;
    if (imageHtml) {
      imageElement = this.htmlToDom_('<div>' + imageHtml + '</div>');
    }
    return new office.clipboard.Clip(mimeType, imageElement);
  }, this);

  return this.getCheckedClip(handle, mimeType, guid, html, imageFn,
      new office.clipboard.Clip(mimeType, element));
};


/**
 * Convert HTML to a DOM tree.
 * @param {string} html The html.
 * @return {!Node} The DOM root.
 * @private
 */
office.clipboard.BrowserSystemClipboard.prototype.htmlToDom_ = function(html) {
  return this.dom_.htmlToDocumentFragment(html);
};
