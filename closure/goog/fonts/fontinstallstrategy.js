goog.provide('office.fonts.FontInstallStrategy');



/**
 * A class to define a loading strategy for FontInstallers.
 * @param {boolean} isReliable
 * @constructor
 * @struct
 * @final
 */
office.fonts.FontInstallStrategy = function(isReliable) {
  /** @private {boolean} */
  this.isReliable_ = isReliable;
};


/**
 * @return {boolean} Whether this strategy is reliable.
 */
office.fonts.FontInstallStrategy.prototype.isReliable = function() {
  return this.isReliable_;
};


/**
 * @enum {!office.fonts.FontInstallStrategy}
 */
office.fonts.FontInstallStrategy.Type = {
  RELIABLE: new office.fonts.FontInstallStrategy(true /* isReliable */),
  UNRELIABLE: new office.fonts.FontInstallStrategy(false /* isReliable */)
};
