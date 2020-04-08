

/**
 * @fileoverview Install font specific CSS in the DOM.

 */

goog.provide('office.fonts.CssInstaller');

goog.require('office.fonts.FontMetrics');
goog.require('goog.cssom');
goog.require('goog.dom');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');



/**
 * A class installing necessary CSS for fonts.
 * @param {!goog.dom.DomHelper} domHelper The DOM helper.
 * @constructor
 * @struct
 * @final
 */
office.fonts.CssInstaller = function(domHelper) {

  /**
   * A DOM helper.
   * @type {!goog.dom.DomHelper}
   * @private
   */
  this.domHelper_ = domHelper;

  /**
   * A map of the css of installed web fonts (@font-face).
   * @type {!Object.<string, string>}
   * @private
   */
  this.installedCss_ = {};

  /**
   * The stylesheet in which the @@font-face rules will be added.
   * @type {CSSStyleSheet}
   * @private
   */
  this.styleSheetIE_ = null;

  /**
   * The number of rules currently present in the stylesheet.
   * @type {number}
   * @private
   */
  this.numberOfRulesIE_ = 0;

  /**
   * The stylesheet in which the @@font-face rules will be added.
   * @type {CSSStyleSheet}
   * @private
   */
  this.styleSheetIEIFrame_ = null;

  /**
   * The number of rules currently present in the iframe stylesheet.
   * @type {number}
   * @private
   */
  this.numberOfRulesIEIFrame_ = 0;

  /**
   * The version of Internet Explorer or -1 if not on Internet Explorer or if
   * the version can not be determined.
   * @type {number}
   * @private
   */
  this.ieVersion_ = this.getIeVersion_();

  /**
   * All the nodes added to the head of the DOM helper. Stored so they can be
   * cleaned up later in tests.
   * @type {!Array.<!Node>}
   * @private
   */
  this.styleNodesDebugDebug_ = [];
};


/**
 * The max number of rules a stylesheet can contain on Internet Explorer.
 * @type {number}
 * @private
 */
office.fonts.CssInstaller.MAX_IE_RULES_ = 4096;


/**
 * @return {number} The Internet Explorer version or -1 if not on
 *     Internet Explorer or if the version could not be determined.
 * @private
 */
office.fonts.CssInstaller.prototype.getIeVersion_ = function() {
  var version = -1;
  if (goog.userAgent.IE) {
    try {
      version = parseFloat(goog.userAgent.VERSION);
    } catch (e) {}
  }
  return version;
};


/**
 * @return {boolean} True if Internet Explorer version is DOM compatible, false
 *     otherwise.
 * @private
 */
office.fonts.CssInstaller.prototype.isDOMCompatibleIE_ = function() {
  return this.ieVersion_ >= 9 && this.ieVersion_ < 11;
};


/**
 * Write css to the given dom.
 * @param {string} css The CSS to install.
 * @param {!goog.dom.DomHelper} domHelper The dom helper.
 * @param {boolean} isIframe Whether this is installing the CSS in the
 *     Iframe DOM.
 * @private
 */
office.fonts.CssInstaller.prototype.writeCssToDom_ = function(css, domHelper,
    isIframe) {
  if (this.isDOMCompatibleIE_()) {
    var document = domHelper.getDocument();
    this.writeIECss_(document, css,
        goog.bind(
            isIframe ? this.getStyleSheetIEIFrame_ : this.getStyleSheetIE_,
            this),
        goog.bind(
            isIframe ? this.setStyleSheetIEIFrame_ : this.setStyleSheetIE_,
            this),
        goog.bind(
            isIframe ? this.getNumberOfRulesIEIFrame_ :
                this.getNumberOfRulesIE_,
            this),
        goog.bind(
            isIframe ? this.setNumberOfRulesIEIFrame_ :
                this.setNumberOfRulesIE_,
            this));
  } else {
    this.addCssText_(css, domHelper);
  }
};


/**
 * Write css to the dom and the iframe if it exists.
 * @param {string} css The CSS to install.
 * @private
 */
office.fonts.CssInstaller.prototype.writeCssEverywhere_ = function(css) {
  this.writeCssToDom_(css, this.domHelper_, false /* isIframe */);

  var iframeDomHelper =
      office.fonts.FontMetrics.getInstance().getIframeDomHelper();
  if (iframeDomHelper) {
    this.writeCssToDom_(css, iframeDomHelper, true /* isIframe */);
  }
};


/**
 * Installs the Web Fonts CSS in the specified iframe.
 * @param {!goog.dom.DomHelper} iframeDom
 */
office.fonts.CssInstaller.prototype.installFontCssInIframe = function(iframeDom) {
  var css = goog.object.getValues(this.installedCss_).join('');
  this.writeCssToDom_(css, iframeDom, true /* isIframe */);
};


/**
 * Installs the Web Fonts CSS (@font-face rules) for the given FontFaceCssInfos.
 * @param {!Array.<!office.fonts.FontFaceCssInfo>} cssInfos Array of
 *     FontFaceCssInfo from which we generate the CSS string.
 */
office.fonts.CssInstaller.prototype.installFontCssInfos = function(cssInfos) {
  var familyToCss = {};
  for (var i = 0; i < cssInfos.length; i++) {
    var family = cssInfos[i].getFontFamily();
    familyToCss[family] = goog.string.buildString(
        familyToCss[family], office.fonts.CssInstaller.generateCss_(cssInfos[i]));
  }

  var css = '';
  for (var family in familyToCss) {
    if (this.installedCss_[family]) {
      continue;
    }
    var familyCss = familyToCss[family];
    css += familyCss;
    this.installedCss_[family] = familyCss;
  }

  if (css) {
    this.writeCssEverywhere_(css);
  }
};


/**
 * @return {CSSStyleSheet} The main frame stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.getStyleSheetIE_ = function() {
  return this.styleSheetIE_;
};


/**
 * Sets a new stylesheet for the main frame.
 * @param {CSSStyleSheet} styleSheet The stylesheet to set.
 * @private
 */
office.fonts.CssInstaller.prototype.setStyleSheetIE_ = function(styleSheet) {
  this.styleSheetIE_ = styleSheet;
};


/**
 * @return {number} The number of rules in the stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.getNumberOfRulesIE_ = function() {
  return this.numberOfRulesIE_;
};


/**
 * Sets the new number of rules in the main stylesheet.
 * @param {number} numberOfRules The number of rules in the stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.setNumberOfRulesIE_ = function(
    numberOfRules) {
  this.numberOfRulesIE_ = numberOfRules;
};


/**
 * @return {number} The number of rules in the stylesheet in the iframe.
 * @private
 */
office.fonts.CssInstaller.prototype.getNumberOfRulesIEIFrame_ = function() {
  return this.numberOfRulesIEIFrame_;
};


/**
 * Sets the new number of rules in the iframe stylesheet.
 * @param {number} numberOfRules The number of rules in the stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.setNumberOfRulesIEIFrame_ = function(
    numberOfRules) {
  this.numberOfRulesIEIFrame_ = numberOfRules;
};


/**
 * @return {CSSStyleSheet} The iframe stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.getStyleSheetIEIFrame_ = function() {
  return this.styleSheetIEIFrame_;
};


/**
 * Sets a new stylesheet for the iframe.
 * @param {CSSStyleSheet} styleSheet The stylesheet to set.
 * @private
 */
office.fonts.CssInstaller.prototype.setStyleSheetIEIFrame_ = function(
    styleSheet) {
  this.styleSheetIEIFrame_ = styleSheet;
};


/**
 * Gets or create a new stylesheet for Internet Explorer.
 * A new stylesheet is created if:
 *   - No stylesheet has been created yet;
 *   - Adding the rules to the current stylesheet would put the stylesheet over
 *     the Internet Explorer limit on the number of rules in a stylesheet.
 * @param {!Document} document The document in which to add the stylesheet.
 * @param {!function(): CSSStyleSheet} styleSheetGetter A getter for the
 *     styleSheet.
 * @param {!function(CSSStyleSheet)} styleSheetSetter A setter to the
 *     stylesheet.
 * @param {!function(): number} numberOfRulesGetter A getter for the
 *     number of rules currently in the stylesheet.
 * @param {!function(number)} numberOfRulesSetter A setter to the
 *     set the number of rules currently in the stylesheet.
 * @return {CSSStyleSheet} The stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.retrieveStyleSheet_ = function(document,
    styleSheetGetter, styleSheetSetter, numberOfRulesGetter,
    numberOfRulesSetter) {
  if (styleSheetGetter() == null ||
      numberOfRulesGetter() + 4 > office.fonts.CssInstaller.MAX_IE_RULES_) {
    numberOfRulesSetter(0);
    styleSheetSetter(this.createStyleSheetIE_(document));
  }
  return styleSheetGetter();
};


/**
 * Creates a stylesheet when on Internet Explorer.
 * @param {!Document} document The document in which to add the stylesheet.
 * @return {CSSStyleSheet} A new stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.createStyleSheetIE_ = function(document) {
  var head = document.getElementsByTagName('head')[0];
  var styleElement = document.createElement('style');

  styleElement.type = 'text/css';
  head.insertBefore(styleElement, head.lastChild);
  if (goog.DEBUG) {
    this.styleNodesDebugDebug_.push(styleElement);
  }
  return styleElement.styleSheet;
};


/**
 * Writes the CSS to a stylesheet when on Internet Explorer.
 * @param {!Document} document The document in which to add the stylesheet.
 * @param {string} css The css containing the @@font-face rules.
 * @param {!function(): CSSStyleSheet} styleSheetGetter A getter for the
 *     styleSheet.
 * @param {!function(CSSStyleSheet)} styleSheetSetter A setter to the
 *     stylesheet.
 * @param {!function(): number} numberOfRulesGetter A getter for the
 *     number of rules currently in the stylesheet.
 * @param {!function(number)} numberOfRulesSetter A setter to the
 *     set the number of rules currently in the stylesheet.
 * @private
 */
office.fonts.CssInstaller.prototype.writeIECss_ = function(document, css,
    styleSheetGetter, styleSheetSetter, numberOfRulesGetter,
    numberOfRulesSetter) {
  var styleSheet = this.retrieveStyleSheet_(document, styleSheetGetter,
      styleSheetSetter, numberOfRulesGetter, numberOfRulesSetter);
  if (!styleSheet.cssRules) {
    throw Error('No css rules on stylesheet.');
  }
  var fontFaces = css.split('@font-face ');
  for (var i = 1; i < fontFaces.length; i++) {
    var fontFaceRule = '@font-face ' + fontFaces[i];
    styleSheet.insertRule(fontFaceRule, styleSheet.cssRules.length);
  }
  numberOfRulesSetter(numberOfRulesGetter() + fontFaces.length - 1);
};


/**
 * Returns a string of CSS from the input css info. This produces the same
 * output as
 * {@code j.c.g.apps.themes.fonts.common.WebFontsCssBuilder#appendCss}.
 * @param {!office.fonts.FontFaceCssInfo} cssInfo Metadata we use to generate
 *     the CSS string. This must have exactly 1 non-local
 *     {@code office.fonts.FontFaceCssInfo.Source} entry, otherwise an error is
 *     raised.
 * @return {string} CSS string created from cssInfo.
 * @private
 */
office.fonts.CssInstaller.generateCss_ = function(cssInfo) {
  var css = '@font-face {\n';
  css += '  font-family: \'' + cssInfo.getFontFamily() + '\';\n';
  css += '  font-style: ' + cssInfo.getStyle() + ';\n';
  css += '  font-weight: ' + cssInfo.getWeight() + ';\n';

  var sourceString = cssInfo.getSourceString();
  if (!sourceString) {
    throw new Error('Must have exactly one non-local source entry to ' +
        'generate CSS for ' + cssInfo.getFontFamily());
  }

  css += '  src: ' + cssInfo.getSourceString();
  css += ' format(\'' + cssInfo.getSources()[0].getFormat() + '\')';
  css += ';\n}';
  return css;
};


/**
 * Calls {@code goog.cssom.addCssText} and holds on to elements created by this
 * so they can be cleaned up when testing.
 * @param {string} cssText CSS to add to the end of the document.
 * @param {!goog.dom.DomHelper} domHelper DOM helper user for document
 *     interactions.
 * @private
 */
office.fonts.CssInstaller.prototype.addCssText_ = function(
    cssText, domHelper) {
  var styleNode = goog.cssom.addCssText(cssText, domHelper);
  if (goog.DEBUG) {
    this.styleNodesDebugDebug_.push(styleNode);
  }
};


/**
 * Resets the singleton CSS installer so {@code getInstance} will return a new
 * instance on next call. Also removes the nodes that the singleton added.
 */
office.fonts.CssInstaller.resetSingletonDebugDebug = function() {
  if (office.fonts.CssInstaller.instance_) {
    var nodes = office.fonts.CssInstaller.instance_.styleNodesDebugDebug_;
    for (var i = 0; i < nodes.length; i++) {
      goog.dom.removeNode(nodes[i]);
    }
    // Clear the stored singleton so {@code getInstance} will return a new one.
    office.fonts.CssInstaller.instance_ = null;
  }
};
