/**
 * @fileoverview Contains the definition of the
 * {@code office.fonts.FontPreferenceFetchTrigger} class.

 */
goog.provide('office.fonts.FontPreferenceFetchTrigger');

goog.require('office.fonts.EventType');
goog.require('office.fonts.FontFetchRequestId');
goog.require('office.storage.FetchRequest');
goog.require('goog.Disposable');
goog.require('goog.events.EventHandler');



/**
 * The font preference fetch trigger that listens to font preference change
 * events and processes the fonts contained in this event.
 * @param {!office.fonts.FontPreference} preference The font preference.
 * @param {!office.fonts.FontFilter} fontFilter The font filter.
 * @param {!office.storage.FetchProcessor} fetchProcessor The fetch processor.
 * @param {!office.storage.PostProcessor} postProcessor The post processor.
 * @extends {goog.Disposable}
 * @constructor
 * @struct
 */
office.fonts.FontPreferenceFetchTrigger = function(
    preference, fontFilter, fetchProcessor, postProcessor) {
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

  /**
   * Whether this trigger processes requests immediately instead of queueing
   * them. If this trigger is enabled then, in
   * {@code #handleFontPreferenceChangeEvent_}, requests from the event are
   * processed immediately; otherwise, these requests are queued up.
   * @type {boolean}
   * @private
   */
  this.isEnabled_ = true;

  /**
   * The queue of fetch requests.
   * @type {!Array.<!office.storage.FetchRequest>}
   * @private
   */
  this.requestQueue_ = [];

  /**
   * The event handler.
   * @type {!goog.events.EventHandler.<!office.fonts.FontPreferenceFetchTrigger>}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
  this.eventHandler_.listen(preference,
      office.fonts.EventType.FONT_PREFERENCE_CHANGE,
      this.handleFontPreferenceChangeEvent_);

  // Request all the fonts that are currently in the preference in case the
  // preference has already been registered and we miss its initial change
  // event. The recent fonts are a subset of the user fonts so we only need to
  // get the latter.
  this.createRequestsForFonts_(preference.getUserFonts());
};
goog.inherits(office.fonts.FontPreferenceFetchTrigger, goog.Disposable);


/**
 * Sets whether this trigger processes requests immediately instead of queueing
 * them. If enabled is 'true' and there are queued requests, they are dequeued
 * and processed immediately.
 * @param {boolean} isEnabled Whether requests should immediately processed
 *     instead of queueing them.
 */
office.fonts.FontPreferenceFetchTrigger.prototype.setEnabled = function(
    isEnabled) {
  this.isEnabled_ = isEnabled;
  if (this.isEnabled_ && this.requestQueue_.length) {
    this.processRequests_(this.requestQueue_);
    this.requestQueue_ = [];
  }
};


/**
 * Handles a font preference change event.
 * @param {!office.fonts.FontPreferenceChangeEvent} e The font preference
 *     change event.
 * @private
 */
office.fonts.FontPreferenceFetchTrigger.prototype.
    handleFontPreferenceChangeEvent_ = function(e) {
  this.createRequestsForFonts_(e.getUserFontsAdded());
};


/**
 * Creates FetchRequests for the given fonts.
 * @param {!Array.<string>} fonts The fonts to request.
 * @private
 */
office.fonts.FontPreferenceFetchTrigger.prototype.createRequestsForFonts_ =
    function(fonts) {
  var filteredFontFamilies = this.fontFilter_.filter(fonts);
  if (!filteredFontFamilies.length) {
    return;
  }
  var requests = [];
  for (var i = 0; i < filteredFontFamilies.length; i++) {
    requests.push(new office.storage.FetchRequest(
        new office.fonts.FontFetchRequestId(filteredFontFamilies[i])));
  }
  if (this.isEnabled_) {
    this.processRequests_(requests);
  } else {
    this.requestQueue_ = this.requestQueue_.concat(requests);
  }
};


/**
 * @return {!Array.<!office.storage.FetchRequest>} The queued requests.
 */
office.fonts.FontPreferenceFetchTrigger.prototype.getQueuedRequestsDebugDebug =
    function() {
  return this.requestQueue_;
};


/**
 * Processes requests to the fetch processor and post processor.
 * @param {!Array.<!office.storage.FetchRequest>} requests The requests to
 *     process.
 * @private
 */
office.fonts.FontPreferenceFetchTrigger.prototype.processRequests_ = function(
    requests) {
  var deferredResults = this.fetchProcessor_.process(requests);
  deferredResults.addCallback(this.postProcessor_.process, this.postProcessor_);
};
