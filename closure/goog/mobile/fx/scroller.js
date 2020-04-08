
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
 * @fileoverview Implementation of a custom scrolling behavior.
 * This behavior overrides native scrolling for an area. This area can be a
 * single defined part of a page, the entire page, or several different parts
 * of a page.
 *
 * To use this scrolling behavior you need to define a frame and the content.
 * The frame defines the area that the content will scroll within. The frame and
 * content must both be HTML Elements, with the content being a direct child of
 * the frame. Usually the frame is smaller in size than the content. This is
 * not necessary though, if the content is smaller then bouncing will occur to
 * provide feedback that you are past the scrollable area.
 *
 * The scrolling behavior works using the webkit translate3d transformation,
 * which means browsers that do not have hardware accelerated transformations
 * will not perform as well using this. Simple scrolling should be fine even
 * without hardware acceleration, but animating momentum and deceleration is
 * unacceptably slow without it. There is also the option to use relative
 * positioning (setting the left and top styles).
 *
 * For this to work properly you need to set -webkit-text-size-adjust to 'none'
 * on an ancestor element of the frame, or on the frame itself. If you forget
 * this you may see the text content of the scrollable area changing size as it
 * moves.
 *
 * Browsers that support hardware accelerated transformations:
 * - Mobile Safari 3.x
 *
 * The behavior is intended to support vertical and horizontal scrolling, and
 * scrolling with momentum when a touch gesture flicks with enough velocity.
 */

goog.provide('wireless.fx.Scroller');

goog.require('goog.asserts');
goog.require('goog.log');
goog.require('goog.math');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.style');
goog.require('wireless.events');
goog.require('wireless.events.EventType');
goog.require('wireless.events.GestureManager');
goog.require('wireless.events.touch');
goog.require('wireless.fx');
goog.require('wireless.fx.MomentumFactory');
goog.require('wireless.fx.ScrollWatcher');
goog.require('wireless.style');



/**
 * @constructor
 * @implements {wireless.events.Draggable}
 * @implements {wireless.events.Touchable}
 * @implements {wireless.fx.MomentumDelegate}
 * @param {!Element} scrollableElem The element to be scrolled.
 * @param {boolean=} opt_verticalEnabled Whether to enable vertical scrolling.
 * @param {boolean=} opt_horizontalEnabled Whether to enable horizontal
 *      scrolling.
 * @param {boolean=} opt_momentumEnabled Whether to enable momentum.
 * @param {wireless.fx.Scroller.ScrollTechnique=} opt_scrollTechnique Which
 *     scroll technique to use. Defaults to WebKit Transform's translate3d.
 * @param {boolean=} opt_capture True if the GestureManager should listen to
 *      during the capture phase.
 * @param {number=} opt_x The initial x position in px.
 * @param {number=} opt_y The initial y position in px.
 */
wireless.fx.Scroller = function(scrollableElem, opt_verticalEnabled,
    opt_horizontalEnabled, opt_momentumEnabled, opt_scrollTechnique,
    opt_capture, opt_x, opt_y) {
  /**
   * The node that will actually scroll.
   * @type {!Element}
   * @private
   */
  this.element_ = scrollableElem;

  goog.asserts.assert(scrollableElem.parentNode,
      'Scroller: scrollableElem must have a parentNode when initialized.');
  /**
   * Frame is the node that will serve as the container for the scrolling
   * content.
   * @type {!Element}
   * @private
   */
  this.frame_ = /** @type {!Element} */ (scrollableElem.parentNode);

  // Listen for transition end events.
  this.element_.addEventListener(wireless.fx.TRANSITION_END_EVENT,
      goog.bind(this.onTransitionEnd, this), false);

  /**
   * Create a touch manager to track the events on the scrollable area.
   * @type {!wireless.events.GestureManager}
   * @private
   */
  this.gestureManager_ = new wireless.events.GestureManager(this /*touchable*/);
  this.gestureManager_.enable(opt_capture);

  /**
   * Create a drag handler that provides drag specific information.
   * @type {!wireless.events.DragHandler}
   * @private
   */
  this.dragHandler_ = this.gestureManager_.setDraggable(this);

  /**
   * The momentum instance.
   * @type {!wireless.fx.Momentum}
   * @private
   */
  this.momentum_ = wireless.fx.MomentumFactory.getInstance().createMomentum(
      this);

  /**
   * Set if vertical scrolling should be enabled.
   * @type {boolean}
   * @private
   */
  this.verticalEnabled_ = !!opt_verticalEnabled;

  /**
   * Set if horizontal scrolling should be enabled.
   * @type {boolean}
   * @private
   */
  this.horizontalEnabled_ = !!opt_horizontalEnabled;

  /**
   * Set if momentum should be enabled.
   * @type {boolean|undefined}
   * @private
   */
  this.momentumEnabled_ = opt_momentumEnabled;

  /**
   * Set which type of scrolling translation technique should be used.
   * @type {wireless.fx.Scroller.ScrollTechnique}
   * @private
   */
  this.scrollTechnique_ = opt_scrollTechnique ||
      wireless.fx.Scroller.ScrollTechnique.TRANSFORM_3D;

  /**
   * The maximum coordinate that the left upper corner of the content can scroll
   * to.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.maxPoint_ = wireless.fx.Scroller.ORIGIN_COORDINATE_.clone();

  /**
   * An offset to subtract from the maximum coordinate that the left upper
   * corner of the content can scroll to.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.maxOffset_ = wireless.fx.Scroller.ORIGIN_COORDINATE_.clone();

  /**
   * An offset to add to the minimum coordinate that the left upper corner of
   * the content can scroll to.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.minOffset_ = wireless.fx.Scroller.ORIGIN_COORDINATE_.clone();

  /**
   * Initialize the current content offset.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.contentOffset_ = wireless.fx.Scroller.ORIGIN_COORDINATE_.clone();

  /**
   * The function to use that will actually translate the scrollable node.
   * @type {function(!Element, number, number)}
   * @private
   */
  this.setOffsetFunction_ = this.scrollTechnique_ ==
      wireless.fx.Scroller.ScrollTechnique.TRANSFORM_3D ?
      wireless.fx.setWebkitTransform : wireless.fx.setLeftAndTop;
  goog.asserts.assert(this.scrollTechnique_ !=
      wireless.fx.Scroller.ScrollTechnique.RELATIVE_POSITIONING ||
      goog.style.getComputedPosition(this.element_) != 'static',
      'The scrollable element must be relatively positioned.');

  this.initLayer_(goog.isDef(opt_x) ? opt_x : this.maxPoint_.x,
                  goog.isDef(opt_y) ? opt_y : this.maxPoint_.y);

  /**
   * @type {!Array.<!wireless.fx.Scroller.GestureGuard>}
   * @private
   */
  this.gestureGuards_ = [];
};



/**
 * Used to help determine when a scroll sequence should begin. Can be used to
 * aid in interoperability with other touch handlers.
 * @interface
 */
wireless.fx.Scroller.GestureGuard = function() {};


/**
 * Called to determine if a scroll sequence should begin.
 * @param {!wireless.fx.Scroller} sender .
 * @param {!Event} event .
 * @return {boolean|undefined} False iff the sequence should be canceled.
 */
wireless.fx.Scroller.GestureGuard.prototype.shouldStartScroll =
    goog.abstractMethod;


/**
 * Called to notification that a scroll sequence will begin.
 * @param {!wireless.fx.Scroller} sender .
 * @param {!Event} event .
 */
wireless.fx.Scroller.GestureGuard.prototype.notifyStartingScroll =
    goog.abstractMethod;


/**
 * Events fired by the scroller.
 * @enum {wireless.events.EventType}
 */
wireless.fx.Scroller.EventType = {
  // Fired when a new scroll sequence begins.
  SCROLLER_START: wireless.events.EventType.create('scroller:scroll_start'),
  // Fired when scrolling stops so that listeners can react to the new
  // scrolled position of the layer.
  SCROLLER_END: wireless.events.EventType.create('scroller:scroll_end'),
  // Fired when dragging ends. Could result in either SCROLLER_END or
  // DECEL_START depending on whether or not the drag initiates momentum.
  DRAG_END: wireless.events.EventType.create('scroller:drag_end'),
  // Fired on any change in content position.
  CONTENT_MOVED: wireless.events.EventType.create('scroller:content_moved'),
  // Fired when momentum begins. For momentum end, just use SCROLLER_END.
  DECEL_START: wireless.events.EventType.create('scroller:decel_start')
};


/**
 * Techniques to translate the scrollable node. If relative (left and top)
 * positioning is used, it is the caller's responsibility to set the scrollable
 * element's position to relative.
 * @enum {number}
 */
wireless.fx.Scroller.ScrollTechnique = {
  TRANSFORM_3D: 1,
  RELATIVE_POSITIONING: 2
};


/**
 * The muted label metadata constant.
 * @type {!goog.math.Coordinate}
 * @private
 */
wireless.fx.Scroller.ORIGIN_COORDINATE_ = new goog.math.Coordinate(0, 0);


/**
 * @type {goog.log.Logger}
 * @private
 */
wireless.fx.Scroller.prototype.logger_ =
    goog.log.getLogger('wireless.fx.Scroller');


/**
 * The size of the frame.
 * @type {goog.math.Size|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.scrollSize_;


/**
 * The size of the content that is scrollable.
 * @type {goog.math.Size|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.contentSize_;


/**
 * The minimum coordinate that the left upper corner of the content can scroll
 * to.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.minPoint_;


/**
 * The offset of the scrollable content when a touch begins. Used to track delta
 * x and y's of the scrolling content.
 * @type {!goog.math.Coordinate|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.contentStartOffset_;


/**
 * Whether there is an active transition. This is set to true after a transition
 * with a non-zero duration is applied, and set to false when a transition with
 * a duration of zero is applied or when a transition ends.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.activeTransition_;


/**
 * Whether the scroller is currently stopping a deceleration.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.isStopping_;


/**
 * Whether the scroller has published scroll start yet.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.started_;


/**
 * The content height. When set, this is used to detemine content height
 * instead of retrieving element height property.
 * @type {number|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.contentHeight_;


/**
 * The content width. When set, this is used to detemine content width
 * instead of retrieving element width property.
 * @type {number|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.contentWidth_;


/**
 * Allow propagation of an event on touchStart while decelerating.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.allowEventPropagationWhileDecelerating_;


/**
 * Iff true the scroller will not allow drag sequences that begin horizontally.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.disallowHorizontalStart_;


/**
 * Allow propagation of an event while dragging.
 * @type {boolean|undefined}
 * @private
 */
wireless.fx.Scroller.prototype.allowEventPropagationWhileDragging_ = true;


/**
 * Update the scroll technique used for animating the scrollable area.
 * @param {wireless.fx.Scroller.ScrollTechnique} technique .
 */
wireless.fx.Scroller.prototype.setScrollTechnique = function(technique) {
  // Update the content offset function based on the new technique.
  this.scrollTechnique_ = technique;
  this.setOffsetFunction_ = technique ==
      wireless.fx.Scroller.ScrollTechnique.TRANSFORM_3D ?
      wireless.fx.setWebkitTransform : wireless.fx.setLeftAndTop;
  // If using relative position then position cannot be static.
  goog.asserts.assert(technique !=
      wireless.fx.Scroller.ScrollTechnique.RELATIVE_POSITIONING ||
      goog.style.getComputedPosition(this.element_) != 'static',
      'The scrollable element must be relatively positioned.');

  // If not using transform3d then we need to clear any transforms.
  if (technique != wireless.fx.Scroller.ScrollTechnique.TRANSFORM_3D) {
    wireless.fx.clearWebkitTransition(this.element_);
    wireless.fx.clearWebkitTransform(this.element_);
  }

  if (technique != wireless.fx.Scroller.ScrollTechnique.RELATIVE_POSITIONING) {
    wireless.fx.setLeftAndTop(this.element_, 0, 0);
  }

  // Set the offset using the updated function.
  this.setOffsetFunction_(this.element_, this.contentOffset_.x,
      this.contentOffset_.y);
};


/**
 * Reset the scroll offset and any transformations previously applied.
 */
wireless.fx.Scroller.prototype.reset = function() {
  this.resetGesture();
  this.resetContentPosition();
};


/**
 * Resets any scroll gesture currently in progress.
 */
wireless.fx.Scroller.prototype.resetGesture = function() {
  // Stop any in-progress momentum.
  this.stop();

  // Stop any in-progress drag.
  this.dragHandler_.reset();

  this.setWebkitTransition_(this.element_, 0);

  this.reconfigure();
};


/**
 * Zeros the scroll position in both the horizontal and vertical directions.
 */
wireless.fx.Scroller.prototype.resetContentPosition = function() {
  this.setContentOffset_(goog.style.isRightToLeft(document.body) ?
      this.minPoint_.x : this.maxPoint_.x,
      this.maxPoint_.y);
};


/**
 * Recalculate dimensions of the frame and the content. Adjust the minPoint
 * and maxPoint allowed for scrolling and scroll to a valid position. Call this
 * method if you know the frame or content has been updated. Called internally
 * on every touchstart event the frame receives.
 */
wireless.fx.Scroller.prototype.reconfigure = function() {
  this.resize_();

  this.snapContentOffsetToBounds_();
};


/**
 * Set content size. If content size is not set, the height/width properties
 * will be used to detemine the size.
 * @param {number=} opt_width The width.
 * @param {number=} opt_height The height.
 */
wireless.fx.Scroller.prototype.setContentSize =
    function(opt_width, opt_height) {
  this.contentWidth_ = opt_width;
  this.contentHeight_ = opt_height;
  this.resize_();
};


/**
 * Recalculate dimensions of the frame and the content. Adjust the minPoint and
 * maxPoint allowed for scrolling.
 * @private
 */
wireless.fx.Scroller.prototype.resize_ = function() {
  this.scrollSize_ = new goog.math.Size(
      this.frame_.offsetWidth, this.frame_.offsetHeight);

  this.contentSize_ = new goog.math.Size(
      this.contentWidth_ || this.element_.scrollWidth,
      this.contentHeight_ || this.element_.scrollHeight);

  var adjusted = this.getAdjustedContentSize_();

  // Calculate the max and min points of the scroller.  This varies depending
  // on whether the page is RTL or LTR.  In LTR, we initially start at the
  // leftmost position (0) and the coordinates go negative as we go right.
  // With RTL, we initially start at the rightmost position and the coordinates
  // move to 0 as we go left.
  var isRtl = goog.style.isRightToLeft(document.body);
  var maxPointX;
  if (isRtl) {
    var width = adjusted.width - this.scrollSize_.width;
    maxPointX = this.maxOffset_.x ?
        Math.min(width, this.maxOffset_.x) : width;
  } else {
    maxPointX = wireless.fx.Scroller.ORIGIN_COORDINATE_.x - this.maxOffset_.x;
  }
  this.maxPoint_ = new goog.math.Coordinate(maxPointX,
      wireless.fx.Scroller.ORIGIN_COORDINATE_.y - this.maxOffset_.y);

  this.minPoint_ = new goog.math.Coordinate(isRtl ?
      this.minOffset_.x :
      Math.min(this.scrollSize_.width - adjusted.width + this.minOffset_.x,
               this.maxPoint_.x),
      Math.min(this.scrollSize_.height - adjusted.height + this.minOffset_.y,
               this.maxPoint_.y));
};


/**
 * Enable or disable horizontal scrolling.
 * @param {boolean} enable True if it should be enabled.
 */
wireless.fx.Scroller.prototype.setHorizontalScrolling =
    function(enable) {
  this.horizontalEnabled_ = enable;
};


/**
 * Enable or disable vertical scrolling.
 * @param {boolean} enable True if it should be enabled.
 */
wireless.fx.Scroller.prototype.setVerticalScrolling = function(enable) {
  this.verticalEnabled_ = enable;
};


/**
 * Enable or disable momentum.
 * @param {boolean} enable True if it should be enabled.
 */
wireless.fx.Scroller.prototype.setMomentum = function(enable) {
  this.momentumEnabled_ = enable;
};


/**
 * Initialize the dom elements necessary for the scrolling to work.
 * - Asserts that the content is a direct child of the frame.
 * @param {number} x The initial x position in px.
 * @param {number} y The initial y position in px.
 * @private
 */
wireless.fx.Scroller.prototype.initLayer_ = function(x, y) {
  goog.asserts.assert(this.element_.parentNode == this.frame_,
      'The scrollable node provided to Scroller must be ' +
      'a direct child of the scrollable frame.');

  // Applying this tranform on initialization avoids flickering issues the first
  // time elements are moved.
  this.setContentOffset_(x, y);
};


/**
 * In the event that the content is currently beyond the bounds of
 * the frame, snap it back in to place.
 * @private
 */
wireless.fx.Scroller.prototype.snapContentOffsetToBounds_ = function() {
  var clampX = goog.math.clamp(this.contentOffset_.x, this.minPoint_.x,
      this.maxPoint_.x);
  var clampY = goog.math.clamp(this.contentOffset_.y, this.minPoint_.y,
      this.maxPoint_.y);

  // If move is required
  if (this.contentOffset_.x != clampX || this.contentOffset_.y != clampY) {
    this.setContentOffset_(clampX, clampY);
  }
};


/**
 * Sets the vertical scrolled offset of the element.
 * @param {number} y The amount of vertical space to be scrolled, in pixels.
 */
wireless.fx.Scroller.prototype.setVerticalOffset = function(y) {
  this.setContentOffset_(this.contentOffset_.x, y);
};


/** @return {number} The vertical scrolled offset of the element. */
wireless.fx.Scroller.prototype.getVerticalOffset = function() {
  return this.contentOffset_.y;
};


/** @return {number} The vertical offset before any scrolling takes place. */
wireless.fx.Scroller.prototype.getDefaultVerticalOffset = function() {
  return this.maxPoint_.y;
};


/**
 * Sets the horizontal scrolled offset of the element.
 * @param {number} x The amount of horizontal space to be scrolled, in pixels.
 */
wireless.fx.Scroller.prototype.setHorizontalOffset = function(x) {
  this.setContentOffset_(x, this.contentOffset_.y);
};


/** @return {number} The horizontal scrolled offset of the element. */
wireless.fx.Scroller.prototype.getHorizontalOffset = function() {
  return this.contentOffset_.x;
};


/**
 * @param {number=} opt_x Value to use as reference for percent measurement. If
 *      none is provided then the content's current x offset will be used.
 * @return {number} The percent of the page scrolled horizontally.
 */
wireless.fx.Scroller.prototype.getHorizontalScrollPercent = function(opt_x) {
  var x = opt_x || this.contentOffset_.x;
  return (x - this.minPoint_.x) / (this.maxPoint_.x - this.minPoint_.x);
};


/**
 * @param {number=} opt_y Value to use as reference for percent measurement. If
 *      none is provided then the content's current y offset will be used.
 * @return {number} The percent of the page scrolled vertically.
 */
wireless.fx.Scroller.prototype.getVerticalScrollPercent = function(opt_y) {
  var y = opt_y || this.contentOffset_.y;
  return (y - this.minPoint_.y) / (this.maxPoint_.y - this.minPoint_.y);
};


/**
 * Translate the content to a new position.
 * @param {number} x The new x position in px.
 * @param {number} y The new y position in px.
 * @private
 */
wireless.fx.Scroller.prototype.setContentOffset_ = function(x, y) {
  this.contentOffset_.x = x;
  this.contentOffset_.y = y;

  this.setOffsetFunction_(this.element_, x, y);

  wireless.events.fire(this.element_,
      wireless.fx.Scroller.EventType.CONTENT_MOVED, this);
};


/**
 * Sets the offset to add to the minimum coordinate that the left upper corner
 * of the content can scroll to.
 * @param {number} x The minimum offset width.
 * @param {number} y The minimum offset height.
 */
wireless.fx.Scroller.prototype.setMinOffset = function(x, y) {
  this.minOffset_.x = x;
  this.minOffset_.y = y;
  this.resize_();
};


/**
 * Sets the offset to subtract from the maximum coordinate that the left upper
 * corner of the content can scroll to.
 * @param {number} x The maximum offset width.
 * @param {number} y The maximum offset height.
 */
wireless.fx.Scroller.prototype.setMaxOffset = function(x, y) {
  this.maxOffset_.x = x;
  this.maxOffset_.y = y;
  this.resize_();
};


/** @return {number} The max y scroll offset. */
wireless.fx.Scroller.prototype.getMaxPointY = function() {
  return this.maxPoint_.y;
};


/** @return {number} The min y scroll offset. */
wireless.fx.Scroller.prototype.getMinPointY = function() {
  return this.minPoint_.y;
};


/** @return {number} The max x scroll offset. */
wireless.fx.Scroller.prototype.getMaxPointX = function() {
  return this.maxPoint_.x;
};


/** @return {number} The min x scroll offset. */
wireless.fx.Scroller.prototype.getMinPointX = function() {
  return this.minPoint_.x;
};


/**
 * Translates the content to a new position under the given duration.
 * @param {number} x The new x position in px.
 * @param {number} y The new y position in px.
 * @param {number=} opt_duration The duration of the translation in ms.
 * @param {string=} opt_timingFunction The transition timing function.
 */
wireless.fx.Scroller.prototype.animateTo = function(x, y, opt_duration,
    opt_timingFunction) {
  if (goog.isDef(opt_duration) && this.scrollTechnique_ ==
      wireless.fx.Scroller.ScrollTechnique.TRANSFORM_3D) {

    this.setWebkitTransition_(this.element_, opt_duration,
        wireless.style.TRANSFORM_STYLE, opt_timingFunction);
  }
  this.setContentOffset_(x, y);
};


/**
 * Transition end event handler.
 * @param {Event} e .
 */
wireless.fx.Scroller.prototype.onTransitionEnd = function(e) {
  if (e.target == this.element_) {
    this.activeTransition_ = false;
    this.momentum_.onTransitionEnd();
  }
};


/** @return {boolean} True if scroller is currently decelerating. */
wireless.fx.Scroller.prototype.isDecelerating = function() {
  return this.momentum_.isDecelerating();
};


/** Stops the scroller and any momentum that is happening. */
wireless.fx.Scroller.prototype.stop = function() {
  if (this.momentum_.isDecelerating()) {
    // For RELATIVE don't attempt any fancy momentum just stop.
    if (this.scrollTechnique_ ==
        wireless.fx.Scroller.ScrollTechnique.RELATIVE_POSITIONING) {
      this.momentum_.stop();
      return;
    }

    var transform1 = wireless.style.getCurrentTransformMatrix(this.element_);

    // If there isn't an active transition, then there is no need to perform
    // the following hack that tries to adjust the position based on an
    // estimated stop position. Just stop it now.
    if (!this.activeTransition_) {
      this.stopDecelerating_(transform1.m41, transform1.m42);
      return;
    }

    // This is a little hacky but is required because callers of this function
    // expect that content offset is updated after calling stop. Since the
    // offset will not really be updated until the timeout below executes, we
    // need to save an approximate value here.
    this.contentOffset_.x = transform1.m41;
    this.contentOffset_.y = transform1.m42;

    this.isStopping_ = true;

    var self = this;
    window.setTimeout(function() {
      var transform2 = wireless.style.getCurrentTransformMatrix(self.element_);
      // NOTE: Order is important. Must clear transition after getting the
      // transform matrix, or we will record bad coordinates (namely where the
      // layer would have ended up had the transition completed).

      self.setWebkitTransition_(self.element_, 0);

      // This is a work around for frozen scrolling state that we can get into
      // when doing a fast drag during content deceleration. See b/3392239 for
      // more details.
      window.setTimeout(function() {
        self.isStopping_ = false;
      }, 0);

      // Use the two transforms taken at different times as an approximation for
      // where we should stop the content. The problem before was that by the
      // time we measured the content's current location and set it there, the
      // content had already moved farther. This delta calculation should find
      // out approximately how far the content is moving between calls and try
      // to account for where the content will really be by the time it stops.
      // This solution is not perfect but it is a big improvement over the
      // current experience on iOS4.1 and iPad3.2. Before changing this code,
      // test by touching the content while it is flinging and seeing how jerky
      // it is when it stops.
      //  See if we can make this even better by looking at
      // time delta.
      var deltaX = transform2.m41 - transform1.m41;
      var deltaY = transform2.m42 - transform1.m42;
      var newX = transform2.m41 + 2 * deltaX;
      var newY = transform2.m42 + 2 * deltaY;
      newX = goog.math.clamp(newX, self.minPoint_.x, self.maxPoint_.x);
      newY = goog.math.clamp(newY, self.minPoint_.y, self.maxPoint_.y);
      self.stopDecelerating_(newX, newY);
    }, 0);
  }
};


/**
 * Stop the deceleration of the scrollable content.
 * @param {number} x The new x position in px.
 * @param {number} y The new y position in px.
 * @private
 */
wireless.fx.Scroller.prototype.stopDecelerating_ = function(x, y) {
  this.momentum_.stop();
  this.setContentOffset_(x, y);
};


/**
 * Adjusted content size is a size with the combined largest height and width
 * of both the content and the frame.
 * @return {!goog.math.Size} the adjusted size.
 * @private
 */
wireless.fx.Scroller.prototype.getAdjustedContentSize_ = function() {
  return new goog.math.Size(
      Math.max(this.scrollSize_.width, this.contentSize_.width),
      Math.max(this.scrollSize_.height, this.contentSize_.height));
};


/**
 * Prepare the scrollable area for possible movement.
 * @override
 */
wireless.fx.Scroller.prototype.onTouchStart = function(e) {
  if (this.dragHandler_.isGesturing()) {
    // Do not react if there is a drag in progress.
    // This can happen if there are some other handlers registered with
    // the gesture manager (e.g., zoom handler). So, return true to allow
    // other handler to act on this.
    return true;
  }

  this.reconfigure();

  // Prevent clicking if we are currently scrolling.
  // This needs to be done before we stop animation.
  if (this.momentum_.isDecelerating()) {
    // Prevents native clicks.
    e.preventDefault();
    if (!this.allowEventPropagationWhileDecelerating_) {
      // Prevents other JS behaviors from handling touchstart.
      e.stopPropagation();
    }

    // If the content is currently animating then we should stop it.
    // NOTE: Order is important. Must stop animation before recording
    // touchStartPosition_.
    this.stop();
  } else {
    // This doesn't need to be done if momentum is decelerating because stopping
    // the momentum will clear the transition.
    this.setWebkitTransition_(this.element_, 0);
  }

  // Save the initial position of touch and content.
  this.contentStartOffset_ = this.contentOffset_.clone();

  // Content should be snapped back in to place at this point if it is currently
  // offset.
  this.snapContentOffsetToBounds_();

  // Returning true here indicates that we are accepting a drag sequence.
  return true;
};


/** @override */
wireless.fx.Scroller.prototype.onTouchEnd = function(e) {};


/** @override */
wireless.fx.Scroller.prototype.onDragStart = function(e) {
  var verticalStart = this.dragHandler_.isDragVertical();

  if (this.disallowHorizontalStart_ && !verticalStart) {
    return false;
  }

  // Take over the native page scroller iff we can scroll both ways or the user
  // is actually scrolling in the direction that is allowed.
  if (!this.canScrollVertically() && (
      !this.canScrollHorizontally() || verticalStart)) {
    return false;
  }

  for (var i = 0, guard; guard = this.gestureGuards_[i]; ++i) {
    if (!guard.shouldStartScroll(this, e)) {
      return false;
    }
  }
  for (var i = 0, guard; guard = this.gestureGuards_[i]; ++i) {
    guard.notifyStartingScroll(this, e);
  }

  return true;
};


/**
 * @return {boolean} True iff this is a horizontal scroller and if
 *     there is still room to scroll in the right direction.
 */
wireless.fx.Scroller.prototype.canScrollRight = function() {
  return this.canScrollHorizontally() && (
      this.contentOffset_.x > this.minPoint_.x);
};


/**
 * @return {boolean} True iff this is a horizontal scroller and if
 *     there is still room to scroll in the left direction.
 */
wireless.fx.Scroller.prototype.canScrollLeft = function() {
  return this.canScrollHorizontally() && (
      this.contentOffset_.x < this.maxPoint_.x);
};


/**
 * @return {boolean} True iff this is a vertical scroller and if
 *     there is still room to scroll in the downward direction.
 */
wireless.fx.Scroller.prototype.canScrollDown = function() {
  return this.canScrollVertically() && (
      this.contentOffset_.y > this.minPoint_.y);
};


/**
 * @return {boolean} True iff this is a vertical scroller and if
 *     there is still room to scroll in the upward direction.
 */
wireless.fx.Scroller.prototype.canScrollUp = function() {
  return this.canScrollVertically() && (
      this.contentOffset_.y < this.maxPoint_.y);
};


/** @override */
wireless.fx.Scroller.prototype.onDragMove = function(e) {
  if (!this.allowEventPropagationWhileDragging_) {
    e.stopPropagation();
  }
  this.dragMove(/** @type {number} */ (this.dragHandler_.getDragDeltaX()),
                /** @type {number} */ (this.dragHandler_.getDragDeltaY()));
};


/**
 * React when a drag has changed.
 * @param {number} deltaX The size change of the drag in x direction.
 * @param {number} deltaY The size change of the drag in y direction.
 * @param {boolean=} opt_noAdjustment Set to true if the scroller should not
 *     adjust the amount of drag to provide backing off effect when the content
 *     is dragged outside the frame.
 */
wireless.fx.Scroller.prototype.dragMove =
    function(deltaX, deltaY, opt_noAdjustment) {
  if (this.isStopping_) {
    return;
  }

  goog.asserts.assert(this.contentStartOffset_, 'Content start not set');
  var contentStart = this.contentStartOffset_;

  var newX = contentStart.x + deltaX;
  if (!opt_noAdjustment) {
    newX = this.canScrollHorizontally() ?
        this.adjustValue_(newX, this.minPoint_.x, this.maxPoint_.x) : 0;
  }

  var newY = contentStart.y + deltaY;
  if (!opt_noAdjustment) {
    newY = this.canScrollVertically() ?
        this.adjustValue_(newY, this.minPoint_.y, this.maxPoint_.y) : 0;
  }

  if (!this.started_) {
    this.started_ = true;
    wireless.events.fire(this.element_,
        wireless.fx.Scroller.EventType.SCROLLER_START, this);
  }

  this.setContentOffset_(newX, newY);
};


/**
 * Whether the scrollable area should scroll horizontally. Only
 * returns true if the client has enabled horizontal scrolling, and the content
 * is wider than the frame.
 * @return {boolean} True if should scroll horizontally.
 */
wireless.fx.Scroller.prototype.canScrollHorizontally = function() {
  return this.horizontalEnabled_ &&
      this.scrollSize_.width < this.contentSize_.width;
};


/**
 * Whether the scrollable area should scroll vertically. Only
 * returns true if the client has enabled vertical scrolling.
 * Vertical bouncing will occur even if frame is taller than content, because
 * this is what iPhone web apps tend to do. If this is not the desired behavior,
 * either disable vertical scrolling for this scroller or add a 'bouncing'
 * parameter to this interface.
 * @return {boolean} True if should scroll vertically.
 */
wireless.fx.Scroller.prototype.canScrollVertically = function() {
  return this.verticalEnabled_;
};


/**
 * Adjust the new calculated scroll position based on the minimum allowed
 * position.
 * @param {number} newPosition The new position before adjusting.
 * @param {number} minPosition The minimum allowed position.
 * @param {number} maxPosition The maximum allowed position.
 * @return {number} the adjusted scroll value.
 * @private
 */
wireless.fx.Scroller.prototype.adjustValue_ =
    function(newPosition, minPosition, maxPosition) {
  goog.asserts.assert(minPosition <= maxPosition, 'Invalid values for ' +
      'minPosition: ' + minPosition + ' and maxPosition: ' + maxPosition);
  if (newPosition < minPosition) {
    newPosition -= (newPosition - minPosition) / 2;
  } else if (newPosition > maxPosition) {
    newPosition -= (newPosition - maxPosition) / 2;
  }
  return newPosition;
};


/** @override */
wireless.fx.Scroller.prototype.onDragEnd = function(e) {
  this.dragEnd(/** @type {!goog.math.Coordinate} */ (this.dragHandler_.
      getEndVelocity()));
};


/**
 * React when a drag has ended.
 * @param {!goog.math.Coordinate=} opt_endVelocity The end velocity of the drag.
 */
wireless.fx.Scroller.prototype.dragEnd = function(opt_endVelocity) {
  wireless.events.fire(this.element_,
      wireless.fx.Scroller.EventType.DRAG_END, this);

  // Listeners could start a transition in response to DRAG_END by calling
  // animateTo with a non-zero duration (e.g. a pull-down-to-refresh revealer).
  // In this case, we shouldn't start deceleration.
  if (opt_endVelocity && this.momentumEnabled_ && !this.activeTransition_) {
    var decelerating = this.startDeceleration_(opt_endVelocity);
  }

  if (!decelerating) {
    this.snapContentOffsetToBounds_();

    wireless.events.fire(this.element_,
        wireless.fx.Scroller.EventType.SCROLLER_END, this);
    this.started_ = false;
  } else {
    wireless.events.fire(this.element_,
        wireless.fx.Scroller.EventType.DECEL_START, this);
  }
};


/**
 * Initiate the deceleration behavior.
 * @param {!goog.math.Coordinate} velocity The flick velocity.
 * @return {boolean|undefined} True if deceleration has been initiated.
 * @private
 */
wireless.fx.Scroller.prototype.startDeceleration_ = function(velocity) {
  if (!this.canScrollHorizontally()) {
    velocity.x = 0;
  }

  if (!this.canScrollVertically()) {
    velocity.y = 0;
  }

  goog.asserts.assert(this.minPoint_, 'Min point is not set');
  goog.asserts.assert(this.maxPoint_, 'Max point is not set');

  return this.momentum_.start(velocity,
      /** @type {!goog.math.Coordinate} */ (this.minPoint_),
      this.maxPoint_, this.contentOffset_);
};


/**
 * Applies a webkit transition on the element.
 * @param {!Element} el The element.
 * @param {number} duration The duration of this animation in ms.
 * @param {string=} opt_property The transition property.
 * @param {string=} opt_timingFunction The transition timing function.
 * @private
 */
wireless.fx.Scroller.prototype.setWebkitTransition_ = function(el, duration,
    opt_property, opt_timingFunction) {
  this.activeTransition_ = duration > 0;
  wireless.fx.setWebkitTransition(el, duration, opt_property,
      opt_timingFunction);
};


/** @override */
wireless.fx.Scroller.prototype.getElement = function() {
  return this.element_;
};


/** @return {!Element} The scroller's frame element. */
wireless.fx.Scroller.prototype.getFrame = function() {
  return this.frame_;
};


/** @return {!wireless.fx.Momentum} The momentum object. */
wireless.fx.Scroller.prototype.getMomentum = function() {
  return this.momentum_;
};


/** @return {!wireless.events.DragHandler} The drag handler. */
wireless.fx.Scroller.prototype.getDragHandler = function() {
  return this.dragHandler_;
};


/** @return {!wireless.fx.Momentum.Strategy} The momentum strategy. */
wireless.fx.Scroller.prototype.getMomentumStrategy = function() {
  if (wireless.fx.MomentumFactory.ENFORCE_TRANSITIONS) {
    return wireless.fx.Momentum.Strategy.TRANSITIONS;
  } else if (wireless.fx.MomentumFactory.ENFORCE_TIMEOUTS) {
    return wireless.fx.Momentum.Strategy.TIMEOUTS;
  } else {
    return this.momentum_.getStrategy();
  }
};


/**
 * Provide access to the touch handler that the scroller created to manage touch
 * events.
 * @return {!wireless.events.GestureManager} the touch handler.
 */
wireless.fx.Scroller.prototype.getGestureManager = function() {
  return this.gestureManager_;
};


/** @override */
wireless.fx.Scroller.prototype.onDecelerate =
    wireless.fx.Scroller.prototype.animateTo;


/** @override */
wireless.fx.Scroller.prototype.onDecelerationEnd = function() {
  this.setWebkitTransition_(this.element_, 0);
  wireless.events.fire(this.element_,
      wireless.fx.Scroller.EventType.SCROLLER_END, this);
  this.started_ = false;
};


/**
 * Add a scroll listener. This allows other classes to subscribe to scroll
 * notifications from this scroller.
 * @param {!wireless.fx.ScrollListener} listener .
 */
wireless.fx.Scroller.prototype.addScrollListener = function(listener) {
  if (!this.scrollWatcher_) {
    this.scrollWatcher_ = new wireless.fx.ScrollWatcher(this);
    this.scrollWatcher_.initialize();
  }
  this.scrollWatcher_.addListener(listener);
};


/**
 * The offset of the content at the moment dragging has started.
 * @return {!goog.math.Coordinate|undefined} The start offset.
 */
wireless.fx.Scroller.prototype.getContentStartOffset = function() {
  return this.contentStartOffset_;
};


/**
 * Allow propagation of an event on touchStart while decelerating.
 * @param {boolean} allow Whether or not allow event propagation.
 */
wireless.fx.Scroller.prototype.allowEventPropagationWhileDecelerating =
    function(allow) {
  this.allowEventPropagationWhileDecelerating_ = allow;
};


/**
 * Allow propagation of an event on dragMove while dragging.
 * @param {boolean} allow Whether or not allow event propagation.
 */
wireless.fx.Scroller.prototype.allowEventPropagationWhileDragging =
    function(allow) {
  this.allowEventPropagationWhileDragging_ = allow;
};


/** Update the content start offset with the current offset. */
wireless.fx.Scroller.prototype.updateContentStartOffset = function() {
  this.contentStartOffset_ = this.contentOffset_.clone();
};


/**
 * @return {boolean|undefined} True if the scroller is currently stopping.
 */
wireless.fx.Scroller.prototype.isStopping = function() {
  return this.isStopping_;
};


/**
 * @param {!wireless.fx.Scroller.GestureGuard} value .
 */
wireless.fx.Scroller.prototype.addGestureGuard = function(value) {
  this.gestureGuards_.push(value);
};


/**
 * @param {boolean|undefined} value True iff the scroller will not allow drag
 *     sequences that begin horizontally.
 */
wireless.fx.Scroller.prototype.setDisallowHorizontalStart = function(value) {
  this.disallowHorizontalStart_ = value;
};
