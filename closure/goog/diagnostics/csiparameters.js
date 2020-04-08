

/**
 * @fileoverview Defines a class to hold request parameters to send to CSI.
 * @author luizp@google.com (Luiz Pereira)
 */

goog.provide('apps.diagnostics.CsiParameters');
goog.provide('apps.diagnostics.CsiParameters.Builder');

goog.require('goog.array');



/**
 * Request parameters to send to CSI.
 * @param {!Array.<string>} experimentIds The experiment ids.
 * @param {?string} releaseId The release id.
 * @constructor
 */
apps.diagnostics.CsiParameters = function(experimentIds, releaseId) {
  /**
   * The experiment ids to send to CSI.
   * @type {!Array.<string>}
   * @private
   */
  this.experimentIds_ = experimentIds;

  /**
   * The release id to send to CSI.
   * @type {?string}
   * @private
   */
  this.releaseId_ = releaseId;
};


/**
 * Query parameter keys for the request to CSI.
 * @enum {string}
 * @private
 */
apps.diagnostics.CsiParameters.ParameterKey_ = {
  EXPERIMENT_IDS: 'e',
  RELEASE_ID: 'rls'
};


/**
 * Get the release ID.
 * @return {?string} The release ID.
 */
apps.diagnostics.CsiParameters.prototype.getReleaseId = function() {
  return this.releaseId_;
};


/**
 * Get the experiment IDs.
 * @return {!Array.<string>} The experiment IDs.
 */
apps.diagnostics.CsiParameters.prototype.getExperimentIds = function() {
  return this.experimentIds_;
};


/**
 * Serializes this class into an object to be sent to CSI.
 * @return {!Object.<string>} The serialized object.
 */
apps.diagnostics.CsiParameters.prototype.serialize = function() {
  var serialized = {};
  if (this.experimentIds_.length > 0) {
    serialized[apps.diagnostics.CsiParameters.ParameterKey_.EXPERIMENT_IDS] =
        this.experimentIds_.join(',');
  }
  if (this.releaseId_) {
    serialized[apps.diagnostics.CsiParameters.ParameterKey_.RELEASE_ID] =
        this.releaseId_;
  }
  return serialized;
};


/**
 * Creates a builder out of the current state of this class.
 * @return {!apps.diagnostics.CsiParameters.Builder} The builder.
 */
apps.diagnostics.CsiParameters.prototype.toBuilder = function() {
  return new apps.diagnostics.CsiParameters.Builder().
      addExperimentIds(this.experimentIds_).setReleaseId(this.releaseId_);
};



/**
 * Builder for {@code CsiParameters}.
 * @constructor
 */
apps.diagnostics.CsiParameters.Builder = function() {
  /**
   * The experiment ids to send to CSI.
   * @type {!Array.<string>}
   * @private
   */
  this.experimentIds_ = [];
};


/**
 * The release id to send to CSI.
 * @type {?string}
 * @private
 */
apps.diagnostics.CsiParameters.Builder.prototype.releaseId_ = null;


/**
 * Adds an experiment id to this builder.
 * @param {string} experimentId The experiment id.
 * @return {!apps.diagnostics.CsiParameters.Builder} The builder for chaining.
 */
apps.diagnostics.CsiParameters.Builder.prototype.addExperimentId = function(
    experimentId) {
  this.experimentIds_.push(this.sanitize_(experimentId));
  return this;
};


/**
 * Removes an experiment id from this builder.
 * @param {string} experimentId
 * @return {!apps.diagnostics.CsiParameters.Builder} The builder for chaining.
 */
apps.diagnostics.CsiParameters.Builder.prototype.removeExperimentId = function(
    experimentId) {
  goog.array.remove(this.experimentIds_, this.sanitize_(experimentId));
  return this;
};


/**
 * Adds the given experiment ids to this builder.
 * @param {!Array.<string>} experimentIds The experiment ids.
 * @return {!apps.diagnostics.CsiParameters.Builder} The builder for chaining.
 */
apps.diagnostics.CsiParameters.Builder.prototype.addExperimentIds = function(
    experimentIds) {
  for (var i = 0; i < experimentIds.length; i++) {
    this.addExperimentId(experimentIds[i]);
  }
  return this;
};


/**
 * Adds an experiment id to this builder. If null the experiment id will be
 * cleared out.
 * @param {?string} releaseId The experiment id.
 * @return {!apps.diagnostics.CsiParameters.Builder} The builder for chaining.
 */
apps.diagnostics.CsiParameters.Builder.prototype.setReleaseId = function(
    releaseId) {
  this.releaseId_ = this.sanitize_(releaseId);
  return this;
};


/**
 * @return {!apps.diagnostics.CsiParameters} The built CsiParameters object.
 */
apps.diagnostics.CsiParameters.Builder.prototype.build = function() {
  return new apps.diagnostics.CsiParameters(
      this.experimentIds_, this.releaseId_);
};


/**
 * Sanitizes CSI parameters by replacing dashes with underscores to conform with
 * CSI guidelines.
 * @param {?string} param Parameter to be sanitized.
 * @return {?string} The sanitized parameter.
 * @private
 */
apps.diagnostics.CsiParameters.Builder.prototype.sanitize_ = function(
    param) {
  return param ? param.replace('-', '_') : null;
};


/**
 * An instance of CsiParameters with no parameters.
 * @type {!apps.diagnostics.CsiParameters}
 */
apps.diagnostics.CsiParameters.EMPTY =
    new apps.diagnostics.CsiParameters.Builder().build();
