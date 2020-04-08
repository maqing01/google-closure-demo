goog.provide('office.html.HtmlTextConverter');

goog.require('office.html.HtmlUtil');



/**
 * A class to convert html to text.
 * @param {function(string):string=} opt_unescapeEntitiesFn
 * @constructor
 * @struct
 * @final
 */
office.html.HtmlTextConverter = function(opt_unescapeEntitiesFn) {
  this.unescapeEntitiesFn_ = opt_unescapeEntitiesFn;
};


/**
 * Converts the given html string to text.
 * @param {string} html The html to convert.
 * @return {string} The plain text representation of the given html.
 */
office.html.HtmlTextConverter.prototype.convert = function(html) {
  return office.html.HtmlUtil.htmlToPlainText(html, this.unescapeEntitiesFn_);
};
