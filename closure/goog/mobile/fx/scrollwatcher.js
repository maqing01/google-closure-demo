
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
 * @fileoverview The scroll watcher is intended to provide a single way to
 * listen for scroll events from instances of wireless.fx.Scroller, abstracting
 * the various nuances between momentum strategies that require different scroll
 * listening strategies.
 */

goog.provide('wireless.fx.ScrollListener');
goog.provide('wireless.fx.ScrollWatcher');

goog.require('wireless.events');



/**
 * Objects that want to listen to scroll events from wireless.fx.Scroller
 * objects.
 * @interface
 */
wireless.fx.ScrollListener = function() {};


/**
 * The callback invoked for a scroll event.
 * @param {number} scrollX The new x offset of the scrolled content.
 * @param {number} scrollY The new y offset of the scrolled content.
 * @param {boolean=} opt_decelerating Whether or not the content is moving due
 *      to deceleration. False or undefined if the content is moving because the
 *      user is dragging the content.
 */
wireless.fx.ScrollListener.prototype.onScrollerMoved = goog.abstractMethod;



/**
 * @constructor
 * @param {!wireless.fx.Scroller} scroller The scroller to watch.
 */
wireless.fx.ScrollWatcher = function(scroller) {
  /**
   * @type {!wireless.fx.Scroller}
   * @private
   */
  this.scroller_ = scroller;

  /**
   * @type {!Array.<!wireless.fx.ScrollListener>}
   * @private
   */
  this.listeners_ = [];

  /**
   * @type {function(Event)}
   * @private
   */
  this.boundOnDecel_ = goog.bind(this.onDecelerate_, this);
};


/**
 * Initializes elements and event handlers. Must be called after construction
 * and before usage.
 */
wireless.fx.ScrollWatcher.prototype.initialize = function() {
  var scrollerEl = this.scroller_.getElement();
  goog.asserts.assert(scrollerEl, 'Scroller element does not exist.');
  this.scrollerEl_ = scrollerEl;
  wireless.events.observe(scrollerEl,
      wireless.fx.Scroller.EventType.CONTENT_MOVED,
      goog.bind(this.onContentMoved_, this));

  if (this.scroller_.getMomentumStrategy() ==
      wireless.fx.Momentum.Strategy.TRANSITIONS) {
    wireless.events.observe(scrollerEl,
        wireless.fx.Scroller.EventType.DECEL_START,
        goog.bind(this.onDecelerationStart_, this));

    wireless.events.observe(scrollerEl,
        wireless.fx.Scroller.EventType.SCROLLER_END,
        goog.bind(this.onScrollerEnd_, this));
  }
};


/**
 * Add a listener
 * @param {!wireless.fx.ScrollListener} listener .
 */
wireless.fx.ScrollWatcher.prototype.addListener = function(listener) {
  this.listeners_.push(listener);
};


/**
 * When deceleration begins, clear the interval if it already exists and set up
 * a new one.
 * @param {Event} e .
 * @private
 */
wireless.fx.ScrollWatcher.prototype.onDecelerationStart_ = function(e) {
  window.clearInterval(this.decelIntervalId_);
  this.decelIntervalId_ = window.setInterval(this.boundOnDecel_, 30);
};


/**
 * This callback is invoked any time the scroller content offset changes.
 * @param {Event} e .
 * @private
 */
wireless.fx.ScrollWatcher.prototype.onContentMoved_ = function(e) {
  // Do nothing if the scroller is decelerating because the onDecelerate
  // callback will handle this. This only applies when the momentum strategy is
  // TRANSITIONS, in the TIMEOUTS strategy we just handle all of the moves here.
  if (this.scroller_.getMomentumStrategy() ==
      wireless.fx.Momentum.Strategy.TRANSITIONS &&
      this.scroller_.isDecelerating()) {
    return;
  }

  var scrollX = this.scroller_.getHorizontalOffset();
  var scrollY = this.scroller_.getVerticalOffset();
  this.dispatchScroll_(scrollX, scrollY);
};


/**
 * When scrolling ends, clear the interval if it exists.
 * @param {Event} e .
 * @private
 */
wireless.fx.ScrollWatcher.prototype.onScrollerEnd_ = function(e) {
  window.clearInterval(this.decelIntervalId_);
  // Call the onScroll method one time at the end of deceleration to apply the
  // full scroll logic to snap all elements into their correct ending places.
  this.onContentMoved_(e);
};


/**
 * This callback is invoked every 30ms while deceleration is happening.
 * @param {Event} e .
 * @private
 */
wireless.fx.ScrollWatcher.prototype.onDecelerate_ = function(e) {
  // Get the computed scroll offset of the animation.
  var transform = wireless.style.getCurrentTransformMatrix(this.scrollerEl_);
  var scrollX = transform.m41;
  var scrollY = transform.m42;
  this.dispatchScroll_(scrollX, scrollY, true /* decelerating */);
};

/**
 * Send the scroll event to all listeners.
 * @param {number} scrollX The new content x offset being scrolled to.
 * @param {number} scrollY The new content y offset being scrolled to.
 * @param {boolean=} opt_decelerating True if the offset is changing because of
 *     deceleration.
 * @private
 */
wireless.fx.ScrollWatcher.prototype.dispatchScroll_ =
    function(scrollX, scrollY, opt_decelerating) {
  for (var i = 0; i < this.listeners_.length; i++) {
    var listener = this.listeners_[i];
    listener.onScrollerMoved(scrollX, scrollY, opt_decelerating);
  }
};
