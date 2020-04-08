goog.provide('office.controller.ImeInputConfiguration');



/**
 * @interface
 */
office.controller.ImeInputConfiguration = function() {};


/**
 * @param {!office.ui.ElementPosition} elementPosition The element position.
 * @param {number} width The width.
 * @param {number} height The height.
 * @param {string} cssStyle The string representing the CSS properties.
 * @param {number=} opt_textIndent The text indent.
 * @param {number=} opt_leftMargin The left margin.
 * @param {!goog.math.AffineTransform=} opt_transform The transform to apply.
 */
office.controller.ImeInputConfiguration.prototype.setPositionAndDimensions =
    goog.abstractMethod;


/**
 */
office.controller.ImeInputConfiguration.prototype.resetPositionAndDimensions =
    goog.abstractMethod;
