goog.provide('office.localstore.CommandQueue');

goog.require('office.localstore.DocumentPartId');
goog.require('office.localstore.LocalStorageCommandBatch');
goog.require('goog.Disposable');
goog.require('goog.log');



/**
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.localstore.CommandQueue = function() {
  goog.base(this);

  /**
   * Unwritten commands.
   * @type {!Array.<!office.localstore.LocalStorageCommandBatch>}
   * @private
   */
  this.unwrittenCommands_ = [];
};
goog.inherits(office.localstore.CommandQueue, goog.Disposable);


/**
 * Logger for office.localstore.CommandQueue.
 * @type {goog.log.Logger}
 * @private
 */
office.localstore.CommandQueue.prototype.logger_ =
    goog.log.getLogger('office.localstore.CommandQueue');


/**
 * Whether the current set of unwritten commands being held by this object
 * should overwrite any existing ones or add to them.
 * @type {boolean}
 * @private
 */
office.localstore.CommandQueue.prototype.shouldReplacePrevious_ = false;


/**
 * Adds some commands to this object.
 * @param {number} version The version number after this batch of changes is
 *     applied.
 * @param {number} chunkIndex Where this is a chunked batch of changes, the
 *     index number of a particular chunk.  For unchunked batches, this is just
 *     zero.
 * @param {?string} userName The name of the user responsible for the last write
 *     in this batch of commands.  For a chunked set, this may be indicative
 *     of the last command in the entire chunked batch.
 * @param {?number} timestamp The timestamp of the last command in the batch.
 *     For a chunked batch, this may be indicative of the last command in the
 *     entire chunked batch.
 * @param {!Array.<!office.commands.Command>} commands The commands to be
 *     stored.
 * @param {boolean=} opt_replace If this is true, all data for the current doc
 *     id will be deleted before this write is performed.
 */
office.localstore.CommandQueue.prototype.addCommands = function(version,
    chunkIndex, userName, timestamp, commands, opt_replace) {
  this.addBatch(office.localstore.LocalStorageCommandBatch.createCommandBatch(
      office.localstore.DocumentPartId.DEFAULT_PART_ID, version, chunkIndex,
      userName, timestamp, commands), opt_replace);
};


/**
 * Adds a batch of commands to this object.
 * @param {!office.localstore.LocalStorageCommandBatch} commandBatch The batch of
 *     commands to be stored.
 * @param {boolean=} opt_replace If this is true, all data for the current doc
 *     id will be deleted before this write is performed.
 */
office.localstore.CommandQueue.prototype.addBatch = function(commandBatch,
    opt_replace) {
  goog.log.info(this.logger_, 'addBatch() - local');
  if (opt_replace) {
    goog.log.info(this.logger_, 'addBatch() - replace');
    this.unwrittenCommands_ = [];
    this.shouldReplacePrevious_ = true;
  }
  this.unwrittenCommands_.push(commandBatch);
};


/**
 * Moves all the commands in this queue to another, leaving this queue empty.
 * @param {!office.localstore.CommandQueue} receivingQueue The queue to move the
 *     commands to.
 */
office.localstore.CommandQueue.prototype.moveCommandsTo = function(
    receivingQueue) {
  goog.log.info(this.logger_, 'moveCommandsTo()');

  // Pass the current contents on to the receiving queue.
  for (var i = 0; i < this.unwrittenCommands_.length; ++i) {
    receivingQueue.addBatch(this.unwrittenCommands_[i],
        this.shouldReplacePrevious_);
    this.shouldReplacePrevious_ = false;
  }
  this.unwrittenCommands_ = [];
};


/**
 * @return {boolean} Whether the unwritten commands currently being held by
 *     this object should entirely replace those currently in local storage.
 */
office.localstore.CommandQueue.prototype.shouldReplacePrevious = function() {
  return this.shouldReplacePrevious_;
};


/**
 * Returns and clears the unwritten command list being held by this document
 * object.
 * @return {!Array.<!office.localstore.LocalStorageCommandBatch>} The unwritten
 *     commands stored by this object.
 */
office.localstore.CommandQueue.prototype.getUnwrittenCommands =
    function() {
  var commands = this.unwrittenCommands_;
  this.unwrittenCommands_ = [];
  this.shouldReplacePrevious_ = false;
  return commands;
};


/**
 * @return {boolean} Whether the queue is empty.
 */
office.localstore.CommandQueue.prototype.isEmpty = function() {
  return this.unwrittenCommands_.length == 0;
};


/** @override */
office.localstore.CommandQueue.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  delete this.unwrittenCommands_;
};
