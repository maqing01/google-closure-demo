goog.provide('office.net.UploadHelper');
goog.provide('office.net.UploadHelper.ResponseProperties');

goog.require('apps.uploader.BaseUploader');
goog.require('apps.uploader.EventType');
goog.require('apps.uploader.File');
goog.require('apps.uploader.UploadManager2');
goog.require('apps.uploader.XhrUploader');
goog.require('goog.Disposable');
goog.require('goog.async.Deferred');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events.EventHandler');
goog.require('goog.object');




office.net.UploadHelper = function(documentInfo, uploaderUrl) {
  goog.base(this);


  this.documentInfo_ = documentInfo;


  this.uploaderUrl_ = uploaderUrl;


  this.fileMap_ = {};


  this.pendingFiles_ = [];


  this.eventHandler_ = new goog.events.EventHandler(this);
};
goog.inherits(office.net.UploadHelper, goog.Disposable);





office.net.UploadHelper.ResponseProperties = {
  ID: 'id',
  WIDTH: 'width',
  HEIGHT: 'height',
  SERVICE_ID: 'serviceId'
};



office.net.UploadHelper.SUPPORTED_IMAGE_TYPES_ = goog.object.createSet(
    'image/gif',
    'image/jpeg',
    'image/png');



office.net.UploadHelper.UploaderFileMetaData_ = {
  CONTAINING_COSMO_ID: 'containingCosmoId'
};



office.net.UploadHelper.File_;



office.net.UploadHelper.prototype.uploaderCreated_ = false;



office.net.UploadHelper.prototype.fileWaitingForSelection_ = null;



office.net.UploadHelper.prototype.uploader_ = null;



office.net.UploadHelper.isImageTypeSupported = function(mimeType) {
  return mimeType in office.net.UploadHelper.SUPPORTED_IMAGE_TYPES_;
};



office.net.UploadHelper.prototype.canUpload_ = function() {
  return !!this.uploader_ && !this.fileWaitingForSelection_;
};



office.net.UploadHelper.prototype.upload = function(file) {
  var deferred = new goog.async.Deferred();
  this.documentInfo_.getSaveStateTracker().createAndCall(
      goog.bind(this.uploadAfterCreate_, this, file, deferred));
  return deferred;
};



office.net.UploadHelper.prototype.uploadAfterCreate_ = function(
    file, deferred) {
  var uploadFile = {
    file: file,
    deferred: deferred
  };

  if (this.canUpload_()) {
    this.uploadInternal_(uploadFile);
  } else {
    this.queue_(uploadFile);
  }
};



office.net.UploadHelper.prototype.queue_ = function(file) {
  this.pendingFiles_.push(file);
  if (!this.uploader_) {
    this.createUploader_();
  }
};



office.net.UploadHelper.prototype.uploadInternal_ = function(file) {
  this.fileWaitingForSelection_ = file;
  this.uploader_.addFiles([file.file]);
};



office.net.UploadHelper.prototype.createUploader_ = function() {

  if (this.uploaderCreated_) {
    return;
  }
  this.uploaderCreated_ = true;

  var uploadManager = new apps.uploader.UploadManager2(this.uploaderUrl_);
  uploadManager.restrictMechanisms(
      apps.uploader.UploadManager2.UploadMechanism.XHR);





  var uploaderEl = goog.dom.createDom(goog.dom.TagName.DIV, {'id': 'uploader'});
  goog.dom.appendChild(goog.dom.getDocument().body, uploaderEl);
  uploadManager.setXhrOptions(uploaderEl);
  uploadManager.createUploader(goog.bind(this.handlersUploaderCreated_, this));
};



office.net.UploadHelper.prototype.handlersUploaderCreated_ = function(uploader) {
  if (!uploader || !(uploader instanceof apps.uploader.XhrUploader)) {
    return;
  }

  this.eventHandler_.
      listen(uploader, apps.uploader.EventType.FILES_SELECTED,
          this.handleUploadFilesSelected_).
      listen(uploader, apps.uploader.EventType.UPLOAD_STATE_CHANGED,
          this.handleUploadStateChanged_);

  this.uploader_ = /** @type {!apps.uploader.XhrUploader} */ (uploader);
  this.uploadNextPendingFile_();
};



office.net.UploadHelper.prototype.uploadNextPendingFile_ = function() {
  if (!this.pendingFiles_ || this.pendingFiles_.length == 0) {
    return;
  }
  this.uploadInternal_(this.pendingFiles_.shift());
};



office.net.UploadHelper.prototype.handleUploadFilesSelected_ = function(e) {
  var files = e.files;
  if (files.length != 1) {
    throw new Error('The uploader should have selected exactly one file');
  }
  var file = files[0];

  var metaData = {};
  metaData[office.net.UploadHelper.UploaderFileMetaData_.CONTAINING_COSMO_ID] =
      this.documentInfo_.getCosmoId();
  file.setMetaData(metaData);

  this.fileMap_[file.getId()] = /** @type {!office.net.UploadHelper.File_} */ (
      this.fileWaitingForSelection_);
  this.fileWaitingForSelection_ = null;

  this.uploader_.queueUpload(file);
  this.uploadNextPendingFile_();
};



office.net.UploadHelper.prototype.handleUploadStateChanged_ = function(e) {
  var file = e.file;
  var state = this.uploader_.getFileState(file);
  if (!apps.uploader.BaseUploader.isUploadStateFinal(state)) {
    return;
  }

  var fileId = file.getId();
  var uploadFile = this.fileMap_[fileId];
  if (!uploadFile) {
    throw new Error('No internal representation found for uploaded file.');
  }
  delete this.fileMap_[fileId];

  if (state == apps.uploader.File.State.SUCCESS) {
    var session = this.uploader_.getSession(file);
    var data = session.getFinalizationData();
    if (data) {

      uploadFile.deferred.callback(data);
      return;
    }
  }

  uploadFile.deferred.errback();
};



office.net.UploadHelper.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  goog.dispose(this.eventHandler_);
  goog.dispose(this.uploader_);

  this.fileWaitingForSelection_ = null;
  this.uploader_ = null;

  delete this.eventHandler_;
  delete this.fileMap_;
  delete this.pendingFiles_;
};
