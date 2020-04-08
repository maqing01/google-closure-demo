// Copyright 2011 Google. All Rights Reserved.

/**
 * @fileoverview Activity indicator for Kennedy. Works on all browsers that
 * support CSS3 Animations (all browsers except IE<10).
 * See http://caniuse.com/#feat=css-animation.

 */

goog.provide('controls.ActivityIndicator');

goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.userAgent');
goog.require('controls.ActivityStatus');



/**
 * Component to show activity status: loading, offline, etc.
 * @param {!controls.ActivityStatus} status Status object.
 * @param {!goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 * @constructor
 * @extends {goog.ui.Component}
 */
controls.ActivityIndicator = function(status, opt_domHelper) {
  controls.ActivityIndicator.base(this, 'constructor', opt_domHelper);

  /**
   * The background color of the activity indicator.
   * @type {string}
   * @private
   */
  this.backgroundColor_ = '#fff';

  /**
   * The size of the activity indicator.
   * @type {controls.ActivityIndicator.Size}
   * @private
   */
  this.size_ = controls.ActivityIndicator.Size.NORMAL;

  /**
   * Status object.
   * @type {!controls.ActivityStatus}
   * @private
   */
  this.status_ = status;
};
goog.inherits(controls.ActivityIndicator, goog.ui.Component);


/**
 * Direction of the folding animation.
 * @enum {number}
 * @private
 */
controls.ActivityIndicator.Direction_ = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};


/**
 * The size of the activity indicator.
 * @enum {number}
 */
controls.ActivityIndicator.Size = {
  NORMAL: 0,
  SMALL: 1
};


/**
 * @param {controls.ActivityIndicator.Size} size The size.
 */
controls.ActivityIndicator.prototype.setSize = function(size) {
  goog.asserts.assert(!this.getElement(),
      'Cannot setSize after activity indicator is rendered.');
  this.size_ = size;
};


/**
 * Sets the background color.
 * @param {string} color Background color.
 */
controls.ActivityIndicator.prototype.setBackgroundColor = function(color) {
  this.backgroundColor_ = color;
};


/** @override */
controls.ActivityIndicator.prototype.createDom = function() {
  controls.ActivityIndicator.base(this, 'createDom');

  var domHelper = this.getDomHelper();

  // The activity indicator needs to display the offline image above
  // the transition circles.  The iconLayer_ div is placed after
  // the contentElement_ so that transition circles are rendered
  // first in document order (and the icon appears above).

  this.contentElement_ = domHelper.createDom(goog.dom.TagName.DIV);

  this.iconLayer_ = domHelper.createDom(goog.dom.TagName.DIV,
      goog.getCssName(controls.ActivityIndicator.CSS_NAME_, 'icon'));

  var classNames = [controls.ActivityIndicator.CSS_NAME_];
  if (this.size_ == controls.ActivityIndicator.Size.SMALL) {
    classNames.push(goog.getCssName(controls.ActivityIndicator.CSS_NAME_, 'small'));
  }
  this.setElementInternal(domHelper.createDom(goog.dom.TagName.DIV,
                                              classNames,
                                              this.contentElement_,
                                              this.iconLayer_));
};


/** @override */
controls.ActivityIndicator.prototype.getContentElement = function() {
  return this.contentElement_;
};


/** @override */
controls.ActivityIndicator.prototype.enterDocument = function() {
  controls.ActivityIndicator.base(this, 'enterDocument');
  //  See the indicator to the initial status state as well.
  // Remove the hacky state resetting in the demo.
  this.getHandler().listen(this.status_,
                           goog.events.EventType.CHANGE,
                           this.runAnimationLoop_);
};


/**
 * Starts off the animation loop.  Plays the next transition in sequence.
 * Called on state change or at the end of a previous transition if it's
 * a state that plays continuously (loading). No-op if a transition is already
 * playing.
 * @private
 */
controls.ActivityIndicator.prototype.runAnimationLoop_ = function() {

  // There is an outstanding loop playing.  It will be responsible for
  // starting the next run.
  if (this.lastTransition_ &&
      !this.lastTransition_.complete) {
    return;
  }

  this.removeChildren(true);

  var transition = this.createNextTransition_();
  this.playTransition_(transition);
  goog.dispose(this.lastTransition_);
  this.lastTransition_ = transition;

  this.setOfflineOpacity_();
};


/**
 * Play given transition.
 * @param {controls.ActivityIndicator.CircleTransition_} transition Transition
 *     to play.
 * @private
 */
controls.ActivityIndicator.prototype.playTransition_ = function(transition) {
  this.addChild(transition, true);
  this.getHandler().listenOnce(transition,
      controls.ActivityIndicator.CircleTransition_.EventType.COMPLETE,
      this.handleTransitionEnd_);

  // Call after a delay to trigger the CSS3 animation (the style changes
  // happen after the execution thread).
  goog.Timer.callOnce(goog.bind(function(transition) {
    if (this.isInDocument()) {
      transition.play();
      // Cleanup in case transitionend event doesn't fire.
      goog.Timer.callOnce(goog.bind(function() {
        if (!this.isDisposed() && this.isInDocument() && this.started &&
            !this.complete) {
          this.handleTransitionEnd_();
        }
      }, transition), 500, transition);
    }
  }, this, transition), 0);

  //  Translations and a11y.
};


/**
 * At the end of a transition, possibly continue the animation.
 * @param {!goog.events.Event} e Transition complete event, with
 *     transition as the target.
 * @private
 */
controls.ActivityIndicator.prototype.handleTransitionEnd_ = function(e) {
  var transition = e.target;

  var state = this.status_.getState();

  // Continue with the animation if the indicator doesn't match the
  // current state, or if we're loading (that animation runs
  // continuously).
  if (state != transition.state ||
      state == controls.ActivityStatus.State.LOADING) {
    this.runAnimationLoop_();
  }

  this.setOfflineOpacity_();
};


/**
 * Set the opacity of the offline icon based on current status.
 * @private
 */
controls.ActivityIndicator.prototype.setOfflineOpacity_ = function() {
  this.iconLayer_.style.opacity =
      this.status_.getState() == controls.ActivityStatus.State.OFFLINE ? 1 : 0;
};


/**
 * Create the next transition.
 * @return {!controls.ActivityIndicator.CircleTransition_} New transition.
 * @private
 */
controls.ActivityIndicator.prototype.createNextTransition_ = function() {

  //  Consider moving color definitions into GSS (if possible).

  // Default values if we don't have a previous transition.
  var lastColor = this.backgroundColor_;
  var lastShadowColor = this.backgroundColor_;
  var newDirection = controls.ActivityIndicator.Direction_.DOWN;

  var previousTransition = this.lastTransition_;
  if (previousTransition) {
    lastColor = previousTransition.endColor;
    lastShadowColor = previousTransition.endShadowColor;
    newDirection = controls.ActivityIndicator.getNextDirection_(
        previousTransition.direction);
  }

  var state = this.status_.getState();

  // nextColor is the color of the next circle.
  // nextShadowColor is the color of the circle midway through the tranision
  var nextColor;
  var nextShadowColor;

  switch (state) {
    case controls.ActivityStatus.State.LOADING:
      var newColors = controls.ActivityIndicator.LOADING_COLOR_MAP_[newDirection];
      nextColor = newColors[0];
      nextShadowColor = newColors[1];
      break;
    case controls.ActivityStatus.State.NONE:
      nextColor = this.backgroundColor_;
      nextShadowColor = this.backgroundColor_;
      break;
    case controls.ActivityStatus.State.OFFLINE:
      nextColor = '#999';
      nextShadowColor = '#777';
      break;
    default:
      goog.asserts.fail('should not reach default case');
  }

  goog.asserts.assert(nextColor);
  goog.asserts.assert(nextShadowColor);

  return new controls.ActivityIndicator.CircleTransition_(
      state, newDirection,
      nextColor, lastColor,
      lastColor, lastShadowColor,
      nextColor, nextShadowColor,
      this.size_, this.getDomHelper());
};


/**
 * Give the next direction.
 * @param {controls.ActivityIndicator.Direction_} direction Current direction.
 * @return {controls.ActivityIndicator.Direction_} New direction.
 * @private
 */
controls.ActivityIndicator.getNextDirection_ = function(direction) {
  goog.asserts.assert(goog.array.contains(
      goog.object.getValues(controls.ActivityIndicator.Direction_),
      direction));

  var newDirection = (direction + 1) % 4;

  goog.asserts.assert(goog.array.contains(
      goog.object.getValues(controls.ActivityIndicator.Direction_),
      newDirection));

  return /** @type {controls.ActivityIndicator.Direction_} */ (newDirection);
};


/**
 * Map of loading transition direction to pairs of colors (regular and shadow).
 * @type {!Object.<controls.ActivityIndicator.Direction_,string>}
 * @private
 */
controls.ActivityIndicator.LOADING_COLOR_MAP_ = goog.object.create(
    controls.ActivityIndicator.Direction_.UP, ['#00B15F', '#008948'],  // green
    controls.ActivityIndicator.Direction_.RIGHT, ['#3C78F8', '#2159bd'], // blue
    controls.ActivityIndicator.Direction_.DOWN, ['#FA2424', '#9e1212'],  // red
    controls.ActivityIndicator.Direction_.LEFT, ['#FFD34B', '#dea11a'] // yellow
    );


/**
 * CSS class name for activity indicator.
 * @type {string}
 * @private
 */
controls.ActivityIndicator.CSS_NAME_ = goog.getCssName('controls-activityIndicator');


/**
 * The last played transition.
 * @type {controls.ActivityIndicator.CircleTransition_}
 * @private
 */
controls.ActivityIndicator.prototype.lastTransition_;


/**
 * Offline icon layer.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.prototype.iconLayer_;


/**
 * Content element.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.prototype.contentElement_;



/**
 * Component animating a folding circle.
 *
 * The transition is done with two CSS3 animations.  See notes in createDom().
 * @constructor
 * @extends {goog.ui.Component}
 * @private
 * @param {controls.ActivityStatus.State} state State for this transition.
 * @param {controls.ActivityIndicator.Direction_} direction Direction of animation.
 * @param {string} startBackgroundColor Background color for first circle.
 * @param {string} endBackgroundColor Background color for second circle.
 * @param {string} startColor Start color of first circle.
 * @param {string} startShadowColor Start shadow color of first circle.
 * @param {string} endColor End color of second circle.
 * @param {string} endShadowColor End shadow color of second circle.
 * @param {controls.ActivityIndicator.Size} size The size that dictates the circle
 *     diameter.
 * @param {goog.dom.DomHelper=} opt_domHelper Dom helper for this component.
 */
controls.ActivityIndicator.CircleTransition_ = function(state,
                                                   direction,
                                                   startBackgroundColor,
                                                   endBackgroundColor,
                                                   startColor,
                                                   startShadowColor,
                                                   endColor,
                                                   endShadowColor,
                                                   size,
                                                   opt_domHelper) {
  controls.ActivityIndicator.CircleTransition_.base(this,
      'constructor', opt_domHelper);

  /**
   * The state represented by this transition.
   * @type {controls.ActivityStatus.State}
   */

  this.state = state;

  /**
   * Whether the transition has completed.
   * @type {boolean}
   */
  this.complete = false;

  /**
   * Direction of the fold.
   * @type {controls.ActivityIndicator.Direction_}
   */
  this.direction = direction;

  /**
   * The color of the first background circle.
   * @type {string}
   */
  this.startBackgroundColor = startBackgroundColor;

  /**
   * The color of the second background circle.
   * @type {string}
   */
  this.endBackgroundColor = endBackgroundColor;

  /**
   * @type {string}
   */
  this.startColor = startColor;

  /**
   * @type {string}
   */
  this.startShadowColor = startShadowColor;

  /**
   * @type {string}
   */
  this.endColor = endColor;

  /**
   * @type {string}
   */
  this.endShadowColor = endShadowColor;

  /**
   * @type {number}
   * @private
   */
  this.circleDiameter_ = size == controls.ActivityIndicator.Size.SMALL ?
      controls.ActivityIndicator.CircleTransition_.CIRCLE_DIAMETER_SMALL_ :
      controls.ActivityIndicator.CircleTransition_.CIRCLE_DIAMETER_;
};
goog.inherits(controls.ActivityIndicator.CircleTransition_, goog.ui.Component);


/**
 * Transition events.
 * @enum {string}
 */
controls.ActivityIndicator.CircleTransition_.EventType = {
  COMPLETE: goog.events.getUniqueId('complete')
};


/**
 * Diameter of a normal circle.
 * Note that this must match the value in activityindicator.gss.
 * @type {number}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.CIRCLE_DIAMETER_ = 19;


/**
 * Diameter of a small circle.
 * Note that this must match the value in activityindicator.gss.
 * @type {number}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.CIRCLE_DIAMETER_SMALL_ = 16;


/**
 * @param {controls.ActivityIndicator.Direction_} direction
 *     Direction of animation.
 * @return {boolean} Whether the animation is in the vertical direction.
 * @private
 */
controls.ActivityIndicator.CircleTransition_.isVertical_ = function(direction) {
  return direction == controls.ActivityIndicator.Direction_.UP ||
         direction == controls.ActivityIndicator.Direction_.DOWN;
};


/**
 * @param {controls.ActivityIndicator.Direction_} direction
 *     Direction of animation.
 * @return {boolean} Whether the animation is in the horizontal direction.
 * @private
 */
controls.ActivityIndicator.CircleTransition_.isHorizontal_ = function(direction) {

  return direction == controls.ActivityIndicator.Direction_.LEFT ||
         direction == controls.ActivityIndicator.Direction_.RIGHT;
};


/** @override */
controls.ActivityIndicator.CircleTransition_.prototype.createDom = function() {
  controls.ActivityIndicator.CircleTransition_.base(this, 'createDom');
  var elem = this.getElement();
  var domHelper = this.getDomHelper();

  goog.dom.classlist.add(elem, goog.getCssName(controls.ActivityIndicator.CSS_NAME_,
      'circle-transition'));

  // The animation of a circle folding over is produced by two semi-circles
  // and two separate animations.

  // The semicircle is accomplished by putting a full circle (created with
  // border-width: %50) inside a cropping mask.

  // In the animation, the first semicircle goes from full width to zero
  // width, and then the second goes from zero to full.  The CSS transition
  // rules animate the transition.

  var maskClassName = goog.getCssName(controls.ActivityIndicator.CSS_NAME_, 'mask');
  var firstMask = domHelper.createDom(goog.dom.TagName.DIV, maskClassName);
  var secondMask = domHelper.createDom(goog.dom.TagName.DIV, maskClassName);

  goog.asserts.assert(elem);
  domHelper.append(elem, firstMask, secondMask);

  var circleClassName = goog.getCssName(controls.ActivityIndicator.CSS_NAME_,
                                        'circle');

  var firstBackgroundCircle =
      domHelper.createDom(goog.dom.TagName.DIV, circleClassName);
  domHelper.appendChild(firstMask, firstBackgroundCircle);
  goog.style.setStyle(firstBackgroundCircle, 'backgroundColor',
                      this.startBackgroundColor);

  var secondBackgroundCircle =
      domHelper.createDom(goog.dom.TagName.DIV, circleClassName);
  domHelper.appendChild(secondMask, secondBackgroundCircle);
  goog.style.setStyle(secondBackgroundCircle, 'backgroundColor',
                      this.endBackgroundColor);

  var firstCircle = domHelper.createDom(goog.dom.TagName.DIV, circleClassName);
  var secondCircle = domHelper.createDom(goog.dom.TagName.DIV, circleClassName);
  domHelper.appendChild(firstMask, firstCircle);
  domHelper.appendChild(secondMask, secondCircle);
  goog.style.setStyle(firstCircle, 'backgroundColor', this.startColor);
  goog.style.setStyle(secondCircle, 'backgroundColor', this.endShadowColor);

  this.firstCircle_ = firstCircle;
  this.secondCircle_ = secondCircle;
  this.firstBackgroundCircle_ = firstBackgroundCircle;
  this.secondBackgroundCircle_ = secondBackgroundCircle;

  this.firstMask_ = firstMask;
  this.secondMask_ = secondMask;

  this.setStartPositions_(this.direction);

  goog.dom.classlist.add(firstCircle,
      goog.getCssName(controls.ActivityIndicator.CSS_NAME_, 'transition'));
  goog.dom.classlist.add(secondCircle,
      goog.getCssName(controls.ActivityIndicator.CSS_NAME_, 'transition-second'));
};


/**
 * Set the starting positions for the animation.
 * @param {controls.ActivityIndicator.Direction_} direction Animation direction.
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.setStartPositions_ =
    function(direction) {

  // Precalculate styles so they needn't be inlined multiple times below.

  // Full circle diameter.
  var full = this.circleDiameter_ + 'px';

  // Half circle diameter.
  var half = Math.ceil(this.circleDiameter_ / 2) + 'px';

  // Negative half circle diameter.
  var minusHalf = '-' + half;

  switch (direction) {
    case controls.ActivityIndicator.Direction_.RIGHT:
      goog.style.setStyle(this.firstMask_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondMask_, {'left': half, 'top': 0});
      goog.style.setStyle(this.firstCircle_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondCircle_, {'width': 0, 'left': 0});
      goog.style.setStyle(this.firstBackgroundCircle_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondBackgroundCircle_, {'left': minusHalf});
      break;
    case controls.ActivityIndicator.Direction_.LEFT:
      goog.style.setStyle(this.firstMask_, {'left': half, 'top': 0});
      goog.style.setStyle(this.secondMask_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.firstCircle_, {'left': minusHalf, 'top': 0});
      goog.style.setStyle(this.secondCircle_, {'width': 0, 'left': half});
      goog.style.setStyle(this.firstBackgroundCircle_,
                          {'left': minusHalf, 'top': 0});
      break;
    case controls.ActivityIndicator.Direction_.UP:
      goog.style.setStyle(this.firstMask_, {'left': 0, 'top': half});
      goog.style.setStyle(this.secondMask_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.firstCircle_, {'left': 0, 'top': minusHalf});
      goog.style.setStyle(this.secondCircle_, {'top': half, 'height': 0});
      goog.style.setStyle(this.firstBackgroundCircle_,
                          {'left': 0, 'top': minusHalf});
      break;
    case controls.ActivityIndicator.Direction_.DOWN:
      goog.style.setStyle(this.firstMask_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondMask_, {'left': 0, 'top': half});
      goog.style.setStyle(this.firstCircle_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondCircle_, {'left': 0, 'height': 0});
      goog.style.setStyle(this.firstBackgroundCircle_, {'left': 0, 'top': 0});
      goog.style.setStyle(this.secondBackgroundCircle_, {'top': minusHalf});
      break;
    default:
      goog.asserts.fail('should not reach default case');
  }

  // Correctly size the masks.
  var maskStyles = controls.ActivityIndicator.CircleTransition_.isVertical_(
      this.direction) ? {'width': full, 'height': half} :
                        {'width': half, 'height': full};
  goog.style.setStyle(this.firstMask_, maskStyles);
  goog.style.setStyle(this.secondMask_, maskStyles);
};


/**
 * Set the ending positions for the animation.
 * @param {controls.ActivityIndicator.Direction_} direction Animation direction.
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.setEndPositions_ =
    function(direction) {
  // See notes on styles in createDom().
  var full = this.circleDiameter_ + 'px';
  var half = Math.ceil(this.circleDiameter_ / 2) + 'px';
  var minusHalf = '-' + half;

  switch (direction) {
    case controls.ActivityIndicator.Direction_.RIGHT:
      goog.style.setStyle(this.firstCircle_, {'width': 0, 'left': half});
      goog.style.setStyle(this.secondCircle_,
                          {'left': minusHalf, 'width': full});
      break;
    case controls.ActivityIndicator.Direction_.LEFT:
      goog.style.setStyle(this.firstCircle_, {'width': 0, 'left': 0});
      goog.style.setStyle(this.secondCircle_, {'width': full, 'left': 0});
      break;
    case controls.ActivityIndicator.Direction_.UP:
      goog.style.setStyle(this.firstCircle_, {'top': 0, 'height': 0});
      goog.style.setStyle(this.secondCircle_, {'top': 0, 'height': full});
      break;
    case controls.ActivityIndicator.Direction_.DOWN:
      goog.style.setStyle(this.firstCircle_, {'top': half, 'height': 0});
      goog.style.setStyle(this.secondCircle_,
                          {'top': minusHalf, 'height': full});
      break;
    default:
      goog.asserts.fail('should not reach default case');
  }
};


/**
 * Play the animation.
 */
controls.ActivityIndicator.CircleTransition_.prototype.play = function() {
  goog.asserts.assert(this.isInDocument(),
                      'Must be in document at this point.');

  // Gecko has a bug where the styles might not have been calculated
  // yet at this point, meaning that the transition may not occur when
  // new values are set. Calculating size forces Gecko to calculate styles
  // and ensures the transition occurs.
  if (goog.userAgent.GECKO) {
    goog.style.getSize(this.getElement());
  }

  this.started = true;

  goog.style.setStyle(this.firstCircle_, 'backgroundColor',
                      this.startShadowColor);
  goog.style.setStyle(this.secondCircle_, 'backgroundColor',
                      this.endColor);

  this.setEndPositions_(this.direction);

  var transitionEvents = ['webkitTransitionEnd', 'transitionend'];
  this.listenEventsOnce_(this.secondCircle_,
                         transitionEvents,
                         this.handleTransitionEnd_);
};


/**
 * Add multiple event listeners, but only call the handler for the first
 * that fires.
 * @param {EventTarget} target Event target.
 * @param {!Array.<string>} events Events to listen for.
 * @param {!Function} handler Handler function.
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.listenEventsOnce_ = function(
    target, events, handler) {
  var fired = false;
  var self = this;
  this.getHandler().listenOnce(target, events, function() {

    if (fired) {
      return;
    }

    fired = true;
    handler.call(self);
  });

};


/**
 * Called when the CSS transition ends.  Mark transition as complete,
 * dispatch COMPLETE event, and hide the hidden background circle (can bleed
 * through otherwise).
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.handleTransitionEnd_ =
    function() {
  this.complete = true;
  this.dispatchEvent(
      controls.ActivityIndicator.CircleTransition_.EventType.COMPLETE);
  goog.style.setElementShown(this.secondBackgroundCircle_, false);
};


/**
 * First circle of the animation.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.firstCircle_;


/**
 * Second circle of the animation.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.secondCircle_;


/**
 * Element that masks the first circle.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.firstMask_;


/**
 * Element that masks the second circle.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.secondMask_;


/**
 * First background circle.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.firstBackgroundCircle_;


/**
 * Second background circle.
 * @type {Element}
 * @private
 */
controls.ActivityIndicator.CircleTransition_.prototype.secondBackgroundCircle_;
