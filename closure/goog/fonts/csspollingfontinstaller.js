

/**
 * @fileoverview The class used to install web fonts.

 */

goog.provide('office.fonts.CssPollingFontInstaller');

goog.require('office.fonts.DomFontInstaller');
goog.require('office.fonts.FontErrorEvent');
goog.require('office.fonts.FontInstallStrategy');
goog.require('office.fonts.FontInstallTimer');
goog.require('office.fonts.FontInstalledEvent');
goog.require('office.fonts.InstallFontTask');
goog.require('goog.events.EventTarget');
goog.require('goog.userAgent');



/**
 * Installs fonts into the CSS installer and determines when fonts have been
 * loaded by polling an iframe to detect changes in sizes.
 *
 * NOTE: This constructor is private, users should use the
 * {@code office.fonts.CssPollingFontInstaller#create} method.
 * @param {!office.fonts.CssInstaller} cssInstaller The CSS installer.
 * @param {!function(!office.fonts.FontIdentifier, boolean, !function()) :
 *     !office.fonts.InstallFontTask} installFontTaskFactory The font installing
 *     task factory.
 * @param {!office.fonts.WebFonts} webFonts The web fonts information.
 * @param {!office.fonts.FontInstallTimer} fontInstallTimer The font load timer.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @implements {office.fonts.DomFontInstaller}
 * @extends {goog.events.EventTarget}
 * @constructor
 * @final
 * @struct
 */
office.fonts.CssPollingFontInstaller = function(cssInstaller,
    installFontTaskFactory, webFonts, fontInstallTimer, errorReporter) {
  goog.events.EventTarget.call(this);

  /**
   * A css installer that adds the CSS to the document.
   * @type {!office.fonts.CssInstaller}
   * @private
   */
  this.cssInstaller_ = cssInstaller;

  /**
   * A office.fonts.InstallFontTask factory.
   * @type {function(!office.fonts.FontIdentifier, boolean,
   *     function()) : !office.fonts.InstallFontTask}
   * @private
   */
  this.installFontTaskFactory_ = installFontTaskFactory;

  /**
   * The web fonts information.
   * @type {!office.fonts.WebFonts}
   * @private
   */
  this.webFonts_ = webFonts;

  /**
   * The font load timer
   * @type {!office.fonts.FontInstallTimer}
   * @private
   */
  this.fontInstallTimer_ = fontInstallTimer;
  this.fontInstallTimer_.setCallback(
      goog.bind(this.handleTasksCompleted_, this));

  /** @private {!office.debug.ErrorReporterApi} */
  this.errorReporter_ = errorReporter;
};
goog.inherits(office.fonts.CssPollingFontInstaller, goog.events.EventTarget);


/**
 * Context parameter names.
 * @enum {string}
 * @private
 */
office.fonts.CssPollingFontInstaller.ContextParam_ = {
  FONT_IDENTIFIERS: 'font_identifiers',
  NUM_CSS_INFOS: 'number_css_infos'
};


/**
 * Creates a FontInstaller.
 * @param {!office.fonts.WebFonts} webFonts The webfonts.
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @param {!office.fonts.CssInstaller} cssInstaller
 * @return {!office.fonts.CssPollingFontInstaller} A FontInstaller.
 */
office.fonts.CssPollingFontInstaller.create = function(
    webFonts, errorReporter, cssInstaller) {
  var fontInstallTimer = new office.fonts.FontInstallTimer();
  var fontInstaller = new office.fonts.CssPollingFontInstaller(
      cssInstaller,
      office.fonts.InstallFontTask.create,
      webFonts,
      fontInstallTimer,
      errorReporter);
  fontInstaller.registerDisposable(fontInstallTimer);
  return fontInstaller;
};


/** @override */
office.fonts.CssPollingFontInstaller.prototype.getStrategy = function() {
  return office.fonts.FontInstallStrategy.Type.UNRELIABLE;
};


/** @override */
office.fonts.CssPollingFontInstaller.prototype.install = function(
    fontIdentifiers) {
  var identifiersToLoad = [];
  var cssInfos = [];
  for (var i = 0; i < fontIdentifiers.length; i++) {
    var identifier = fontIdentifiers[i];
    var cssInfo = this.webFonts_.getCssInfoForIdentifier(identifier);
    if (cssInfo) {
      cssInfos.push(cssInfo);
      identifiersToLoad.push(identifier);
    }
  }

  if (cssInfos.length != fontIdentifiers.length) {
    var identifierStrings = [];
    for (var i = 0; i < fontIdentifiers.length; i++) {
      identifierStrings.push(fontIdentifiers[i].getIdentifier());
    }

    var context = {};
    context[office.fonts.CssPollingFontInstaller.ContextParam_.FONT_IDENTIFIERS] =
        identifierStrings;
    context[office.fonts.CssPollingFontInstaller.ContextParam_.NUM_CSS_INFOS] =
        cssInfos.length;
    this.errorReporter_.log(
        new Error('The number of cssInfos to install should match the number ' +
            'of identifiers to install.'),
        context);
  }

  if (cssInfos.length) {
    this.cssInstaller_.installFontCssInfos(cssInfos);
  }

  for (var i = 0; i < identifiersToLoad.length; i++) {
    var task = this.installFontTaskFactory_(identifiersToLoad[i],
        goog.userAgent.WEBKIT, function() { return new Date().getTime(); });
    this.fontInstallTimer_.addTask(task);
  }
};


/**
 * When a font is installed, dispatch a font loaded event.
 * @param {!Array.<!office.fonts.InstallFontTask>} tasks The completed install
 *     font tasks.
 * @private
 */
office.fonts.CssPollingFontInstaller.prototype.handleTasksCompleted_ = function(
    tasks) {
  var successfulIdentifiers = [];
  var failedIdentifiers = [];
  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    var fontIdentifier = task.getFontIdentifier();
    if (task.isSuccessful()) {
      successfulIdentifiers.push(fontIdentifier);
    } else {
      failedIdentifiers.push(fontIdentifier);
    }
  }

  if (successfulIdentifiers.length) {
    this.dispatchEvent(new office.fonts.FontInstalledEvent(
        this, successfulIdentifiers));
  }
  if (failedIdentifiers.length) {
    this.dispatchEvent(new office.fonts.FontErrorEvent(
        this, failedIdentifiers));
  }
};


/** @override */
office.fonts.CssPollingFontInstaller.prototype.flushInstalled = goog.nullFunction;


/** @override */
office.fonts.CssPollingFontInstaller.prototype.setIframeDom = function(
    iframeDom) {
  this.cssInstaller_.installFontCssInIframe(iframeDom);
};


/** @override */
office.fonts.CssPollingFontInstaller.prototype.installMenuFonts = function(
    cssInfos) {
  this.cssInstaller_.installFontCssInfos(cssInfos);
};
