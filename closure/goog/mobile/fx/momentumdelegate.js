
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
 * @fileoverview Momentum Delegate interface.
 * You are required to implement this interface in order to use the
 * wireless.fx.Momentum behavior.
 * Also see wireless.fx.Momentum.
 */

goog.provide('wireless.fx.MomentumDelegate');



/**
 * @interface
 */
wireless.fx.MomentumDelegate = function() {};


/**
 * Callback for a deceleration step. The delegate is responsible for redrawing
 * the element in its new position.
 * @param {number} x The new x position in px.
 * @param {number} y The new y position in px.
 * @param {number=} opt_duration The duration of the translation in ms.
 * @param {string=} opt_timingFunction The transition timing function.
 */
wireless.fx.MomentumDelegate.prototype.onDecelerate = goog.abstractMethod;


/**
 * Callback for end of deceleration.
 */
wireless.fx.MomentumDelegate.prototype.onDecelerationEnd = goog.abstractMethod;
