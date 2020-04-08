goog.provide('office.fonts.CssEventsFontInstaller');

goog.require('office.fonts.DomFontInstaller');
goog.require('office.fonts.FontErrorEvent');
goog.require('office.fonts.FontIdentifier');
goog.require('office.fonts.FontInstallStrategy');
goog.require('office.fonts.FontInstalledEvent');
goog.require('office.util.CallOnceTracker');
goog.require('goog.Promise');
goog.require('goog.events.EventTarget');
goog.require('goog.functions');



/**
 * Installs fonts using CSS Font Loading.
 * @param {!goog.dom.DomHelper} dom The dom helper.
 * @param {!office.fonts.WebFonts} webFonts
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 * @implements {office.fonts.DomFontInstaller}
 */
office.fonts.CssEventsFontInstaller = function(dom, webFonts, errorReporter) {
  goog.base(this);

  /** @private {!goog.dom.DomHelper} */
  this.dom_ = dom;

  /** @private {!office.fonts.WebFonts} */
  this.webFonts_ = webFonts;

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;

  /** @private {!office.util.CallOnceTracker} */
  this.callOnceTracker_ = new office.util.CallOnceTracker();
  this.registerDisposable(this.callOnceTracker_);

  /**
   * The dom for a related iframe where fonts must be installed if one is
   * provided.
   * @private {goog.dom.DomHelper}
   */
  this.iframeDom_ = null;

  /**
   * The map from identifier strings to information for variants that are
   * currently installing. This map does not include menu font variants.
   * @private {!Object.<!office.fonts.CssEventsFontInstaller.VariantInfo_>}
   */
  this.installingVariantInfos_ = {};

  /**
   * The queue of installed identifiers that have not been dispatched yet.
   * @private {!Array.<!office.fonts.FontIdentifier>}
   */
  this.installedIdentifiers_ = [];

  /**
   * The queue of failed identifiers that have not been dispatched yet.
   * @private {!Array.<!office.fonts.FontIdentifier>}
   */
  this.failedIdentifiers_ = [];
};
goog.inherits(office.fonts.CssEventsFontInstaller, goog.events.EventTarget);


/**
 * The time to wait in milliseconds for more FontFaces to resolve before firing
 * events.
 * @private {number}
 * @const
 */
office.fonts.CssEventsFontInstaller.BATCHING_TIME_ = 5;


/**
 * Context parameter names.
 * @enum {string}
 * @private
 */
office.fonts.CssEventsFontInstaller.ContextParam_ = {
  FONT_IDENTIFIERS: 'font_identifiers',
  MENU_FONT: 'menu_font',
  NUM_INSTALLS: 'number_installs'
};


/**
 * The different keys for the FontFaceDescriptors of a FontFace.
 * @enum {string}
 * @private
 */
office.fonts.CssEventsFontInstaller.DescriptorKeys_ = {
  STYLE: 'style',
  WEIGHT: 'weight'
};


/** @override */
office.fonts.CssEventsFontInstaller.prototype.getStrategy = function() {
  return office.fonts.FontInstallStrategy.Type.RELIABLE;
};


/** @override */
office.fonts.CssEventsFontInstaller.prototype.setIframeDom = function(domHelper) {
  this.iframeDom_ = domHelper;
};


/** @override */
office.fonts.CssEventsFontInstaller.prototype.install = function(
    fontIdentifiers) {
  var numAttemptedInstalls = 0;
  for (var i = 0; i < fontIdentifiers.length; i++) {
    var identifier = fontIdentifiers[i];
    var cssInfo = this.webFonts_.getCssInfoForIdentifier(identifier);
    if (!cssInfo) {
      continue;
    }

    var sourceString = this.getSourceString_(identifier, cssInfo);
    if (!sourceString) {
      continue;
    }

    var descriptors = this.createDescriptors_(identifier);
    var promise = this.loadFont_(
        identifier,
        sourceString,
        descriptors,
        false /* isMenuFont */);

    // Note: Avoid aggregating the promises of multiple font identifiers here in
    // order to track each font identifier individually. It is not advantageous
    // to wait for all identifiers for a particular family to load.
    promise.then(
        goog.bind(this.handleSuccess_, this, identifier),
        goog.bind(this.handleFailure_, this, identifier));

    numAttemptedInstalls++;
  }

  if (numAttemptedInstalls != fontIdentifiers.length) {
    var identifierStrings = [];
    for (var i = 0; i < fontIdentifiers.length; i++) {
      identifierStrings.push(fontIdentifiers[i].getIdentifier());
    }

    var context = {};
    var ContextParam_ = office.fonts.CssEventsFontInstaller.ContextParam_;
    context[ContextParam_.FONT_IDENTIFIERS] = identifierStrings;
    context[ContextParam_.NUM_INSTALLS] = numAttemptedInstalls;
    this.errorReporter_.log(
        new Error('The number of attempted installations should match the ' +
            'number of identifiers to install.'),
        context);
  }
};


/**
 * Creates a FontFaceDescriptors object for the given identifier.
 * @param {!office.fonts.FontIdentifier} identifier
 * @return {!FontFaceDescriptors}
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.createDescriptors_ = function(
    identifier) {
  var descriptors = {};
  descriptors[office.fonts.CssEventsFontInstaller.DescriptorKeys_.WEIGHT] =
      identifier.getWeight();
  descriptors[office.fonts.CssEventsFontInstaller.DescriptorKeys_.STYLE] =
      identifier.getStyle();
  return descriptors;
};


/**
 * Creates and loads a FontFace for the given information in the necessary DOMs.
 * @param {!office.fonts.FontIdentifier} identifier
 * @param {string} sourceString
 * @param {!FontFaceDescriptors} descriptors
 * @param {boolean} isMenuFont
 * @return {!goog.Thenable} The promise for the FontFaces loading in all the
 *      necessary DOMs. If there are multiple DOMs, this Promise will only
 *      resolve after all of the FontFaces have loaded.
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.loadFont_ = function(
    identifier, sourceString, descriptors, isMenuFont) {
  var fontFamily = identifier.getFontFamily();

  var fontFace = this.addFontToDom_(
      this.dom_, fontFamily, sourceString, descriptors);
  var promises = [fontFace.load()];

  var iframeFontFace = null;
  if (this.iframeDom_) {
    iframeFontFace = this.addFontToDom_(
        this.iframeDom_, fontFamily, sourceString, descriptors);
    promises.push(iframeFontFace.load());
  }

  if (!isMenuFont) {
    var info = new office.fonts.CssEventsFontInstaller.VariantInfo_(
        identifier, fontFace, iframeFontFace);
    this.installingVariantInfos_[identifier.getIdentifier()] = info;
  }

  if (promises.length > 1) {
    return goog.Promise.all(promises);
  }
  return promises[0];
};


/**
 * Creates and adds a FontFace with the given information to the given dom.
 * @param {!goog.dom.DomHelper} dom
 * @param {string} fontFamily
 * @param {string} sourceString
 * @param {!FontFaceDescriptors} descriptors
 * @return {FontFace} The added FontFace.
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.addFontToDom_ = function(
    dom, fontFamily, sourceString, descriptors) {
  var fontFace = new FontFace(
      fontFamily,
      sourceString,
      descriptors);
  dom.getDocument().fonts.add(fontFace);
  return fontFace;
};


/** @override */
office.fonts.CssEventsFontInstaller.prototype.flushInstalled = function() {
  var installed = [];
  for (var identifierString in this.installingVariantInfos_) {
    var info = this.installingVariantInfos_[identifierString];
    if (info.isInstalled()) {
      installed.push(info.getIdentifier());
      delete this.installingVariantInfos_[identifierString];
    }
  }

  if (installed.length) {
    this.dispatchEvent(new office.fonts.FontInstalledEvent(this, installed));
  }
};


/** @override */
office.fonts.CssEventsFontInstaller.prototype.installMenuFonts = function(
    cssInfos) {
  for (var i = 0; i < cssInfos.length; i++) {
    var menuCssInfo = cssInfos[i];
    var menuFontFamily = menuCssInfo.getFontFamily();

    // Create an identifier with the normal style and weight but with the Menu
    // Font's font family name.
    var menuIdentifier = new office.fonts.FontIdentifier(menuFontFamily);

    var sourceString = this.getSourceString_(
        menuIdentifier,
        menuCssInfo,
        true /* opt_isMenuFont */);
    if (!sourceString) {
      continue;
    }

    var descriptors = this.createDescriptors_(menuIdentifier);
    this.loadFont_(
        menuIdentifier, sourceString, descriptors, true /* isMenuFont */);
  }
};


/**
 * Handles when a font identifier has successfully installed.
 * @param {!office.fonts.FontIdentifier} fontIdentifier
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.handleSuccess_ = function(
    fontIdentifier) {
  this.maybeStartTimer_();
  this.installedIdentifiers_.push(fontIdentifier);
  delete this.installingVariantInfos_[fontIdentifier.getIdentifier()];
};


/**
 * Handles when a font identifier has failed to installed.
 * @param {!office.fonts.FontIdentifier} fontIdentifier
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.handleFailure_ = function(
    fontIdentifier) {
  this.maybeStartTimer_();
  this.failedIdentifiers_.push(fontIdentifier);
  delete this.installingVariantInfos_[fontIdentifier.getIdentifier()];
};


/**
 * Starts the timer if this is the first identifier since events were last fired
 * to resolve.
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.maybeStartTimer_ = function() {
  if (!this.installedIdentifiers_.length && !this.failedIdentifiers_.length) {
    //  Investigate whether its worth doing a more
    // complicated time out system where we wait Xms after every resolved
    // identifier for a maximum of Yms.
    this.callOnceTracker_.callOnce(
        goog.functions.lock(goog.bind(this.fireEvents_, this)),
        office.fonts.CssEventsFontInstaller.BATCHING_TIME_);
  }
};


/**
 * Fires the appropriate installed or error events for all the identifiers that
 * have resolved since the last time the events were fired.
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.fireEvents_ = function() {
  if (this.installedIdentifiers_.length) {
    this.dispatchEvent(new office.fonts.FontInstalledEvent(
        this, this.installedIdentifiers_));
  }
  if (this.failedIdentifiers_.length) {
    this.dispatchEvent(new office.fonts.FontErrorEvent(
        this, this.failedIdentifiers_));
  }

  this.installedIdentifiers_ = [];
  this.failedIdentifiers_ = [];
};


/**
 * Returns the string with all the urls from the given cssInfo. Logs an error
 * and returns null if the sources do not contain exactly one non-local url.
 * @param {!office.fonts.FontIdentifier} fontIdentifier
 * @param {!office.fonts.FontFaceCssInfo} cssInfo
 * @param {boolean=} opt_isMenuFont
 * @return {?string} The source string if it exists.
 * @private
 */
office.fonts.CssEventsFontInstaller.prototype.getSourceString_ = function(
    fontIdentifier, cssInfo, opt_isMenuFont) {
  var sourceString = cssInfo.getSourceString();
  if (sourceString) {
    return sourceString;
  }

  var context = {};
  var ContextParam_ = office.fonts.CssEventsFontInstaller.ContextParam_;
  context[ContextParam_.FONT_IDENTIFIERS] = fontIdentifier.getIdentifier();
  context[ContextParam_.MENU_FONT] = !!opt_isMenuFont;
  this.errorReporter_.log(
      Error('Exactly one non-local source is expected.'), context);
  return null;
};



/**
 * An object containing relevant information regarding the variant that is
 * being installed.
 * @param {!office.fonts.FontIdentifier} identifier
 * @param {!FontFace} fontFace
 * @param {FontFace} iframeFontFace
 * @constructor
 * @struct
 * @final
 * @private
 */
office.fonts.CssEventsFontInstaller.VariantInfo_ = function(
    identifier, fontFace, iframeFontFace) {
  /** @private {!office.fonts.FontIdentifier} */
  this.identifier_ = identifier;

  /** @private {!FontFace} */
  this.fontFace_ = fontFace;

  /** @private {FontFace} */
  this.iframeFontFace_ = iframeFontFace;
};


/**
 * @return {boolean} Whether this variant has installed in all relevant DOMs.
 */
office.fonts.CssEventsFontInstaller.VariantInfo_.prototype.isInstalled =
    function() {
  return this.fontFace_.status == 'loaded' &&
      (!this.iframeFontFace_ || this.iframeFontFace_.status == 'loaded');
};


/**
 * @return {!office.fonts.FontIdentifier}
 */
office.fonts.CssEventsFontInstaller.VariantInfo_.prototype.getIdentifier =
    function() {
  return this.identifier_;
};
