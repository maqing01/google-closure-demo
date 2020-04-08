goog.provide('office.effects.Effect');

goog.require('goog.math');
goog.require('goog.math.AffineTransform');
goog.require('goog.math.Bezier');
goog.require('goog.object');



/**
 * An effect is a collection of filters to apply to an effect target, the effect
 * target is determined at rendering time.
 * @param {!Object.<office.effects.filters.FilterType,
 *     !Array.<!office.effects.filters.FilterOp>>} filterOpsMap A map of filter
 *     type to a list of filter ops.
 * @constructor
 * @struct
 * @final
 */
office.effects.Effect = function(filterOpsMap) {
  /** @private {!Object.<office.effects.filters.FilterType,
      !Array.<!office.effects.filters.FilterOp>>} */
  this.filterOpsMap_ = filterOpsMap;
};


/**
 * The number of interpolation regions to use for 'table' component transfer
 * functions.
 * @private {number}
 */
office.effects.Effect.TABLE_COMPONENT_TRANSFER_INTERPOLATION_REGIONS_ = 255;


/**
 * Returns an array of primitive filter ops for a filter type in this effect. An
 * empty array is returned if the filter is not in this effect.
 * @param {office.effects.filters.FilterType} filterType
 * @return {!Array.<!office.effects.filters.FilterOp>}
 */
office.effects.Effect.prototype.getFilterOpsForType = function(filterType) {
  return this.filterOpsMap_[filterType] || [];
};


/**
 * Returns an effect builder.
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.builder = function() {
  return new office.effects.Effect.Builder();
};



/**
 * A builder for {@code office.effects.Effect}.
 * @constructor
 * @struct
 * @final
 */
office.effects.Effect.Builder = function() {
  /** @private {!Object.<office.effects.filters.FilterType,
      !Array.<!office.effects.filters.FilterOp>>} */
  this.filterOpsMap_ = {};
};


/**
 * Adds a sharpen filter to this effect.
 * @param {number} factor A value in the closed-open range [0,1).
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.sharpen = function(factor) {
  return this;
};


/**
 * Adds a blur filter to this effect.
 * @param {number} stdDevX The amount of horizontal blur to apply.
 * @param {number} stdDevY The amount of vertical blur to apply.
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.blur = function(stdDevX, stdDevY) {
  return this;
};


/**
 * Adds a recolor filter to this effect.
 * @param {!Array.<!office.effects.ColorStop>} colorStops
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.recolor = function(colorStops) {
  return this;
};


/**
 * Adds a contrast filter to this effect.
 * @param {number} amount
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.contrast = function(amount) {
  return this;
};


/**
 * Adds a brightness filter to this effect.
 * @param {number} brightness The amount to increase all RGB channel values by,
 *     from -1 to 1.
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.brightness = function(brightness) {
  return this;
};


/**
 * Adds an opacity filter to this effect and sets the scale of the filter.
 * @param {number} opacityScale
 * @return {!office.effects.Effect.Builder}
 */
office.effects.Effect.Builder.prototype.opacity = function(opacityScale) {
  return this;
};


/**
 * Builds the effect. Returns null if no filters have been added.
 * @return {office.effects.Effect}
 */
office.effects.Effect.Builder.prototype.build = function() {
  if (goog.object.isEmpty(this.filterOpsMap_)) {
    return null;
  }
  return new office.effects.Effect(goog.object.clone(this.filterOpsMap_));
};
