// Copyright 2011 Google. All Rights Reserved.

/**
 * @fileoverview Status state for Kennedy.

 */

goog.provide('controls.ActivityStatus');
goog.provide('controls.ActivityStatus.State');

goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');



/**
 * Observable status object.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
controls.ActivityStatus = function() {
  controls.ActivityStatus.base(this, 'constructor');

  /**
   * Currently displayed state.
   * @type {controls.ActivityStatus.State}
   * @private
   */
  this.state_ = controls.ActivityStatus.State.NONE;
};
goog.inherits(controls.ActivityStatus, goog.events.EventTarget);


/**
 * Possible states.
 * @enum {string}
 */
controls.ActivityStatus.State = {
  LOADING: goog.events.getUniqueId('loading'),
  NONE: goog.events.getUniqueId('none'),
  OFFLINE: goog.events.getUniqueId('offline')
};


/**
 * Set a new state.
 * @param {controls.ActivityStatus.State} state New state.
 */
controls.ActivityStatus.prototype.setState = function(state) {
  if (this.state_ != state) {
    this.state_ = state;
    this.dispatchEvent(goog.events.EventType.CHANGE);
  }
};


/**
 * Get the current state.
 * @return {controls.ActivityStatus.State} The current state.
 */
controls.ActivityStatus.prototype.getState = function() {
  return this.state_;
};
