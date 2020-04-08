
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
 * @fileoverview An abstraction around some common window properties. The
 * primary motivation is to make it easier for apps to live in an iframe. The
 * application should use the static methods of this class. To override the
 * basic behavior with a WindowHelper implementation define USE_INSTANCE to true
 * and use the setInstance method as early as possible.
 */

goog.provide('wireless.WindowHelper');

goog.require('goog.asserts');



/**
 * The WindowHelper provides access to various properties such as scroll
 * position and viewport dimensions. There should only be a single implementing
 * class.
 * @interface
 */
wireless.WindowHelper = function() {};


/**
 * @define {boolean} Whether the application intends to set a WindowHelper
 * instance. Otherwise the static methods will provide basic functionality.
 */
wireless.WindowHelper.USE_INSTANCE = false;


/**
 * The singleton instance.
 * @type {wireless.WindowHelper}
 * @private
 */
wireless.WindowHelper.instance_;


/**
 * Flags that setInstance should throw an error because a method has already
 * been used with the basic implementation.
 * @type {boolean}
 * @private
 */
wireless.WindowHelper.canNotSetInstance_ = false;


/**
 * Returns whether the instance should be used or the basic behavior.
 * This method should compile out completely with the correct function inlining
 * and code removal optimization.
 * @private
 * @return {boolean} True if the method should delegate to instance_.
 */
wireless.WindowHelper.useInstance_ = function() {
  if (COMPILED) {
    if (wireless.WindowHelper.USE_INSTANCE) {
      goog.asserts.assert(wireless.WindowHelper.instance_,
                          'There is no WindowHelper instance.');
      return true;
    } else {
      return false;
    }
  } else {
    if (wireless.WindowHelper.instance_) {
      return true;
    } else {
      wireless.WindowHelper.canNotSetInstance_ = true;
      return false;
    }
  }
};


/**
 * Sets the singleton instance. It can only be set once.
 * @param {wireless.WindowHelper} windowHelper The instance to use.
 */
wireless.WindowHelper.setInstance = function(windowHelper) {
  if (COMPILED) {
    goog.asserts.assert(wireless.WindowHelper.USE_INSTANCE,
                        'USE_INSTANCE must be set to true.');
    goog.asserts.assert(!wireless.WindowHelper.instance_,
                        'WindowHelper instance has already been set.');
  } else {
    goog.asserts.assert(!wireless.WindowHelper.canNotSetInstance_,
                        'WindowHelper has already been used.' +
                        ' Call setInstance earlier.');
  }
  wireless.WindowHelper.instance_ = windowHelper;
};


/**
 * Gets the horizontal scroll position of the window.
 * @return {number} The horizontal scroll position.
 */
wireless.WindowHelper.prototype.getScrollX = goog.abstractMethod;


/**
 * Gets the vertical scroll position of the window.
 * @return {number} The vertical scroll position.
 */
wireless.WindowHelper.prototype.getScrollY = goog.abstractMethod;


/**
 * Gets the width of the viewable area in the browser.
 * @return {number} The viewport width.
 */
wireless.WindowHelper.prototype.getViewportWidth = goog.abstractMethod;


/**
 * Gets the height of the viewable area in the browser.
 * @return {number} The viewport height.
 */
wireless.WindowHelper.prototype.getViewportHeight = goog.abstractMethod;


/**
 * Adds a listener for scroll events. This method is idempotent when called with
 * the same listener. So a listener that is added multiple times will not be
 * called multiple times on a scroll event and will only require one call to
 * remove the listener.
 * @param {Function} listener The scroll listener to add.
 */
wireless.WindowHelper.prototype.addScrollListener = goog.abstractMethod;


/**
 * Removes a listener for scroll events.
 * @param {Function} listener The scroll listener to remove.
 */
wireless.WindowHelper.prototype.removeScrollListener = goog.abstractMethod;


/**
 * Adds a listener for resize events (Such as orientation changes). This method
 * is idempotent when called with the same listener, similar to
 * addScrollListener.
 * @param {Function} listener The resize listener to add.
 */
wireless.WindowHelper.prototype.addResizeListener = goog.abstractMethod;


/**
 * Removes a listener for resize events.
 * @param {Function} listener The resize listener to remove.
 */
wireless.WindowHelper.prototype.removeResizeListener = goog.abstractMethod;


/**
 * Scrolls the window to the specified X and Y position.
 * Named differently from scrollTo so that the jsCompiler will obfuscate the
 * name.
 * @param {number} xPos The X position to scroll to.
 * @param {number} yPos The Y position to scroll to.
 */
wireless.WindowHelper.prototype.scrollToPosition = goog.abstractMethod;


/**
 * Gets the horizontal scroll position of the window.
 * @return {number} The horizontal scroll position.
 */
wireless.WindowHelper.getScrollX = function() {
  if (wireless.WindowHelper.useInstance_()) {
    return wireless.WindowHelper.instance_.getScrollX();
  } else {
    return window.pageXOffset;
  }
};


/**
 * Gets the vertical scroll position of the window.
 * @return {number} The vertical scroll position.
 */
wireless.WindowHelper.getScrollY = function() {
  if (wireless.WindowHelper.useInstance_()) {
    return wireless.WindowHelper.instance_.getScrollY();
  } else {
    return window.pageYOffset;
  }
};


/**
 * Gets the width of the viewable area in the browser.
 * @return {number} The viewport width.
 */
wireless.WindowHelper.getViewportWidth = function() {
  if (wireless.WindowHelper.useInstance_()) {
    return wireless.WindowHelper.instance_.getViewportWidth();
  } else {
    return window.innerWidth;
  }
};


/**
 * Gets the height of the viewable area in the browser.
 * @return {number} The viewport height.
 */
wireless.WindowHelper.getViewportHeight = function() {
  if (wireless.WindowHelper.useInstance_()) {
    return wireless.WindowHelper.instance_.getViewportHeight();
  } else {
    return window.innerHeight;
  }
};


/**
 * Adds a listener for scroll events. This method is idempotent when called with
 * the same listener. So a listener that is added multiple times should not be
 * called multiple times on a scroll event and should only require one call to
 * remove the listener.
 * @param {Function} listener The scroll listener to add.
 */
wireless.WindowHelper.addScrollListener = function(listener) {
  if (wireless.WindowHelper.useInstance_()) {
    wireless.WindowHelper.instance_.addScrollListener(listener);
  } else {
    window.addEventListener('scroll', listener, false);
  }
};


/**
 * Removes a listener for scroll events.
 * @param {Function} listener The scroll listener to remove.
 */
wireless.WindowHelper.removeScrollListener = function(listener) {
  if (wireless.WindowHelper.useInstance_()) {
    wireless.WindowHelper.instance_.removeScrollListener(listener);
  } else {
    window.removeEventListener('scroll', listener, false);
  }
};


/**
 * Adds a listener for resize events (Such as orientation changes). This method
 * is idempotent when called with the same listener, similarly to
 * addScrollListener.
 * @param {Function} listener The resize listener to add.
 */
wireless.WindowHelper.addResizeListener = function(listener) {
  if (wireless.WindowHelper.useInstance_()) {
    wireless.WindowHelper.instance_.addResizeListener(listener);
  } else {
    window.addEventListener('resize', listener, false);
  }
};


/**
 * Removes a listener for resize events.
 * @param {Function} listener The resize listener to remove.
 */
wireless.WindowHelper.removeResizeListener = function(listener) {
  if (wireless.WindowHelper.useInstance_()) {
    wireless.WindowHelper.instance_.removeResizeListener(listener);
  } else {
    window.removeEventListener('resize', listener, false);
  }
};


/**
 * Scrolls the window to the specified X and Y position.
 * @param {number} xPos The X position to scroll to.
 * @param {number} yPos The Y position to scroll to.
 */
wireless.WindowHelper.scrollToPosition = function(xPos, yPos) {
  if (wireless.WindowHelper.useInstance_()) {
    wireless.WindowHelper.instance_.scrollToPosition(xPos, yPos);
  } else {
    window.scrollTo(xPos, yPos);
  }
};
