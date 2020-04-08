

/**
 * @fileoverview An extension of the BaseUploader which uses a Flash based
 * upload mechanism. See:
 *
 * @author wescarr@google.com (Wes Carr)
 */

goog.provide('apps.uploader.FlashUploader');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.FileEvent');
goog.require('apps.uploader.FileListEvent');
goog.require('apps.uploader.FilePreviewEvent');
goog.require('apps.uploader.FlashFileInfo2');
goog.require('apps.uploader.UploaderEvent');
goog.require('apps.uploader.net.FlashFileIo');
goog.require('apps.uploader.ui.EventType');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.dom.safe');
goog.require('goog.events.Event');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.SafeUrl');
goog.require('goog.iter');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('goog.style');
goog.require('goog.userAgent');
goog.require('goog.userAgent.flash');



/**
 * Creates a new FlashUploader object.
 * @constructor
 * @extends {apps.uploader.BaseUploader}
 */
apps.uploader.FlashUploader = function() {
  apps.uploader.BaseUploader.call(this);

  /**
   * Maintains a mapping of Flash elements to their respective overlay targets.
   * @type {!goog.structs.Map.<string,Element>}
   * @private
   */
  this.overlayElements_ = new goog.structs.Map();

  /**
   * Maintains a mapping of overlay elements to their respective Flash IDs.
   * @type {!goog.structs.Map.<number,string>}
   * @private
   */
  this.flashIdsByOverlayElement_ = new goog.structs.Map();

  /**
   * Maintains a mapping of Flash file Id's to
   * {@link apps.uploader.net.FlashFileIo}s.
   * @type {!goog.structs.Map.<string,apps.uploader.net.FlashFileIo>}
   * @private
   */
  this.fileIoByFlashId_ = new goog.structs.Map();

  /**
   * Maintains a mapping of Flash file Id's to
   * {@link apps.uploader.File}s.
   * @type {!goog.structs.Map.<string,apps.uploader.File>}
   * @private
   */
  this.fileByFlashId_ = new goog.structs.Map();

  /**
   * Stores whether or not Flash elements are ready.
   * @type {!goog.structs.Map.<string,boolean>}
   * @private
   */
  this.flashReadyById_ = new goog.structs.Map();

  /**
   * Stores the set of files currently generating a preview. Needed to queue
   * upload requests since the operations are not allowed to overlap.
   * @type {!goog.structs.Set.<string>}
   * @private
   */
  this.previewingInProgress_ = new goog.structs.Set();

  /**
   * Stores the set of files queued for upload because they are waiting for a
   * preview operation to finish.
   * @type {!goog.structs.Set.<string>}
   * @private
   */
  this.queuedPreviews_ = new goog.structs.Set();

  /**
   * List of flash IDs that need to be removed from the DOM.
   * @type {!Array.<string>}
   * @private
   */
  this.flashIdsToRemove_ = [];
};
goog.inherits(apps.uploader.FlashUploader, apps.uploader.BaseUploader);


/**
 * URL to the Flash API swf file.
 * @type {string}
 * @private
 */
apps.uploader.FlashUploader.flashApiSwfUrl_ = 'static/uploaderapi.swf';


/**
 * Prefix to be used for Flash instance Ids.
 * @type {string}
 * @private
 */
apps.uploader.FlashUploader.FLASH_API_PREFIX_ = 'FLASH_UPLOADER_';


/**
 * The flash overlay's hidden CSS class name.
 * @type {string}
 * @private
 */
apps.uploader.FlashUploader.OVERLAY_HIDDEN_CLASS_NAME_ =
    'uploader-overlay-hidden';


/**
 * Counter for Flash instance Ids
 * @type {number}
 * @private
 */
apps.uploader.FlashUploader.flashApiCount_ = 1;


/**
 * @type {goog.structs.Map.<Function>}
 * @private
 */
apps.uploader.FlashUploader.flashApiReadyCallbacks_ = new goog.structs.Map();


/**
 * The initial Flash API instance id created by the uploader.
 * @type {string}
 * @private
 */
apps.uploader.FlashUploader.prototype.initialFlashId_ = '';


/**
 * A flag indicating whether to replace not queued files before adding new
 * ones in {@link #onFilesSelected_}.
 * @type {boolean}
 * @private
 */
apps.uploader.FlashUploader.prototype.replaceFilesOnSelect_ = false;


/**
 * Additional flash vars to be set on the flash object.
 * @type {string|undefined}
 * @private
 */
apps.uploader.FlashUploader.prototype.flashVars_;


/**
 * Whether or not the flash swf is visible (windowed) or transparent.
 * @type {boolean}
 * @private
 */
apps.uploader.FlashUploader.prototype.flashIsVisible_ = false;


// ----------------------------------------------------------------------------
// Public Methods - Get and set options.
// ----------------------------------------------------------------------------


/**
 * Sets the URL to use for the Flash API SWF file.
 * @param {string} url The url.
 */
apps.uploader.FlashUploader.setFlashApiSwfUrl = function(url) {
  apps.uploader.FlashUploader.flashApiSwfUrl_ = url;
};


/**
 * Sets flash variables to be added onto the swf object.
 * @param {string} flashVars Flash variables.
 */
apps.uploader.FlashUploader.prototype.setFlashVars = function(flashVars) {
  this.flashVars_ = flashVars;
};


/**
 * Sets whether the flash is visible or transaprent.
 * @param {boolean} isVisible whether or not it is visible.
 */
apps.uploader.FlashUploader.prototype.setFlashVisible = function(isVisible) {
  this.flashIsVisible_ = isVisible;
};


/** @override */
apps.uploader.FlashUploader.prototype.setMultiSelect =
    function(multiSelect) {
  apps.uploader.FlashUploader.superClass_.setMultiSelect.call(this,
                                                              multiSelect);
  this.forEachFlashId_(this.setMultiSelectHelper_, this);
};


/** @override */
apps.uploader.FlashUploader.prototype.setAllowedFileTypes = function(types) {
  apps.uploader.FlashUploader.superClass_.setAllowedFileTypes.call(this, types);
  this.forEachFlashId_(this.setAllowedFileTypesHelper_, this);
};


/**
 * Sets whether the user is allowed to add more files.
 * @param {boolean} allowAddingFiles TRUE iff the user is allowed to add files.
 * @override
 */
apps.uploader.FlashUploader.prototype.setAllowAddingFiles = function(
    allowAddingFiles) {
  apps.uploader.FlashUploader.superClass_.setAllowAddingFiles.call(this,
      allowAddingFiles);
  this.forEachFlashId_(this.setAllowAddingFilesHelper_, this);
};


// ----------------------------------------------------------------------------
// Public Methods
// ----------------------------------------------------------------------------


/**
 * Returns the Flash element with the corresponding id.
 * @param {string=} opt_flashId The id of the flash element to lookup.
 * @return {Element} The flash element.
 */
apps.uploader.FlashUploader.prototype.getFlashElem = function(opt_flashId) {
  var dom = this.getDomHelper_(opt_flashId);

  return dom.getElement(opt_flashId || this.initialFlashId_);
};


/**
 * This method will only return something useful after {@link #install}
 * is called.
 * @param {string=} opt_flashId The id of a Flash  element.
 * @return {Element} Returns the container element for the Flash API instance.
 */
apps.uploader.FlashUploader.prototype.getFlashContainer =
    function(opt_flashId) {
  return /** @type {Element} */(this.getFlashElem(opt_flashId ||
      this.initialFlashId_).parentNode);
};


/**
 * Returns true if the Flash API is installed and ready to be used.
 * @param {string=} opt_flashId The id of a Flash element.
 * @return {boolean} Whether the Flash API is ready to be used.
 */
apps.uploader.FlashUploader.prototype.isFlashApiReady = function(opt_flashId) {
  return this.flashReadyById_.containsKey(opt_flashId || this.initialFlashId_);
};


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.FlashUploader.prototype.install = function(opt_overlayElement) {
  if (!opt_overlayElement) {
    throw Error('overlayElement must be defined');
  }
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_INSTALLING, this));
  this.bindAddFileItemsControlInternal_(opt_overlayElement);
};


/** @override */
apps.uploader.FlashUploader.prototype.uninstall = function(opt_overlayElement) {
  if (!opt_overlayElement) {
    throw Error('overlayElement must be defined');
  }
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_UNINSTALLING, this));
  this.unbindAddFileItemsControl(opt_overlayElement);
};


/**
 * Returns the client ID to be reported to the upload server.
 * @return {string} the client ID.
 * @override
 */
apps.uploader.FlashUploader.prototype.getClientId = function() {
  return 'scotty flash';
};


/** @override */
apps.uploader.FlashUploader.prototype.isInitialized = function() {
  return this.isFlashApiReady();
};


/** @override */
apps.uploader.FlashUploader.prototype.createFileInfo = function(file) {
  return new apps.uploader.FlashFileInfo2(file);
};


/** @override */
apps.uploader.FlashUploader.prototype.resizeAndPositionOverlayContainer =
    function() {
  goog.iter.forEach(this.overlayElements_.getKeyIterator(),
      function(flashId) {
        var flashElem = this.getFlashElem(flashId);
        var container = this.getFlashContainer(flashId);
        // Position the Flash container over the overlay element.
        var dom = this.getDomHelper_(flashId);
        var overlay = /** @type {Element} */ (
            this.overlayElements_.get(flashId));
        goog.style.setPosition(container, goog.style.getPosition(overlay));
        // Resize to fit.
        var overlaySize = goog.style.getSize(overlay);
        goog.style.setSize(flashElem, overlaySize.width, overlaySize.height);
      }, this);
};


/** @override */
apps.uploader.FlashUploader.prototype.startImagePreview = function(file,
    width, height, opt_quality, opt_cropping) {
  var flashElement = this.getFlashElemByFile_(file);

  if (this.isPreviewAllowed(file)) {
    this.previewingInProgress_.add(file.getId());
    var fileId = this.getFileInfo(file).flashFile['id'];
    flashElement['startPreview'](fileId,
        {'id': 'preview',
         'width': width,
         'height': height,
         'quality': opt_quality || 90,
         'allowCropping': opt_cropping || false});
    return true;
  }
  return false;
};


/** @override */
apps.uploader.FlashUploader.prototype.isPreviewAllowed = function(file) {
  return apps.uploader.FlashUploader.isPreviewSupported() &&
      !this.previewingInProgress_.contains(file.getId()) &&
      !goog.array.contains([
        apps.uploader.File.State.IN_QUEUE,
        apps.uploader.File.State.RECOVERY,
        apps.uploader.File.State.START,
        apps.uploader.File.State.TRANSFER
      ], this.getFileState(file));
};


/** @override */
apps.uploader.FlashUploader.prototype.addFileItems = function(opt_replace) {
  this.replaceFilesOnSelect_ = opt_replace || this.replaceFilesOnSelect_;
  if (this.isFlashApiReady() && this.allowAddingFiles) {
    var elem = /** @type {Element} */ (this.getFlashElem(
        this.initialFlashId_));
    elem['browse'](this.isMultiSelect(), this.getFlashSafeFileTypes_());
  }
};


/** @override */
apps.uploader.FlashUploader.prototype.bindAddFileItemsControl =
    function(control, opt_tabstop) {
  this.bindAddFileItemsControlInternal_(control);
};


/** @override */
apps.uploader.FlashUploader.prototype.unbindAddFileItemsControl =
    function(control) {
  var element = this.extractElement(control);
  var overlayUid = goog.getUid(element);
  var flashId = /** @type {string} */ (
      this.flashIdsByOverlayElement_.get(overlayUid));
  if (flashId && (flashId != this.initialFlashId_)) {
    // Remove the flash container. (We can't just hide it because the flash
    // swf is not really rendered in the dom, so display:none doesn't have
    // the same effect.
    if (this.hasNoQueuedOrCurrentUploads()) {
      var dom = this.getDomHelper_(flashId);
      dom.removeNode(this.getFlashContainer(flashId));
    } else {
      this.flashIdsToRemove_.push(flashId);
    }
    this.flashIdsByOverlayElement_.remove(overlayUid);
    this.overlayElements_.remove(element);
  }
};


/** @override */
apps.uploader.FlashUploader.prototype.nextUpload = function() {
  goog.base(this, 'nextUpload');

  if (this.hasNoQueuedOrCurrentUploads()) {
    // Remove any flash elements that have been unbound but were needed
    // to complete uploads.
    for (var i = 0; i < this.flashIdsToRemove_.length; i++) {
      var dom = this.getDomHelper_(this.flashIdsToRemove_[i]);
      dom.removeNode(this.getFlashContainer(this.flashIdsToRemove_[i]));
    }
    this.flashIdsToRemove_ = [];
  }
};


/**
 * Extends the default cancel upload implementation to remove files from the
 * queuedPreviews set so that they will not be uploaded after their image
 * preview is completed.
 * @param {apps.uploader.File} file The file being uploaded to cancel.
 * @param {boolean=} opt_keepSession Don't delete the session.
 * @override
 */
apps.uploader.FlashUploader.prototype.cancelUpload = function(
    file, opt_keepSession) {
  this.queuedPreviews_.remove(file.getId());
  apps.uploader.FlashUploader.superClass_.cancelUpload.call(this, file,
      opt_keepSession);
};


// ----------------------------------------------------------------------------
// Public Static Functions
// ----------------------------------------------------------------------------


/**
 * @return {boolean} Returns true if generating file previews is supported.
 */
apps.uploader.FlashUploader.isPreviewSupported = function() {
  var flashVersion = goog.userAgent.flash.VERSION;
  return goog.string.compareVersions(flashVersion, '10') >= 0;
};


// ----------------------------------------------------------------------------
// Protected Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Extends the default queue upload implementation to keep track of files which
 * are being previewed, so that they can be queued once the preview is ready.
 * @param {apps.uploader.File} file The file to upload.
 * @protected
 * @override
 */
apps.uploader.FlashUploader.prototype.queueUpload = function(file) {
  if (this.previewingInProgress_.contains(file.getId())) {
    this.queuedPreviews_.add(file.getId());
  } else {
    apps.uploader.FlashUploader.superClass_.queueUpload.call(this, file);
  }
};


/**
 * Extends the default startUploadSession implementation to consider whether
 * images are being previewed or need to be downsampled.  It is the
 * responsibility of downsampleImageOrStartUpload_ to ultimately call
 * super.startUploadSession once downsampling has completed.
 * @param {apps.uploader.File} file The file to start uploading.
 * @protected
 * @override
 */
apps.uploader.FlashUploader.prototype.startUploadSession = function(file) {
  if (this.previewingInProgress_.contains(file.getId())) {
    return;
  }
  this.downsampleImageOrStartUpload_(file);
};


/**
 * Creates a {@link apps.uploader.net.FlashFileIo} request object.
 * @param {apps.uploader.File} file The file instance to upload.
 * @return {!apps.uploader.net.FlashFileIo} The request object.
 * @protected
 * @override
 */
apps.uploader.FlashUploader.prototype.createFileIo = function(file) {
  var flashFile = this.getFileInfo(file).flashFile;
  var request = new apps.uploader.net.FlashFileIo(file,
      flashFile,
      this.getFlashElemByFile_(file));

  var fileId = /** @type {Object} */ (flashFile)['id'];
  this.fileIoByFlashId_.set(fileId, request);
  return request;
};


/**
 * Returns the number of files queued for upload.
 * @return {number} The number of files currently queued for upload.
 * @protected
 * @override
 */
apps.uploader.FlashUploader.prototype.getNumQueuedFiles = function() {
  return this.queuedPreviews_.getCount() + goog.base(this, 'getNumQueuedFiles');
};


/**
 * Extends the default hasNoQueuedOrCurrentUploads implementation to consider
 * whether there are files which we will queue once their previews are ready.
 * @return {boolean} True if the uploader does not have any files which will be
 *     queued when their image previews are done, queued, or current uploads.
 *     False, otherwise.
 * @protected
 * @override
 */
apps.uploader.FlashUploader.prototype.hasNoQueuedOrCurrentUploads = function() {
  return this.queuedPreviews_.isEmpty() &&
      apps.uploader.FlashUploader.superClass_.hasNoQueuedOrCurrentUploads.
          call(this);
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Helper method for {@link setAllowAddingFiles} which updates an
 * individual flash element.
 * @param {string} flashId Id of the flash element to update.
 * @private
 */
apps.uploader.FlashUploader.prototype.setAllowAddingFilesHelper_ =
    function(flashId) {
  var allowAddingFiles = this.allowAddingFiles;
  var elem = this.getFlashElem(flashId);
  elem['setAllowAddingFiles'](allowAddingFiles);
  goog.dom.classes.enable(elem,
      apps.uploader.FlashUploader.OVERLAY_HIDDEN_CLASS_NAME_,
      !allowAddingFiles);
};


/**
 * Calls the given function for each flash element id created by the uploader.
 * @param {Function} func The function to call. Each function should expect the
 *     id of the flash element as the only parameter to the function call.
 * @param {Object=} opt_obj The object on which to call the provided function.
 * @private
 */
apps.uploader.FlashUploader.prototype.forEachFlashId_ = function(func,
                                                                 opt_obj) {
  goog.array.forEach(this.flashReadyById_.getKeys(), func, opt_obj);
};


/**
 * Helper method for {@link setMultiSelect} which updates an
 * individual flash element.
 * @param {string} flashId Id of the flash element to update.
 * @private
 */
apps.uploader.FlashUploader.prototype.setMultiSelectHelper_ =
    function(flashId) {
  this.getFlashElem(flashId)['setMultiSelect'](this.isMultiSelect());
};


/**
 * Helper method for {@link setAllowedFileTypes} which updates an
 * individual flash element.
 * @param {string} flashId Id of the flash element to update.
 * @private
 */
apps.uploader.FlashUploader.prototype.setAllowedFileTypesHelper_ =
    function(flashId) {
  this.getFlashElem(flashId)['setAllowedFileTypes'](
      this.getFlashSafeFileTypes_());
};


/**
 * Creates a unique id to identify Flash element instances.
 * @return {string} The new id.
 * @private
 */
apps.uploader.FlashUploader.prototype.createFlashId_ = function() {
  return apps.uploader.FlashUploader.FLASH_API_PREFIX_ +
      apps.uploader.FlashUploader.flashApiCount_++;
};


/**
 * Returns the Flash element which created the File instance.
 * @param {apps.uploader.File} file The file to look up.
 * @return {Element} The flash element.
 * @private
 */
apps.uploader.FlashUploader.prototype.getFlashElemByFile_ = function(file) {
  var flashId = this.getFileInfo(file).flashId;
  return this.getFlashElem(flashId);
};


/**
 * Returns the dom helper of the flash element.
 * @param {string=} opt_flashId The id of the flash element to lookup.
 * @return {!goog.dom.DomHelper} The dom helper.
 * @private
 */
apps.uploader.FlashUploader.prototype.getDomHelper_ = function(opt_flashId) {
  var overlayElem = /** @type {Element} */ (this.overlayElements_.get(
      opt_flashId || this.initialFlashId_));
  return goog.dom.getDomHelper(overlayElem);
};


/**
 * Binds an element or component to trigger #addFileItems. See
 * #bindAddFileItemsControl.
 * @param {goog.ui.Component|Element} control An element or component which
 *     should trigger #addFileItems if it is clicked on.
 * @private
 */
apps.uploader.FlashUploader.prototype.bindAddFileItemsControlInternal_ =
    function(control) {
  var element = this.extractElement(control);
  var flashId = this.createFlashId_();
  this.overlayElements_.set(flashId, element);
  this.flashIdsByOverlayElement_.set(goog.getUid(element), flashId);

  var dom = this.getDomHelper_(flashId);
  if (!this.initialFlashId_) {
    this.initialFlashId_ = flashId;
    dom.getWindow()['onUploaderApiReady'] =
        apps.uploader.FlashUploader.GlobalFlashApiReadyHandler_;
  }
  // Register api ready callback.
  apps.uploader.FlashUploader.flashApiReadyCallbacks_.set(flashId,
      goog.bind(this.onFlashApiReady_, this));

  // Create placeholder for SWF on top of provided element.
  goog.dom.classes.add(element, 'uploader-overlay-visible');
  var elemSize = goog.style.getSize(element);
  var flashContainer = dom.createDom('div',
      {'class': 'upload-uploader-flash-content'});
  dom.insertSiblingAfter(flashContainer, element);

  // Use absolute positioning to provide overlay without affecting layout of
  // sibling elements.
  goog.style.setStyle(flashContainer, 'position', 'absolute');
  // The Flash element must be visible to initialize. It's transparent, so even
  // if the containing element is hidden, making it visible should be fine.
  goog.style.setStyle(flashContainer, 'visibility', 'visible');

  // Parent must be relatively positioned so that the offsets of the Flash
  // container are relative to the parent and not the body.
  if (element.parentNode) {
    goog.style.setStyle(/** @type {Element} */ (element.parentNode),
        'position', 'relative');
  }
  // Position the Flash container over the overlay element.
  goog.style.setPosition(flashContainer, goog.style.getPosition(element));

  // Creates a new Flash instance and writes it into the flashContent
  // container created above.
  var wmode = this.flashIsVisible_ ?
      'window' : 'transparent';
  var flashVars = 'apiId=' + flashId + (this.flashVars_ ?
      ('&' + this.flashVars_) : '');
  var params = {'allowscriptaccess': 'always',
                'wmode': wmode,
                'flashvars': flashVars};
  this.createFlashDom_(apps.uploader.FlashUploader.flashApiSwfUrl_,
      flashContainer,
      flashId,
      elemSize.width,
      elemSize.height,
      params);
};


/**
 * Creates the necessary DOM for the Flash instance and inserts it into the
 * document.
 * @param {string} url The url of the swf to embed.
 * @param {string|Element!} parent The parent element or id in which the flash
 *     object will be inserted.
 * @param {string} id The id of the element.
 * @param {number} width The width of the flash object.
 * @param {number} height The height of the flash object.
 * @param {Object=} opt_params Additional <param>'s to include when creating the
 *     flash object.
 * @private
 */
apps.uploader.FlashUploader.prototype.createFlashDom_ = function(url,
    parent,
    id,
    width,
    height,
    opt_params) {
  var params = opt_params || {};

  // Dom element attributes
  var attrs = {'type': 'application/x-shockwave-flash',
       'id': id,
       'width': width,
       'height': height};

  // IE doesn't understand the 'data' attribute, needs a 'movie' param instead.
  if (goog.userAgent.IE) {
    params['movie'] = url;
  } else {
    attrs['data'] = goog.html.SafeUrl.sanitize(url);
  }

  var htmlParams = [];
  for (var i in params) {
    htmlParams.push(
        goog.html.SafeHtml.create('param', {'name': i, 'value': params[i]}));
  }

  // We set innerHTML on the parent because it is the only way we can
  // dynamically load the swf in IE9.
  var dom = this.getDomHelper_(id);
  var parentEl = dom.getElement(parent);
  goog.dom.safe.setInnerHtml(/** @type {!Element} */ (parentEl),
      goog.html.SafeHtml.create('object', attrs, htmlParams));
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.APPLET_INSERTED_IN_DOM, this));
};


/**
 * Called when the Flash API has loaded and called the 'onUploaderApiReady'
 * callback function. Registers event listens for all the event types provided
 * by the Flash API and enables UI to allow browsing for files.
 * @param {string} flashId The id of the flash instance.
 * @private
 */
apps.uploader.FlashUploader.prototype.onFlashApiReady_ = function(flashId) {
  var dom = this.getDomHelper_(flashId);
  var flashElement = this.getFlashElem(flashId);

  // In FF3.0 on Windows the ExternalInterface API may not be ready
  // synchronously, so we wait till this function is done executing and try
  // again.
  if (!flashElement['addListener']) {
    goog.Timer.callOnce(goog.bind(this.onFlashApiReady_, this, flashId));
    return;
  }

  this.flashReadyById_.set(flashId, true);

  // Register Flash API events
  // Create unique function handler name for events
  var handlerName = flashId + 'flashFileSelection';

  // Register handler on window
  var win = dom.getWindow();
  // This is what the Flash API targets for callbacks
  win[handlerName] = goog.bind(this.onFilesSelected_, this);

  // Register the event handler with the Flash API
  flashElement['addListener']('onSelected', handlerName);

  // Register mouse events
  handlerName = flashId + 'flashMouseEvent';
  win[handlerName] = goog.bind(this.onFlashMouseEvent_, this);
  flashElement['addListener']('onMouseOver', handlerName);
  flashElement['addListener']('onMouseOut', handlerName);
  flashElement['addListener']('onMouseClick', handlerName);

  // The following events are sent straight to the correct FileIo instance.
  handlerName = flashId + 'flashToFileIo';
  win[handlerName] = goog.bind(this.flashToFileIo_, this);
  flashElement['addListener']('onOpen', handlerName);
  flashElement['addListener']('onProgress', handlerName);
  flashElement['addListener']('onCompleteData', handlerName);
  flashElement['addListener']('onHttpError', handlerName);
  flashElement['addListener']('onSecurityError', handlerName);
  flashElement['addListener']('onIoError', handlerName);

  handlerName = flashId + 'flashImageEvent';
  win[handlerName] = goog.bind(this.onImageEvent_, this);
  flashElement['addListener']('onPreviewReady', handlerName);
  flashElement['addListener']('onResizeReady', handlerName);
  flashElement['addListener']('onLoadError', handlerName);

  // Update properties on the Flash API instance.
  this.setMultiSelectHelper_(flashId);
  this.setAllowedFileTypesHelper_(flashId);
  this.setAllowAddingFilesHelper_(flashId);
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_READY, this));
};


/**
 * Handler for the 'onSelected' event called by the Flash API. This handler is
 * called when the user has selected files from the browse dialog.
 * @param {Object} e The event to handle.
 * @private
 */
apps.uploader.FlashUploader.prototype.onFilesSelected_ = function(e) {
  this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_STARTED));

  var flashId = e['apiId'];
  var flashElement = this.getFlashElem(flashId);

  if (this.replaceFilesOnSelect_) {
    this.clearFileList();
  }
  var flashFiles = e['files'];
  if (this.isAlphabeticalOrdering()) {
    goog.array.sort(flashFiles, function(file1, file2) {
      return goog.string.numerateCompare(file1['name'], file2['name']);
    });
  }
  var genericFiles = goog.array.map(flashFiles, function(file) {
    return new apps.uploader.File(
        file['name'],
        file['size'],
        undefined, // opt_relativeDirectoryPath
        undefined, // opt_selectionId
        file['modificationDate']);
  });

  goog.array.forEach(genericFiles,
      function(file, index) {
        var fileInfo = this.getFileInfo(file);
        fileInfo.flashId = flashId;
        fileInfo.flashFile = flashFiles[index];
        var fileId = flashFiles[index]['id'];
        this.fileByFlashId_.set(fileId, file);
      },
      this);
  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_FINISHED));
  var result = this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.FILES_SELECTED, genericFiles));
  if (!result) {
    return;
  }

  goog.array.forEach(genericFiles,
      function(file) {
        this.addFile(file);
      },
      this);
  this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.ALL_FILES_ADDED, genericFiles));
};


/**
 * Tell the flash uploader to downsample the image.  If downsampling is disabled
 * or if the file is smaller the the minimum byte amount, this method kicks off
 * the upload without applying downsampling.
 * @param {apps.uploader.File} file The file to resize and upload.
 * @private
 */
apps.uploader.FlashUploader.prototype.downsampleImageOrStartUpload_ =
    function(file) {
  var options = this.getDownsamplingOptions(file);
  if (!options) {
    // Start the image upload in earnest, skipping downsampling checks.
    apps.uploader.FlashUploader.superClass_.startUploadSession.call(this, file);
    return;
  }

  this.dispatchEvent(new apps.uploader.FileEvent(
      apps.uploader.EventType.FILE_DOWNSAMPLING_STARTED, file));

  // Request Flash to downsample the file.
  //  Switch SWF to support width & height, not just a single
  // dimension.
  var flashElement = this.getFlashElemByFile_(file);
  flashElement['setMaxPixelDimension'](
      Math.min(options.getSize().width, options.getSize().height));
  flashElement['setMinImageByteCountForRescale'](
      this.getMinImageByteCountForRescale());
  flashElement['resizeImage'](this.getFileInfo(file).flashFile['id'],
      file.getUploadUrl());
};


/**
 * Handler for image related events called by the Flash API.
 * @param {Object} event The event to handle.
 * @private
 */
apps.uploader.FlashUploader.prototype.onImageEvent_ = function(event) {
  // Find corresponding file
  var file = /** @type {apps.uploader.File} */(this.fileByFlashId_.get(
      event['file']));

  // This code handles events for both previews and downsamples.  If a preview
  // gets into a final state (onPreviewReady or onLoadError), check if the file
  // it was working on is now queued.  If so, start downsampling it.
  switch (event['type']) {
    case 'onPreviewReady':
      this.previewingInProgress_.remove(file.getId());
      var dataUri = 'data:image/jpg;base64,' + event['data'];
      this.dispatchEvent(
          new apps.uploader.FilePreviewEvent(file, dataUri, event['version']));
      if (this.queuedPreviews_.contains(file.getId())) {
        this.queuedPreviews_.remove(file.getId());
        this.queueUpload(file);
      }
      break;
    case 'onResizeReady':
      file.setBytesTotal(event['fileSize']);
      this.dispatchEvent(new apps.uploader.FileEvent(
          apps.uploader.EventType.FILE_DOWNSAMPLING_COMPLETED, file));
      // Start the image upload in earnest, skipping downsampling checks.
      apps.uploader.FlashUploader.superClass_.startUploadSession.call(
          this, file);
      break;
    case 'onLoadError':
      if (this.previewingInProgress_.contains(file.getId())) {
        this.previewingInProgress_.remove(file.getId());
        this.dispatchEvent(new apps.uploader.FileEvent(
            apps.uploader.EventType.FILE_PREVIEW_ERROR, file));
        if (this.queuedPreviews_.contains(file.getId())) {
          this.queuedPreviews_.remove(file.getId());
          this.queueUpload(file);
        }
      } else {
        this.dispatchEvent(new apps.uploader.FileEvent(
            apps.uploader.EventType.FILE_DOWNSAMPLING_COMPLETED, file));
        // Start the image upload in earnest, skipping downsampling checks.
        apps.uploader.FlashUploader.superClass_.startUploadSession.call(
            this, file);
      }
      break;
  }
};


/**
 * Sends events called by the Flash API to the appropriate upload request.
 * @param {Object} event The event to handle.
 * @private
 */
apps.uploader.FlashUploader.prototype.flashToFileIo_ = function(event) {
  this.fileIoByFlashId_.get(event['file']).handleFlashMessage(event);
};


/**
 * Handles mouse events from the Flash API overlay, and rebroadcasts them.
 * @param {Object} event The event to handle.
 * @private
 */
apps.uploader.FlashUploader.prototype.onFlashMouseEvent_ = function(event) {
  var eventName;
  switch (event['type']) {
    case 'onMouseOver':
      eventName = apps.uploader.ui.EventType.FLASH_MOUSE_OVER;
      break;
    case 'onMouseOut':
      eventName = apps.uploader.ui.EventType.FLASH_MOUSE_OUT;
      break;
    case 'onMouseClick':
      eventName = apps.uploader.ui.EventType.FLASH_MOUSE_CLICK;
      break;
  }

  // The source of the event if the flash overlay would not be there.
  var sourceOverlay = this.overlayElements_.get(event['apiId']);

  this.dispatchEvent({ 'type': eventName, 'sourceOverlay': sourceOverlay });
};


/**
 * Returns the equivalent of {@link #getAllowedFileTypes} which is compatible
 * with the Flash API.
 * @return {!Array|undefined} The file types list.
 * @private
 */
apps.uploader.FlashUploader.prototype.getFlashSafeFileTypes_ = function() {
  var allowedTypes = this.getAllowedFileTypes();
  if (goog.isArray(allowedTypes) && allowedTypes.length) {
    /**
     * @desc Message shown when the user is selecting files. It is a label
     * for the section that specifies the files that are allowed to be uploaded.
     */
    var MSG_UPLOADER_UPLOAD_ALLOWED_FILES = goog.getMsg('Allowed files');
    return [{
      'description': MSG_UPLOADER_UPLOAD_ALLOWED_FILES,
      'extension': '*' + allowedTypes.join(';*')
    }];
  }
  return undefined;
};


// ----------------------------------------------------------------------------
// Private Static Functions
// ----------------------------------------------------------------------------


/**
 * Called when the Flash API has loaded and called the 'onUploaderApiReady'
 * callback function. Since mulitple swfs can be created, we use a global
 * callback which then looks up and call the specific FlashUploader's
 * handler.
 * @param {string} flashId The id of the flash instance.
 * @private
 */
apps.uploader.FlashUploader.GlobalFlashApiReadyHandler_ = function(flashId) {
  var callback = /** @type {Function} */(
      apps.uploader.FlashUploader.flashApiReadyCallbacks_.get(flashId));
  callback(flashId);
};
