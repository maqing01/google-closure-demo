

goog.provide('office.net.ImagePingSender');

goog.require('goog.Disposable');




office.net.ImagePingSender = function(opt_imageCallback) {
  goog.base(this);


  this.imageCallback_ = opt_imageCallback || null;


  this.image_ = null;
};
goog.inherits(office.net.ImagePingSender, goog.Disposable);



office.net.ImagePingSender.prototype.sendImage = function(url) {
  if (this.isDisposed()) {
    return;
  }


  this.cleanUpImage_();



  this.xhrIo_ = new goog.net.XhrIo();




  goog.net.XhrIo.send(url, goog.bind(function(e){
    if(!!e.target.getLastErrorCode()) {
      this.imageEventHandler_(false, e);
    } else {
      this.imageEventHandler_(true, e);
    }
  }, this));



};



office.net.ImagePingSender.prototype.imageEventHandler_ = function(success, e) {
  if (this.imageCallback_) {
    this.imageCallback_(success, e);
  }

};



office.net.ImagePingSender.prototype.cleanUpImage_ = function() {
  if (this.image_) {
    try {
      this.image_.onload = null;
      this.image_.onerror = null;
      this.image_ = null;
    } catch (e) {
    }
  }
};



office.net.ImagePingSender.prototype.disposeInternal = function() {
  this.cleanUpImage_();
  this.imageCallback_ = null;
};

