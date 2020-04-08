goog.provide('office.localstore.Flags');

goog.require('office.flag');
goog.require('office.localstore.Document');
goog.require('goog.userAgent.product');
goog.require('goog.userAgent.product.isVersion');


/**
 * @enum {string}
 */
office.localstore.Flags = {
  CHROME_VERSION_WITH_IDB_SUPPORT: 'o-c-v',

  ENABLE_OFFLINE: 'y-e-o',

  // The amount of time in ms to allow for IndexedDB lock acquisitions before
  // aborting and falling back to a read-only offline initialization flow. 0
  // means no timeout.
  IDB_LOCK_ACQUISITION_TIMEOUT: goog.events.getUniqueId('office-localstore-ilat'),

  // The amount of time in ms to allow for IndexedDB database open requests to
  // complete before falling back to loading without offline support.
  IDB_OPEN_REQUEST_TIMEOUT: goog.events.getUniqueId('office-localstore-iort'),

  // Flag to limit maximum number of allowed reports in a latency stats record.
  LATENCY_REPORT_ARRAY_LIMIT: goog.events.getUniqueId('office-localstore-lral')
};


/**
 * @return {boolean}
 */
office.localstore.Flags.getEnableIndexedDb = function() {
  var chromeWithIndexdb = goog.userAgent.product.CHROME &&
      goog.userAgent.product.isVersion(office.flag.getInstance().getNumber(
          office.localstore.Flags.CHROME_VERSION_WITH_IDB_SUPPORT));
  var enable =
      office.flag.getInstance().getBoolean(office.localstore.Flags.ENABLE_OFFLINE);
  var edge = goog.userAgent.EDGE;
  //return (enable && !edge && (chromeWithIndexdb || !!window.YIQIXIE))
  return (enable && !edge && chromeWithIndexdb)
  //return true;
  //return
  //     //((goog.userAgent.product.CHROME && goog.userAgent.isVersionOrHigher(40)))
  //    //|| goog.userAgent.product.FIREFOX
  //    //|| (goog.userAgent.product.IE && goog.userAgent.isVersionOrHigher(10))
  //    //|| goog.userAgent.product.SAFARI
  //    //|| goog.userAgent.product.OPERA
  //    //;
};


/**
 * Returns whether offline creation is enabled for a document type.
 * @param {!office.localstore.Document.Type} docType The document type.
 * @return {boolean} True if offline creation is enabled for the doc type.
 */
office.localstore.Flags.getEnableOfflineCreation = function(docType) {
  switch (docType) {
    case office.localstore.Document.Type.VODKA:
    //case office.localstore.Document.Type.PUNCH:
    //case office.localstore.Document.Type.DRAWING:
    case office.localstore.Document.Type.TACO:
      return true;
    default:
      return false;
  }
};


/**
 * Returns whether homescreen is enabled for a document type.
 * @param {!office.localstore.Document.Type} docType The document type.
 * @return {boolean} True if homescreen is enabled for the doc type.
 */
office.localstore.Flags.getEnableDoclist = function(docType) {
  switch (docType) {
    case office.localstore.Document.Type.VODKA:
    //case office.localstore.Document.Type.PUNCH:
    //case office.localstore.Document.Type.DRAWING:
    case office.localstore.Document.Type.TACO:
      return true;
    default:
      return false;
  }
};
