

/**
 * @fileoverview A class which computes the metrics for a given web font.
 *
 * Unfortunately, there are no events to tell us when a web font has been
 * downloaded.  So we poll by testing the width of the characters.  We setup the
 * font path to be the web font followed by the default font.  If the web font
 * has not been downloaded yet, then the character widths will match those of
 * the default font, otherwise, the web font has arrived.
 *
 * The characters are measured in this class.

 */

goog.provide('office.fonts.FontMetrics');

goog.require('goog.Disposable');
goog.require('goog.dom');
goog.require('goog.style');



/**
 * The class which computes the metrics for a given font.
 * @param {!HTMLSpanElement} element The HTML element used to check the size of
 *     the text.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.fonts.FontMetrics = function(element) {
  goog.Disposable.call(this);

  /**
   * The element to which another element should be appended
   * in order to get the metrics.
   * @type {!HTMLSpanElement}
   * @private
   */
  this.element_ = element;

  /**
   * The element that is used if the sizing iframe
   * is not available.
   * @type {!HTMLSpanElement}
   * @private
   */
  this.fallbackElement_ = element;

  /**
   * DomHelper to create/update elements.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.domHelper_ = goog.dom.getDomHelper(this.element_);

  /**
   * Font Element will be used to check if the font is loaded.
   * The element will be reused for all the font check requests.
   * @type {!Element}
   * @private
   */
  this.fontElement_ = this.createFontElement_();
};
goog.inherits(office.fonts.FontMetrics, goog.Disposable);


/**
 * The test string.
 * @type {string}
 */
office.fonts.FontMetrics.TEST_STRING =
    'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';


/**
 * Creates the font element using the current dom helper object.
 * @return {!Element} The font element.
 * @private
 */
office.fonts.FontMetrics.prototype.createFontElement_ = function() {
  return this.domHelper_.createDom(
      'span',
      {'style': 'font-size:300px;width:auto;height:auto;line-height:normal;' +
            'margin:0;padding:0;white-space:nowrap;font-variant:normal;'},
      office.fonts.FontMetrics.TEST_STRING);
};


/**
 * On instantiation this will create a span in the main frame.
 * The span is used to get the metrics.
 * A client of the library can later pass an own iframe, the iframe must contain
 * a body with a span. The span must be the first child of the body and will
 * be used to get the metrics. This is needed by Vodka today to help with getting
 * the metrics (see document in office.fonts.vodka.VodkaFontLoader for more
 * information).
 * @return {!office.fonts.FontMetrics} The FontMetrics object.
 */
office.fonts.FontMetrics.getInstance = function() {
  if (office.fonts.FontMetrics.instance_ == null) {
    var offScreenElement = goog.dom.createDom('span',
        {'style': 'position:absolute;top:-10000px;left:-10000px;' });

    goog.dom.appendChild(goog.dom.getDocument().body, offScreenElement);
    office.fonts.FontMetrics.instance_ = new office.fonts.FontMetrics(
        /** @type {!HTMLSpanElement}  */ (offScreenElement));
  }
  return office.fonts.FontMetrics.instance_;
};


/**
 * Singleton instance of FontMetrics.
 * @type {office.fonts.FontMetrics}
 * @private
 */
office.fonts.FontMetrics.instance_ = null;


/**
 * Sets an iframe for sizing if such an iframe is already used by the
 * application. This is used by Vodka right now in order to help with sizing.
 * @param {!goog.dom.DomHelper} iframeDom The iframe dom helper.
 * @param {!HTMLSpanElement} element The element within the iframe to use
 *     for sizing.
 */
office.fonts.FontMetrics.prototype.setIframe = function(iframeDom, element) {
  this.removeIframe();
  if (iframeDom) {
    this.element_ = element;
    this.domHelper_ = iframeDom;
    this.fontElement_ = this.createFontElement_();
  }
};


/**
 * @return {goog.dom.DomHelper} The iframe.
 */
office.fonts.FontMetrics.prototype.getIframeDomHelper = function() {
  return this.domHelper_;
};


/**
 * Remove and stop using the iframe for sizing.
 */
office.fonts.FontMetrics.prototype.removeIframe = function() {
  this.element_ = this.fallbackElement_;
  this.domHelper_ = goog.dom.getDomHelper(this.element_);
  this.fontElement_ = this.createFontElement_();
};


/**
 * Computes and returns the font metrics for the given font and test string.
 * Extracted from vodka.util.SizeUtil.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 * @param {string} fontStack The font stack.
 * @return {number} The width for the given font test string.
 */
office.fonts.FontMetrics.prototype.getFontMetrics = function(fontIdentifier,
    fontStack) {
  goog.dom.removeChildren(this.element_);

  this.updateFontElement_(fontIdentifier, fontStack);
  this.domHelper_.appendChild(this.element_, this.fontElement_);
  var width = this.element_.offsetWidth;

  this.element_.removeChild(this.fontElement_);
  return width;
};


/**
 * Updates the font element with the font information from the font identifier
 * and font stack.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 * @param {string} fontStack The font stack.
 * @private
 */
office.fonts.FontMetrics.prototype.updateFontElement_ = function(
    fontIdentifier, fontStack) {
  var fontFamilyStringBuilder = [];
  if (fontIdentifier.getFontFamily() != '') {
    fontFamilyStringBuilder.push("'" + fontIdentifier.getFontFamily() + "'");
  }
  if (fontStack != '') {
    fontFamilyStringBuilder.push(fontStack);
  }
  var fontFamily = fontFamilyStringBuilder.length > 0 ?
      fontFamilyStringBuilder.join(',') : null;

  goog.style.setStyle(this.fontElement_, 'font-family',
      fontFamily != null ? fontFamily : '');
  goog.style.setStyle(this.fontElement_, 'font-weight',
      fontIdentifier.getWeight());
  goog.style.setStyle(this.fontElement_, 'font-style',
      fontIdentifier.getStyle());
};


/** @override */
office.fonts.FontMetrics.prototype.disposeInternal = function() {
  office.fonts.FontMetrics.superClass_.disposeInternal.call(this);
  goog.dom.removeNode(this.fallbackElement_);
  delete this.fallbackElement_;
  delete this.element_;
  delete this.fontElement_;
};
