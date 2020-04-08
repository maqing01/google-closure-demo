goog.provide('office.fonts.DomFontInstaller');

goog.require('office.fonts.FontInstaller');



/**
 * An interface for all FontInstallers that rely on the DOM.
 * @interface
 * @extends {office.fonts.FontInstaller}
 */
office.fonts.DomFontInstaller = function() {};
goog.mixin(
    office.fonts.DomFontInstaller.prototype, office.fonts.FontInstaller.prototype);


/**
 * Sets the dom of a related iframe on the FontInstaller.
 * @param {!goog.dom.DomHelper} iframeDom The iframe in which to install fonts.
 */
office.fonts.DomFontInstaller.prototype.setIframeDom = goog.abstractMethod;


/**
 * Installs the given menu fonts.
 * @param {!Array.<!office.fonts.FontFaceCssInfo>} cssInfos
 */
office.fonts.DomFontInstaller.prototype.installMenuFonts = goog.abstractMethod;
