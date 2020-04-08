

/**
 * @fileoverview Diagnostics data wrapper class for docs impressions.
 *

 */

goog.provide('office.diagnostics.impressions.DiagnosticsData');



/**
 * Diagnostics data wrapper class for docs impressions. This constructor ONLY to
 * be called by office.diagnostics.impressions.DiagnosticsDataBuilder#build.
 * @param {!office.diagnostics.impressions.proto.EntryPoint} entryPoint The entry
 *     point.
 * @param {office.diagnostics.impressions.proto.impressiondetails.ActionData=}
 *     opt_actionData Additional data about the action that should be logged in
 *     impressions, or null if there is none.
 * @constructor
 * @struct
 */
office.diagnostics.impressions.DiagnosticsData = function(entryPoint,
    opt_actionData) {
  /**
   * The entry point.
   * @type {!office.diagnostics.impressions.proto.EntryPoint}
   * @private
   */
  this.entryPoint_ = entryPoint;

  /**
   * The additional impressions action data, or null if there is none.
   * @type {office.diagnostics.impressions.proto.impressiondetails.ActionData}
   * @private
   */
  this.actionData_ = opt_actionData || null;
};


/**
 * Gets the entry point.
 * @return {!office.diagnostics.impressions.proto.EntryPoint} The entry point.
 */
office.diagnostics.impressions.DiagnosticsData.prototype.getEntryPoint =
    function() {
  return this.entryPoint_;
};


/**
 * Gets the additional impressions action data, or null if there is none.
 * @return {office.diagnostics.impressions.proto.impressiondetails.ActionData} The
 *     action data.
 */
office.diagnostics.impressions.DiagnosticsData.prototype.getActionData =
    function() {
  return this.actionData_;
};
