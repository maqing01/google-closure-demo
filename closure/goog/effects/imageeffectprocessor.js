goog.provide('office.effects.ImageEffectProcessor');

goog.require('office.effects.filters.FilterType');



/**
 * A class to get the rendering order of {@code office.effects.filter.FilterOp}
 * primitives for the image effect pipeline.
 * @constructor
 * @struct
 * @final
 */
office.effects.ImageEffectProcessor = function() {};


/**
 * This is the rendering order of filter operations for applying effects to
 * images. New filter types may be added anywhere in this list, but existing
 * filters should never be reordered - otherwise this will affect rendering of
 * legacy documents. This must be kept in sync with the server side version at
 * {@code com.google.apps.office.effects.ImageEffectProcessor}.
 * @private {!Array.<office.effects.filters.FilterType>}
 */
office.effects.ImageEffectProcessor.FILTER_TYPE_PIPELINE_ = [
  office.effects.filters.FilterType.BLUR,
  office.effects.filters.FilterType.SHARPEN,
  office.effects.filters.FilterType.RECOLOR,
  office.effects.filters.FilterType.BRIGHTNESS,
  office.effects.filters.FilterType.CONTRAST,
  office.effects.filters.FilterType.OPACITY
];


/**
 * Gets an array of filter ops for the given effect.
 * @param {!office.effects.Effect} effect
 * @return {!Array.<!office.effects.filters.FilterOp>}
 */
office.effects.ImageEffectProcessor.prototype.getFilterOpPipeline =
    function(effect) {
  var filterOps = [];
  var filterTypePipeline =
      office.effects.ImageEffectProcessor.FILTER_TYPE_PIPELINE_;
  for (var i = 0; i < filterTypePipeline.length; i++) {
    filterOps = filterOps.concat(
        effect.getFilterOpsForType(filterTypePipeline[i]));
  }
  return filterOps;
};
