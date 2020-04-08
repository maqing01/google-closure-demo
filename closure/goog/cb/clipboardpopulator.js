

/**
 * @fileoverview A class that populates the AppClipboard with clips equivalent
 * to the current selection when a cut or copy event is received or when the
 * selection changes.


 */

goog.provide('office.clipboard.ClipboardPopulator');

goog.require('office.clipboard.MimeClipboard');
goog.require('office.controller.AppClipboard');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');



/**
 * A class that populates the AppClipboard with clips as necessary. Clients
 * supply a populator that generates clips from the current selection.
 * @param {!office.controller.AppClipboard} appClipboard The application
 *     clipboard.
 * @param {!office.clipboard.ClipboardContentProvider} clipboardContentProvider
 *     The application clipboard content provider.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.clipboard.ClipboardPopulator = function(
    appClipboard, clipboardContentProvider) {
  goog.base(this);

  /**
   * The application clipboard.
   * @type {!office.controller.AppClipboard}
   * @private
   */
  this.clipboard_ = appClipboard;

  /**
   * The application clipboard content provider.
   * @type {!office.clipboard.ClipboardContentProvider}
   * @private
   */
  this.clipboardContentProvider_ = clipboardContentProvider;

  /**
   * The event handler.
   * @type {!goog.events.EventHandler.<!office.clipboard.ClipboardPopulator>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  this.eventHandler_.
      listen(appClipboard,
          office.controller.AppClipboard.EventType.BEFORE_COPY,
          this.handleBeforeCopy_).
      listen(appClipboard,
          office.controller.AppClipboard.EventType.BEFORE_CUT,
          this.handleBeforeCut_);
};
goog.inherits(office.clipboard.ClipboardPopulator, goog.Disposable);


/**
 * Handles a before copy event from the application clipboard.
 * @param {!office.controller.AppClipboard.BeforeCopyEvent} e The event.
 * @private
 */
office.clipboard.ClipboardPopulator.prototype.handleBeforeCopy_ = function(e) {
  if (!e.copyExternalContent) {
    this.populateAppClipboard_();
  }
};


/**
 * Handles a before cut event from the application clipboard.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.clipboard.ClipboardPopulator.prototype.handleBeforeCut_ = function(e) {
  this.populateAppClipboard_();
};


/**
 * Populates the clipboard.
 * @private
 */
office.clipboard.ClipboardPopulator.prototype.populateAppClipboard_ = function() {
  var clips = this.clipboardContentProvider_.getClips();
  if (!clips.length) {
    return;
  }

  var handle = this.clipboard_.newClipHandle(
      office.clipboard.MimeClipboard.newGuid());
  for (var i = 0; i < clips.length; i++) {
    this.clipboard_.setClip(clips[i], handle);
  }
  this.clipboard_.finish(handle);
};


/** @override */
office.clipboard.ClipboardPopulator.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  delete this.clipboard_;

  goog.dispose(this.eventHandler_);
  delete this.eventHandler_;
};
