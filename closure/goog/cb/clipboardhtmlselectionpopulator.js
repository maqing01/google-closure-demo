goog.provide('office.clipboard.ClipboardHtmlSelectionPopulator');

goog.require('office.clipboard.Clip');
goog.require('office.clipboard.MimeClipboard');
goog.require('office.clipboard.MimeType');
goog.require('office.controller.AppClipboard');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');
goog.require('goog.userAgent');



/**
 * A class that populates the AppClipboard with HTML equivalent to the
 * current selection when the selection changes.  Clients supply a function that
 * generates the current selection as HTML and invoke the updateSelection method
 * whenever the selection state changes.
 * @param {!office.controller.AppClipboard} appClipboard The application
 *     clipboard.
 * @param {!office.clipboard.ClipboardContentProvider} clipboardContentProvider
 *     The application clipboard content provider.
 * @constructor
 * @struct
 * @final
 * @extends {goog.Disposable}
 */
office.clipboard.ClipboardHtmlSelectionPopulator = function(
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
   * @private {!goog.events.EventHandler.<
   *     !office.clipboard.ClipboardHtmlSelectionPopulator>}
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.eventHandler_.
      listen(appClipboard,
          office.controller.AppClipboard.EventType.BEFORE_PASTE,
          this.handleBeforePaste_);
  this.registerDisposable(this.eventHandler_);

  /**
   * The GUID for the logical clip last written due to selection update.
   * Initialized with a random guid to ensure a clip is always written on the
   * initial call to updateSelection.
   * @type {?string}
   * @private
   */
  this.currentGuid_ = office.clipboard.MimeClipboard.newGuid();

  /**
   * The GUID for the logical clip previously written due to selection update.
   * @type {?string}
   * @private
   */
  this.previousGuid_ = null;
};
goog.inherits(office.clipboard.ClipboardHtmlSelectionPopulator, goog.Disposable);


/**
 * The minimal HTML that can be placed on the clipboard and still be selectable
 * and recognized as being internally generated. Many browsers won't send
 * cut/copy events unless the html clip has something in its body, and this
 * selection serves this purpose.
 * @type {string}
 */
office.clipboard.ClipboardHtmlSelectionPopulator.MINIMAL_SELECTION =
    '<span>&nbsp;</span>';


/**
 * The default value for optimizeCopy_.  This constant is used for
 * initialization and to restore its initial value during testing.
 * @type {boolean}
 * @private
 */
office.clipboard.ClipboardHtmlSelectionPopulator.OPTIMIZE_COPY_ =
    !goog.userAgent.LINUX;


/**
 * GUID for the minimal selection.
 * @type {string}
 * @private
 */
office.clipboard.ClipboardHtmlSelectionPopulator.MINIMAL_SELECTION_GUID_ =
    office.clipboard.MimeClipboard.newGuid();


/**
 * There is no event for middle-click copies originating from the browser. The
 * only way for copying using middle-click pastes to work is for the text event
 * target element to be constantly populated and selected. This is hugely
 * inefficient, especially for larger selections and is therefore only enabled
 * on Linux.
 * NOTE: This is not a constant to facilitate changing this value in tests. The
 * value should not be modified during runtime.
 *  Make this a constant and remove the setOptimizeCopyDebugDebug
 * function after webdriver is running on more platforms.
 * @type {boolean}
 * @private
 */
office.clipboard.ClipboardHtmlSelectionPopulator.optimizeCopy_ =
    office.clipboard.ClipboardHtmlSelectionPopulator.OPTIMIZE_COPY_;


/**
 * Reinitializes whether to optimize copying. Used only for tests, it is not
 * safe to call this method at runtime otherwise.
 */
office.clipboard.ClipboardHtmlSelectionPopulator.
    initializeOptimizeCopyDebugDebug = function() {
  office.clipboard.ClipboardHtmlSelectionPopulator.optimizeCopy_ =
      office.clipboard.ClipboardHtmlSelectionPopulator.OPTIMIZE_COPY_;
};


/**
 * Sets whether to optimize the copy. Used only for tests, it is not safe to
 * change this value at runtime otherwise.
 * @param {boolean} optimize Whether to optimize copy.
 */
office.clipboard.ClipboardHtmlSelectionPopulator.setOptimizeCopyDebugDebug =
    function(optimize) {
  office.clipboard.ClipboardHtmlSelectionPopulator.optimizeCopy_ = optimize;
};


/**
 * Handles a before paste event from the application clipboard.
 * @param {goog.events.Event} e The event.
 * @private
 */
office.clipboard.ClipboardHtmlSelectionPopulator.prototype.handleBeforePaste_ =
    function(e) {
  // Before paste, we reset the selection state.  The paste will change the
  // state of the application clipboard - populating it with the current system
  // clipboard contents and clearing the text selection.  Thus there should no
  // longer be a selection.  Any new selection that occurs during the paste
  // event will get a chance to reset this value.
  this.currentGuid_ = null;
};


/**
 * Updates the currently selected HTML.  This should be called whenever the text
 * selection changes to ensure that the application clipboard is prepared for
 * copy and cut events.
 * @param {boolean} hasSelectedRange Whether the current selection is a range.
 */
office.clipboard.ClipboardHtmlSelectionPopulator.prototype.updateSelection =
    function(hasSelectedRange) {
  this.previousGuid_ = this.currentGuid_;
  var htmlClip = null;
  var guid;
  // With screen reader and Braille support enabled, always generate the HTML
  // for the clipboard regardless of selection in order to provide the context.
  if (!hasSelectedRange) {
    // No range. Empty selection and no guid.
    // Note: Will also cause the browser's cut/copy menu to be disabled.
    htmlClip =
        new office.clipboard.Clip(office.clipboard.MimeType.DOCS_HTML_CLIP, '');
    guid = null;
  } else if (office.clipboard.ClipboardHtmlSelectionPopulator.optimizeCopy_) {
    // New range in optimized copy mode. Use selection surrogate HTML.
    // Many browsers won't send cut/copy events unless the text event target
    // iframe has something in its body.
    htmlClip = new office.clipboard.Clip(office.clipboard.MimeType.DOCS_HTML_CLIP,
        office.clipboard.ClipboardHtmlSelectionPopulator.MINIMAL_SELECTION);
    guid =
        office.clipboard.ClipboardHtmlSelectionPopulator.MINIMAL_SELECTION_GUID_;
  } else {
    // New range in unoptimized copy mode.
    htmlClip = this.clipboardContentProvider_.getHtmlClip();
    guid = office.clipboard.MimeClipboard.newGuid();
  }
  if (this.previousGuid_ != guid && htmlClip != null) {
    var handle = guid ?
        this.clipboard_.newClipHandle(guid) :
        this.clipboard_.newClipHandle();
    this.clipboard_.setClip(htmlClip);
    this.clipboard_.finish(handle);
  }
  this.currentGuid_ = guid;
};
