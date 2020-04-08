

/**
 * @fileoverview A batch of commands and associated metadata.

 */

goog.provide('office.localstore.LocalStorageCommandBatch');

goog.require('office.storage.StorageMessage');



/**
 * Holds a set of commands and associated metadata in the form of a storage
 * message, part id and a chunk index.
 * @param {!office.storage.StorageMessage} storageMessage The storage message.
 * @param {!office.localstore.DocumentPartId} partId The part this batch belongs
 *     to.
 * @param {number=} opt_chunkIndex The chunk index this represents, if not
 *     zero.
 * @constructor
 * @struct
 */
office.localstore.LocalStorageCommandBatch = function(
    storageMessage, partId, opt_chunkIndex) {
  /**
   * The storage message which holds the comands and associated metadata.
   * @type {!office.storage.StorageMessage}
   * @private
   */
  this.storageMessage_ = storageMessage;

  /**
   * The id of the document part this batch belongs to.
   * @type {!office.localstore.DocumentPartId}
   * @private
   */
  this.partId_ = partId;

  /**
   * Where this is a chunked batch of changes, the index number of a particular
   * chunk. For unchunked batches, this is just zero.
   * @type {number}
   * @private
   */
  this.chunkIndex_ = opt_chunkIndex || 0;
};


/**
 * @return {!office.localstore.DocumentPartId} The id of the document part this
 *     batch belongs to.
 */
office.localstore.LocalStorageCommandBatch.prototype.getPartId = function() {
  return this.partId_;
};


/**
 * @return {number} The revision number after this batch of changes is applied.
 */
office.localstore.LocalStorageCommandBatch.prototype.getRevision = function() {
  return this.storageMessage_.getEndRevision();
};


/**
 * @return {number} Where this is a chunked batch of changes, the index number
 *     of a particular chunk. For unchunked batches, this is just zero.
 */
office.localstore.LocalStorageCommandBatch.prototype.getChunkIndex = function() {
  return this.chunkIndex_;
};


/**
 * @return {?string} The name of the user responsible for the last write in this
 *     batch of commands. For a chunked set, this may be indicative of the
 *     last command in the entire chunked batch.
 */
office.localstore.LocalStorageCommandBatch.prototype.getUserName = function() {
  return this.storageMessage_.getUserId();
};


/**
 * @return {?number} The timestamp of the last command in the batch. For a
 *     chunked batch, this may be indicative of the last command in the entire
 *     chunked batch.
 */
office.localstore.LocalStorageCommandBatch.prototype.getTimestamp = function() {
  return this.storageMessage_.getTimeMs();
};


/**
 * @return {!Array.<!office.commands.Command>} The commands to be stored.
 */
office.localstore.LocalStorageCommandBatch.prototype.getCommands = function() {
  var commands = this.storageMessage_.getCommands();
  if (!commands) {
    throw Error('Local storage command batch contained no commands.');
  }
  return commands;
};


/**
 * Factory method to create a LocalStorageCommandBatch.
 * @param {!office.localstore.DocumentPartId} partId The part this batch belongs
 *     to.
 * @param {number} revision The revision number after this batch of changes is
 *     applied.
 * @param {number} chunkIndex Where this is a chunked batch of changes, the
 *     index number of a particular chunk. For unchunked batches, this is just
 *     zero.
 * @param {?string} userName The name of the user responsible for the last write
 *     in this batch of commands.  For a chunked set, this may be indicative
 *     of the last commmand in the entire chunked batch.
 * @param {?number} timestamp The timestamp of the last command in the batch.
 *     For a chunked batch, this may be indicative of the last command in the
 *     entire chunked batch.
 * @param {!Array.<!office.commands.Command>} commands The commands to be stored.
 * @return {!office.localstore.LocalStorageCommandBatch} The command batch.
 */
office.localstore.LocalStorageCommandBatch.createCommandBatch = function(partId,
    revision, chunkIndex, userName, timestamp, commands) {
  return new office.localstore.LocalStorageCommandBatch(
      new office.storage.StorageMessage(commands, null /* selection */, timestamp,
          userName, revision, revision, null /* sid */,
          null /* effectiveSid */),
      partId, chunkIndex);
};
