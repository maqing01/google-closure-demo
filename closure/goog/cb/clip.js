goog.provide('office.clipboard.Clip');



/**
 * Create a clip. A clip is an item on a clipboard, and it consists of actual
 * clip data, it's MIME type, and an optional handle used to address this clip
 * in the future.
 *
 * @param {string} mimeType The clip MIME type. The type name is case-sensitive,
 *     and should be lower case (e.g. 'text/plain').
 * @param {*} data The clip data. Null means there is no data
 *     corresponding to the MIME type and (optionally) clip handle of this clip.
 * @see {office.clipboard.MimeClipboard}
 * @constructor
 * @struct
 */
office.clipboard.Clip = function(mimeType, data) {

  /**
   * The MIME type.
   * @type {string}
   * @private
   */
  this.mimeType_ = mimeType;

  /**
   * The clip data.
   * @type {*}
   * @private
   */
  this.data_ = data;
};


/**
 * @return {string} The MIME type.
 */
office.clipboard.Clip.prototype.getMimeType = function() {
  return this.mimeType_;
};


/**
 * Get clip data. Null means there is no clip data.
 * @return {*} The clip data.
 */
office.clipboard.Clip.prototype.getData = function() {
  return this.data_;
};


/**
 * @return {boolean} Whether this clip has any data (data not null/undefined).
 */
office.clipboard.Clip.prototype.hasData = function() {
  return goog.isDefAndNotNull(this.data_);
};
