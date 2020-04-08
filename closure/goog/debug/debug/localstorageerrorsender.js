



goog.provide('office.debug.LocalStorageErrorSender');

goog.require('office.debug.ErrorSender');
goog.require('office.storage.WebStorageUtil');
goog.require('goog.asserts');
goog.require('goog.json');




office.debug.LocalStorageErrorSender = function(baseKey, opt_maxErrorsStored) {
  goog.base(this, opt_maxErrorsStored);


  this.baseKey_ = baseKey;


  this.versionKey_ = baseKey + '-v';


  this.frontIndexKey_ = baseKey + '-f';


  this.nextIndexKey_ = baseKey + '-n';


  this.store_ = /** @type {!Storage} */ (goog.global.localStorage);

  goog.asserts.assert(office.storage.WebStorageUtil.isSupported(),
      'Can\'t create LocalStorageErrorSender because web storage doesn\'t ' +
      'work.');




  var storeVersion = this.getInt_(this.versionKey_);
  if (!storeVersion ||
      storeVersion < office.debug.LocalStorageErrorSender.VERSION_) {
    this.store_.setItem(this.versionKey_,
        String(office.debug.LocalStorageErrorSender.VERSION_));
    this.store_.setItem(this.frontIndexKey_,
        String(office.debug.LocalStorageErrorSender.INITIAL_INDEX_));
    this.store_.setItem(this.nextIndexKey_,
        String(office.debug.LocalStorageErrorSender.INITIAL_INDEX_));
  }

  this.maybeSendFront();
};
goog.inherits(office.debug.LocalStorageErrorSender, office.debug.ErrorSender);



office.debug.LocalStorageErrorSender.VERSION_ = 1;



office.debug.LocalStorageErrorSender.INITIAL_INDEX_ = 1;



office.debug.LocalStorageErrorSender.prototype.enqueue = function(requestData) {
  var oldNextIndex = this.getInt_(this.nextIndexKey_);

  if (!oldNextIndex || !this.isVersionOk_()) {
    return;
  }

  this.store_.setItem(this.nextIndexKey_, String(oldNextIndex + 1));
  this.store_.setItem(this.getKeyForIndex_(oldNextIndex),
      goog.json.serialize(requestData));
};



office.debug.LocalStorageErrorSender.prototype.deleteFront = function() {
  var frontIndex = this.getInt_(this.frontIndexKey_);

  if (!frontIndex || !this.isVersionOk_()) {
    return;
  }

  this.store_.removeItem(this.getKeyForIndex_(frontIndex));

  frontIndex++;
  this.store_.setItem(this.frontIndexKey_, String(frontIndex));
  if (this.getQueueSize() == 0) {
    this.store_.setItem(this.frontIndexKey_,
        String(office.debug.LocalStorageErrorSender.INITIAL_INDEX_));
    this.store_.setItem(this.nextIndexKey_,
        String(office.debug.LocalStorageErrorSender.INITIAL_INDEX_));
  }
};



office.debug.LocalStorageErrorSender.prototype.getFront = function() {
  var frontIndex = this.getInt_(this.frontIndexKey_);


  if (!frontIndex || !this.isVersionOk_() || this.getQueueSize() < 1) {
    return null;
  }

  try {
    var requestDataStr = this.get_(this.getKeyForIndex_(frontIndex));
    if (requestDataStr) {
      var requestData = goog.json.parse(requestDataStr);
      if (requestData) {
        return requestData;
      }
    }
  } catch (ex) {}



  this.deleteFront();
  return this.getFront();
};



office.debug.LocalStorageErrorSender.prototype.isVersionOk_ = function() {
  var version = this.getInt_(this.versionKey_);
  return version == office.debug.LocalStorageErrorSender.VERSION_;
};



office.debug.LocalStorageErrorSender.prototype.getQueueSize = function() {
  return this.getInt_(this.nextIndexKey_) - this.getInt_(this.frontIndexKey_);
};



office.debug.LocalStorageErrorSender.prototype.getKeyForIndex_ = function(index) {
  return this.baseKey_ + '-e-' + index;
};



office.debug.LocalStorageErrorSender.prototype.getInt_ = function(key) {
  var value = parseInt(this.get_(key), 10);
  if (value < 0 || isNaN(value)) {
    return null;
  }
  return value;
};



office.debug.LocalStorageErrorSender.prototype.get_ = function(key) {
  return /** @type {?string} */ (this.store_.getItem(key));
};



office.debug.LocalStorageErrorSender.prototype.disposeInternal = function() {
  delete this.store_;
  goog.base(this, 'disposeInternal');
};
