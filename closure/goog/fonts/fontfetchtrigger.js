/**
 * @fileoverview Contains the definition of the
 * {@code office.fonts.FontFetchTrigger} class.

 */
goog.provide('office.fonts.FontFetchTrigger');

goog.require('office.fonts.FontFetchRequestId');
goog.require('office.storage.FetchRequest');
goog.require('goog.Disposable');



/**
 * A font fetcher that provides the method {@code #fetch} that consume an array
 * of font families and installs them immediately after fetching them.
 * @param {!office.fonts.FontFilter} fontFilter The font filter.
 * @param {!office.storage.FetchProcessor} fetchProcessor The fetch processor.
 * @param {!office.storage.PostProcessor} postProcessor The post processor.
 * @constructor
 * @struct
 * @extends {goog.Disposable}
 */
office.fonts.FontFetchTrigger = function(
    fontFilter, fetchProcessor, postProcessor) {
  goog.base(this);

  /**
   * The font filter.
   * @type {!office.fonts.FontFilter}
   * @private
   */
  this.fontFilter_ = fontFilter;

  /**
   * The fetch processor.
   * @type {!office.storage.FetchProcessor}
   * @private
   */
  this.fetchProcessor_ = fetchProcessor;

  /**
   * The post processor.
   * @type {!office.storage.PostProcessor}
   * @private
   */
  this.postProcessor_ = postProcessor;
};
goog.inherits(office.fonts.FontFetchTrigger, goog.Disposable);


/**
 * Fetches font metadata, installs it, and returns the deferred with the results
 * of the fetch.
 * @param {!Array.<string>} families The font families.
 * @param {boolean=} opt_forceSync Whether to force sync the given families.
 * @return {!goog.async.Deferred} The {@type !Array.<!office.storage.FetchResult>}
 *     deferred results.
 */
office.fonts.FontFetchTrigger.prototype.fetch = function(
    families, opt_forceSync) {
  var filteredFontFamilies = this.fontFilter_.filter(families);
  var fetchRequests = [];
  for (var i = 0; i < filteredFontFamilies.length; i++) {
    fetchRequests.push(new office.storage.FetchRequest(
        new office.fonts.FontFetchRequestId(filteredFontFamilies[i]),
        opt_forceSync));
  }
  var deferredResults = this.fetchProcessor_.process(fetchRequests);
  //  Add retrying for failed fetches to improve current
  // behavior.
  deferredResults.addCallback(this.postProcessor_.process, this.postProcessor_);
  return deferredResults;
};
