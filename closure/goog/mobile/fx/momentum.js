
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
 * @fileoverview Momentum Strategy interface.
 *
 * Implementations can be used to simulate the deceleration of an element within
 * a certain region. To use this behavior you need to provide an initial
 * velocity that is meant to represent the gesture that is initiating this
 * deceleration. You also provide the bounds of the region that the element
 * exists in, and the current offset of the element within that region. The
 * transitions will have the element decelerate to rest, or stretch past the
 * offset boundaries and then come to rest.
 *
 * This is primarily designed to solve the problem of slow scrolling in mobile
 * safari. You can use this along with the Scroller behavior
 * (wireless.fx.Scroller) to make a scrollable area scroll as well as it would
 * in a native application.
 *
 * Implementations of this interface do not maintain any references to HTML
 * elements, and therefore cannot do any redrawing of elements. They only
 * calculates where the element should be on an interval. It is the delegate's
 * responsibility to redraw the element when the onDecelerate callback is
 * invoked. It is recommended that you move the element with a hardware
 * accelerated method such as using 'translate3d' on the element's
 * -webkit-transform style property.
 */

goog.provide('wireless.fx.Momentum');
goog.provide('wireless.fx.Momentum.Strategy');



/**
 * @interface
 */
wireless.fx.Momentum = function() {};



/**
 * An enum of momentum strategies.
 * @enum {number}
 */
wireless.fx.Momentum.Strategy = {
  TIMEOUTS: 0,
  TRANSITIONS: 1
};


/**
 * Start decelerating.
 * @param {!goog.math.Coordinate} velocity The initial velocity. The velocity
 *     passed here should be in terms of number of pixels / millisecond.
 * @param {!goog.math.Coordinate} minCoord The content's scrollable boundary.
 * @param {!goog.math.Coordinate} maxCoord The content's scrollable boundary.
 * @param {!goog.math.Coordinate} initialOffset The current offset of the
 *      element within its boundaries.
 * @return {boolean|undefined} True if deceleration has been initiated.
 */
wireless.fx.Momentum.prototype.start = goog.abstractMethod;


/** Stop decelerating. */
wireless.fx.Momentum.prototype.stop = goog.abstractMethod;


/** @return {boolean} True if currently decelerating. */
wireless.fx.Momentum.prototype.isDecelerating = goog.abstractMethod;


/**
 * Transition end handler. This function must be invoked after any transition
 * that occurred as a result of a call to the delegate's onDecelerate callback.
 */
wireless.fx.Momentum.prototype.onTransitionEnd = goog.abstractMethod;


/**
 * Sets the momentum delegate.
 * @param {!wireless.fx.MomentumDelegate} delegate The momentum delegate.
 */
wireless.fx.Momentum.prototype.setMomentumDelegate =
    goog.abstractMethod;


/** @return {!wireless.fx.Momentum.Strategy} The momentum strategy. */
wireless.fx.Momentum.prototype.getStrategy = goog.abstractMethod;
