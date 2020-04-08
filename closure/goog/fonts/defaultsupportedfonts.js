goog.provide('office.fonts.DefaultSupportedFonts');

goog.require('office.fonts.SupportedFontsImpl');



/**
 * @constructor
 * @struct
 * @extends {office.fonts.SupportedFontsImpl}
 */
office.fonts.DefaultSupportedFonts = function() {
  goog.base(
      this,
      office.fonts.DefaultSupportedFonts.FONT_FAMILIES,
      office.fonts.DefaultSupportedFonts.LOCALIZED_FONT_FAMILIES_);
};
goog.inherits(office.fonts.DefaultSupportedFonts, office.fonts.SupportedFontsImpl);


/**
 * Hardcoded list of font families for the font family select control. This
 * list should be kept in sync with the DEFAULT_FONT_FAMILIES list in
 * DefaultFontFamilies.java
 * @type {!Array.<string>}
 */
office.fonts.DefaultSupportedFonts.FONT_FAMILIES = [
  'Arial',
  'Comic Sans MS',
  'Courier New',
  //'Georgia',
  'Impact',
  //'Times New Roman',
  'Trebuchet MS',
  'Verdana'
];


/**
 * A map from a language code to an array of font families available for the
 * language.
 * @type {!Object.<!Array.<string>>}
 * @private
 */
office.fonts.DefaultSupportedFonts.LOCALIZED_FONT_FAMILIES_ = {
  'zh-CN': [
    // Windows
    'SimSun',
    //'SimSun-ExtB',
    'SimHei', 'NSimSun', 'Microsoft Yahei', 'FangSong',
    'KaiTi',
    // Mac
    //'Hei',
    'Heiti SC',
    'Kai',
    'STFangsong',
    'STHeiti',
    'STKaiti',
    'STsong',
      // new font
    'FangSong_GB2312',
    'KaiTi_GB2312',
      'LiSu',
    'YouYuan',
    'FZXiaoBiaoSong-B05S'
  ]
};
