

/**
 * @fileoverview Builder for the diagnostics data class.
 *

 */

goog.provide('office.diagnostics.impressions.DiagnosticsDataBuilder');

goog.require('office.diagnostics.impressions.DiagnosticsData');
goog.require('goog.asserts');



/**
 * Builder for diagnostics data class for docs impressions.
 * @constructor
 * @struct
 */
office.diagnostics.impressions.DiagnosticsDataBuilder = function() {
};


/**
 * The entry point.
 * @type {(!office.diagnostics.impressions.proto.EntryPoint|undefined)}
 * @private
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.prototype.entryPoint_;


/**
 * The impressions action data.
 * @type {office.diagnostics.impressions.proto.impressiondetails.ActionData}
 * @private
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.prototype.actionData_ =
    null;


/**
 * Sets the entry point.
 * @param {!office.diagnostics.impressions.proto.EntryPoint} entryPoint The entry
 *     point.
 * @return {!office.diagnostics.impressions.DiagnosticsDataBuilder} The updated
 *     builder.
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.prototype.setEntryPoint =
    function(entryPoint) {
  this.entryPoint_ = entryPoint;
  return this;
};


/**
 * Sets additional action data to log in impressions, or null if there is none.
 * @param {office.diagnostics.impressions.proto.impressiondetails.ActionData}
 *     actionData Additional action data, or null if there is none.
 * @return {!office.diagnostics.impressions.DiagnosticsDataBuilder} The updated
 *     builder.
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.prototype.setActionData =
    function(actionData) {
  this.actionData_ = actionData;
  return this;
};


/**
 * Creates a DiagnosticsData class with the builder's set values.
 * @return {!office.diagnostics.impressions.DiagnosticsData} The newly-built
 * diagnostics data.
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.prototype.build =
    function() {
  goog.asserts.assertNumber(this.entryPoint_,
      'A new DiagnosticsData may not be instantiated without a ' +
      'office.diagnostics.impressions.proto.EntryPoint.');
  return new office.diagnostics.impressions.DiagnosticsData(this.entryPoint_,
      this.actionData_);
};


/**
 * Creates a builder from a diagnostics data.
 * @param {!office.diagnostics.impressions.DiagnosticsData} diagnosticsData The
 *     diagnostics data to copy into a new builder.
 * @return {!office.diagnostics.impressions.DiagnosticsDataBuilder} The builder.
 */
office.diagnostics.impressions.DiagnosticsDataBuilder.from = function(
    diagnosticsData) {
  return new office.diagnostics.impressions.DiagnosticsDataBuilder().
      setEntryPoint(diagnosticsData.getEntryPoint()).
      setActionData(diagnosticsData.getActionData());
};
