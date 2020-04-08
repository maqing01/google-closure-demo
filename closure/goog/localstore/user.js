goog.provide('office.localstore.User');
goog.provide('office.localstore.User.Property');

goog.require('office.localstore.Record');



/**
 * Package-protected
 * @param {string} id The user's id.
 * @param {boolean} isNew Whether this is a new object, not yet persisted in
 *     local storage.
 * @constructor
 * @struct
 * @extends {office.localstore.Record}
 */
office.localstore.User = function(id, isNew) {
  goog.base(this, office.localstore.Record.Type.USER, isNew);
  this.setProperty(office.localstore.User.Property.ID, id);
  //  Remove this when fast track status is synced properly.
  this.setBooleanProperty(office.localstore.User.Property_v4.FAST_TRACK, true);
};
goog.inherits(office.localstore.User, office.localstore.Record);


/**
 * Property names.
 * @enum {string}
 */
office.localstore.User.Property = {
  ID: '11',
  MANAGING_DOMAIN: '12',
  EMAIL_ADDRESS: '13',
  LOCALE: '14',
  OPT_IN_SECRET: '15',
  OPT_IN_REASONS: '16'
};


/**
 * Properties in v4 of the schema.
 */
office.localstore.User.Property_v4 = {
  FAST_TRACK: '21',
  INTERNAL: '22'
};


/**
 * Gets the user's id.
 * @return {string} The user id.
 */
office.localstore.User.prototype.getId = function() {
  return this.getStringProperty(office.localstore.User.Property.ID);
};


/**
 * Sets the managing domain.
 * @param {?string} managingDomain The managing domain.
 */
office.localstore.User.prototype.setManagingDomain = function(managingDomain) {
  this.setProperty(office.localstore.User.Property.MANAGING_DOMAIN,
      managingDomain);
};


/**
 * @return {?string} The managing domain.
 */
office.localstore.User.prototype.getManagingDomain = function() {
  return this.getNullableStringProperty(
      office.localstore.User.Property.MANAGING_DOMAIN);
};


/**
 * Sets the email address.
 * @param {?string} emailAddress The email address.
 */
office.localstore.User.prototype.setEmailAddress = function(emailAddress) {
  this.setProperty(office.localstore.User.Property.EMAIL_ADDRESS,
      emailAddress);
};


/**
 * @return {?string} The managing domain.
 */
office.localstore.User.prototype.getEmailAddress = function() {
  return this.getNullableStringProperty(
      office.localstore.User.Property.EMAIL_ADDRESS);
};


/**
 * Sets the user's locale.
 * @param {?string} locale The user's locale.
 */
office.localstore.User.prototype.setLocale = function(locale) {
  this.setProperty(office.localstore.User.Property.LOCALE,
      locale);
};


/**
 * @return {?string} The user's locale.
 */
office.localstore.User.prototype.getLocale = function() {
  return this.getNullableStringProperty(office.localstore.User.Property.LOCALE);
};


/**
 * Sets the opt-in secret.
 * @param {?string} optInSecret The opt-in secret.
 */
office.localstore.User.prototype.setOptInSecret = function(optInSecret) {
  this.setProperty(office.localstore.User.Property.OPT_IN_SECRET,
      optInSecret);
};


/**
 * @return {?string} The opt-in secret.
 */
office.localstore.User.prototype.getOptInSecret = function() {
  return this.getNullableStringProperty(
      office.localstore.User.Property.OPT_IN_SECRET);
};


/**
 * Sets the opt-in reason.
 * @param {!Array.<number>} optInReasons The opt-in reasons.
 */
office.localstore.User.prototype.setOptInReasons = function(optInReasons) {
  this.setProperty(office.localstore.User.Property.OPT_IN_REASONS,
      optInReasons);
};


/**
 * @return {!Array.<number>} The opt-in reasons.
 */
office.localstore.User.prototype.getOptInReasons = function() {
  return this.getNullableArrayProperty(
      office.localstore.User.Property.OPT_IN_REASONS) || [];
};


/**
 * Sets the fast track status for the given user.
 * @param {boolean} fastTrack Whether the user is fast track.
 */
office.localstore.User.prototype.setFastTrack = function(fastTrack) {
  this.setBooleanProperty(office.localstore.User.Property_v4.FAST_TRACK,
      fastTrack);
};


/**
 * @return {boolean} Returns the fast track status.
 */
office.localstore.User.prototype.getFastTrack = function() {
  return this.getBooleanProperty(office.localstore.User.Property_v4.FAST_TRACK);
};


/**
 * Sets the internal state of the user.
 * @param {boolean} internal Whether the user is internal.
 */
office.localstore.User.prototype.setInternal = function(internal) {
  this.setBooleanProperty(office.localstore.User.Property_v4.INTERNAL, internal);
};


/**
 * Gets the internal state of the user.
 * @return {boolean} Whether the user is internal.
 */
office.localstore.User.prototype.getInternal = function() {
  var internal = this.getNullableBooleanProperty(
      office.localstore.User.Property_v4.INTERNAL);

  // Determine internal status from the user's domain if not set.
  //  Remove domain check once internal status is synced
  // regularly.
  return internal || 'google.com' == this.getManagingDomain();
};

