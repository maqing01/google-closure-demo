goog.provide('goog.stats.Ga');

goog.stats.Ga.CATEGORY = {
  REGISTRY_LOGIN: 'u',
  SHOW: 'p',
  SHEET: 's',
  DOCS: 'd',
  EXPLORE: 'e',
  ALL: 'a',
  UNKNOWN: 'x'
};

goog.stats.Ga.ACTION = {
  // e
  LINK_POPUP: 'link',
  COLLABORATOR_POPUP: 'collaborator',

  // d

  // s
  SHEET_EXCEED: 'se',

  // p

  // u

  // a
  FIRE_ACTION: 'fa',
  EXPORT: 'export',
  TAB_SWITCH: 'tabswitch',
  EDIT: 'edit',

  // x
  UNKNOWN: 'unknown'
};

goog.stats.Ga.LABEL = {
  // string
  EXPORT_TYPE: 'export_type',

  // string
  TAB_NAME: 'tabname',

  // boolean
  IN_EDITOR: 'in_editor'
};

goog.stats.Ga.send = function(category, action, opt_label, opt_value) {
  if (goog.isFunction(window.ga)) {
    window.ga('send', {
      'hitType': 'event',
      'eventCategory': category,
      'eventAction': action,
      'eventLabel': opt_label,
      'eventValue': opt_value
    });
  }
};
