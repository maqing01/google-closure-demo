
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Common effects related helpers.
 */

goog.provide('wireless.fx');
goog.provide('wireless.fx.TransitionTimingFunction');

goog.require('goog.userAgent');
goog.require('wireless.device');
goog.require('wireless.style');


/**
 * Testes wether this browser supports 3d transforms.
 * @type {boolean} Whether the touch api is supported.
 */
wireless.fx.SUPPORTS_TRANSLATE_3D = (
    'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix(''));


/**
 * List of transition timing functions.
 * @enum {string}
 */
wireless.fx.TransitionTimingFunction = {
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  LINEAR: 'linear'
};


/**
 * On transition end event.
 * @type {string}
 */
wireless.fx.TRANSITION_END_EVENT = goog.userAgent.WEBKIT ?
    'webkitTransitionEnd' : 'transitionend';


/**
 * The translate3d transform function.
 * @type {string}
 */
wireless.fx.TRANSLATE_3D = 'translate3d';


/**
 * The translate transform function.
 * @type {string}
 */
wireless.fx.TRANSLATE = 'translate';


/**
 * The rotate transform function.
 * @type {string}
 */
wireless.fx.ROTATE = 'rotate';


/**
 * The scale transform function.
 * @type {string}
 */
wireless.fx.SCALE_3D = 'scale3d';


/**
 * Apply a {vendor prefix}-transition on an element.
 *  Rename to setTransitionCss.
 * @param {!Element} el The element.
 * @param {number} duration The duration of this animation in ms.
 * @param {string=} opt_property The transition property.
 * @param {string=} opt_timingFunction The transition timing function.
 */
wireless.fx.setWebkitTransition =
    function(el, duration, opt_property, opt_timingFunction) {
  var property = opt_property || wireless.style.TRANSFORM_STYLE;

  var timingFunction = opt_timingFunction ||
      wireless.fx.TransitionTimingFunction.EASE_IN_OUT;

  var transition = property + ' ' + duration + 'ms ' + timingFunction;

  el.style[wireless.style.CAMEL_CASE_TRANSITION_STYLE] = transition;
};


/**
 * Stops and clears the transition on an element.
 *  Rename to clearTransitionCss.
 * @param {!Element} el The element.
 */
wireless.fx.clearWebkitTransition = function(el) {
  el.style[wireless.style.CAMEL_CASE_TRANSITION_STYLE] = '';
};


/**
 * Apply a {vendor prefix}-transform using translate3d to an HTML element.
 * Add a z parameter if it is ever required.
 *  Rename to setTransformCss.
 * @param {!Element} el The element.
 * @param {number} x The x transform.
 * @param {number} y The y transform.
 * @param {number=} opt_z Optionally, the z transform.
 * @param {number=} opt_rotation Optionally, a rotation to apply to the object.
 * @param {number=} opt_scale Optionally, a scale to apply to the object.
 * @param {number=} opt_originX Optionally, the x-coordinate of the transform
 *     origin, relative to the element's border box.
 * @param {number=} opt_originY Optionally, the y-coordinate of the transform
 *     origin, relative to the element's border box.
 */
wireless.fx.setWebkitTransform = function(el, x, y, opt_z, opt_rotation,
    opt_scale, opt_originX, opt_originY) {
  // Notes about -webkit-transform:
  // translate, rotate, and scale appear to act on the object as well as the
  // axis with which future transforms operate.
  // For example:
  // el.style.WebkitTransform = 'rotate(180deg) translate3d(0, 10px, 0px)'
  // will rotate the element 180 degrees, then translate 10 pixels down relative
  // to the rotated axis, which in this case would be up.
  // The order of rotate and scale shouldn't matter.
  // Also note, even if no translation is required translate3d is required to
  // make the transform hardware accelerated.
  var zValue = opt_z || 0;
  var transform = wireless.fx.TRANSLATE_3D + '(' + x + 'px,' + y + 'px,' +
      zValue + 'px)';
  if (opt_rotation) {
    transform += ' ' + wireless.fx.ROTATE + '(' + opt_rotation + 'deg)';
  }
  if (goog.isDef(opt_scale)) {
    transform += ' ' + wireless.fx.SCALE_3D + '(' + opt_scale + ',' +
        opt_scale + ',1)';
  }

  el.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE] = transform;

  if (opt_originX) {
    el.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE + 'OriginX'] =
        opt_originX + 'px';
  }
  if (opt_originY) {
    el.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE + 'OriginY'] =
        opt_originY + 'px';
  }
};


/**
 * Apply a {vendor prefix}-transform using translate3d (or translate if
 * translate3d is unavailable) to an HTML element.
 * It is convient sometimes to prefer translate3d so that the element does go
 * back and forth between being hardware accelerated and not.
 * @param {!Element} element The element.
 * @param {string|number=} opt_x The x transform. In pixels if a number,
 *     expected to have a unit if it is a string. '0' is the default.
 * @param {string|number=} opt_y The y transform. In pixels if a number,
 *     expected to have a unit if it is a string. '0' is the default.
 */
wireless.fx.setTranslate3dOrTranslate = function(element, opt_x, opt_y) {
  element.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE] =
      wireless.fx.getTranslate3dOrTranslate(opt_x, opt_y);
};


/**
 * Return a transform using translate3d (or translate if translate3d is
 * unavailable) to an HTML element.
 * It is convient sometimes to prefer translate3d so that the element does go
 * back and forth between being hardware accelerated and not.
 * @param {string|number=} opt_x The x transform. In pixels if a number,
 *     expected to have a unit if it is a string. '0' is the default.
 * @param {string|number=} opt_y The y transform. In pixels if a number,
 *     expected to have a unit if it is a string. '0' is the default.
 * @return {string} The constructed transform.
 */
wireless.fx.getTranslate3dOrTranslate = function(opt_x, opt_y) {
  var x = goog.isNumber(opt_x) ? (opt_x + 'px') : (opt_x || '0');
  var y = goog.isNumber(opt_y) ? (opt_y + 'px') : (opt_y || '0');
  return wireless.fx.SUPPORTS_TRANSLATE_3D ?
      wireless.fx.TRANSLATE_3D + '(' + x + ',' + y + ',0)' :
      wireless.fx.TRANSLATE + '(' + x + ',' + y + ')';
};


/**
 * Clear a the transform from an element.
 *  Rename to clearTransformCss.
 * @param {!Element} el The element.
 */
wireless.fx.clearWebkitTransform = function(el) {
  el.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE] = '';
};


/**
 * Checks whether an element has a translate3d a transform applied.
 *  Rename to hasTransformCss.
 * @param {!Element} el The element.
 * @return {boolean} Whether the element has a translate3d a transform.
 */
wireless.fx.hasWebkitTransform = function(el) {
  return goog.string.contains(
      el.style[wireless.style.CAMEL_CASE_TRANSFORM_STYLE],
      wireless.fx.TRANSLATE_3D);
};


/**
 * Translate an HTML element by setting its left and top CSS styles.
 * @param {!Element} el The element, which must have a relative CSS position.
 * @param {number} x The left position.
 * @param {number} y The top position.
 */
wireless.fx.setLeftAndTop = function(el, x, y) {
  el.style.left = x + 'px';
  el.style.top = y + 'px';
};
