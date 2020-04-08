goog.provide('office.localstore.accesslevel');

goog.require('office.localstore.Document');


/**
 * Extracts the localstore access level out of the given document info.
 * @param {!office.info.Document} documentInfo
 * @return {office.localstore.Document.AccessLevel}
 */
office.localstore.accesslevel.fromDocumentInfo = function(
    documentInfo) {
  if (documentInfo.isOwner()) {
    return office.localstore.Document.AccessLevel.OWN;
  } else if (documentInfo.getSaveStateTracker().isEditable()) {
    return office.localstore.Document.AccessLevel.WRITE;
  } else if (documentInfo.getSaveStateTracker().isCommentable()) {
    return office.localstore.Document.AccessLevel.COMMENT;
  } else {
    return office.localstore.Document.AccessLevel.READ;
  }
};


/**
 * @param {office.localstore.Document.AccessLevel} accessLevel
 * @return {boolean} Whether the given access level can edit.
 */
office.localstore.accesslevel.canEdit = function(accessLevel) {
  return office.localstore.Document.AccessLevelOrder.indexOf(accessLevel) >=
      office.localstore.Document.AccessLevelOrder.indexOf(
          office.localstore.Document.AccessLevel.WRITE);
};


/**
 * @param {office.localstore.Document.AccessLevel} accessLevel
 * @return {boolean} Whether the given access level can comment.
 */
office.localstore.accesslevel.canComment = function(accessLevel) {
  return office.localstore.Document.AccessLevelOrder.indexOf(accessLevel) >=
      office.localstore.Document.AccessLevelOrder.indexOf(
          office.localstore.Document.AccessLevel.COMMENT);
};


//  This is Vodka-specific. Modify so that applications can provide this
// information.
/**
 * Calculates whether various access levels exist at equivalent model
 * projetions. If either of the access levels are null, does not perform the
 * check and returns true.
 * @param {office.localstore.Document.AccessLevel} firstAccessLevel
 * @param {office.localstore.Document.AccessLevel} secondAccessLevel
 * @return {boolean} Whether the two access levels exist under equivalent
 *     projections. If either of the access levels are null, does not perform
 *     the check and returns true.
 */
office.localstore.accesslevel.hasEquivalentProjection = function(
    firstAccessLevel, secondAccessLevel) {
  var firstEffectiveProjection =
      office.localstore.accesslevel.getEffectiveProjection_(firstAccessLevel);
  var secondEffectiveProjection =
      office.localstore.accesslevel.getEffectiveProjection_(secondAccessLevel);

  return firstEffectiveProjection == secondEffectiveProjection;
};


//  This is Vodka-specific. Modify so that applications can provide this
// information.
/**
 * Calculates whether various access levels exist at equivalent model
 * projetions.
 * @param {office.localstore.Document.AccessLevel} accessLevel
 * @return {office.localstore.Document.AccessLevel} effectiveAccessLevel
 * @private
 */
office.localstore.accesslevel.getEffectiveProjection_ = function(accessLevel) {
  switch (accessLevel) {
    case office.localstore.Document.AccessLevel.READ:
      return office.localstore.Document.AccessLevel.READ;

    case office.localstore.Document.AccessLevel.WRITE:
    case office.localstore.Document.AccessLevel.COMMENT:
    case office.localstore.Document.AccessLevel.OWN:
      return office.localstore.Document.AccessLevel.WRITE;

    case office.localstore.Document.AccessLevel.NONE:
      return office.localstore.Document.AccessLevel.NONE;

    default:
      throw Error('No such access level.');
  }
};
