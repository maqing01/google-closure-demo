goog.provide('office.controller.FocusManager');
goog.provide('office.controller.FocusManager.StateChangeEvent');

goog.require('office.controller.ServiceId');
goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.log');



/**
 * @constructor
 * @struct
 * @extends {goog.events.EventTarget}
 */
office.controller.FocusManager = function() {
  goog.base(this);

  /** @private {?office.controller.FocusState} */
  this.state_ = null;

  /**
   * The reason for which the current state has been set as sticky.
   * @private {?string}
   */
  this.stickyReason_ = null;
};
goog.inherits(office.controller.FocusManager, goog.events.EventTarget);


/**
 * Events dispatched by the focus manager.
 * @enum {string}
 */
office.controller.FocusManager.EventType = {
  STATE_CHANGE: goog.events.getUniqueId('stateChange')
};


/** @protected {goog.log.Logger} */
office.controller.FocusManager.prototype.logger =
    goog.log.getLogger('office.controller.FocusManager');


/**
 * Sets the focus state. Depending on state (current focus state, dialog open,
 * etc), the resultant state might not be set. For example, if a dialog is open
 * and the state is set to office.controller.FocusState.EDITOR, the new state will
 * be ignored and the editor will not be focused.
 * @param {office.controller.FocusState} state The new focus state.
 * @param {string=} opt_reason If given, the state will be set as "sticky", and
 *     all subsequent state changes will be ignored until clearReason() is
 *     called with the same reason.
 */
office.controller.FocusManager.prototype.setState = function(
    state, opt_reason) {
  goog.log.info(this.logger, 'setState(' + state + ')');
  if (this.setStateInternal(state, opt_reason)) {
    this.dispatchStateChangeEvent();
  }
};


/**
 * Sets the focus state, unless prevented by an existing sticky reason or
 * because the state is unchanged. Does not dispatch a state change event.
 * @param {office.controller.FocusState} state The new focus state.
 * @param {string=} opt_reason If given, the state will be set as "sticky", and
 *     all subsequent state changes will be ignored until clearReason() is
 *     called with the same reason.
 * @return {boolean} Whether the focus state was changed.
 * @protected
 */
office.controller.FocusManager.prototype.setStateInternal = function(
    state, opt_reason) {
  if (this.stickyReason_) {
    goog.log.info(this.logger, 'Cannot change state to "' + state +
        '" while current state is sticky due to reason "' + this.stickyReason_ +
        '".');
    return false;
  }

  if (opt_reason) {
    goog.log.info(
        this.logger, 'State change sticky due to reason "' + opt_reason + '"');
    this.stickyReason_ = opt_reason;
  }

  if (this.state_ == state) {
    return false;
  }
  this.state_ = state;
  return true;
};


/** @return {?office.controller.FocusState} The current focus state. */
office.controller.FocusManager.prototype.getState = function() {
  return this.state_;
};


/**
 * Clears the sticky state of the manager. The reason given must be the same one
 * passed to setState() when setting it. Optionally changes to a different state
 * after clearing.
 * @param {string} reason The reason for which current state was set as sticky.
 * @param {office.controller.FocusState=} opt_state A new state to switch to after
 *     clearing.
 */
office.controller.FocusManager.prototype.clearReason = function(reason,
    opt_state) {
  if (this.stickyReason_ != reason) {
    goog.log.info(this.logger, 'Cannot clear sticky reason "' + reason +
        '", current reason is "' + this.stickyReason_ + '"');
    if (!goog.isNull(this.stickyReason_)) {
      return;
    }
  }

  this.stickyReason_ = null;
  if (goog.isDef(opt_state)) {
    this.setState(opt_state);
  }
};


/**
 * Forcefully clears the reason for which the manager has been put into sticky
 * mode.
 */
office.controller.FocusManager.prototype.forceClearReason = function() {
  if (!goog.isNull(this.stickyReason_)) {
    goog.log.info(this.logger,
        'forceClearReason called when in sticky mode due to "' +
            this.stickyReason_ + '". This should not happen.');
    this.stickyReason_ = null;
  }
};


/** @protected */
office.controller.FocusManager.prototype.dispatchStateChangeEvent = function() {
  goog.log.info(this.logger, 'Dispatching focus state event: ' + this.state_);
  this.dispatchEvent(new office.controller.FocusManager.StateChangeEvent(
      this, goog.asserts.assert(this.state_)));
};


/**
 * @param {!fava.AppContext} appContext The app context.
 * @return {!office.controller.FocusManager} The focus manager in the app context.
 */
office.controller.FocusManager.get = function(appContext) {
  return /** @type {!office.controller.FocusManager} */ (
      appContext.get(office.controller.ServiceId.FOCUS_MANAGER));
};



/**
 * A focus state change event.
 * @param {!Object} target The object that fired this event.
 * @param {office.controller.FocusState} state The new focus state.
 * @constructor
 * @struct
 * @extends {goog.events.Event}
 */
office.controller.FocusManager.StateChangeEvent = function(target, state) {
  goog.base(this, office.controller.FocusManager.EventType.STATE_CHANGE, target);

  /**
   * The new focus state.
   * @type {office.controller.FocusState}
   */
  this.state = state;
};
goog.inherits(office.controller.FocusManager.StateChangeEvent, goog.events.Event);
