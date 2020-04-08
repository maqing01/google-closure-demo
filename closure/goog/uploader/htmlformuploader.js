goog.provide('apps.uploader.HtmlFormUploader');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.FileListEvent');
goog.require('apps.uploader.UploaderEvent');
goog.require('apps.uploader.net.HtmlFormFileIo');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.iter');
goog.require('goog.log');
goog.require('goog.structs.Map');
goog.require('goog.style');



/**
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 * @constructor
 * @extends {apps.uploader.BaseUploader}
 */
apps.uploader.HtmlFormUploader = function(opt_disableTabStop) {
  apps.uploader.BaseUploader.call(this);

  /**
   * Associate files and form elements.
   * @type {!goog.structs.Map.<number,HTMLFormElement>}
   * @private
   */
  this.formByFileId_ = new goog.structs.Map();

  /**
   * Associate overlay and form elements.
   * @type {!goog.structs.Map.<number,HTMLFormElement>}
   * @private
   */
  this.formByOverlayId_ = new goog.structs.Map();

  /**
   * Associate overlay and form container elements.
   * @type {!goog.structs.Map.<number,Element>}
   * @private
   */
  this.formContainerByOverlayId_ = new goog.structs.Map();

  /**
   * Map from overlay uid to overlay element.
   * @type {!goog.structs.Map.<number,Element>}
   * @private
   */
  this.overlayElementByOverlayId_ = new goog.structs.Map();

  /**
   * True if the INPUT control will NOT be reachable by the tab key.
   * @type {boolean}
   * @private
   */
  this.disableTabStop_ = opt_disableTabStop || false;
};
goog.inherits(apps.uploader.HtmlFormUploader, apps.uploader.BaseUploader);


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.HtmlFormUploader.prototype.logger =
    goog.log.getLogger('apps.uploader.HtmlFormUploader');


/**
 * True after the uploader has initialized.
 * @type {boolean}
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.isInitialized_ = false;


/**
 * Approximate upload speed that was most recently observed. This is
 * used to update the progress bar. We store the value here as well as in
 * HtmlFormFileIo so that we can track it over multiple file uploads.
 * Value is in bytes per millisecond (or KBps).
 * @type {number}
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.uploadSpeed_ = 0;


/**
 * True if the HtmlFormUploader is using an overlay.
 * @type {boolean}
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.isUsingOverlay_ = false;


// ----------------------------------------------------------------------------
// Public Methods - Get and set options.
// ----------------------------------------------------------------------------


/**
 * Sets whether the user is allowed to add more files.
 * @param {boolean} allowAddingFiles TRUE iff the user is allowed to add files.
 * @override
 */
apps.uploader.HtmlFormUploader.prototype.setAllowAddingFiles = function(
    allowAddingFiles) {
  apps.uploader.HtmlFormUploader.superClass_.setAllowAddingFiles.call(this,
      allowAddingFiles);
  if (!allowAddingFiles) {
    this.clearEmptyFiles();
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.setAllowedFileTypes = function(types) {
  apps.uploader.HtmlFormUploader.superClass_.setAllowedFileTypes.call(
      this, types);

  var allowedFileTypes = this.getAllowedFileTypes();
  var setAcceptAttribute = function(form) {
    var input = form.childNodes[0];
    if (allowedFileTypes) {
      input.setAttribute('accept', allowedFileTypes.join(','));
    } else {
      input.removeAttribute('accept');
    }
  };

  if (this.isUsingOverlay()) {
    // If we are in overlay mode, set the accept attribute on each overlay.
    goog.iter.forEach(
        this.formByOverlayId_.getValueIterator(),
        setAcceptAttribute);
  } else {
    // If we are in legacy mode, set the accpet attribute on each file.
    goog.iter.forEach(
        this.formByFileId_.getValueIterator(),
        setAcceptAttribute);
  }
};


// ----------------------------------------------------------------------------
// Public Methods
// ----------------------------------------------------------------------------


/**
 * @return {boolean} true if the uploader is using an overlay.
 */
apps.uploader.HtmlFormUploader.prototype.isUsingOverlay = function() {
  return this.isUsingOverlay_;
};


/**
 * @param {Element} elem Parent element into which the DOM will be inserted.
 * @param {apps.uploader.File} file File object linked to this input element.
 */
apps.uploader.HtmlFormUploader.prototype.createInputForm =
    function(elem, file) {
  var dom = goog.dom.getDomHelper(elem);

  // Create file input.
  var inputAttributes = {
      'type': 'file',
      'name': 'Filedata',
      'size': 20,
      'class': goog.getCssName('uploader-upload-input')
  };
  if (this.getAllowedFileTypes()) {
    inputAttributes['accept'] = this.getAllowedFileTypes().join(',');
  }
  var input = dom.createDom('input', inputAttributes);
  var form = /** @type {!HTMLFormElement} */ (dom.createDom('form',
      {'method': 'POST',
       'enctype': 'multipart/form-data',
       'encoding': 'multipart/form-data'},
      input));

  elem.appendChild(form);

  // Store form reference.
  this.formByFileId_.set(file.getId(), form);

  // Register events.
  this.getHandler().listen(input,
      goog.events.EventType.CHANGE,
      function(e) {
        file.setPath(this.stripFakepath_(e.target.value));
        this.onFileSelect(file);
      });
};


/**
 * Handler for the {@link apps.uploader.ui.FormFileItem}'s
 * {@link goog.events.EventType.CHANGE} event. The event is triggered when the
 * value of the INPUT field changes, meaning that a file was selected by the
 * user.
 * @param {apps.uploader.File} file The file that changed.
 */
apps.uploader.HtmlFormUploader.prototype.onFileSelect = function(file) {
  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_STARTED));
  file.setSelectionTime(goog.now());
  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_FINISHED));
  var result = this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.FILES_SELECTED, [file]));
  if (!result) {
    return;
  }
  this.queueUploadInternal(file);
  // Auto add a new empty file dialog if there are none left.
  // Only do this in multiSelect mode.
  if (this.isMultiSelect() &&
      !goog.array.some(this.fileList, this.isFileEmpty_, this)) {
    this.addFileItems(false);
  }
  this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.ALL_FILES_ADDED, [file]));
};


/**
 * Called when the user selects a file on the input form overlay.
 * @param {string} file_path The path of the file that was selected.
 * @param {Element} overlayEl The the overlay element.
 * @param {number} overlayId The UID of the overlay element.
 */
apps.uploader.HtmlFormUploader.prototype.onFileSelectOverlay =
    function(file_path, overlayEl, overlayId) {
  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_STARTED));

  // Create a new file and associate it with the form overlay.
  var file = new apps.uploader.File(file_path);
  var form = this.formByOverlayId_.get(overlayId);
  this.formByFileId_.set(file.getId(), form);

  // Resize the existing form overlay from the DOM.
  var input = form.childNodes[0];
  goog.style.setSize(input, 0, 0);

  // Create a new form overlay.
  this.createInputFormOverlay_(overlayEl);

  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_FINISHED));
  var result = this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.FILES_SELECTED, [file]));
  if (!result) {
    return;
  }
  this.addFile(file);
  this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.ALL_FILES_ADDED, [file]));
};


/**
 * Removes all empty files from the file list.
 */
apps.uploader.HtmlFormUploader.prototype.clearEmptyFiles = function() {
  goog.array.forEach(
      goog.array.clone(this.fileList),
      function(f) {
        if (this.isFileEmpty_(f)) {
          this.removeFile(f);
        }
      },
      this);
};


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.HtmlFormUploader.prototype.install =
    function(opt_overlayElement) {
  if (opt_overlayElement) {
    this.isUsingOverlay_ = true;
  }

  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_INSTALLING, this));

  if (opt_overlayElement) {
    this.createInputFormOverlay_(
        opt_overlayElement, this.disableTabStop_);
  }
  this.isInitialized_ = true;
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_READY, this));

  // Auto adds first file input element, this needs to be done after events
  // have been registered on the FileList, i.e., after UPLOADER_READY is fired.
  if (!opt_overlayElement) {
    goog.Timer.callOnce(function() {
      this.addFileItems(false);
    }, 1, this);
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.uninstall =
    function(opt_overlayElement) {

  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_UNINSTALLING, this));
  if (opt_overlayElement) {
    var formContainer = /** @type {Element} */ (
        this.formContainerByOverlayId_.get(goog.getUid(opt_overlayElement)));
    if (formContainer) {
      goog.style.setElementShown(formContainer, false);
    }
  }
};


/**
 * Returns the client ID to be reported to the upload server.
 * @return {string} the client ID.
 * @override
 */
apps.uploader.HtmlFormUploader.prototype.getClientId = function() {
  return 'html form';
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.isInitialized = function() {
  return this.isInitialized_;
};


/**
 * @return {!Array.<apps.uploader.File>} A defense-cloned array of all the
 *     non-empty files contained by this uploader.
 * @override
 */
apps.uploader.HtmlFormUploader.prototype.getFiles = function() {
  var files = apps.uploader.HtmlFormUploader.superClass_.getFiles.call(this);
  return goog.array.filter(files,
      function(item) {
        return !this.isFileEmpty_(item);
      }, this);
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.resizeAndPositionOverlayContainer =
    function() {
  // Nothing to do if we are not in overlay mode.
  if (!this.isUsingOverlay()) {
    return;
  }

  // Resize and reposition each input element and container. There should
  // normally only be one of each unless bindAddFileItemsControl() has been
  // called.
  goog.iter.forEach(this.overlayElementByOverlayId_.getKeyIterator(),
      function(overlayId) {
        var overlayEl = /** @type {Element} */ (
            this.overlayElementByOverlayId_.get(overlayId));
        var formContainer = /** @type {Element} */ (
            this.formContainerByOverlayId_.get(overlayId));
        var form = /** @type {HTMLFormElement} */ (
            this.formByOverlayId_.get(overlayId));
        var inputEl = form.childNodes[0];

        goog.style.setPosition(
            formContainer, goog.style.getPosition(overlayEl));
        var overlaySize = goog.style.getSize(overlayEl);
        goog.style.setSize(formContainer,
            overlaySize.width, overlaySize.height);
        goog.style.setWidth(inputEl, overlaySize.width);
        goog.style.setHeight(inputEl, overlaySize.height);
        goog.style.setStyle(inputEl, 'font-size', overlaySize.height + 'px');
      }, this);
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.bindAddFileItemsControl =
    function(control, opt_disableTabStop) {
  var overlayEl = this.extractElement(control);
  var formContainer = /** @type {Element} */ (
      this.formContainerByOverlayId_.get(goog.getUid(overlayEl)));

  // Show the form overlay if it exists, or create it.
  if (formContainer) {
    goog.style.setElementShown(formContainer, true);
  } else {
    this.createInputFormOverlay_(overlayEl);
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.unbindAddFileItemsControl =
    function(control) {
  var overlayId = goog.getUid(this.extractElement(control));

  // Hide the form overlay.
  var formContainer = /** @type {Element} */ (
      this.formContainerByOverlayId_.get(overlayId));
  if (formContainer) {
    goog.style.setElementShown(formContainer, false);
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.onUploadSuccess = function(event) {
  var request = event.target;
  this.uploadSpeed_ = request.getUploadSpeed();
  apps.uploader.HtmlFormUploader.superClass_.onUploadSuccess.call(this, event);
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.addFileItems = function(opt_replace) {
  if (this.allowAddingFiles && !this.isUsingOverlay()) {
    // Clearing the file list will automatically add an empty file.
    if (opt_replace) {
      this.clearFileList();
    } else {
      this.addFile(new apps.uploader.File());
    }
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.removeFile = function(file) {
  apps.uploader.HtmlFormUploader.superClass_.removeFile.call(this, file);
  this.formByFileId_.remove(file.getId());
  // Add empty file if there are none left and we are not using an overlay.
  if (this.fileList.length == 0 && !this.isUsingOverlay()) {
    this.addFileItems(false);
  }
};


/** @override */
apps.uploader.HtmlFormUploader.prototype.isRetrySupported = function() {
  return true;
};


// ----------------------------------------------------------------------------
// Protected Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Called by addFile. This method is responsible for any post handling of
 * adding a file.
 * @param {apps.uploader.File} file The file added to the uploader.
 * @protected
 * @override
 */
apps.uploader.HtmlFormUploader.prototype.addFileInternal = function(file) {
  // If we're in overlay mode, we want to call the base implementation to queue
  // the file for upload immediately. Otherwise, we need to wait for it to be
  // selected first.
  if (this.isUsingOverlay()) {
    goog.base(this, 'addFileInternal', file);
  }
};


/**
 * Creates a {@link apps.uploader.net.HtmlFormFileIo} request object.
 * @param {apps.uploader.File} file The file instance to upload.
 * @return {!apps.uploader.net.HtmlFormFileIo} The request object.
 * @protected
 * @override
 */
apps.uploader.HtmlFormUploader.prototype.createFileIo = function(file) {
  // Get original form and start upload
  var form =
      /** @type {HTMLFormElement} */(this.formByFileId_.get(file.getId()));
  var request = new apps.uploader.net.HtmlFormFileIo(
      file, form, this.uploadSpeed_);

  return request;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Checks whether or not a file object has had any value set.
 * @param {apps.uploader.File} file The file to check.
 * @return {boolean} If the file has any value or not.
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.isFileEmpty_ = function(file) {
  return file.getPath() == '';
};


/**
 * Creates a new form, not yet associated with a file. It will be positioned
 * over the overlay element.
 * @param {Element} overlayEl The element to place the overlay over.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.createInputFormOverlay_ =
    function(overlayEl, opt_disableTabStop) {
  var overlayId = goog.getUid(overlayEl);
  this.overlayElementByOverlayId_.set(overlayId, overlayEl);
  var dom = goog.dom.getDomHelper(overlayEl);
  goog.dom.classes.add(overlayEl, 'uploader-overlay-visible');
  var elemSize = goog.style.getSize(overlayEl);
  // Create the file input form.
  var inputStyles = [
      'opacity:0',
      'filter:alpha(opacity=0)',
      'font-size:' + elemSize.height + 'px',
      'height:' + elemSize.height + 'px',
      'position:absolute',
      goog.style.isRightToLeft(overlayEl) ? 'left:0px' : 'right:0px',
      'top:0px'];
  var inputAttributes = {
      'type': 'file',
      'name': 'Filedata',
      'size': 20,
      'class': goog.getCssName('uploader-upload-input'),
      'style': inputStyles.join(';'),
      'tabIndex': !!opt_disableTabStop ? -1 : 0
  };
  if (this.getAllowedFileTypes()) {
    inputAttributes['accept'] = this.getAllowedFileTypes().join(',');
  }
  var input = dom.createDom('input', inputAttributes);
  var form = /** @type {!HTMLFormElement} */ (dom.createDom('form',
      {'method': 'POST',
       'enctype': 'multipart/form-data',
       'encoding': 'multipart/form-data'},
      input));
  this.formByOverlayId_.set(overlayId, form);

  // Create the form container if necessary.
  var formContainer = /** @type {Element} */ (
      this.formContainerByOverlayId_.get(overlayId));
  if (!formContainer) {
    formContainer = dom.createDom('div',
        {'style': 'overflow:hidden;width:' + elemSize.width + 'px;height:' +
             elemSize.height + 'px'});
    this.formContainerByOverlayId_.set(overlayId, formContainer);

    dom.insertSiblingAfter(formContainer, overlayEl);

    goog.style.setStyle(formContainer, 'position', 'absolute');
    if (overlayEl.parentNode) {
      goog.style.setStyle(/** @type {Element} */ (overlayEl.parentNode),
          'position', 'relative');
    }
    goog.style.setPosition(
        formContainer, goog.style.getPosition(overlayEl));
  }

  // Append the form to the container.
  dom.append(formContainer, form);

  // Register events.
  this.getHandler().listen(input,
      goog.events.EventType.CHANGE,
      function(e) {
        this.onFileSelectOverlay(
            this.stripFakepath_(e.target.value), overlayEl, overlayId);
      });
};


/**
 * Strips off 'C:\fakepath\' at the start of the path, which is added to the
 * file input.value by some browsers (IE8, Chrome 7).
 * @param {string} path The path to strip.
 * @return {string} The stripped path.
 * @private
 */
apps.uploader.HtmlFormUploader.prototype.stripFakepath_ = function(path) {
  if (path.match(/^c:\\fakepath\\/i)) {
    path = path.substring(12);
  }
  return path;
};
