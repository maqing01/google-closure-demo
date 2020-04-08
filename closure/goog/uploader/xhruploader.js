goog.provide('apps.uploader.XhrUploader');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.DirectoryHelper');
goog.require('apps.uploader.DirectoryScanner');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.FileEvent');
goog.require('apps.uploader.FileListEvent');
goog.require('apps.uploader.FilePreviewEvent');
goog.require('apps.uploader.Session');
goog.require('apps.uploader.UploaderEvent');
goog.require('apps.uploader.net.ResumableXhrFileIo');
goog.require('apps.uploader.net.XhrFileIo');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.fs.FileReader');
goog.require('goog.iter');
goog.require('goog.log');
goog.require('goog.math.Size');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.userAgent');
goog.require('goog.userAgent.product');



/**
 * @param {boolean=} opt_listen True if click/action events should
 *     automatically be listened for on the overlay element.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 * @constructor
 * @extends {apps.uploader.BaseUploader}
 */
apps.uploader.XhrUploader = function(opt_listen, opt_disableTabStop) {
  apps.uploader.BaseUploader.call(this);

  /**
   * Input elements keyed by overlay UIDs.  Elements are added in
   * #addFileInput_.
   * @type {!goog.structs.Map.<number,Element>}
   * @private
   */
  this.inputElements_ = new goog.structs.Map();

  /**
   * Overlay elements keyed by overlay UIDs.  Elements are added in
   * #addFileInput_.
   * @type {!goog.structs.Map.<number,Element>}
   * @private
   */
  this.overlayElements_ = new goog.structs.Map();

  /**
   * For webkit browsers, this map keeps track of overlay element listeners.
   * @type {!goog.structs.Set.<number>}
   * @private
   */
  this.overlayListeners_ = new goog.structs.Set();

  /**
   * Function for handling overlay clicks.  Need to keep this cached so that we
   * can unbind it.
   * @type {!Function}
   * @private
   */
  this.overlayListenerFn_ = goog.partial(this.addFileItems, false);


  /**
   * True if click/action events should automatically be listened for on the
   * overlay element.
   * @type {boolean}
   * @private
   */
  this.listen_ = opt_listen || false;

  /**
   * True if the INPUT control will NOT be reachable by the tab key.
   * @type {boolean}
   * @private
   */
  this.disableTabStop_ = opt_disableTabStop || false;
};
goog.inherits(apps.uploader.XhrUploader, apps.uploader.BaseUploader);


/**
 * Name of the file input property used by webkit browsers to indicate that
 * we're uploading a directory rather than a single file.
 * @type {string}
 * @private
 */
apps.uploader.XhrUploader.WEBKIT_DIRECTORY_PROP_ = 'webkitdirectory';


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @private
 */
apps.uploader.XhrUploader.prototype.logger_ =
    goog.log.getLogger('apps.uploader.XhrUploader');


/**
 * The maximum file size to generate image previews for.
 * @type {number}
 * @private
 */
apps.uploader.XhrUploader.PREVIEW_MAX_BYTES_ = 20 * 1024 * 1024;


/**
 * An id to track the deferred addFileInput call and cancel it during dispose.
 * @type {number}
 * @private
 */
apps.uploader.XhrUploader.prototype.addFileInputTimerId_;


/**
 * A flag indicating whether to replace not queued files before adding new
 * ones in {@link #addFiles}.
 * @type {boolean}
 * @private
 */
apps.uploader.XhrUploader.prototype.replaceFilesOnSelect_ = false;


// ----------------------------------------------------------------------------
// Public Methods - Set and get options.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.XhrUploader.prototype.setMultiSelect = function(multiSelect) {
  apps.uploader.XhrUploader.superClass_.setMultiSelect.call(this, multiSelect);

  // Set multiselect on each input.
  goog.iter.forEach(this.inputElements_.getValueIterator(),
      function(inputEl, und, itr) {
        if (!inputEl) {
          return;
        }

        if (this.isMultiSelect()) {
          inputEl['multiple'] = 'true';
        } else {
          inputEl.removeAttribute('multiple');
        }
      }, this);
};


/**
 * @override
 */
apps.uploader.XhrUploader.prototype.setAllowDirectories = function(allow) {
  apps.uploader.XhrUploader.superClass_.setAllowDirectories.call(this, allow);

  goog.iter.forEach(this.inputElements_.getValueIterator(),
      function(inputEl, und, itr) {
        if (!inputEl) {
          return;
        }

        if (this.getAllowDirectories()) {
          inputEl[apps.uploader.XhrUploader.WEBKIT_DIRECTORY_PROP_] = 'true';
        } else {
          inputEl.removeAttribute(
              apps.uploader.XhrUploader.WEBKIT_DIRECTORY_PROP_);
        }
      }, this);
};


/** @override */
apps.uploader.XhrUploader.prototype.setAllowedFileTypes = function(types) {
  apps.uploader.XhrUploader.superClass_.setAllowedFileTypes.call(this, types);

  // Set the accept attribute on each overlay to the new file types.
  goog.iter.forEach(
      this.inputElements_.getValueIterator(),
      function(inputEl) {
        if (!inputEl) {
          return;
        }

        if (this.getAllowedFileTypes()) {
          inputEl.setAttribute('accept', this.getAllowedFileTypes().join(','));
        } else {
          inputEl.removeAttribute('accept');
        }
      },
      this);
};


// ----------------------------------------------------------------------------
// Public Methods
// ----------------------------------------------------------------------------


/**
 * Checks a drag event to see if contains valid file objects.
 * @param {goog.events.Event} e The 'drag' event to check.
 * @return {boolean} Returns true if the drop operation would be allowed.
 */
apps.uploader.XhrUploader.prototype.isDragDropEventAllowed = function(e) {
  var data = e.getBrowserEvent()['dataTransfer'];
  return (data && goog.array.contains(data['types'], 'Files'));
};


/**
 * Accepts a drag and drop event. Any files included in the event will be
 * added to the file list.
 * @param {goog.events.Event} e The 'drop' event to handle.
 * @param {boolean=} opt_suppressEvent Whether to dispatch the FILES_SELECTED
 *     and related events.
 * @param {boolean=} opt_keepEmptyFiles Whether to keep 0-byte files.
 *     By default, 0-byte files are removed.
 * @return {!Array.<!apps.uploader.File>} Array of files added as a result of
 *     the drag/drop operation.
 * @deprecated Use acceptDragDropAsync, which more accurately filters out
 *     directories.
 */
apps.uploader.XhrUploader.prototype.acceptDragDrop =
    function(e, opt_suppressEvent, opt_keepEmptyFiles) {
  if (!opt_suppressEvent) {
    this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_STARTED));
  }
  return this.acceptDragDrop_(e, opt_suppressEvent, opt_keepEmptyFiles)
      .acceptedFiles;
};


/**
 * Accepts a drag and drop event. Any files included in the event will be
 * added to the file list. This uses a FileReader to asynchronously check if
 * a drag and dropped item is a file or directory. The list of accepted files
 * will be returned in the callback as apps.uploader.Files. The list of
 * filtered items (directories and 0-byte files if opt_keepEmptyFiles is false)
 * will be returned in the callback as browser Files. Note: Internet Explorer 10
 * and Internet Explorer 11 do not pass directories in the drop event so the
 * opt_allAddedCallback can receive empty arrays for both arguments.
 * @param {goog.events.Event} e The 'drop' event to handle.
 * @param {boolean=} opt_suppressEvent Whether to dispatch the FILES_SELECTED
 *     and related events.
 * @param {boolean=} opt_keepEmptyFiles Whether to keep 0-byte files.
 * @param {function(!Array.<!apps.uploader.File>,!Array.<!File>)=}
 *     opt_allAddedCallback The callback to call when all files have been
 *     added. It will be passed the accepted files as apps.uploader.File and
 *     filtered items as File objects from the drop event.
 */
apps.uploader.XhrUploader.prototype.acceptDragDropAsync =
    function(e, opt_suppressEvent, opt_keepEmptyFiles, opt_allAddedCallback) {
  if (!opt_suppressEvent) {
    this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_STARTED));
  }

  var data = e.getBrowserEvent()['dataTransfer'];
  var items = data && data['items'];
  var files = data && data['files'];
  var selfObj = this;
  var addedFiles = [];
  var filteredFiles = [];
  var addedGenericFiles = [];

  // If webkitGetAsEntry is supported, use DirectoryScanner.
  if (items && items[0] && items[0]['webkitGetAsEntry']) {
    var scanner = new apps.uploader.DirectoryScanner(items,
        function(browserFiles, directoryIndicatorFiles) {
          for (var i = 0; i < browserFiles.length; i++) {
            var file = browserFiles[i];
            if (!opt_keepEmptyFiles &&
                (file['size'] || file['fileSize']) == 0) {
              filteredFiles.push(file);
            } else if (!selfObj.isMultiSelect() && addedFiles.length == 1) {
              filteredFiles.push(file);
            } else {
              addedFiles.push(file);
            }
          }

          addedGenericFiles = selfObj.addFiles(
              addedFiles, opt_suppressEvent, true, directoryIndicatorFiles);
          if (opt_allAddedCallback) {
            opt_allAddedCallback(addedGenericFiles, filteredFiles);
          }
        });
    scanner.start();
    return;
  }

  // If FileReader is not supported, fallback to the old method of
  // using the content type to differentiate between directories
  // and files.
  if (typeof FileReader == 'undefined') {
    var dragDropFiles =
        this.acceptDragDrop_(e, opt_suppressEvent, opt_keepEmptyFiles);
    if (opt_allAddedCallback) {
      opt_allAddedCallback(
          dragDropFiles.acceptedFiles,
          dragDropFiles.filteredFiles);
    }
    return;
  }

  // FileReader is supported.  We attempt to read each file.  If the
  // read fails, then we assume the file is actually a directory.
  if (files && files.length) {
    for (var i = 0; i < files.length; i++) {
      var item = files[i];

      // Checks if all files have been processed and calls the callback.
      var checkAllFilesAdded = function() {
        if (addedFiles.length + filteredFiles.length == files.length) {
          // Add files in a single batch to be more consistent with how
          // acceptDragDrop calls the method.
          addedGenericFiles =
              selfObj.addFiles(addedFiles, opt_suppressEvent, true);

          if (opt_allAddedCallback) {
            opt_allAddedCallback(addedGenericFiles, filteredFiles);
          }
        }
      };

      // Create a reader, and listen for progress, load, and error events.
      var reader = new goog.fs.FileReader();
      this.getHandler().listen(
          reader,
          [goog.fs.FileReader.EventType.PROGRESS,
           goog.fs.FileReader.EventType.LOAD,
           goog.fs.FileReader.EventType.ERROR],
          (function(item) {
            return function(e) {
              var reader = /** @type {goog.fs.FileReader} */ (e.target);
              goog.events.removeAll(reader);

              // Error means the item is a directory.  Filter it out.
              if (e.type == goog.fs.FileReader.EventType.ERROR) {
                filteredFiles.push(item);

              // Progress or load means the item is a file.
              } else {
                // Abort the in-progress read.
                if (e.type == goog.fs.FileReader.EventType.PROGRESS) {
                  reader.abort();
                }

                if (!opt_keepEmptyFiles &&
                    (item['size'] || item['fileSize']) == 0) {
                  // Filter out empty files.
                  filteredFiles.push(item);
                } else if (!selfObj.isMultiSelect() && addedFiles.length == 1) {
                  // Filter out additional files when multi-select is disabled.
                  filteredFiles.push(item);
                } else {
                  addedFiles.push(item);
                }
              }

              checkAllFilesAdded();
            }})(item));

      // Start reading the file.  We'll try to read it a couple of different
      // ways, since browser support is spotty.
      try {
        reader.readAsBinaryString(item);
      } catch (ex) {
        try {
          reader.readAsArrayBuffer(item);
        } catch (ex2) {
          // If none of the above worked, we assume it's not a file.
          filteredFiles.push(item);
          checkAllFilesAdded();
        }
      }
    }

  } else if (opt_allAddedCallback) {
    opt_allAddedCallback(addedGenericFiles, filteredFiles);
  }
};


/**
 * Apps implementing their own UI can add files directly to the uploader
 * via this function, which is also called as the event handler when the user
 * closes the file picker dialog.
 * @param {!Array.<File>} files Array of file objects, empty if user.
 *     cancelled selecting files.
 * @param {boolean=} opt_suppressEvent Whether to dispatch the FILES_SELECTED
 *     and related events.
 * @param {boolean=} opt_isFileDropped Whether the file is drag-and-dropped.
 * @param {!Array.<string>=} opt_directoryPaths The paths of any directories
 *     associated with the processing.
 * @return {!Array.<!apps.uploader.File>} Array of files added.
 */
apps.uploader.XhrUploader.prototype.addFiles = function(
    files, opt_suppressEvent, opt_isFileDropped, opt_directoryPaths) {
  if (goog.array.isEmpty(files)) {
    if (!opt_suppressEvent) {
      this.dispatchEvent(new goog.events.Event(
          apps.uploader.EventType.FILES_SCAN_FINISHED));
    }
    return []; // No files selected, nothing to do.
  }

  if (this.replaceFilesOnSelect_) {
    this.clearFileList();
  }

  var genericFiles = goog.array.map(files, function(file) {
    var path = this.getAllowDirectories() ?
        (file['webkitRelativePath'] || file['relativePath'] || file['name']) :
        (file['name'] || file['fileName']);
    return new apps.uploader.File(
        path,
        file['size'] || file['fileSize'],
        undefined, // opt_relativeDirectoryPath
        undefined, // opt_selectionId
        file['lastModifiedDate'] && file['lastModifiedDate'].getTime(),
        file['type']);
  }, this);

  if (opt_directoryPaths && this.getAllowDirectories()) {
    goog.array.forEach(opt_directoryPaths, function(path) {
      // Create a Directory Indicator File from the directory path.
      path += apps.uploader.File.DIRECTORY_INDICATOR_FILENAME;
      genericFiles.push(new apps.uploader.File(path));
    });
  }

  goog.array.forEach(genericFiles,
      function(file, index) {
        var fileInfo = this.getFileInfo(file);
        fileInfo.blob = files[index];
        if (opt_isFileDropped) {
          fileInfo.isFileDropped = true;
        }
      },
      this);

  if (this.getAllowDirectories()) {
    genericFiles = apps.uploader.DirectoryHelper.unflattenFiles(genericFiles);
  }

  if (this.isAlphabeticalOrdering()) {
    goog.array.sort(genericFiles, function(file1, file2) {
      return goog.string.numerateCompare(file1.getName(), file2.getName());
    });
  }

  if (!opt_suppressEvent) {
    this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_FINISHED));
    var result = this.dispatchEvent(new apps.uploader.FileListEvent(
        apps.uploader.EventType.FILES_SELECTED, genericFiles));
    if (!result) {
      return [];
    }
  }

  goog.array.forEach(genericFiles,
      function(file, index) {
        this.addFile(file);
      },
      this);

  if (!opt_suppressEvent) {
    this.dispatchEvent(new apps.uploader.FileListEvent(
        apps.uploader.EventType.ALL_FILES_ADDED, genericFiles));
  }

  return /** @type {!Array.<!apps.uploader.File>} */ (genericFiles);
};


/**
 * Returns the main file input element.
 * @return {Element} The hidden input element used for file selection.
 */
apps.uploader.XhrUploader.prototype.getFileInputElement = function() {
  return this.getFirstInputElement_();
};


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.XhrUploader.prototype.install = function(opt_overlayElement) {
  if (!opt_overlayElement) {
    throw Error('overlayElement must be defined');
  }
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_INSTALLING, this));
  this.bindAddFileItemsControlInternal_(
      opt_overlayElement, this.listen_, this.disableTabStop_);
};


/** @override */
apps.uploader.XhrUploader.prototype.uninstall = function(opt_overlayElement) {
  if (!opt_overlayElement) {
    throw Error('overlayElement must be defined');
  }
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_UNINSTALLING, this));
  this.unbindAddFileItemsControl(opt_overlayElement);
};


/** @override */
apps.uploader.XhrUploader.prototype.getClientId = function() {
  if (this.isResumable()) {
    return '';
  } else {
    return '';
  }
};


/** @override */
apps.uploader.XhrUploader.prototype.isInitialized = function() {
  return true;
};


/** @override */
apps.uploader.XhrUploader.prototype.isDirectoryUploadSupported = function() {
  var testInputElement = this.getFirstInputElement_() ||
      goog.dom.createDom('input', {'type': 'file'});
  return testInputElement[apps.uploader.XhrUploader.WEBKIT_DIRECTORY_PROP_] !=
      undefined;
};


/** @override */
apps.uploader.XhrUploader.prototype.isSeparateDirectoryUploadLinkRequired =
    function() {
  return true;
};


/** @override */
apps.uploader.XhrUploader.prototype.isResumable = function() {
  // Return false for native android browser because it fails to upload sliced
  // file.
  // TODO(aivanauskas) This restriction should be removed when bug in android
  // browser is fixed.
  return !!File.prototype.slice ||
      (!!File.prototype.webkitSlice && !goog.userAgent.MOBILE) ||
      !!File.prototype.mozSlice;
};


/** @override */
apps.uploader.XhrUploader.prototype.isRecoverySupported = function() {
  return this.isResumable();
};


/** @override */
apps.uploader.XhrUploader.prototype.resizeAndPositionOverlayContainer =
    function() {
  //  Determine why isProgrammaticClickSupported_ is undefined in
  // IE9 when compiled.
  if (!goog.isFunction(this.isProgrammaticClickSupported_)) {
    return;
  }

  // Check if we are using an overlay.
  if (this.isProgrammaticClickSupported_()) {
    return;
  }

  // Resize and position each overlay.
  goog.iter.forEach(this.inputElements_.getKeyIterator(),
      function(overlayUid) {
        var overlayEl = /** @type {Element} */ (
            this.overlayElements_.get(overlayUid));
        var inputEl = /** @type {Element} */ (
            this.inputElements_.get(overlayUid));

        var container = /** @type {Element} */(inputEl.parentNode);
        goog.style.setPosition(container, goog.style.getPosition(overlayEl));
        var overlaySize = goog.style.getSize(overlayEl);
        goog.style.setSize(container, overlaySize.width, overlaySize.height);
        // We only set the height on the input element because setting the width
        // messes up the positioning for some reason.
        goog.style.setHeight(inputEl, overlaySize.height);
        goog.style.setStyle(inputEl, 'font-size', overlaySize.height + 'px');
      }, this);
};


/** @override */
apps.uploader.XhrUploader.prototype.isDragDropSupported = function() {
  // DnD is supported in Firefox 3.6+ (Gecko 1.9.2+).
  if (goog.userAgent.GECKO) {
    return goog.userAgent.isVersionOrHigher('1.9.2');
  }

  // DnD is supported in all Webkit-based browsers (Chrome & Safari).
  // NOTE(mprocopio): As of 11/10/2010, testers have found that drag and drop
  // is problematic with (A) the Safari/Win web browser. See b/3177721.
  if (goog.userAgent.WEBKIT) {
    return !(goog.userAgent.product.SAFARI && goog.userAgent.WINDOWS);
  }

  // DnD is supported in IE 10+.
  if (goog.userAgent.IE) {
    return goog.userAgent.isVersionOrHigher(10);
  }

  return false;
};


/** @override */
apps.uploader.XhrUploader.prototype.createFileIo = function(file) {
  // If an image was downscaled on the browser, this information is stored in
  // the alternate data object.  Use that instead in the XHR send.
  var alternateBlob = file.getAlternateBlob();
  var blob = alternateBlob || this.getFileInfo(file).blob;
  goog.asserts.assert(blob);

  if (this.isResumable()) {
    var fileIo = new apps.uploader.net.ResumableXhrFileIo(file, blob);
    fileIo.setAutoRetry(true);
    return fileIo;
  } else {
    return new apps.uploader.net.XhrFileIo(file, blob);
  }
};


/** @override */
apps.uploader.XhrUploader.prototype.addFileItems = function(opt_replace) {
  if (this.allowAddingFiles) {
    this.replaceFilesOnSelect_ = opt_replace || this.replaceFilesOnSelect_;
    this.getFirstInputElement_().click();
  }
};


/** @override */
apps.uploader.XhrUploader.prototype.bindAddFileItemsControl =
    function(control, opt_disableTabStop) {
  this.bindAddFileItemsControlInternal_(control, true, opt_disableTabStop);
};


/** @override */
apps.uploader.XhrUploader.prototype.unbindAddFileItemsControl =
    function(control) {
  var overlayUid = goog.getUid(this.extractElement(control));

  if (goog.isFunction(this.isProgrammaticClickSupported_) &&
      this.isProgrammaticClickSupported_()) {
    this.getHandler().unlisten(control,
        this.isElement(control) ?
            goog.events.EventType.CLICK : goog.ui.Component.EventType.ACTION,
        this.overlayListenerFn_);
    this.overlayListeners_.remove(overlayUid);
  } else {
    // Hide the input container.
    var inputEl = this.inputElements_.get(overlayUid);
    if (inputEl) {
      goog.style.setElementShown(
          /** @type {Element} */ (inputEl.parentNode), false);
    }
  }

  this.inputElements_.remove(overlayUid);
};


/** @override */
apps.uploader.XhrUploader.prototype.startUploadSession = function(file) {
  var startUploadFn = goog.bind(
      apps.uploader.XhrUploader.superClass_.startUploadSession, this, file);
  startUploadFn();
};


/** @override */
apps.uploader.XhrUploader.prototype.startImagePreview = function(file,
    width, height, opt_quality, opt_cropping) {
};


/** @override */
apps.uploader.XhrUploader.prototype.isPreviewAllowed = function(file) {
  return apps.uploader.ImageProcessor.isClientScalingSupported() &&
      this.getFileState(file) == apps.uploader.File.State.DEFAULT &&
      file.getBytesTotal() < apps.uploader.XhrUploader.PREVIEW_MAX_BYTES_;
};


/** @override */
apps.uploader.XhrUploader.prototype.isRetrySupported = function() {
  return true;
};


/** @override */
apps.uploader.XhrUploader.prototype.pauseFile = function(file) {
  if (this.getFileState(file) != apps.uploader.File.State.TRANSFER) {
    return;
  }
  var fileIo = this.getFileIo(file);
  if (fileIo && fileIo.pause) {
    fileIo.pause();
  }
};


/** @override */
apps.uploader.XhrUploader.prototype.resumeFile = function(file) {
  if (this.getFileState(file) != apps.uploader.File.State.TRANSFER) {
    return;
  }
  var fileIo = this.getFileIo(file);
  if (fileIo && fileIo.resume) {
    fileIo.resume();
  }
};


/** @override */
apps.uploader.XhrUploader.prototype.isPaused = function(file) {
  if (this.getFileState(file) != apps.uploader.File.State.TRANSFER) {
    return false;
  }
  var fileIo = this.getFileIo(file);
  return fileIo && fileIo.isPaused && fileIo.isPaused();
};


/** @override */
apps.uploader.XhrUploader.prototype.isBackoff = function(file) {
  if (this.getFileState(file) != apps.uploader.File.State.TRANSFER) {
    return false;
  }
  var fileIo = this.getFileIo(file);
  return fileIo && fileIo.isBackoff && fileIo.isBackoff();
};


/** @override */
apps.uploader.XhrUploader.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.Timer.clear(this.addFileInputTimerId_);
};


// ----------------------------------------------------------------------------
// Protected Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * @override
 */
apps.uploader.XhrUploader.prototype.getTransferMechanism = function() {
  return this.isResumable() ?
      apps.uploader.Session.TransferMechanism.PUT :
      apps.uploader.Session.TransferMechanism.FORM_POST;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Returns the main input element for this uploader.
 * @return {Element} The first input element.
 * @private
 */
apps.uploader.XhrUploader.prototype.getFirstInputElement_ = function() {
  return this.inputElements_.getValues()[0];
};


/**
 * @return {boolean} True if the file input element can be clicked
 *     programmatically, false if it cannot.
 * @private
 */
apps.uploader.XhrUploader.prototype.isProgrammaticClickSupported_ = function() {
  // Webkit, IE 10, and Firefox 12 (Gecko 12) support programmatic click.
  return goog.userAgent.WEBKIT ||
      (goog.userAgent.IE && goog.userAgent.isVersionOrHigher(10)) ||
      (goog.userAgent.GECKO && goog.userAgent.isVersionOrHigher(12));
};


/**
 * Adds an input element necessary to trigger the file browse dialog.
 * @param {string|Element} overlayElem The element ID or DOM node on which to
 *     place the input overlay if necessary.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 * @private
 */
apps.uploader.XhrUploader.prototype.addFileInput_ =
    function(overlayElem, opt_disableTabStop) {
  var elem = goog.dom.getElement(overlayElem);
  this.overlayElements_.set(goog.getUid(elem), elem);
  var inputAttributes = {};
  var inputEl = null;

  var dom = goog.dom.getDomHelper(elem);
  // We can simply hide the input field and call its click handler.
  if (goog.isFunction(this.isProgrammaticClickSupported_) &&
      this.isProgrammaticClickSupported_() &&
      !this.getFirstInputElement_()) {
    inputAttributes = {
        'type': 'file',
        'style': 'height:0;visibility:hidden;position:absolute'
    };
    if (this.getAllowedFileTypes()) {
      inputAttributes['accept'] = this.getAllowedFileTypes().join(',');
    }
    inputEl = dom.createDom('input', inputAttributes);
    dom.insertSiblingAfter(inputEl, elem);
  } else {
    // For everyone else we use a transparent overlay.
    goog.dom.classes.add(elem, 'uploader-overlay-visible');
    var elemSize = goog.style.getSize(elem);
    // Style the input element so that its entire area is clickable, using the
    // technique described here:
    // http://tiagoe.blogspot.com/2010/01/css-style-typefile-tags.html
    inputAttributes = {
         'type': 'file',
         'style': 'opacity:0;font-size:' + elemSize.height +
             'px;height:' + elemSize.height + 'px;' +
             'position:absolute;right:0px;top:0px',
         'tabIndex': !!opt_disableTabStop ? -1 : 0
    };
    if (this.getAllowedFileTypes()) {
      inputAttributes['accept'] = this.getAllowedFileTypes().join(',');
    }
    inputEl = dom.createDom('input', inputAttributes);
    var inputContainer = dom.createDom('div',
        {'style': 'overflow:hidden;width:' + elemSize.width + 'px;height:' +
                  elemSize.height + 'px'}, inputEl);
    dom.insertSiblingAfter(inputContainer, elem);

    // Use absolute positioning to provide overlay without affecting layout of
    // sibling elements.
    goog.style.setStyle(inputContainer, 'position', 'absolute');
    // Parent must be relatively positioned so that the offsets of the input
    // container are relative to the parent and not the body.
    goog.style.setStyle(/** @type {Element} */(elem.parentNode), 'position',
        'relative');
    // Position the input container over the overlay element.
    goog.style.setPosition(inputContainer, goog.style.getPosition(elem));
  }

  if (inputEl) {
    this.inputElements_.set(goog.getUid(elem), inputEl);

    // Listen for file selection.
    this.getHandler().listen(inputEl,
        goog.events.EventType.CHANGE,
        function(e) {
          this.dispatchEvent(new goog.events.Event(
              apps.uploader.EventType.FILES_SCAN_STARTED));
          this.addFiles(inputEl['files']);
          inputEl.value = '';
        });
  }
};


/**
 * See {@link apps.uploader.XhrUploader.prototype.acceptDragDrop}.
 * @param {goog.events.Event} e The 'drop' event to handle.
 * @param {boolean=} opt_suppressEvent Whether to dispatch the FILES_SELECTED
 *     and related events.
 * @param {boolean=} opt_keepEmptyFiles Whether to keep 0-byte files.
 *     By default, 0-byte files are removed.
 * @return {!apps.uploader.XhrUploader.DragDropFiles_} The accepted and filtered
 *     files.
 * @private
 */
apps.uploader.XhrUploader.prototype.acceptDragDrop_ =
    function(e, opt_suppressEvent, opt_keepEmptyFiles) {
  var data = e.getBrowserEvent()['dataTransfer'];
  var files = data && data['files'];

  var addedFiles = [];
  var filteredFiles = [];
  var addedGenericFiles = [];

  // Returns true if the item is accepted.
  var isItemAccepted = function(item) {
    // Remove empty files.
    if (!opt_keepEmptyFiles && (item['size'] || item['fileSize']) == 0) {
      return false;
    }
    // Remove folders.
    if (item['type'] == '') {
      // Workaround an issue where files that end in ".flv" will sometimes
      // have type == ''. Note: there are many extensions with this issue,
      // please use acceptDragDropAsync for better folder detection.
      var name = item['name'] || item['fileName'];
      return /\.flv$/.test(name);
    }
    return true;
  };

  if (files) {
    for (var i = 0; i < files.length; i++) {
      var item = files[i];
      if (isItemAccepted(item) &&
          (this.isMultiSelect() || addedFiles.length == 0)) {
        addedFiles.push(item);
      } else {
        filteredFiles.push(item);
      }
    }
  }
  addedGenericFiles = this.addFiles(addedFiles, opt_suppressEvent, true);
  return new apps.uploader.XhrUploader.DragDropFiles_(
      addedGenericFiles, filteredFiles);
};


/**
 * Binds an element or component to trigger #addFileItems. See
 * #bindAddFileItemsControl.
 * @param {goog.ui.Component|Element} control An element or component which
 *     should trigger #addFileItems if it is clicked on.
 * @param {boolean=} opt_listen True if click/action events should
 *     automatically be listened for on the overlay element.
 * @param {boolean=} opt_disableTabStop True if the INPUT control will NOT be
 *     reachable by the tab key.
 * @private
 */
apps.uploader.XhrUploader.prototype.bindAddFileItemsControlInternal_ =
    function(control, opt_listen, opt_disableTabStop) {
  var overlayEl = this.extractElement(control);
  var overlayUid = goog.getUid(overlayEl);

  if (goog.isFunction(this.isProgrammaticClickSupported_) &&
      this.isProgrammaticClickSupported_()) {
    if (!this.overlayListeners_.contains(overlayUid) && opt_listen) {
      // Listen for clicks/actions and call #addFileItems if a listener doesn't
      // already exist on the control.
      this.getHandler().listen(control,
          this.isElement(control) ?
              goog.events.EventType.CLICK : goog.ui.Component.EventType.ACTION,
          this.overlayListenerFn_);
      this.overlayListeners_.add(overlayUid);
    }

    // If there is an exising input to use, there is no need to create
    // any more input elements.
    if (this.getFirstInputElement_()) {
      return;
    }
  }

  var existingInputEl = this.inputElements_.get(overlayUid);
  if (existingInputEl) {
    goog.style.setElementShown(
        /** @type {Element} */ (existingInputEl.parentNode), true);
  } else {
    // Add a new input element.  Delay to ensure that the initial input element
    // is set first.
    this.addFileInputTimerId_ = goog.Timer.callOnce(function() {
      this.addFileInput_(overlayEl, opt_disableTabStop);
      this.updateInputElementProperties_();
      this.dispatchEvent(new apps.uploader.UploaderEvent(
          apps.uploader.EventType.UPLOADER_READY, this));
    }, undefined, this);
  }
};


/**
 * Updates properties on all input elements.
 * @private
 */
apps.uploader.XhrUploader.prototype.updateInputElementProperties_ =
    function() {
  this.setMultiSelect(this.isMultiSelect());
  this.setAllowDirectories(this.getAllowDirectories());
};


/**
 * Handles image processor events for when we were generating a downsampled
 * version of the image to be uploaded.  On successful downsamples, replaces the
 * respective image with the downsampled version.  Each event is also
 * redispatched as its appropriate apps.uploader.Event equivalent.
 * @param {!apps.uploader.File} file The file the event pertains to.
 * @param {function()} startUploadFn Function to call to start the upload after
 *     downsampling has been completed.
 * @param {!apps.uploader.ImageProcessorEvent} ev Event, fired from the image
 *     processor.
 * @private
 */
apps.uploader.XhrUploader.prototype.handleImageDownsampleEvent_ =
    function(file, startUploadFn, ev) {
  var item = ev.getItem();
  switch (ev.type) {
    case apps.uploader.ImageProcessorEvent.Type.STARTED:
      this.dispatchEvent(new apps.uploader.FileEvent(
          apps.uploader.EventType.FILE_DOWNSAMPLING_STARTED, file));
      break;

    case apps.uploader.ImageProcessorEvent.Type.COMPLETED:
    case apps.uploader.ImageProcessorEvent.Type.ERROR:
      if (ev.type == apps.uploader.ImageProcessorEvent.Type.COMPLETED) {
        if (item.getDimensionsChanged()) {
          file.setAlternateBlob(item.getBlob());
        }
        this.dispatchEvent(new apps.uploader.FileEvent(
            apps.uploader.EventType.FILE_DOWNSAMPLING_COMPLETED, file));
      }
      this.unlistenForImageProcessorEvents_(item);
      startUploadFn();
      break;
  }
};


/**
 * Unlistens for all image processor events on the specified item.
 * @param {!apps.uploader.ImageProcessor.Item} item Item to stop listening for
 *     events on.
 * @private
 */
apps.uploader.XhrUploader.prototype.unlistenForImageProcessorEvents_ =
    function(item) {
  this.getHandler().unlisten(item,
      [apps.uploader.ImageProcessorEvent.Type.STARTED,
          apps.uploader.ImageProcessorEvent.Type.COMPLETED,
          apps.uploader.ImageProcessorEvent.Type.ERROR]);
};


/**
 * Handles image processor events for when we were generating an image preview.
 * Dispatches the appropriate "Preview was created" events.
 * @param {!apps.uploader.File} file The file the event pertains to.
 * @param {!apps.uploader.ImageProcessorEvent} ev Event, fired from the image
 *     processor.
 * @private
 */
apps.uploader.XhrUploader.prototype.handleImagePreviewEvent_ =
    function(file, ev) {
  switch (ev.type) {
    case apps.uploader.ImageProcessorEvent.Type.COMPLETED:
      var item = ev.getItem();
      this.unlistenForImageProcessorEvents_(item);
      var previewSize = item.getSize();
      var additionalData = {
        'resultWidth' : previewSize.width,
        'resultHeight' : previewSize.height
      };
      this.dispatchEvent(new apps.uploader.FilePreviewEvent(
          file, /** @type {string} */ (item.getDataUrl()),
          additionalData));
      break;

    case apps.uploader.ImageProcessorEvent.Type.ERROR:
      this.unlistenForImageProcessorEvents_(ev.getItem());
      this.dispatchEvent(new apps.uploader.FileEvent(
          apps.uploader.EventType.FILE_PREVIEW_ERROR, file));
      break;
  }
};


// ----------------------------------------------------------------------------
// Private Helper Classes
// ----------------------------------------------------------------------------



/**
 * Container for the accepted and filtered files that are the result of a drag
 * and drop event.
 * @param {!Array.<!apps.uploader.File>} acceptedFiles The accepted files.
 * @param {!Array.<!File>} filteredFiles The filtered 0-byte files or
 *     directories.
 * @private
 * @constructor
 */
apps.uploader.XhrUploader.DragDropFiles_ = function(
    acceptedFiles, filteredFiles) {
  /**
   * Accepted files that were dragged into the drag-n-drop target.
   * @type {!Array.<!apps.uploader.File>}
   */
  this.acceptedFiles = acceptedFiles;

  /**
   * Files or directories that were dragged into the drag-n-drop target but
   * were filtered out.
   * @type {!Array.<!File>}
   */
  this.filteredFiles = filteredFiles;
};
