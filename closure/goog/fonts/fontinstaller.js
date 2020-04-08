

/**
 * @fileoverview The class used to install web fonts.

 */

goog.provide('office.fonts.FontInstaller');

goog.require('goog.events.Listenable');



/**
 * Installs fonts into the CSS installer and font cache.
 * This constructor is private, users should use the themes.FontInstaller.create
 * method.
 * @interface
 * @extends {goog.events.Listenable}
 */
office.fonts.FontInstaller = function() {};


/**
 * @return {!office.fonts.FontInstallStrategy} The strategy this installer
 *     supports.
 */
office.fonts.FontInstaller.prototype.getStrategy = goog.abstractMethod;


/**
 * Installs the provided font identifiers. This method should only be called
 * with identifiers that have associated metadata to install (i.e. identifiers
 * that will not need to be synthesized).
 * @param {!Array.<!office.fonts.FontIdentifier>} fontIdentifiers An array of
 *     font identifiers.
 */
office.fonts.FontInstaller.prototype.install = goog.abstractMethod;


/**
 * Check for any newly installed variants and flush them to the system. This may
 * include variants which have already been flushed or will cause an event to
 * fire.
 *
 * This method is meant to be a synchronous check into the FontInstaller in
 * order to optimize performance. If an implementation cannot synchronously
 * check outstanding variants, this method should be a no-op.
 */
office.fonts.FontInstaller.prototype.flushInstalled = goog.abstractMethod;
