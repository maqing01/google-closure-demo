

/**
 * @fileoverview Transfer agent for Webkit HTML5 clipboard API.
 *

 */
goog.provide('office.clipboard.Html5TransferAgent');

goog.require('office.clipboard.BrowserTransferAgent');
goog.require('office.clipboard.MimeType');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.async.Deferred');
goog.require('goog.events.EventType');
goog.require('goog.fs.FileReader');
goog.require('goog.functions');
goog.require('goog.object');



/**
 * Transfer agent for HTML5 clipboard API. To support HTML5-specific
 * functionality the transfer agent needs access to an in-scope HTML5
 * DataTransfer object. This is done by executing the executeBrowserEventHandler
 * method with a clipboard event, which will in turn execute a given method with
 * the transfer agent configured with any in-scope DataTransfer object of the
 * event.
 * Accesses of type text/html fall back to the chained transfer agent. In
 * addition, text/html writes are always mirrored to the chained transfer agent.
 * Clipboard items will be cached on the first call to getData() and are
 * retained until flushCache() is called.
 * @param {!office.clipboard.BrowserTransferAgent} chainedTransferAgent Transfer
 *     agent to which type text/html writes are chained.
 * @param {!office.clipboard.HtmlPreparer} htmlPreparer The html preparer.
 * @param {(function(string): boolean)=} opt_allowedMimeTypeFn A function to
 *     determine whether the given MIME type is allowed to be read from the
 *     DataTransfer.
 * @constructor
 * @struct
 * @implements {office.clipboard.BrowserTransferAgent}
 * @extends {goog.Disposable}
 */
office.clipboard.Html5TransferAgent = function(
    chainedTransferAgent, htmlPreparer, opt_allowedMimeTypeFn) {
  goog.base(this);

  /**
   * The chained transfer agent.
   * @type {!office.clipboard.BrowserTransferAgent}
   * @private
   */
  this.chainedTransferAgent_ = chainedTransferAgent;

  /**
   * The html preparer.
   * @type {!office.clipboard.HtmlPreparer}
   * @private
   */
  this.htmlPreparer_ = htmlPreparer;

  /**
   * The current HTML5 data transfer. Only set within the handleEvent call
   * graph.
   * @type {DataTransfer}
   * @private
   */
  this.dataTransfer_ = null;

  /**
   * Whether the current DataTransfer was written to.
   * @type {boolean}
   * @private
   */
  this.dataTransferWasWritten_ = false;

  /**
   * Data read cache. Maps from MIME type to data.
   * @type {!Object.<string, !goog.async.Deferred>}
   * @private
   */
  this.readCache_ = {};

  /**
   * A function to determine whether the given MIME type is allowed to be read
   * from the data transfer.
   * @type {function(string): boolean}
   * @private
   */
  this.allowedMimeTypeFn_ = opt_allowedMimeTypeFn || goog.functions.TRUE;
};
goog.inherits(office.clipboard.Html5TransferAgent, goog.Disposable);


/** @override */
office.clipboard.Html5TransferAgent.prototype.setData =
    function(mimeType, data) {
  if (mimeType == office.clipboard.MimeType.HTML ||
      mimeType == office.clipboard.MimeType.DOCS_HTML_CONTEXT) {
    // We need to mirror to the chained transfer agent for middle-click paste
    // and for providing HTML context.
    this.chainedTransferAgent_.setData(mimeType, data);
  }
  if (this.dataTransfer_) {
    if (mimeType == office.clipboard.MimeType.HTML) {
      data = this.htmlPreparer_.prepareHtml(data);
    }
    try {
      this.dataTransfer_.setData(mimeType, data);
    } catch (error) {
      // edge somehow throw an exception

    }
    this.dataTransferWasWritten_ = true;
  }
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.getData = function(mimeType) {
  if (mimeType in this.readCache_) {
    return this.readCache_[mimeType].branch();
  }
  return this.chainedTransferAgent_.getData(mimeType);
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.getMimeTypes = function() {
  var types = [].concat(this.chainedTransferAgent_.getMimeTypes());
  goog.array.extend(types, goog.object.getKeys(this.readCache_));
  goog.array.removeDuplicates(types);
  return types;
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.executeBrowserEventHandler =
    function(fn, e) {
  this.dataTransfer_ = /** @type {DataTransfer} */
      ((e && e.getBrowserEvent()['clipboardData']) || null);
  this.dataTransferWasWritten_ = false;
  try {
    this.readCache_ = {};
    if (this.dataTransfer_ && e.type == goog.events.EventType.PASTE) {
      this.readCache_ = office.clipboard.Html5TransferAgent.createCache_(
          this.dataTransfer_, this.allowedMimeTypeFn_);
    }
    this.chainedTransferAgent_.executeBrowserEventHandler(fn, e);
    if (this.dataTransferWasWritten_) {
      // DataTransfer was written directly, prevent default clip grabbing
      // from the text event target. We can't always do this, since we need to
      // grab clips populated programmatically ahead of the browser event (i.e.,
      // those marked with "externalContent") off the textEventTarget.
      e.preventDefault();
    }
  } finally {
    this.dataTransfer_ = null;
  }
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.flushCache = function() {
  this.readCache_ = {};
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.getIgnoredHint =
    goog.functions.FALSE;


//  Type the item parameter when added to externs.
/**
 * Reads a DataTransfer item.
 * @param {!DataTransfer} dataTransfer The data transfer.
 * @param {!Object} item The item.
 * @return {goog.async.Deferred} The deferred if the item can be read, else
 *     null.
 * @private
 */
office.clipboard.Html5TransferAgent.readItem_ = function(dataTransfer, item) {
  var kind = item['kind'];
  switch (kind) {
    case 'string':
      return goog.async.Deferred.succeed(
          dataTransfer.getData(item['type']));
    case 'file':
      return office.clipboard.Html5TransferAgent.readFile_(
          /** @type {!File} */ (item['getAsFile']()));
    default:
      return null;
  }
};


/**
 * Reads a file.
 * @param {!File} file The file.
 * @return {!goog.async.Deferred} The deferred for the file data as a data url.
 * @private
 */
office.clipboard.Html5TransferAgent.readFile_ = function(file) {
  var deferred = new goog.async.Deferred();
  var asyncRead = goog.fs.FileReader.readAsDataUrl(file);
  asyncRead.addCallback(function(data) {
    deferred.callback(data);
  });
  asyncRead.addErrback(function() {
    deferred.callback(null);
  });
  return deferred;
};


/**
 * Creates a cache of the content that can be read from the data transfer.
 * @param {!DataTransfer} dataTransfer The data transfer object.
 * @return {!Object.<!goog.async.Deferred>} The cached content,
 *     keyed by mimetype and with the value being a deferred.
 * @param {function(string): boolean} allowedMimeTypeFn A function to
 *     determine whether the given MIME type is allowed to be read from the
 *     DataTransfer.
 * @private
 */
office.clipboard.Html5TransferAgent.createCache_ = function(
    dataTransfer, allowedMimeTypeFn) {
  var cache = {};
  // Cache creation for DataTransferItemList.
  if (goog.isDef(dataTransfer['items'])) {
    var items = dataTransfer['items'];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var mimeType = item['type'];
      if (!cache[mimeType] && allowedMimeTypeFn(mimeType)) {
        var deferred = office.clipboard.Html5TransferAgent.readItem_(
            dataTransfer, item);
        if (deferred) {
          cache[mimeType] = deferred;
        }
      }
    }
  } else {
    // Parsing for legacy types/files properties.
    var types = dataTransfer.types || [];
    for (var i = 0; i < types.length; i++) {
      var mimeType = types[i];
      if (!cache[mimeType] && allowedMimeTypeFn(mimeType)) {
        cache[mimeType] =
            goog.async.Deferred.succeed(dataTransfer.getData(mimeType));
      }
    }

    var files = dataTransfer.files || [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var mimeType = file.type;
      if (!cache[mimeType] && allowedMimeTypeFn(mimeType)) {
        cache[mimeType] = office.clipboard.Html5TransferAgent.readFile_(file);
      }
    }
  }
  return cache;
};


/** @override */
office.clipboard.Html5TransferAgent.prototype.disposeInternal = function() {
  goog.dispose(this.chainedTransferAgent_);
  goog.base(this, 'disposeInternal');
};
