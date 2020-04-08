goog.provide('office.diagnostics.CsiConstants');
goog.provide('office.diagnostics.CsiConstants.Action');
goog.provide('office.diagnostics.CsiConstants.Variable');

goog.require('office.diagnostics.Flags');
goog.require('office.flag');
goog.require('goog.object');


/**
 * The CSI report URI to be used.
 * @type {string}
 */
office.diagnostics.CsiConstants.REPORT_URI = office.flag.getInstance().getString(
    office.diagnostics.Flags.CSI_REPORTING_URI) ||
    (window.location.protocol + '//');


/**
 * Common Docs CSI action names.
 * @enum {string}
 */
office.diagnostics.CsiConstants.Action = {
  EDIT: 'edit',
  EDIT_NEW_DOC: 'edit_new',
  HOMESCREEN: 'hs',
  PREVIEW: 'preview',
  PUBLISHED: 'published',
  VIEW: 'view'
};


/**
 * Common Docs CSI variable names.
 * @enum {string}
 */
office.diagnostics.CsiConstants.Variable = {
};


/**
 * The set of common event codes that should be reported by all apps.
 * @type {!Object.<string, boolean>}
 * @const
 * @private
 */
office.diagnostics.CsiConstants.COMMON_EVENT_CODES_ = goog.object.createSet();


/**
 * @param {*} eventCode The event code.
 * @return {boolean} Whether {@code eventCode} is a common event code that
 *     should be reported by all apps.
 */
office.diagnostics.CsiConstants.isCommonEventCode = function(eventCode) {
  return eventCode in office.diagnostics.CsiConstants.COMMON_EVENT_CODES_;
};
