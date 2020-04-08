goog.provide('office.fonts.FontInstallerFactory');

goog.require('office.flag');
goog.require('office.flag.Flags');
goog.require('office.fonts.CssEventsFontInstaller');
goog.require('office.fonts.CssInstaller');
goog.require('office.fonts.CssPollingFontInstaller');
goog.require('goog.userAgent.product');


/**
 * Creates the appropriate DomFontInstaller to be used given the current browser
 * and flags.
 * @param {!goog.dom.DomHelper} domHelper
 * @param {!office.fonts.WebFonts} webFonts
 * @param {!office.debug.ErrorReporterApi} errorReporter
 * @return {!office.fonts.DomFontInstaller}
 */
office.fonts.FontInstallerFactory.createInstaller = function(
    domHelper, webFonts, errorReporter) {
  var useChromeFontLoadEvents =
      goog.userAgent.product.CHROME &&
      goog.userAgent.product.isVersion(35) &&
      domHelper.getDocument().fonts &&
      !!goog.global['FontFace'] &&
      office.flag.getInstance().getBoolean(
          office.flag.Flags.ENABLE_WEBFONTS_EVENTS_INSTALLER);
  return useChromeFontLoadEvents ?
      new office.fonts.CssEventsFontInstaller(
          domHelper, webFonts, errorReporter) :
      office.fonts.CssPollingFontInstaller.create(
          webFonts, errorReporter, new office.fonts.CssInstaller(domHelper));
};
