goog.provide('apps.uploader.JavaUploader');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.Directory');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.File.State');
goog.require('apps.uploader.FileListEvent');
goog.require('apps.uploader.Session.TransferMechanism');
goog.require('apps.uploader.UploaderEvent');
goog.require('apps.uploader.javadetection');
goog.require('apps.uploader.net.JavaFileIo');
goog.require('goog.array');
goog.require('goog.events.Event');
goog.require('goog.json');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.userAgent');



/**
 * Creates a new JavaUploader object.
 * @param {string} appletJarUrl The URL that locates the applet jar file.
 * @param {string} opt_locale Locale to use for native java components like the
 *     file dialog (in the form of "en", "en_US", or "fr-FR", where at least a
 *     language is specified).
 * @constructor
 * @extends {apps.uploader.BaseUploader}
 */
apps.uploader.JavaUploader = function(appletJarUrl, opt_locale) {
  apps.uploader.BaseUploader.call(this);

  /**
   * The URL that locates the applet jar file.
   * @type {string}
   * @private
   */
  this.appletJarUrl_ = appletJarUrl;

  /**
   * Locale to use in native java components (like the file dialog).
   * @type {string}
   * @private
   */
  this.locale_ = opt_locale || 'en_US';

  /**
   * The applet element.
   * @type {Element}
   * @private
   */
  this.applet_ = null;

  /**
   * Identifes if previously selected files should be replaced with
   * newly selected files.
   * @type {boolean}
   * @private
   */
  this.replaceFilesOnSelect_ = false;

  /**
   * Identifier for the selection ready polling function interval.
   * @type {?number}
   * @private
   */
  this.isSelectionReadyPollId_ = null;

  /**
   * Identifier for the loaded check polling function interval.
   * @type {?number}
   * @private
   */
  this.isLoadedPollId_ = null;

  /**
   * Identifies if the applet is loaded and ready to be interacted with.
   * @type {boolean}
   * @private
   */
  this.loaded_ = false;

  /**
   * Identifies if the applet is active and ready to be interacted with.
   * @type {boolean}
   * @private
   */
  this.active_ = false;

  /**
   * Number of attempts made to determine if the applet has loaded (used in
   * IE where applets load asynchronously).
   * @type {number}
   * @private
   */
  this.loadedPollAttempts_ = 0;

  /**
   * @desc Default message to be used as the file selection dialog title.
   */
  var MSG_UPLOADER_FILE_DIALOG_TITLE = goog.getMsg('Upload');

  /**
   * Title for the file selection dialog.
   * @type {string}
   * @private
   */
  this.dialogTitle_ = MSG_UPLOADER_FILE_DIALOG_TITLE;

  /**
   * @desc Default message to be used as the file selection select button text.
   */
  var MSG_UPLOADER_FILE_DIALOG_SELECT_LABEL = goog.getMsg('Select');

  /**
   * Label for the file selection dialog select button.
   * @type {string}
   * @private
   */
  this.selectLabel_ = MSG_UPLOADER_FILE_DIALOG_SELECT_LABEL;

  /**
   * The size of the height and width of the applet (we render it as a small
   * square offscreen).  It needs to be non-zero to work in IE.
   * @type {string}
   * @private
   */
  this.appletDimension_ = '1';

  /**
   * Identifies if the file dialog should have a native look and feel.  This
   * is really great on all platforms except Linux, which has a horrible
   * "native" look and feel which, aside from looking bad, is nearly impossible
   * to use when you want to select a directory.  So for Linux, we just use the
   * Java look and feel.
   * @type {boolean}
   * @private
   */
  this.nativeLookAndFeel_ = !goog.userAgent.LINUX;

  // Turn on directory upload support by default for Java.
  this.setAllowDirectories(true);
};
goog.inherits(apps.uploader.JavaUploader, apps.uploader.BaseUploader);


/**
 * Prefix to be used for Java applet element Ids.
 * @type {string}
 * @private
 */
apps.uploader.JavaUploader.JAVA_API_PREFIX_ = 'JAVA_UPLOADER_';

/**
 * Poll interval in milliseconds (for upload progress).
 * @type {number}
 * @private
 */
apps.uploader.JavaUploader.PROGRESS_POLL_INTERVAL_ = 100;


/**
 * Poll interval in milliseconds (for loading).
 * @type {number}
 * @private
 */
apps.uploader.JavaUploader.LOADING_POLL_INTERVAL_ = 50;


/**
 * Counter for Java applet element IDs.
 * @type {number}
 * @private
 */
apps.uploader.JavaUploader.javaApiCount_ = 1;


/**
 * The logger used by this object.
 * @type {goog.log.Logger}
 * @protected
 */
apps.uploader.JavaUploader.prototype.logger =
    goog.log.getLogger('apps.uploader.JavaUploader');


/**
 * JSON keys received from the applet.
 * @enum {string}
 * @private
 */
apps.uploader.JavaUploader.FileJsonKey_ = {
  CHILDREN: 'c',
  DIRECTORY: 'd',
  FILE_COUNT: 'f',
  NAME: 'n',
  RELATIVE_DIRECTORY_PATH: 'r',
  SELECTION_ID: 'i',
  SIZE: 's'
};


// ----------------------------------------------------------------------------
// Public Methods - Get and set options.
// ----------------------------------------------------------------------------


/**
 * Sets the file dialog title.
 * @param {string} dialogTitle The localized string to use as the file dialog
 *     title.
 */
apps.uploader.JavaUploader.prototype.setDialogTitle = function(dialogTitle) {
  this.dialogTitle_ = dialogTitle;
};


/**
 * Sets the file dialog select button label.
 * @param {string} selectLabel The localized string to use as the file dialog
 *     select button label.
 */
apps.uploader.JavaUploader.prototype.setSelectLabel = function(selectLabel) {
  this.selectLabel_ = selectLabel;
};


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.JavaUploader.prototype.install = function(opt_overlayElement) {
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_INSTALLING, this));
  var appletId = this.createAppletId_();
  var dom = goog.dom.getDomHelper(document.body);
  var appletElem = dom.createDom('applet', {'id': appletId,
      'archive': this.appletJarUrl_,
      'code': 'com.google.uploader.service.client.applet.UploaderApplet',
      'width': this.appletDimension_, 'height': this.appletDimension_,
      'style': 'position: absolute; top: -' + this.appletDimension_ +
          'px; left: -' + this.appletDimension_ + 'px;'});

  dom.appendChild(document.body, appletElem);
  this.applet_ = appletElem;

  goog.log.info(this.logger, 'Inserted applet into DOM with id: ' + appletId);
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.APPLET_INSERTED_IN_DOM, this));

  // Determine if the applet loaded, if not fire failed-to-load event.
  this.isLoadedPollId_ = window.setInterval(goog.bind(function() {
    var permissionDenied = false;
    try {
      if (this.applet_ && (this.active_ = this.applet_['isActive']())) {
        if (!(this.loaded_ = this.applet_['isLoaded']())) {
          permissionDenied = true;
        } else {
          goog.log.info(this.logger, 'Successfully loaded JAVA mechanism.');
          this.dispatchEvent(new apps.uploader.UploaderEvent(
              apps.uploader.EventType.UPLOADER_READY, this));
          window.clearTimeout(this.isLoadedPollId_);
        }
      } else {
        this.loadedPollAttempts_++;
      }
    } catch (e) {
      // Not loaded yet.
      this.loadedPollAttempts_++;
    }

    if (permissionDenied) {
      goog.log.info(this.logger, 'No security permission for JAVA mechanism.');
      this.dispatchEvent(new apps.uploader.UploaderEvent(
          apps.uploader.EventType.UPLOADER_WITHOUT_PERMISSION, this));
      window.clearTimeout(this.isLoadedPollId_);
    } else if (this.loadedPollAttempts_ >= 10) {
      goog.log.info(this.logger, 'Failed to load JAVA mechanism.');
      this.dispatchEvent(new apps.uploader.UploaderEvent(
          apps.uploader.EventType.APPLET_FAILED_TO_LOAD, this));
      window.clearTimeout(this.isLoadedPollId_);
    }
  }, this), apps.uploader.JavaUploader.LOADING_POLL_INTERVAL_);
};


/** @override */
apps.uploader.JavaUploader.prototype.uninstall = function(opt_overlayElement) {
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_UNINSTALLING, this));
  goog.dom.removeNode(this.applet_);
};


/**
 * @override
 */
apps.uploader.JavaUploader.prototype.addFileItems = function(opt_replace) {
  this.replaceFilesOnSelect_ = opt_replace || this.replaceFilesOnSelect_;
  if (this.loaded_ && this.allowAddingFiles) {
    this.allowAddingFiles = false;

    // We move the applet from off the screen to the center of the page
    // so that the file dialog will be centered (which centers itself with
    // respect to the applet).  After the dialog is closed, the applet is
    // moved back to a non-visible location.

    // NOTE: On some platforms (Linux/Firefox), there is an exception thrown
    // if a null value for getAllowedFileTypes() is passed. This appears to be
    // a platform-specific issue relating to the Browser<-->Applet interface.
    // As a workaround, we pass in an empty array if getAllowedFileTypes()
    // returns null.
    this.centerApplet_();
    window.setTimeout(goog.bind(function() {
      this.applet_['setLocale'](this.locale_);
      var filesJson = this.applet_['selectFiles'](
          this.dialogTitle_, this.selectLabel_, this.isMultiSelect(),
          this.getAllowedFileTypes() || [], this.getAllowDirectories(),
          this.nativeLookAndFeel_);
      this.moveAppletOffScreen_();
      this.onFilesSelected_(filesJson);
      this.allowAddingFiles = true;
    }, this), 50);
  }
};


/**
 * Removes a file from the file list and frees any associated resources held by
 * the applet.
 * @param {apps.uploader.File} file The file to be removed.
 */
apps.uploader.JavaUploader.prototype.removeFile = function(file) {
  apps.uploader.JavaUploader.superClass_.removeFile.call(this, file);

  this.applet_['freeResources'](file.getSelectionId());
};


/**
 * Returns the client ID to be reported to the upload server.
 * @return {string} the client ID.
 * @override
 */
apps.uploader.JavaUploader.prototype.getClientId = function() {
  return 'scotty java';
};


/** @override */
apps.uploader.JavaUploader.prototype.isInitialized = function() {
  return this.loaded_;
};


/** @override */
apps.uploader.JavaUploader.prototype.isResumable = function() {
  return true;
};


/** @override */
apps.uploader.JavaUploader.prototype.isDirectoryUploadSupported = function() {
  return true;
};


/** @override */
apps.uploader.JavaUploader.prototype.queueAllFiles = function() {
  goog.array.forEach(this.getFiles(), this.queueFilesRecursively, this);
};


// ----------------------------------------------------------------------------
// Public Static Functions
// ----------------------------------------------------------------------------


/**
 * Returns whether a usable version of Java is available.
 * @return {boolean} Whether a usable version of Java is available.
 */
apps.uploader.JavaUploader.isJavaAvailable = function() {
  return apps.uploader.javadetection.isEnabled('1.5.0_0');
};


// ----------------------------------------------------------------------------
// Protected Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Creates a {@link apps.uploader.net.JavaFileIo} request object.
 * @param {apps.uploader.File} file The file instance to upload.
 * @return {!apps.uploader.net.JavaFileIo} The request object.
 * @protected
 * @override
 */
apps.uploader.JavaUploader.prototype.createFileIo = function(file) {
  return new apps.uploader.net.JavaFileIo(file, this.applet_);
};


/**
 * @return {apps.uploader.Session.TransferMechanism} Resumable put.
 * @protected
 */
apps.uploader.JavaUploader.prototype.getTransferMechanism = function() {
  return apps.uploader.Session.TransferMechanism.PUT;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Creates a unique id to identify applet elements.
 * @return {string} The new id.
 * @private
 */
apps.uploader.JavaUploader.prototype.createAppletId_ = function() {
  return apps.uploader.JavaUploader.JAVA_API_PREFIX_ +
      apps.uploader.JavaUploader.javaApiCount_++;
};


/**
 * Moves the applet element to a non visible location.
 * @private
 */
apps.uploader.JavaUploader.prototype.moveAppletOffScreen_ = function() {
  var pos = '-' + this.appletDimension_ + 'px';
  goog.style.setStyle(this.applet_, {'top': pos, 'left': pos});
};


/**
 * Moves the applet to the center of the page.  This allows the file dialog
 * (which centers itself relative to the applet) to appear in the center of
 * the page.
 * @private
 */
apps.uploader.JavaUploader.prototype.centerApplet_ = function() {
  var pos = '50%';
  goog.style.setStyle(this.applet_, {'top': pos, 'left': pos});
};


/**
 * Handler for receiving selected files from the Java applet, and
 * representing them in a manner that is understood by the JS client
 * library.
 * @param {string} filesJson JSON specifying the files to upload.
 * @private
 */
apps.uploader.JavaUploader.prototype.onFilesSelected_ = function(filesJson) {
  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_STARTED));

  if (this.replaceFilesOnSelect_) {
    this.clearFileList();
  }

  // Get generic files that were selected.
  var files = /** @type {Array} */(goog.json.parse(filesJson));
  var genericFiles = goog.array.map(files, goog.bind(function(fileJson) {
    var entry = this.createEntryFromJson_(fileJson);
    if (entry instanceof apps.uploader.Directory) {
      this.addEntriesFromJsonToDirectory_(
          fileJson[apps.uploader.JavaUploader.FileJsonKey_.CHILDREN],
          entry, /** @type {apps.uploader.Directory} */ (entry));
    }
    return entry;
  }, this));

  this.dispatchEvent(new goog.events.Event(
      apps.uploader.EventType.FILES_SCAN_FINISHED));
  var result = this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.FILES_SELECTED, genericFiles));
  if (!result) {
    return;
  }

  goog.array.forEach(genericFiles, function(file, index) {
    this.addFile(file);
  }, this);

  this.dispatchEvent(new apps.uploader.FileListEvent(
      apps.uploader.EventType.ALL_FILES_ADDED, genericFiles));
};


/**
 * Recursively adds file entries to the specified parent file.
 * @param {Array.<Object>} entriesJson Directory entry raw JSON objects.
 * @param {apps.uploader.File} parent Parent file of the specified entries.
 * @param {apps.uploader.Directory} directoryToUpdate The top level directory
 *     through which the parent and entries were originally selected.
 * @private
 */
apps.uploader.JavaUploader.prototype.addEntriesFromJsonToDirectory_ =
    function(entriesJson, parent, directoryToUpdate) {
  for (var i = 0; i < entriesJson.length; i++) {
    var entryJson = entriesJson[i];
    var entry = this.createEntryFromJson_(entryJson);
    entry.setDirectoryToUpdateOnChange(directoryToUpdate);
    if (entry instanceof apps.uploader.Directory) {
      var childEntriesJson =
          entryJson[apps.uploader.JavaUploader.FileJsonKey_.CHILDREN];
      // The directory may be empty, that is, it may have no child entries.
      // If it has children, recurse and process it properly. Otherwise, add
      // in a special directory indicator file and do not recurse.
      if (childEntriesJson) {
        this.addEntriesFromJsonToDirectory_(
            childEntriesJson, entry, directoryToUpdate);
      } else {
        // Add a single, special file to the parent directory, to ensure that it
        // gets created. This file is known as a directory indicator file, and
        // is automatically sent in the Chrome-based folder upload files. Here,
        // we must manually create it.
        var relativePath = entry.getName() + apps.uploader.File.PATH_SEPARATOR;
        var directoryIndicatorFile = new apps.uploader.File(
            relativePath + apps.uploader.File.DIRECTORY_INDICATOR_FILENAME,
            0, // size
            relativePath);

        // Add the directory indicator file directly to this entry. This file
        // will be the only file present as the otherwise empty directory's
        // children, and will ensure the folder tree gets created correctly.
        entry.addEntry(directoryIndicatorFile);
      }
    }
    parent.addEntry(entry);
  }
};


/**
 * Constructs a file from the raw file JSON received from the applet.
 * @param {Object} fileJson The raw JSON object representing a file.
 * @return {!apps.uploader.File} A newly constructed file with the
 *     properties specified in the raw JSON object.
 * @private
 */
apps.uploader.JavaUploader.prototype.createEntryFromJson_ =
    function(fileJson) {
  var path = fileJson[
      apps.uploader.JavaUploader.FileJsonKey_.RELATIVE_DIRECTORY_PATH];
  // File count can be 0, which is "falsey," so we need a special check here.
  if (goog.isDefAndNotNull(
      fileJson[apps.uploader.JavaUploader.FileJsonKey_.FILE_COUNT])) {
    return new apps.uploader.Directory(
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.NAME],
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.SIZE],
        path,
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.SELECTION_ID],
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.FILE_COUNT]);
  } else {
    return new apps.uploader.File(
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.NAME],
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.SIZE],
        path,
        fileJson[apps.uploader.JavaUploader.FileJsonKey_.SELECTION_ID]);
  }
};
