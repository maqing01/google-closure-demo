

/**
 * @fileoverview A task polling for font to install.

 */

goog.provide('office.fonts.InstallFontTask');

goog.require('office.fonts.FontIdentifier');
goog.require('office.fonts.FontMetrics');



/**
 * A class which polls for a certain amount of time to check if a subset of a
 * font has been installed.
 * @param {!office.fonts.FontMetrics} fontMetrics The font metrics.
 * @param {!office.fonts.FontIdentifier} fontIdentifier The font identifier.
 * @param {boolean} isWebKit True if it's a WebKit based browser, false if it
 *     isn't.
 * @param {!function()} timeProvider Provides the number of milliseconds since
 *     January 1 1970 00:00:00.
 * @constructor
 * @struct
 */
office.fonts.InstallFontTask = function(
    fontMetrics, fontIdentifier, isWebKit, timeProvider) {

  /**
   * A class to calculate font metrics.
   * @type {!office.fonts.FontMetrics}
   * @private
   */
  this.fontMetrics_ = fontMetrics;

  /**
   * The identifier of the font which is being installed.
   * @type {!office.fonts.FontIdentifier}
   * @private
   */
  this.fontIdentifier_ = fontIdentifier;

  /**
   * True if it's a WebKit based browser, false if it isn't.
   * @type {boolean}
   * @private
   */
  this.isWebKit_ = isWebKit;

  /**
   * Provides the number of milliseconds since January 1 1970 00:00:00.
   * @type {!function()}
   * @private
   */
  this.timeProvider_ = timeProvider;

  /**
   * If on WebKit keep track of when we started polling for the new font in
   * case the font is metrics compatible with a last resort default font.
   * @type {number}
   * @private
   */
  this.webKitStartTime_ = timeProvider();
};


/**
 * Cached values for calculated last resort metrics.
 * @type {!Object.<!Array.<boolean>>}
 */
office.fonts.InstallFontTask.cachedLastResortMetrics = {};


/**
 * The default Sans font stack that should be used when sizing fonts.
 * @type {string}
 */
office.fonts.InstallFontTask.SANS_STACK = 'Arial,sans-serif';


/**
 * The default Serif font stack that should be used when sizing fonts.
 * @type {string}
 */
office.fonts.InstallFontTask.SERIF_STACK = "'Times New Roman',serif";


/**
 * Set of fonts that are metrics compatible with the WebKit last resort fonts.
 * @type {Object.<boolean>}
 * @private
 */
office.fonts.InstallFontTask.WEBKIT_METRICS_COMPATIBLE_FONTS_ = {
  'Arimo': true,
  'Cousine': true,
  'Quattrocento': true,
  'Tinos': true
};


/**
 * On WebKit the time after which we consider one of the metrics compatible
 * fonts to be installed, since it is impossible to detect that the font has
 * installed.
 * @type {number}
 * @private
 */
office.fonts.InstallFontTask.WEBKIT_TIMEOUT_METRICS_COMPATIBLE_FONTS_ = 5000;


/**
 * Stores the default font sizes for font styles and font stack.
 * The default sizes are used to compare the text rendered with the font
 * to check if the font is installed.
 * @type {!Object.<number>}
 * @private
 */
office.fonts.InstallFontTask.defaultFontSizes_ = {};


/**
 * A factory method to create a InstallFontTask.
 * @param {!office.fonts.FontIdentifier} fontIdentifier A font identifier.
 * @param {boolean} isWebKit True if it's a WebKit based browser, false if it
 *     isn't.
 * @param {!function()} timeProvider Provides the number of milliseconds since
 *     January 1 1970 00:00:00.
 * @return {!office.fonts.InstallFontTask} An instance of InstallFontTask.
 */
office.fonts.InstallFontTask.create = function(fontIdentifier, isWebKit,
    timeProvider) {
  return new office.fonts.InstallFontTask(office.fonts.FontMetrics.getInstance(),
      fontIdentifier, isWebKit, timeProvider);
};


/**
 * The maximum number of times before giving up.
 * Polling for at most 1 minute (300 tries * 200 ms = 1 minute).
 * @type {number}
 */
office.fonts.InstallFontTask.MAX_NUMBER_TRIES = 300;


/**
 * The current retry attempt count.
 * @type {number}
 * @private
 */
office.fonts.InstallFontTask.prototype.currentTry_ = 0;


/**
 * If on webkit contains the sizes for the different last resort fonts.
 * @type {Array.<boolean>}
 * @private
 */
office.fonts.InstallFontTask.prototype.webKitLastResortSizes_ = null;


/**
 * True if a size change occured that matches the last resort font size, false
 * otherwise.
 * @type {boolean}
 * @private
 */
office.fonts.InstallFontTask.prototype.webKitLastResortSizeChangeOccured_ = false;


/**
 * Original size sans.
 * @type {number}
 * @private
 */
office.fonts.InstallFontTask.prototype.originalSizeSans_ = 0;


/**
 * original size serif.
 * @type {number}
 * @private
 */
office.fonts.InstallFontTask.prototype.originalSizeSerif_ = 0;


/**
 * True if this task is initialized.
 * @type {boolean}
 * @private
 */
office.fonts.InstallFontTask.prototype.initialized_ = false;


/**
 * True if this task is completed.
 * @type {boolean}
 * @private
 */
office.fonts.InstallFontTask.prototype.completed_ = false;


/**
 * True if this task is completed and was successful.
 * @type {boolean}
 * @private
 */
office.fonts.InstallFontTask.prototype.successful_ = false;


/**
 * Returns the default size for the font stack and style-weight of this font.
 * Lookup the DEFAULT_FONT_SIZES map to check if the entry is available;
 * load entry if not present.
 * @param {string} fontStack The font stack.
 * @return {number} default size.
 * @private
 */
office.fonts.InstallFontTask.prototype.getDefaultSize_ = function(fontStack) {
  var weightStyle = fontStack + this.fontIdentifier_.getWeight() +
      this.fontIdentifier_.getStyle();

  var defaultSize = office.fonts.InstallFontTask.defaultFontSizes_[weightStyle];

  if (!goog.isDef(defaultSize)) {
    var defaultFontId = new office.fonts.FontIdentifier('',
        this.fontIdentifier_.getWeight(), this.fontIdentifier_.getStyle());
    defaultSize = this.fontMetrics_.getFontMetrics(defaultFontId, fontStack);
    office.fonts.InstallFontTask.defaultFontSizes_[weightStyle] = defaultSize;
  }

  return defaultSize;
};


/**
 * Initializes this task.
 */
office.fonts.InstallFontTask.prototype.init = function() {
  if (!this.initialized_) {
    this.originalSizeSans_ = this.getDefaultSize_(
        office.fonts.InstallFontTask.SANS_STACK);
    this.originalSizeSerif_ = this.getDefaultSize_(
        office.fonts.InstallFontTask.SERIF_STACK);
    this.webKitLastResortSizes_ = this.setUpWebKitLastResortSizes_();
    this.initialized_ = true;
  }
};


/**
 * Executes this task.
 */
office.fonts.InstallFontTask.prototype.run = function() {
  this.init();

  this.currentTry_++;
  var reachedMaxTries =
      this.currentTry_ >= office.fonts.InstallFontTask.MAX_NUMBER_TRIES;
  this.successful_ = this.hasInstalled_(this.originalSizeSans_,
      this.originalSizeSerif_);

  this.completed_ = this.successful_ || reachedMaxTries;
};


/**
 * Checks if a font has installed.
 * @param {number} originalSizeSans The original width for the sans
 *     stack.
 * @param {number} originalSizeSerif The original width for the serif
 *     stack.
 * @return {boolean} True if the font has installed, false otherwise.
 * @private
 */
office.fonts.InstallFontTask.prototype.hasInstalled_ = function(originalSizeSans,
    originalSizeSerif) {
  var sizeSans = this.fontMetrics_.getFontMetrics(this.fontIdentifier_,
      office.fonts.InstallFontTask.SANS_STACK);
  var sizeSerif = this.fontMetrics_.getFontMetrics(this.fontIdentifier_,
      office.fonts.InstallFontTask.SERIF_STACK);
  var isLastResortSize = this.webKitLastResortSizes_ &&
      this.webKitLastResortSizes_[sizeSans] &&
      this.webKitLastResortSizes_[sizeSerif];

  if (this.isWebKit_ && !this.webKitLastResortSizeChangeOccured_ &&
      isLastResortSize && sizeSans == sizeSerif) {
    this.webKitLastResortSizeChangeOccured_ = true;
    this.webKitLastResortSizes_ = [];
    this.webKitLastResortSizes_[sizeSans] = true;
  }
  return this.isWebKitMetricsCompatibleFont_() ||
      ((sizeSans != originalSizeSans || sizeSerif != originalSizeSerif) &&
      (this.webKitLastResortSizes_ == null || !isLastResortSize));
};


/**
 * Check If the web font installing is metrics compatible with the last resort
 * fonts, if it is and a timeout expires just report that the font has installed
 * properly since we can not know for sure.
 * @return {boolean} True if the font is a metrics compatible font and the
 *     timeout expired, false otherwise.
 * @private
 */
office.fonts.InstallFontTask.prototype.isWebKitMetricsCompatibleFont_ =
    function() {
  return this.isWebKit_ &&
      !!office.fonts.InstallFontTask.WEBKIT_METRICS_COMPATIBLE_FONTS_[
          this.fontIdentifier_.getFontFamily()] &&
      ((this.timeProvider_() - this.webKitStartTime_) >
          office.fonts.InstallFontTask.WEBKIT_TIMEOUT_METRICS_COMPATIBLE_FONTS_);
};


/**
 * When on WebKit, create a list of sizes for last resort fonts (which WebKit
 * applies to an element on which the web font is applied while the web font is
 * installing). The list of fonts has been gathered from the WebKit source code,
 * for the different platforms (mac, windows, chromium, gtk, qt).
 * @return {Array.<boolean>} A map of size to boolean for the last resort
 *     fonts for quick lookups.
 * @private
 */
office.fonts.InstallFontTask.prototype.setUpWebKitLastResortSizes_ = function() {
  if (!this.isWebKit_) {
    return null;
  }

  var weightStyle = this.fontIdentifier_.getWeight() +
      this.fontIdentifier_.getStyle();

  if (!office.fonts.InstallFontTask.cachedLastResortMetrics[weightStyle]) {
    // From WebKit source code, starting at:
    // WebKit/Source/WebCore/css/CSSFontFaceSource.cpp.
    var lastResortFonts =
        ['Times New Roman', 'Arial', 'Times', 'Sans', 'Serif'];
    var lastResortFontSizes = lastResortFonts.length;
    var webKitLastResortSizes = [];

    for (var i = 0; i < lastResortFontSizes; i++) {
      var font = lastResortFonts[i];

      // First get the size we are expecting for the weight style combination
      var expectedSize = this.computeLastResortMetrics_(font,
          this.fontIdentifier_.getWeight(), this.fontIdentifier_.getStyle());
      webKitLastResortSizes[expectedSize] = true;

      if (this.fontIdentifier_.getWeight() !=
          office.fonts.FontIdentifier.Weight.NORMAL) {

        //  Determine if this is happening with italics also.

        // For some unknown reason, sometimes we get the size of the last resort
        // font for the normal size even though the weight is different.
        // I looked for a pattern for a while related to fontcaching mechanism
        // in WebKit, but so far they all failed at some point. One possible
        // solution that would require a big rewrite would be to make getting
        // the width an async process to give time to the browser UI thread to
        // run, but I am not even sure this is the issue right now.
        var normalWeightSize = this.computeLastResortMetrics_(font,
            office.fonts.FontIdentifier.Weight.NORMAL,
            this.fontIdentifier_.getStyle());
        webKitLastResortSizes[normalWeightSize] = true;
      }
    }
    office.fonts.InstallFontTask.cachedLastResortMetrics[weightStyle] =
        webKitLastResortSizes;
  }
  return office.fonts.InstallFontTask.cachedLastResortMetrics[
      weightStyle].concat();
};


/**
 * Computes the metrics for the last resort fonts.
 * @param {string} lastResortFont A last resort font for webkit.
 * @param {office.fonts.FontIdentifier.Weight} weight The weight of the font.
 * @param {office.fonts.FontIdentifier.Style} style The style of the font.
 * @return {number} The width of the last resort font for a given test string.
 * @private
 */
office.fonts.InstallFontTask.prototype.computeLastResortMetrics_ = function(
    lastResortFont, weight, style) {
  var fontIdentifier = new office.fonts.FontIdentifier(lastResortFont,
      weight, style);
  return this.fontMetrics_.getFontMetrics(fontIdentifier, '' /* fontStack */);
};


/**
 * @return {boolean} True if task is completed; false otherwise.
 */
office.fonts.InstallFontTask.prototype.isCompleted = function() {
  return this.completed_;
};


/**
 * @return {boolean} True if task was successful; false otherwise.
 */
office.fonts.InstallFontTask.prototype.isSuccessful = function() {
  return this.successful_;
};


/**
 * @return {!office.fonts.FontIdentifier} The font this task was trying to
 *     install.
 */
office.fonts.InstallFontTask.prototype.getFontIdentifier = function() {
  return this.fontIdentifier_;
};


/**
 * Set the value for current try - used for testing.
 * @param {number} currentTry current try.
 */
office.fonts.InstallFontTask.prototype.setCurrentTryDebugDebug =
    function(currentTry) {
  this.currentTry_ = currentTry;
};


/**
 * Resets all the cached data. This is only used for tests.
 */
office.fonts.InstallFontTask.resetCachedObjectsForTestDebugDebug = function() {
  office.fonts.InstallFontTask.cachedLastResortMetrics = {};
  office.fonts.InstallFontTask.defaultFontSizes_ = {};
};
