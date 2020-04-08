

/**
 * @fileoverview Utility for manipulating html.

 */

goog.provide('office.html.HtmlUtil');

goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * Tag names that should cause a paragraph break when seen as an end tag.
 * @type {!Array.<string>}
 * @private
 */
office.html.HtmlUtil.FLOW_BREAK_END_TAGS_ = [
  'ADDRESS',
  'BLOCKQUOTE',
  'BODY',
  'CENTER',
  'DD',
  'DIR',
  'DIV',
  'DL',
  'FIELDSET',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEAD',
  'HR',
  'HTML',
  'ISINDEX',
  'LI',
  'MENU',
  'NOFRAMES',
  'OL',
  'P',
  'PRE',
  'TABLE',
  'TD',
  'TH',
  'TITLE',
  'TR',
  'UL'
];


/**
 * Tag names that should be stripped when converting to plain text.
 * @type {!Array.<string>}
 * @private
 */
office.html.HtmlUtil.PLAIN_TEXT_STRIP_TAGS_ = [
  'SCRIPT',
  'STYLE'
];


/**
 * Creates the pattern for stripping tags when converting to plain text.
 * @return {string}
 * @private
 */
office.html.HtmlUtil.createPlainTextStripPattern_ = function() {
  var patterns = [];
  for (var i = 0; i < office.html.HtmlUtil.PLAIN_TEXT_STRIP_TAGS_.length; i++) {
    var tag = office.html.HtmlUtil.PLAIN_TEXT_STRIP_TAGS_[i];
    patterns.push('(<' + tag + '( [^>]*?)?>.*?<\/' + tag + '( [^>]*?)?>)');
  }
  return patterns.join('|');
};


/**
 * Pattern for stripping tags when converting to plain text.
 * @type {string}
 * @private
 */
office.html.HtmlUtil.PLAIN_TEXT_STRIP_PATTERN_ =
    office.html.HtmlUtil.createPlainTextStripPattern_();


/**
 * The string that represents a platform dependent new line.
 * @type {string}
 * @private
 */
office.html.HtmlUtil.NEW_LINE_ = goog.userAgent.WINDOWS ? '\r\n' : '\n';


/**
 * Converts HTML to plaintext.
 * @param {string} html The html string to convert.
 * @param {function(string):string=} opt_unescapeEntitiesFn
 * @return {string} The plain text string.
 */
office.html.HtmlUtil.htmlToPlainText = function(html, opt_unescapeEntitiesFn) {
  // Strip all tags and their content that should not be converted to plain
  // text.
  html = html.replace(
      new RegExp(office.html.HtmlUtil.PLAIN_TEXT_STRIP_PATTERN_, 'gi'), '');

  // Replace any BR tags with a '\n'.
  html = html.replace(new RegExp('<BR( [^>]*?)?>', 'gi'),
      office.html.HtmlUtil.NEW_LINE_);

  // Replace any sequential flow break end tags with a '\n
  var endTagPattern =
      '(<\/(' + office.html.HtmlUtil.FLOW_BREAK_END_TAGS_.join('|') + ')>)+';
  html = html.replace(new RegExp(endTagPattern, 'gi'),
      office.html.HtmlUtil.NEW_LINE_);

  // Replace all remaining tags.
  html = html.replace(/<[^>]+>/g, '');

  // Unescape entities.
  html = opt_unescapeEntitiesFn ?
      opt_unescapeEntitiesFn(html) :
      goog.string.unescapeEntities(html);

  // Replace non-breaking spaces with normal spaces.
  html = html.replace(/\xa0|\xc2/g, ' ');

  return html;
};
