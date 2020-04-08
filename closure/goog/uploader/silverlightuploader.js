

/**
 * @fileoverview An extension of the BaseUploader which uses a Silverlight based
 * upload mechanism.
 *
 * @author azzie@google.com (Marcin Marszalek)
 */


goog.provide('apps.uploader.SilverlightUploader');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.ErrorCode');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.FileListEvent');
goog.require('apps.uploader.UploaderEvent');
goog.require('apps.uploader.net.SilverlightFileIo');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.safe');
goog.require('goog.events.Event');
goog.require('goog.html.SafeHtml');
goog.require('goog.html.SafeUrl');
goog.require('goog.log');
goog.require('goog.string.Const');
goog.require('goog.structs.Map');
goog.require('goog.style');



/**
 * Creates a new SilverlightUploader object.
 * @param {string} xapUrl The URL of the XAP file containing the Silverlight
 *     application binaries.
 * @param {string=} opt_id Element id for the created HTML object which is
 *     hosting the Silverlight application.
 * @constructor
 * @extends {apps.uploader.BaseUploader}
 */
apps.uploader.SilverlightUploader = function(xapUrl, opt_id) {
  apps.uploader.BaseUploader.call(this);

  /**
   * Element id of the hosting HTML object.
   * @type {string}
   * @private
   */
  this.id_ = opt_id || apps.uploader.SilverlightUploader.DEFAULT_OBJECT_ID_;

  /**
   * URL of the XAP file containing the Silverlight application.
   * @type {string}
   * @private
   */
  this.xapUrl_ = xapUrl;

  /**
   * HTML object element hosting the Silverlight application, available after
   * the application was installed.
   * @type {Element}
   * @private
   */
  this.appElement_ = null;

  /**
   * Silverlight uploader object, available after the application has loaded.
   * @type {Object}
   * @private
   */
  this.appUploader_ = null;

  /**
   * Maintains a mapping of Silverlight file ids to corresponding
   * SilverlightFileIo objects.
   * @type {!goog.structs.Map.<number,!apps.uploader.net.SilverlightFileIo>}
   * @private
   */
  this.fileIoMap_ = new goog.structs.Map();

  /**
   * The logger used by this object.
   * @type {goog.log.Logger}
   * @protected
   */
  this.logger =
      goog.log.getLogger('apps.uploader.SilverlightUploader');

  if (!apps.uploader.SilverlightUploader.installedUploaders_) {
    apps.uploader.SilverlightUploader.installedUploaders_ =
        new goog.structs.Map();
  }
};
goog.inherits(apps.uploader.SilverlightUploader, apps.uploader.BaseUploader);


/**
 * Default id for the HTML object element hosting the Silverlight application.
 * @type {string}
 * @private
 */
apps.uploader.SilverlightUploader.DEFAULT_OBJECT_ID_ = 'silverlightObject';


/**
 * Global mapping of HTML object element ids to SilverlightUploader objects.
 * @type {goog.structs.Map.<string,!apps.uploader.SilverlightUploader>}
 * @private
 */
apps.uploader.SilverlightUploader.installedUploaders_ = null;


// ----------------------------------------------------------------------------
// Public Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/** @override */
apps.uploader.SilverlightUploader.prototype.install =
    function(opt_overlayElement) {
  var installedUploaders =
      apps.uploader.SilverlightUploader.installedUploaders_;
  if (installedUploaders.containsKey(this.id_)) {
    throw new Error('A Silverlight uploader with the same tag already exists');
  }
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_INSTALLING, this));

  var WIDTH = 128;
  var HEIGHT = 32;

  var attrs = {
    'id': this.id_,
    'type': 'application/x-silverlight-2',
    'data': goog.html.SafeUrl.fromConstant(goog.string.Const.from(
        'data:application/x-silverlight-2,')),
    'width': WIDTH,
    'height': HEIGHT
  };
  var params = {
    'source': this.xapUrl_,
    'onload': 'silverlightOnLoad',
    'onerror': 'silverlightOnError'
  };
  if (goog.DEBUG) {
    params['debug'] = 'true';
  }
  var style = {
    'position': 'absolute',
    'top': '-' + HEIGHT + 'px',
    'left': '-' + WIDTH + 'px',
    'width': WIDTH,
    'height': HEIGHT
  };

  var htmlParams = [];
  for (var i in params) {
    htmlParams.push(
        goog.html.SafeHtml.create('param', {'name': i, 'value': params[i]}));
  }

  var document = goog.dom.getDocument();
  var dom = goog.dom.getDomHelper(document.body);
  // Register a global function so that Silverlight can call it
  // when the application loads.
  goog.global['silverlightOnLoad'] =
      apps.uploader.SilverlightUploader.onApplicationLoaded_;
  goog.global['silverlightOnError'] =
      apps.uploader.SilverlightUploader.onApplicationError_;
  var container = dom.createDom('div');
  goog.style.setStyle(container, style);
  dom.appendChild(document.body, container);
  goog.dom.safe.setInnerHtml(container,
      goog.html.SafeHtml.create('object', attrs, htmlParams));
  goog.log.info(this.logger,
      'Inserted the Silverlight object into DOM: ' + this.id_);
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.APPLET_INSERTED_IN_DOM, this));
  this.appElement_ = dom.getElement(this.id_);
  installedUploaders.set(this.id_, this);
};


/** @override */
apps.uploader.SilverlightUploader.prototype.uninstall =
    function(opt_overlayElement) {
  var installedUploaders =
      apps.uploader.SilverlightUploader.installedUploaders_;
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_UNINSTALLING, this));
  goog.dom.removeNode(this.appElement_);
  installedUploaders.remove(this.id_);
};


/**
 * @override
 */
apps.uploader.SilverlightUploader.prototype.getClientId = function() {
  return 'scotty silverlight';
};


/** @override */
apps.uploader.SilverlightUploader.prototype.isInitialized = function() {
  return !!this.appUploader_;
};


/** @override */
apps.uploader.SilverlightUploader.prototype.isResumable = function() {
  return true;
};


/** @inheritDoc */
apps.uploader.SilverlightUploader.prototype.isRecoverySupported = function() {
  return true;
};


/**
 * @override
 */
apps.uploader.SilverlightUploader.prototype.addFileItems = function(
    opt_replace) {
  if (!this.initialize_()) {
    return;
  }
  var userSelection = this.appUploader_['Browse']();
  if (userSelection && userSelection['length']) {
    this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_STARTED));

    var files = [];
    // We do not use goog.array.map here, as builtins are sometimes not
    // compatible with object arrays produced by JavaScript <-> Silverlight
    // bridge. Opera is a good example.
    for (var i = 0; i < userSelection['length']; ++i) {
      var selectedFile = userSelection[i];
      // Read the int64 as string to work around a bug in Moonlight HTML bridge.
      files[i] = new apps.uploader.File(
          selectedFile['FileName'],
          Number(selectedFile['SizeBytesAsString']),
          '',
          selectedFile['FileId']);
    }
    this.dispatchEvent(new goog.events.Event(
        apps.uploader.EventType.FILES_SCAN_FINISHED));
    this.dispatchEvent(new apps.uploader.FileListEvent(
        apps.uploader.EventType.FILES_SELECTED, files));

    goog.array.forEach(files, function(file) {
      this.addFile(file);
    }, this);
    this.dispatchEvent(new apps.uploader.FileListEvent(
        apps.uploader.EventType.ALL_FILES_ADDED, files));
  }
};


/**
 * Removes a file from the file list and frees any associated resources held by
 * the application.
 * @param {apps.uploader.File} file The file to remove.
 * @override
 */
apps.uploader.SilverlightUploader.prototype.removeFile = function(file) {
  var id = file.getSelectionId();
  apps.uploader.SilverlightUploader.superClass_.removeFile.call(this, file);
  this.appUploader_['Discard'](id);
  this.fileIoMap_.remove(id);
};


// ----------------------------------------------------------------------------
// Private Methods - Overridden by subclasses.
// ----------------------------------------------------------------------------


/**
 * Creates a {@link apps.uploader.net.SilverlightFileIo} I/O object.
 * @param {apps.uploader.File} file The file to upload.
 * @return {!apps.uploader.net.SilverlightFileIo} The I/O object.
 * @protected
 * @override
 */
apps.uploader.SilverlightUploader.prototype.createFileIo = function(file) {
  if (!this.appUploader_) {
    throw new Error('The Silverlight application has not yet loaded');
  }
  var fileIo = new apps.uploader.net.SilverlightFileIo(
      /** @type {!apps.uploader.File} */ (file), this.appUploader_);
  this.fileIoMap_.set(file.getSelectionId(), fileIo);
  return fileIo;
};


// ----------------------------------------------------------------------------
// Private Methods
// ----------------------------------------------------------------------------


/**
 * Initializes the uploader after the Silverlight application was loaded.
 * @return {boolean} Whether the uploader is initialized.
 * @private
 */
apps.uploader.SilverlightUploader.prototype.initialize_ = function() {
  // Do nothing if already initialized.
  if (this.appUploader_) {
    return true;
  }
  // This is a special Silverlight field to get the application content.
  var content = this.appElement_['Content'];
  if (!content) {
    goog.log.error(this.logger, 'Error accessing Silverlight application');
    this.dispatchEvent(new apps.uploader.UploaderEvent(
        apps.uploader.EventType.APPLET_FAILED_TO_INITIALIZE, this));
    return false;
  }
  // Here we access our Silverlight Uploader class. This will throw if the
  // Silverlight application did not load properly.
  try {
    this.appUploader_ = content['Uploader'];
  } catch (e) {}
  if (!this.appUploader_) {
    goog.log.error(this.logger,
        'The Silverlight application did not load properly');
    this.dispatchEvent(new apps.uploader.UploaderEvent(
        apps.uploader.EventType.APPLET_FAILED_TO_INITIALIZE, this));
    return false;
  }
  this.appUploader_['OnStateUpdate'] =
      apps.uploader.SilverlightUploader.onApplicationStateUpdate_;
  goog.log.info(this.logger,
      'The Silverlight application has loaded: ' + this.id_);
  this.dispatchEvent(new apps.uploader.UploaderEvent(
      apps.uploader.EventType.UPLOADER_READY, this));
  return true;
};


/**
 * Fails the uploader after an exception was encountered. This should rarely
 * happen, but if it does, then any upload in progress most likely has failed.
 * An error should be dispatched in such case.
 * @param {string} message An error message.
 * @private
 */
apps.uploader.SilverlightUploader.prototype.fail_ = function(message) {
  goog.log.error(this.logger,
      'The Silverlight application has failed: ' + this.id_);

  if (!this.appUploader_) {
    this.dispatchEvent(new apps.uploader.UploaderEvent(
        apps.uploader.EventType.APPLET_FAILED_TO_LOAD, this));
  }

  goog.array.forEach(this.fileList, function(file) {
    if (this.getFileState(file) == apps.uploader.File.State.TRANSFER) {
      this.getFileIo(file).handleError(
          apps.uploader.ErrorCode.EXCEPTION, message);
    }
  }, this);
};


// ----------------------------------------------------------------------------
// Private Static Functions
// ----------------------------------------------------------------------------


/**
 * Converts a Silverlight scriptable object to a JavaScript uploader instance.
 * @param {!Object} sender Silverlight event dispatcher.
 * @return {!apps.uploader.SilverlightUploader} The corresponding uploader.
 * @private
 */
apps.uploader.SilverlightUploader.getUploader_ = function(sender) {
  var installedUploaders =
      apps.uploader.SilverlightUploader.installedUploaders_;
  try {
    // This might throw if the sender is not a Silverlight uploader object, for
    // example in the OnLoad call on IE8 - which is strange, but it's a fact.
    var id = sender['Id'];
    if (id) {
      return /** @type {!apps.uploader.SilverlightUploader} */ (
          installedUploaders.get(id));
    }
  } catch (e) {}
  try {
    // This is a special Silverlight method to get the host element.
    var hostElement = /** @type {Element} */ (sender['GetHost']());
    return /** @type {!apps.uploader.SilverlightUploader} */ (
        installedUploaders.get(hostElement.id));
  } catch (e) {}
  throw new Error('Failed to obtain the Silverlight host element ID');
};


/**
 * Handles the Silverlight application onload event.
 * @param {!Object} sender Silverlight event dispatcher.
 * @private
 */
apps.uploader.SilverlightUploader.onApplicationLoaded_ = function(sender) {
  var uploader = apps.uploader.SilverlightUploader.getUploader_(sender);
  if (uploader) {
    uploader.initialize_();
  }
};


/**
 * Handles the Silverlight application file upload state change event.
 * @param {!Object} sender Silverlight event dispatcher.
 * @param {!Object} state Silverlight upload state.
 * @private
 */
apps.uploader.SilverlightUploader.onApplicationStateUpdate_ = function(
    sender, state) {
  var uploader = apps.uploader.SilverlightUploader.getUploader_(sender);
  var fileIo = uploader.fileIoMap_.get(state['FileId']);
  fileIo.onStateUpdate(state);
};


/**
 * Handles the Silverlight application error event.
 * @param {Object} sender Silverlight event dispatcher.
 * @param {!Object} error Silverlight error object.
 * @private
 */
apps.uploader.SilverlightUploader.onApplicationError_ = function(
    sender, error) {
  var message = error['errorMessage'] || error['Message'] || '';
  if (message) {
    var logger =
        goog.log.getLogger('apps.uploader.SilverlightUploader[App]');
    goog.log.error(logger, message);
  }

  var uploader = null;
  if (sender) {
    try {
      // This might throw for senders other than Uploader or root visual.
      uploader = apps.uploader.SilverlightUploader.getUploader_(sender);
    } catch (e) {}
  }

  if (uploader) {
    uploader.fail_(message);
  } else {
    // This is dumb, but should rarely happen. And if it does,
    // we want to know about the exception whatever it takes.
    goog.array.forEach(
        apps.uploader.SilverlightUploader.installedUploaders_.getValues(),
        function(uploader) {
          uploader.fail_(message);
        });
  }
};
