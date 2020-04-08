/**
 * @fileoverview A clipboard that uses
 * {@code office.clipboard.TransferAgent}s to interface with system clipboards.
 *

 */

goog.provide('office.clipboard.SystemClipboard');
goog.provide('office.clipboard.SystemClipboard.TextMode');

goog.require('office.clipboard.BaseClipboard');
goog.require('office.clipboard.Clip');
goog.require('office.clipboard.ClipboardError');
goog.require('office.clipboard.Digest');
goog.require('office.clipboard.HtmlUtil');
goog.require('office.clipboard.MimeType');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.log');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');



/**
 * Clipboard that supports clips as HTML strings. HTML clips are stored on the
 * system clipboard. This class uses a office.clipboard.TransferAgent instance to
 * interface with the system's clipboard.
 * @param {!office.clipboard.TransferAgent} transferAgent The transfer agent
 *     to access the system clip data.
 * @param {office.clipboard.SystemClipboard.TextMode} textMode The text mode.
 * @param {!office.html.HtmlTextConverter} htmlTextConverter
 * @param {!Array.<string>=} opt_mimeTypes The additional string-format MIME
 *     types with are supported.
 * @param {!Array.<string>=} opt_nativeMimeTypes MIME types supported with
 *     custom logic in the Clipboard.
 * @constructor
 * @struct
 * @extends {office.clipboard.BaseClipboard}
 */
office.clipboard.SystemClipboard = function(
    transferAgent, textMode, htmlTextConverter, opt_mimeTypes,
    opt_nativeMimeTypes) {
  var customMimeTypes = opt_mimeTypes || [];
  var nativeMimeTypes = office.clipboard.SystemClipboard.MIME_TYPES_.concat(
      opt_nativeMimeTypes);
  goog.base(this,
      nativeMimeTypes.concat(customMimeTypes),
      'nch-');

  /**
   * The transfer agent to read and write the clip data.
   * @type {!office.clipboard.TransferAgent}
   * @private
   */
  this.transferAgent_ = transferAgent;

  /**
   * The text mode.
   * @type {office.clipboard.SystemClipboard.TextMode}
   * @private
   */
  this.textMode_ = textMode;

  /** @private {!office.html.HtmlTextConverter} */
  this.htmlTextConverter_ = htmlTextConverter;

  /**
   * @type {goog.log.Logger}
   * @private
   */
  this.logger_ = goog.log.getLogger(
      'office.clipboard.SystemClipboard');

  /**
   * The set of custom MIME types whose data is expected as a string.
   * @type {!Object}
   * @private
   */
  this.customMimeTypes_ = goog.object.createSet(customMimeTypes);
  goog.asserts.assert(!this.customMimeTypes_[office.clipboard.MimeType.TEXT],
      'Use textMode to configure plain text support');

  /**
   * Map of currently active handles to readable MIME type for that handle.
   * @type {Object.<string, !Array.<string>>}
   * @private
   */
  this.readableMimeTypes_ = {};
};
goog.inherits(office.clipboard.SystemClipboard, office.clipboard.BaseClipboard);


/**
 * Default MIME types supported by this clipboard.
 * @type {!Array.<office.clipboard.MimeType>}
 * @const
 * @private
 */
office.clipboard.SystemClipboard.MIME_TYPES_ = [
  office.clipboard.MimeType.DOCS_HTML_CLIP,
  office.clipboard.MimeType.DOCS_HTML_CONTEXT,
  office.clipboard.MimeType.HTML,
  office.clipboard.MimeType.TEXT
];


/**
 * MIME types for images that can be imported from the clipboard. Ordered by
 * type preference (most preferred type = first, typically non-lossy formats).
 * @type {!Array.<office.clipboard.MimeType>}
 * @private
 */
office.clipboard.SystemClipboard.IMAGE_MIME_TYPES_ =
    [
      office.clipboard.MimeType.IMAGE_PNG,
      office.clipboard.MimeType.IMAGE_GIF,
      office.clipboard.MimeType.IMAGE_BMP,
      office.clipboard.MimeType.IMAGE_JPEG,
      office.clipboard.MimeType.IMAGE_JPG
    ];


/**
 * The prefix used to indicate that a source tag originated from this
 * application.
 * @type {string}
 * @private
 */
office.clipboard.SystemClipboard.INTERNAL_SOURCE_ID_PREFIX_ =
    goog.events.getUniqueId('clipboard-source-id-prefix-');


/**
 * Regular expression used to search for a tag with an id attribute whose value
 * contains the prefix attached to a GUID. The expression also contains a
 * capturing group around the GUID. Note that the regexp is constructed so a
 * marker can only match inside a tag; specifically it will ignore text nodes.
 * Note that IE browsers older than v9 will not quote the attribute value, and
 * hence will not match this regexp.
 * @type {RegExp}
 * @private
 */
office.clipboard.SystemClipboard.internalGuidRegexp_ = new RegExp(
    '<[^>]*[\\s"\'][Ii][Dd]=["\']' +
    office.clipboard.SystemClipboard.INTERNAL_SOURCE_ID_PREFIX_ +
    '([^>]+?)["\'][^>]*>');


/**
 * Regular expression used to determine if html contains a single image tag.
 * @type {RegExp}
 * @private
 */
office.clipboard.SystemClipboard.singleImageHtmlRegexp_ = new RegExp(
    '^<img [^>]*src="[^">]+"[^>]*>$');


/**
 * Size of window from the start of the target HTML where we look for the
 * internal source marker. This value should be large enough so that the first
 * "real" (not inserted by browser) tags of the target content falls within
 * the window with a good margin (to allow for lots of autogenerated style
 * directives etc.). Making the window very large could impact performance
 * negatively.
 * @type {number}
 * @private
 */
office.clipboard.SystemClipboard.INTERNAL_SOURCE_LOOKUP_WINDOW_ = 4096;


/**
 * Get the TransferAgent.
 * @return {!office.clipboard.TransferAgent}
 * @protected
 */
office.clipboard.SystemClipboard.prototype.getTransferAgent = function() {
  return this.transferAgent_;
};


/** @override */
office.clipboard.SystemClipboard.prototype.setClipInternal = function(
    clip, guid, handle) {
  var mimeType = clip.getMimeType();
  switch (mimeType) {
    case office.clipboard.MimeType.DOCS_HTML_CLIP:
      var clipGuid = guid || this.newGuid();
      this.setSelection_(this.getStringOrEmpty_(clip.getData()), clipGuid);
      break;
    case office.clipboard.MimeType.DOCS_HTML_CONTEXT:
      this.transferAgent_.setData(office.clipboard.MimeType.DOCS_HTML_CONTEXT,
          this.getStringOrEmpty_(clip.getData()));
      break;
    case office.clipboard.MimeType.HTML:
      this.transferAgent_.setData(office.clipboard.MimeType.HTML,
          this.getStringOrEmpty_(clip.getData()));
      break;
    case office.clipboard.MimeType.TEXT:
      this.setTextData_(this.getStringOrEmpty_(clip.getData()));
      break;
    default:
      if (this.customMimeTypes_[mimeType]) {
        this.transferAgent_.setData(
            mimeType, this.getStringOrEmpty_(clip.getData()));
        return;
      }
      throw new office.clipboard.ClipboardError(
          office.clipboard.ClipboardError.Code.MIMETYPE_UNKNOWN,
          'Cannot set clip with MIME type ' + clip.getMimeType());
  }
};


/** @override */
office.clipboard.SystemClipboard.prototype.getClipInternal =
    function(mimeType, handle, timeout, guid) {
  if (guid == office.clipboard.BaseClipboard.NULL_GUID) {
    return goog.async.Deferred.succeed(
        new office.clipboard.Clip(mimeType, null /* data */));
  }
  if (this.customMimeTypes_[mimeType]) {
    return this.transferAgent_.getData(office.clipboard.MimeType.HTML).
        addCallback(goog.bind(this.getDeferredCustomMimeTypeClip_, this,
            mimeType, guid));
  }

  switch (mimeType) {
    case office.clipboard.MimeType.TEXT:
      return this.transferAgent_.getData(office.clipboard.MimeType.HTML).
          addCallback(goog.bind(this.getTextData_, this, handle, guid));
    case office.clipboard.MimeType.HTML:
    case office.clipboard.MimeType.DOCS_HTML_CLIP:
      return this.transferAgent_.getData(office.clipboard.MimeType.HTML).
          addCallback(
              goog.bind(this.getHtmlClip_, this, handle, mimeType, guid));
    default:
      return this.getClipOptNativeMimeTypes(mimeType, handle, timeout, guid);
  }
};


/**
 * Gets clip for optional Native mimetypes.
 * @param {string} mimeType MIME type of the clip to retrieve.
 * @param {string} handle The clip handle.
 * @param {number|undefined} timeout Optional timeout in milliseconds. If
 *     unspecified or 0, no timeout is in effect.
 * @param {string} guid The clip guid associated with the handle, the empty
 *     string if none.
 * @return {!goog.async.Deferred} The retrieved clip. The clip MIME type and
 *     handle will be set to the mimeType and opt_handle parameters
 *     respectively.
 * @throws {office.clipboard.ClipboardError} If an error occurs.
 * @protected
 */
office.clipboard.SystemClipboard.prototype.getClipOptNativeMimeTypes =
    function(mimeType, handle, timeout, guid) {
  throw new office.clipboard.ClipboardError(
      office.clipboard.ClipboardError.Code.MIMETYPE_UNKNOWN,
      'Unhandled MIME type ' + mimeType);
};


/** @override */
office.clipboard.SystemClipboard.prototype.getClipHandle =
    function(opt_digests) {
  var handle = goog.base(this, 'getClipHandle', opt_digests);
  this.cacheReadableMimeTypes_(handle);
  return handle;
};


/**
 * Gets a deferred clip for a custom mimetype. The html is used for guid
 * matching. Note that guids are not matched if the guid is an empty string.
 * @param {string} mimeType The requested clip mimetype.
 * @param {string} guid The guid to match.
 * @param {?string} html The html.
 * @return {!goog.async.Deferred} A deferred for the clip.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getDeferredCustomMimeTypeClip_ =
    function(mimeType, guid, html) {
  // When matching guids for a custom mimetype, we need to make sure that some
  // office-issued guid is present in the html. This makes sure that the document
  // slice is not pasted if the user is attempting to do a plain-text paste.
  if (this.isMatchingGuid_(guid, html, this.textMode_ == office.clipboard.
      SystemClipboard.TextMode.IMPLICIT /* opt_forceCheckHtmlGuid */)) {
    return this.transferAgent_.getData(mimeType).addCallback(function(data) {
      return new office.clipboard.Clip(mimeType, data);
    });
  } else {
    return goog.async.Deferred.succeed(
        new office.clipboard.Clip(mimeType, null));
  }
};


/**
 * Checks that html represents an image, and there are image bytes available.
 * @param {?string} html The html.
 * @param {string} handle The handle.
 * @return {boolean} Returns true if html is a single img tag and there are
 *     image bytes available, otherwise false.
 * @private
 */
office.clipboard.SystemClipboard.prototype.isSingleImageDataAvailable_ =
    function(html, handle) {
  return !!office.clipboard.SystemClipboard.singleImageHtmlRegexp_.exec(html) &&
      !!this.getImageType_(handle);
};


/**
 * Retrieves any recognized image from the clipboard as HTML.
 * @param {string} handle The handle.
 * @return {!goog.async.Deferred} Retrieved image as an HTML string.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getImageAsHtml_ = function(handle) {
  // Look for a recognized image on the clipboard, and if found, return it.
  var imageType = this.getImageType_(handle);
  if (imageType) {
    return this.transferAgent_.getData(imageType).addCallback(
        function(dataUrl) {
          return dataUrl ? '<img src="' + dataUrl + '">' : null;
        }, this);
  } else {
    return goog.async.Deferred.succeed(null /* data */);
  }
};


/**
 * Gets a clip from the HTML with matching guids. Note that guids are not
 * matched if the guid is an empty string.
 * @param {string} handle The handle.
 * @param {string} mimeType The requested clip mimetype.
 * @param {string} guid The guid to match.
 * @param {?string} html The html.
 * @return {!goog.async.Deferred} The deferred containing the HTML clip.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getHtmlClip_ =
    function(handle, mimeType, guid, html) {
  var imageFn = function(imageHtml) {
    return new office.clipboard.Clip(mimeType, imageHtml);
  };
  return this.getCheckedClip(handle, mimeType, guid, html, imageFn,
      new office.clipboard.Clip(mimeType, html));
};


/**
 * Checks clips for matching GUID. If relevant (if no HTML is available),
 * checks for and returns an image clip.
 * @param {string} handle The handle.
 * @param {string} mimeType The requested clip mimetype.
 * @param {string} guid The guid to match.
 * @param {?string} html The html.
 * @param {function(?string): office.clipboard.Clip} imageFn
 * @param {!office.clipboard.Clip} successClip clip to return in deferred if GUIDs
 *    match and html is not empty.
 * @return {!goog.async.Deferred} The deferred containing the HTML clip.
 * @protected
 */
office.clipboard.SystemClipboard.prototype.getCheckedClip =
    function(handle, mimeType, guid, html, imageFn, successClip) {
  if (!this.isMatchingGuid_(guid, html)) {
    return goog.async.Deferred.succeed(
        new office.clipboard.Clip(mimeType, null /* data */));
  }

  // If the html is empty, look for images in the clipboard.
  if (this.isEmpty_(html) || this.isSingleImageDataAvailable_(html, handle)) {
    return this.getImageAsHtml_(handle).addCallback(imageFn);
  }

  return goog.async.Deferred.succeed(successClip);
};


/**
 * Determines if the guid is matching and the data should be returned.
 * @param {string} guid The guid to match.
 * @param {?string} html The html.
 * @param {boolean=} opt_forceCheckHtmlGuid Whether to force checking that the
 *     guid matches what is in the html.
 * @return {boolean} Whether the guid is matching.
 * @private
 */
office.clipboard.SystemClipboard.prototype.isMatchingGuid_ = function(
    guid, html, opt_forceCheckHtmlGuid) {
  // The empty string guid should be considered to always match if we are not
  // force checking the guid.
  if (!opt_forceCheckHtmlGuid && !guid) {
    return true;
  }

  if (this.isEmpty_(html)) {
    return false;
  }

  var htmlGuid = this.getGuidFromHtml_(html);
  if (opt_forceCheckHtmlGuid && goog.isNull(htmlGuid)) {
    return false;
  }
  return !guid || guid == htmlGuid;
};


/**
 * @param {?string} html The html.
 * @return {?string} The GUID of the copied content, or the null if there isn't
 *     one.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getGuidFromHtml_ = function(html) {
  // When the iframe target is copied via a Select All event, some random crazy
  // 'Apple-style-span' tags can get placed at the top of the hierarchy. In
  // practice this has been observed to be a <font> tag followed by a <span>
  // tag, followed by the stuff expected below (e.g., a <meta> tag with a
  // sibling which is a <div> that encloses the "real" content of the
  // originally-copied iframe.
  // On Safari, empty lines encoded by <br> tags are a problem, because the
  // marker cannot be attached to these, so it will be found on some other node.
  // To account for these and other yet unknown behaviors we just grep for the
  // internal marker form the start of the clipboard HTML.
  var contentToSearch = goog.string.makeSafe(html).substring(0,
      office.clipboard.SystemClipboard.INTERNAL_SOURCE_LOOKUP_WINDOW_);
  var capture = office.clipboard.SystemClipboard.internalGuidRegexp_.
      exec(contentToSearch);
  // The first capturing group in the regular expression matches the GUID.
  return capture && capture.length > 1 ?
      capture[1] :
      null;
};


/** @override */
office.clipboard.SystemClipboard.prototype.getDigestsInternal =
    function(handle, guid) {
  // We only compute digests from the transfer agent if we don't already have a
  // guid.
  var digest = guid ?
      guid :
      this.transferAgent_.getData(office.clipboard.MimeType.HTML).
          addCallback(goog.bind(this.getGuidFromHtml_, this));
  var digests = [
    new office.clipboard.Digest(office.clipboard.Digest.Type.GUID, digest)
  ];
  if (this.textMode_ ==
          office.clipboard.SystemClipboard.TextMode.EXPLICIT_WITH_TEXT_DIGEST) {
    digests.push(new office.clipboard.Digest(office.clipboard.Digest.Type.TEXT,
        this.transferAgent_.getData(office.clipboard.MimeType.TEXT)));
  }
  return digests;
};


/** @override */
office.clipboard.SystemClipboard.prototype.finishInternal =
    function(handle, guid) {
  delete this.readableMimeTypes_[handle];
  if (goog.object.isEmpty(this.readableMimeTypes_)) {
    this.transferAgent_.flushCache();
  }
};


/**
 * Retrives string value, or the empty string if !str. The argument must be of
 * type string for the non-empty case.
 * @param {*} str The potential string.
 * @return {string} The string value.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getStringOrEmpty_ =
    function(str) {
  if (!str) {
    return '';
  }
  if (!goog.isString(str)) {
    throw Error('Expected string type argument.');
  }
  return str;
};


/**
 * Sets the html selection and selects and focuses on it. This is treated as
 * "internal" content that comes from the application.
 * @param {string} selectionHtml The selected text.
 * @param {string} guid The guid associated with this selection.
 * @private
 */
office.clipboard.SystemClipboard.prototype.setSelection_ = function(
    selectionHtml, guid) {
  goog.log.fine(this.logger_, 'SystemClipboard#setSelection_ with guid: ' +
      guid + '.');

  if (selectionHtml) {
    var internalSourceId =
        office.clipboard.SystemClipboard.INTERNAL_SOURCE_ID_PREFIX_ +
        guid;
    // If the selected HTML starts with any html tag, add a distinctive id to
    // the opening tag of this selection to indicate that this selection was
    // generated by this application instance.
    // if (goog.userAgent.WEBKIT) {
    //   // This is needed for Webkit browsers because the Webkit contentEditable
    //   // sanitizer in Chrome 17+ removes the id set on the span tag but
    //   // preserves it for the b tag.
    //   // IE converts the b tag into strong tag inside the selection html and
    //   // the technique in the else block works for FF as well. Use this only for
    //   // Webkit browsers.
    //   selectionHtml = goog.string.buildString(
    //       office.clipboard.HtmlUtil.getContainerPreventStripElementStart(
    //           internalSourceId),
    //       selectionHtml,
    //       office.clipboard.HtmlUtil.getContainerPreventStripElementEnd());
    // } else {
      var firstTagClose = selectionHtml.indexOf('>');
      if (firstTagClose > 0 && selectionHtml.charAt(0) == '<') {
        // Splice an id attribute into the html at the end of the opening tag in
        // the selection.
        selectionHtml = goog.string.buildString(
            selectionHtml.substring(0, firstTagClose),
            ' id="',
            internalSourceId,
            '"',
            selectionHtml.substring(firstTagClose));
      }
    // }
  }

  this.transferAgent_.setData(office.clipboard.MimeType.HTML, selectionHtml);
  if (this.textMode_ == office.clipboard.SystemClipboard.TextMode.IMPLICIT &&
      !this.transferAgent_.getIgnoredHint(office.clipboard.MimeType.TEXT)) {
    this.transferAgent_.setData(office.clipboard.MimeType.TEXT,
        this.htmlTextConverter_.convert(selectionHtml));
  }
};


/**
 * Whether the specified html has no displayable content.
 * @param {?string} html The HTML.
 * @return {boolean} Whether the html has nothing displayable to the user.
 * @private
 */
office.clipboard.SystemClipboard.prototype.isEmpty_ = function(html) {
  //  Webkit has a bug that appends a <br> tag to the end of
  // each pasted selection, even if it's empty, meaning formerly empty
  // selections seem non-empty, and we fail out to our external paste
  // unnecessarily. Remove this clause if/when webkit fixes their <br> bug.
  //  Chrome has its own apparent bug (feature?) that
  // prepends the utf-8 charset meta tag to its browser clipboard contents.
  // Remove this clause also if/when the bug gets fixed.
  if (!html) {
    return true;
  }
  return html == '' || (goog.userAgent.WEBKIT &&
      (html == '\u200B<br>' || html == '\u200B' ||
      html == office.clipboard.HtmlUtil.CHARSET_META_TAG ||
      html == office.clipboard.HtmlUtil.CHARSET_META_TAG + '\u200B' ||
      html == office.clipboard.HtmlUtil.CHARSET_META_TAG + '<br>\u200B' ||
      html == office.clipboard.HtmlUtil.CHARSET_META_TAG + '\u200B<br>'));
};


/**
 * Caches MIME types available for read with this handle and returns the types.
 * @param {string} handle The handle.
 * @return {!Array.<string>} The MIME types.
 * @private
 */
office.clipboard.SystemClipboard.prototype.cacheReadableMimeTypes_ =
    function(handle) {
  // In case the default handle is used, there are no cached types and we need
  // to read fresh off the transfer agent.
  if (this.isDefaultHandle(handle)) {
    return this.transferAgent_.getMimeTypes();
  } else {
    return this.readableMimeTypes_[handle] ||
        (this.readableMimeTypes_[handle] = this.transferAgent_.getMimeTypes());
  }
};


/**
 * Returns type of any recognized image accessible in the scope of this handle.
 * @param {string} handle The handle.
 * @return {?string} Image type, or null if no recognized type.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getImageType_ = function(handle) {
  var readableMimeTypes =
      goog.object.createSet(this.cacheReadableMimeTypes_(handle));
  return goog.array.find(office.clipboard.SystemClipboard.IMAGE_MIME_TYPES_,
      function(type) {
        return type in readableMimeTypes;
      });
};


/**
 * @param {string} handle The handle.
 * @param {string} guid The GUID.
 * @param {string} html The html.
 * @return {!goog.async.Deferred} The clipboard text content.
 * @private
 */
office.clipboard.SystemClipboard.prototype.getTextData_ =
    function(handle, guid, html) {
  if (this.isMatchingGuid_(guid, html)) {
    return this.transferAgent_.getData(office.clipboard.MimeType.TEXT).
        addCallback(function(text) {
          return new office.clipboard.Clip(office.clipboard.MimeType.TEXT, text);
        });
  } else {
    return goog.async.Deferred.succeed(
        new office.clipboard.Clip(office.clipboard.MimeType.TEXT, null));
  }
};


/**
 * @param {string} text The clipboard text content.
 * @private
 */
office.clipboard.SystemClipboard.prototype.setTextData_ = function(text) {
  if (this.textMode_ ==
      office.clipboard.SystemClipboard.TextMode.EXPLICIT_WITH_TEXT_DIGEST) {
    this.transferAgent_.setData(office.clipboard.MimeType.TEXT,
        this.getStringOrEmpty_(text));
    return;
  } else {
    throw new office.clipboard.ClipboardError(
        office.clipboard.ClipboardError.Code.MIMETYPE_UNKNOWN,
        'Cannot set explicit plain text in this text mode.');
  }
};


/**
 * System clipboard plaintext modes.
 * @enum {number}
 */
office.clipboard.SystemClipboard.TextMode = {

  /**
   * Plain text cannot be written and no text digests are available. If
   * the transfer agent accepts plain text a text representation of the HTML
   * passed to setClip is automatically written to the transfer agent.
   */
  IMPLICIT: 0,

  /**
   * Plain text is read and written as other MIME types. The clipboard returns
   * TEXT type digests in addition to GUID. Matching is still on GUID type
   * digest only, however in the case no GUID is specified the requirement that
   * all formats share a matching GUID is relaxed (since we cannot embed a GUID
   * in plain text). This does require that all available clips are projections
   * of each other (i.e., the "same" clip in different formats). For all
   * practical purposes, this should be the case as this is the user expectation
   * on how the system clipboard works.
   */
  EXPLICIT_WITH_TEXT_DIGEST: 1
};
