
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
 * @fileoverview This file contains a click buster implementation, which is a
 * behavior that prevents native clicks from firing at undesirable times. There
 * are two scenarios where we may want to 'bust' a click.
 *
 * Buttons implemented with touch events usually have click handlers as well.
 * This is because sometimes touch events stop working, and the click handler
 * serves as a fallback. Here we use a click buster to prevent the native click
 * from firing if the touchend event was succesfully handled.
 *
 * When native scrolling behavior is disabled (see wireless.fx.Scroller), click
 * events will fire after the touchend event when the drag sequence is
 * complete. The click event also happens to fire at the location of the
 * touchstart event which can lead to some very strange behavior.
 *
 * This class puts a single click handler on the body, and calls preventDefault
 * on the click event if we detect that there was a touchend event that already
 * fired in the same spot recently.
 */

goog.provide('wireless.events.clickbuster');

goog.require('goog.log');
goog.require('goog.math.Coordinate');
goog.require('wireless.events');
goog.require('wireless.events.touch');



/**
 * The logger for this package.
 * @private {goog.log.Logger}
 */
wireless.events.clickbuster.logger_ =
    goog.log.getLogger('wireless.events.clickbuster');


/**
 * The list of coordinates that we use to measure the distance of clicks from.
 * If a click is within the distance threshold of any of these coordinates then
 * we allow the click.
 * @type {Array.<number>}
 * @private
 */
wireless.events.clickbuster.coordinates_;


/**
 * The last time preventGhostClick was called.
 * @type {number}
 * @private
 */
wireless.events.clickbuster.lastPreventedTime_;


/**
 * The threshold for how long we allow a click to occur after a touchstart.
 * @type {number}
 * @private
 */
wireless.events.clickbuster.TIME_THRESHOLD_ = 2500;


/**
 * The threshold for how close a click has to be to the saved coordinate for us
 * to allow it.
 * @type {number}
 * @private
 */
wireless.events.clickbuster.DISTANCE_THRESHOLD_ = 25;


/**
 * Callback to call when a click is busted.
 * @type {function()|undefined}
 * @private
 */
wireless.events.clickbuster.onBustCallback_;


/**
 * Cached value of canUseTouchEndPreventDefault. This prevents evaluating a
 * regex on every touch event.
 * @type {boolean|undefined}
 * @private
 */
wireless.events.clickbuster.canUseTouchEndPreventDefaultCache_;


/**
 * This handler will prevent the default behavior for any clicks unless the
 * click is within the distance threshold of one of the temporary allowed
 * coordinates.
 * @param {Event} e The click event.
 * @private
 */
wireless.events.clickbuster.onClick_ = function(e) {
  // If there were no calls to preventGhostClick in the last 2.5s then we should
  // not event consider busting any clicks.
  if (goog.now() - wireless.events.clickbuster.lastPreventedTime_ >
      wireless.events.clickbuster.TIME_THRESHOLD_) {
    return;
  }

  var coord =
      wireless.events.touch.getClientCoordinate(/** @type {!Event} */ (e));
  // On desktop webkit browsers, clicking on a label element will cause another
  // click event to be fired on the associated input element. We don't want to
  // bust that click. Depending on the browser, it will have a coordinate of
  // either 0,0 or use negative numbers.
  if (coord.x < 1 && coord.y < 1) {
    goog.log.warning(wireless.events.clickbuster.logger_,
        'Not busting click on label elem at (' +
          coord.x + ', ' + coord.y + ')');
    return;
  }

  for (var i = 0; i < wireless.events.clickbuster.coordinates_.length; i += 2) {
    if (wireless.events.clickbuster.hitTest_(
        wireless.events.clickbuster.coordinates_[i],
        wireless.events.clickbuster.coordinates_[i + 1],
        coord.x, coord.y)) {
      // Remove the coordinate so that we don't allow any more clicks from this
      // coordinate.
      wireless.events.clickbuster.coordinates_.splice(i, i + 2);
      return;
    }
  }
  goog.log.warning(wireless.events.clickbuster.logger_,
    'busting click at ' + coord.x + ', ' + coord.y);
  // Stop the click event from being handled by anything else.
  e.stopPropagation();

  // Stop the click from being resolved by the browser, for example to
  // follow a link.
  e.preventDefault();

  var onBustCallback = wireless.events.clickbuster.onBustCallback_;
  if (onBustCallback) {
    onBustCallback();
  }
};


/**
 * This handler will temporarily allow a click to occur near the touch event's
 * coordinates.
 * @param {!Event} e The touchstart event.
 * @private
 */
wireless.events.clickbuster.onTouchStart_ = function(e) {
  var coord = wireless.events.touch.getClientCoordinate(
      wireless.events.touch.getTouches(e)[0]);

  wireless.events.clickbuster.coordinates_.push(coord.x, coord.y);

  window.setTimeout(function() {
        wireless.events.clickbuster.removeCoordinate_(coord.x, coord.y);
        wireless.events.clickbuster.onBustCallback_ = undefined;
      }, wireless.events.clickbuster.TIME_THRESHOLD_
  );
};


/**
 * This is the actual hit test for whether a coordinate is within the
 * distance threshold of an event.
 * @param {number} x The x value of the coordinate.
 * @param {number} y The y value of the coordinate.
 * @param {number} eventX The x value of the event.
 * @param {number} eventY The y value of the evnet.
 * @return {boolean} True if the event is within threshold.
 * @private
 */
wireless.events.clickbuster.hitTest_ = function(x, y, eventX, eventY) {
  var threshold = wireless.events.clickbuster.DISTANCE_THRESHOLD_;
  return Math.abs(eventX - x) < threshold && Math.abs(eventY - y) < threshold;
};



/**
 * Remove one specified coordinate from the coordinates array.
 * @param {number} x The x value of the coordinate.
 * @param {number} y The y value of the coordinate.
 * @private
 */
wireless.events.clickbuster.removeCoordinate_ = function(x, y) {
  for (var i = 0; i < wireless.events.clickbuster.coordinates_.length; i += 2) {
    if (wireless.events.clickbuster.coordinates_[i] == x &&
        wireless.events.clickbuster.coordinates_[i + 1] == y) {
      wireless.events.clickbuster.coordinates_.splice(i, i + 2);
      return;
    }
  }
};


/**
 * @return {boolean} True iff calling preventDefault on touchEnd events causes
 *     the subsequent click event to be surpressed. This makes it possible to
 *     skip the ClickBuster logic entirely.
 * @private
 */
wireless.events.clickbuster.canUseTouchEndPreventDefault_ = function() {
  if (!goog.isDef(
      wireless.events.clickbuster.canUseTouchEndPreventDefaultCache_)) {
    // iOS 6 correctly prevents click events when preventDefault is called on a
    // touch event.
    wireless.events.clickbuster.canUseTouchEndPreventDefaultCache_ =
        wireless.device.getAppleOsVersion() >= wireless.device.getVersion(6);
  }
  return wireless.events.clickbuster.canUseTouchEndPreventDefaultCache_;

};

/**
 * Calls preventDefault on the event if the browser will correctly prevent the
 * subsequent click event, otherwise call preventGhostClick.
 * @param {number} x The x value of the click coordinate to prevent.
 * @param {number} y The y value of the click coordinate to prevent.
 * @param {Event} e The touch event to surpress click events from.
 * @param {function()=} opt_onBustCallback A callback to be called if a ghost
 *     click is prevented. This callback is removed when the allowable zone is
 *     removed.
 * @suppress {deprecated}
 */
wireless.events.clickbuster.preventGhostClickWithEvent =
    function(x, y, e, opt_onBustCallback) {
  if (e && wireless.events.clickbuster.canUseTouchEndPreventDefault_()) {
    e.preventDefault();
    if (opt_onBustCallback) {
      opt_onBustCallback();
    }
  } else {
    wireless.events.clickbuster.preventGhostClick(x, y, opt_onBustCallback);
  }
};

/**
 * Registers new touches to create temporary "allowable zones" and registers new
 * clicks to be prevented unless they fall in one of the current "allowable
 * zones". Note that if the touchstart and touchend locations are different, it
 * is still possible for a ghost click to be fired if you called preventDefault
 * on all touchmove events. In this case the ghost click will be fired at the
 * location of the touchstart event, so the coordinate you pass in should be the
 * coordinate of the touchstart.
 * @deprecated As of iOS 6, calling preventDefault on a touchEnd event will
 *     correctly supress the subsequent click event. Prefer using {@code
 *     preventGhostClickWithEvent} to get this optimization.
 * @param {number} x The x value of the click coordinate to prevent.
 * @param {number} y The y value of the click coordinate to prevent.
 * @param {function()=} opt_onBustCallback A callback to be called if a ghost
 *     click is prevented. This callback is removed when the allowable zone is
 *     removed.
 */
wireless.events.clickbuster.preventGhostClick =
    function(x, y, opt_onBustCallback) {
  // First time this is called the following occurs:
  //   1) Attaches a handler to touchstart events so that each touch will
  //      temporarily create an "allowable zone" for clicks to occur in.
  //   2) Attaches a handler to click events so that each click will be
  //      prevented unless it is in an "allowable zone".
  //
  // Every time this is called (including the first) the following occurs:
  //   1) Removes an allowable zone that contains the specified coordinate.
  //
  // How this enables click busting:
  //   1) User performs first click.
  //     - No attached touchstart handler yet.
  //     - preventGhostClick is called before the click event occurs, it
  //       attaches the touchstart and click handlers.
  //     - The click handler captures the user's click event and prevents it
  //       from propagating since there is no "allowable zone".
  //
  //   2) User performs subsequent, to-be-busted click.
  //     - touchstart event triggers the attached handler and creates a
  //       temporary "allowable zone".
  //     - preventGhostClick is called and removes the "allowable zone".
  //     - The click handler captures the user's click event and prevents it
  //       from propagating since there is no "allowable zone".
  //
  //   3) User performs a should-not-be-busted click.
  //     - touchstart event triggers the attached handler and creates a
  //       temporary "allowable zone".
  //     - The click handler captures the user's click event and allows it to
  //       propagate since the click falls in the "allowable zone".

  wireless.events.clickbuster.onBustCallback_ = opt_onBustCallback;

  if (!wireless.events.clickbuster.coordinates_) {
    // Listen to clicks on capture phase so they can be busted before anything
    // else gets a chance to handle them.
    document.addEventListener('click', wireless.events.clickbuster.onClick_,
                              true);

    // Listen to touchstart on capture phase since it must be called prior to
    // every click or else we will accidentally prevent the click even if we
    // don't call preventGhostClick.
    var startFn = wireless.events.clickbuster.onTouchStart_;
    if (!wireless.events.touch.SUPPORTS_TOUCHES &&
        !wireless.events.touch.SUPPORTS_POINTER) {
      startFn = wireless.events.touch.mouseToTouchCallback(startFn);
    }
    wireless.events.observe(document, wireless.events.touch.START_EVENT,
        startFn, true /* capture */, true /* removeHandlerOnFocus */);
    wireless.events.clickbuster.coordinates_ = [];
  }

  // Above all other rules, we won't bust any clicks if there wasn't some call
  // to preventGhostClick in the last time threshold.
  wireless.events.clickbuster.lastPreventedTime_ = goog.now();

  // Remove one allowable coordinate that is within the distance threshold to
  // the ghost click so that it can be busted.
  for (var i = 0; i < wireless.events.clickbuster.coordinates_.length; i += 2) {
    if (wireless.events.clickbuster.hitTest_(
        wireless.events.clickbuster.coordinates_[i],
        wireless.events.clickbuster.coordinates_[i + 1],
        x, y)) {
      // Instead of looking for a specific coordinate to remove, we look for a
      // coordinate that is within the distance threshold. One reason for this
      // is because a user can move their finger slightly between the touchstart
      // and the actual click.
      wireless.events.clickbuster.coordinates_.splice(i, i + 2);
      return;
    }
  }
};
