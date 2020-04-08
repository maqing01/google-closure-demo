goog.provide('office.app.ChunkQueueingStrategy');
goog.provide('office.app.ChunkQueueingStrategy.None');
goog.provide('office.app.ChunkQueueingStrategy.UntilIncrementalsApplied');



/**
 * @constructor
 * @struct
 */
office.app.ChunkQueueingStrategy = function() {};


/**
 * Whether any chunk has been applied.
 * @private {boolean}
 */
office.app.ChunkQueueingStrategy.prototype.hasAppliedModelChunk_ = false;


/**
 * Whether the model is loaded incrementally (as opposed to from a snapshot).
 * @private {?boolean}
 */
office.app.ChunkQueueingStrategy.prototype.incrementalLoad_ = null;


/**
 * Whether the pending queue is empty.
 * @private {?boolean}
 */
office.app.ChunkQueueingStrategy.prototype.pendingQueueIsEmpty_ = null;


/**
 * Whether the application is ready to apply the model chunks.
 * @private {boolean}
 */
office.app.ChunkQueueingStrategy.prototype.startModelApplication_ = false;


/**
 * @param {boolean} hasAppliedModelChunk Whether any chunk has been loaded.
 */
office.app.ChunkQueueingStrategy.prototype.setHasLoadedChunk =
    function(hasAppliedModelChunk) {
  this.hasAppliedModelChunk_ = hasAppliedModelChunk;
};


/**
 * @param {boolean} isEmpty Whether the pending queue is empty.
 */
office.app.ChunkQueueingStrategy.prototype.setPendingQueueIsEmpty =
    function(isEmpty) {
  this.pendingQueueIsEmpty_ = isEmpty;
};


/**
 * Notifies that application is ready to apply the model chunks.
 */
office.app.ChunkQueueingStrategy.prototype.setStartModelApplication = function() {
  this.startModelApplication_ = true;
};


/**
 * @param {boolean} incrementalLoad Whether the model is loaded incrementally.
 */
office.app.ChunkQueueingStrategy.prototype.setIncrementalLoad =
    function(incrementalLoad) {
  this.incrementalLoad_ = incrementalLoad;
};


/**
 * @return {boolean}
 * @protected
 */
office.app.ChunkQueueingStrategy.prototype.getHasLoadedChunk = function() {
  return this.hasAppliedModelChunk_;
};


/**
 * @return {?boolean}
 * @protected
 */
office.app.ChunkQueueingStrategy.prototype.getPendingQueueIsEmpty = function() {
  return this.pendingQueueIsEmpty_;
};


/**
 * @return {boolean}
 * @protected
 */
office.app.ChunkQueueingStrategy.prototype.getStartModelApplication = function() {
  return this.startModelApplication_;
};


/**
 * @return {?boolean}
 * @protected
 */
office.app.ChunkQueueingStrategy.prototype.getIncrementalLoad = function() {
  return this.incrementalLoad_;
};


/**
 * Determines whether to queue a chunk based on this strategy.
 * @return {boolean} Whether model chunks should be queued.
 */
office.app.ChunkQueueingStrategy.prototype.shouldQueueChunk =
    goog.abstractMethod;



/**
 * @constructor
 * @struct
 * @extends {office.app.ChunkQueueingStrategy}
 */
office.app.ChunkQueueingStrategy.None = function() {
  goog.base(this);
};
goog.inherits(office.app.ChunkQueueingStrategy.None,
    office.app.ChunkQueueingStrategy);


/** @override */
office.app.ChunkQueueingStrategy.None.prototype.shouldQueueChunk = function() {
  return false;
};



/**
 * This strategy queues all model chunks until the application is ready to apply
 * them, the pending queue is set and there is no incrementals and/or pending
 * commands.
 * @param {boolean=} opt_shouldApplyFirstChunk Whether the first model chunk
 *     should be applied, instead of queued.
 * @constructor
 * @struct
 * @extends {office.app.ChunkQueueingStrategy}
 */
office.app.ChunkQueueingStrategy.UntilIncrementalsApplied =
    function(opt_shouldApplyFirstChunk) {
  goog.base(this);

  /**
   * Whether the first model chunk should be applied, instead of queued.
   * @type {boolean}
   * @private
   */
  this.shouldApplyFirstChunk_ = !!opt_shouldApplyFirstChunk;
};
goog.inherits(office.app.ChunkQueueingStrategy.UntilIncrementalsApplied,
    office.app.ChunkQueueingStrategy);


/** @override */
office.app.ChunkQueueingStrategy.UntilIncrementalsApplied.prototype.shouldQueueChunk = function() {
  if (goog.isDefAndNotNull(this.getIncrementalLoad()) &&
      !this.getIncrementalLoad() && this.getPendingQueueIsEmpty() &&
      this.getStartModelApplication()) {
    return false;
  }
  return !this.shouldApplyFirstChunk_ || this.getHasLoadedChunk();
};
