goog.provide('office.app.NoOpModelRenderObserver');

goog.require('office.app.ModelRenderObserver');



/**
 * A no-op implementation for observing model render.
 * @constructor
 * @implements {office.app.ModelRenderObserver}
 * @struct
 * @final
 */
office.app.NoOpModelRenderObserver = function() {
  /**
   * The number of times {@code #notifyBeforeRender} has been called.
   * @private {number}
   */
  this.numTimesCalled_ = 0;
};


/** @override */
office.app.NoOpModelRenderObserver.prototype.notifyBeforeRender = function() {
  this.numTimesCalled_++;
};


/**
 * @return {number} The number of times {@code #notifyBeforeRender} was called.
 */
office.app.NoOpModelRenderObserver.prototype.numNotifyBeforeRenderDebugDebug =
    function() {
  return this.numTimesCalled_;
};
