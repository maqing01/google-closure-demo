goog.provide('office.diagnostics.InitialLoadTimingKeys');

/**
 * The key for an initial load timing in the initial load timing object.
 * @enum {string}
 */
office.diagnostics.InitialLoadTimingKeys = {
  START_LOAD: goog.events.getUniqueId('sl'),
  END_LOAD: goog.events.getUniqueId('el'),

  START_JS_LOAD: goog.events.getUniqueId('sjl'),
  END_JS_LOAD: goog.events.getUniqueId('ejl'),

  START_JS_APPLICATION_CREATION: goog.events.getUniqueId('sac'),
  END_JS_APPLICATION_CREATION: goog.events.getUniqueId('eac'),

  START_CHROME_FLUSH: goog.events.getUniqueId('scf'),
  END_CHROME_FLUSH: goog.events.getUniqueId('ecf'),

  START_JS_APPLICATION_SET_LOADED: goog.events.getUniqueId('sasl'),
  END_JS_APPLICATION_SET_LOADED: goog.events.getUniqueId('easl'),

  START_FIRST_MODEL_PART_JS_YIELD: goog.events.getUniqueId('sfpjy'),
  END_FIRST_MODEL_PART_JS_YIELD: goog.events.getUniqueId('efpjy'),

  APPLICATION_LOAD_COMPLETE: goog.events.getUniqueId('alc'),
  CHROME_VIEWABLE: goog.events.getUniqueId('chv'),
  CONTENT_VIEWABLE: goog.events.getUniqueId('cov'),
  CONTENT_EDITABLE: goog.events.getUniqueId('coe'),
  FIRST_ASYNC_REDRAW: goog.events.getUniqueId('far'),
  FIRST_BASIC_EDIT: goog.events.getUniqueId('fbe'),
  FIRST_MODEL_PART_LOADED: goog.events.getUniqueId('fmpl'),
  FULL_CONTENT_EDITABLE: goog.events.getUniqueId('fcoe'),
  JS_APPLICATION_LOAD: goog.events.getUniqueId('al'),
  LOCAL_STORE_INITIALIZED: goog.events.getUniqueId('lsi'),
  LOCK_ACQUISITION_COMPLETE: goog.events.getUniqueId('lac'),
  LOCK_ACQUISITION_STARTED: goog.events.getUniqueId('las'),
  MODEL_LOAD_COMPLETE: goog.events.getUniqueId('mlc'),
  OPEN_DATABASE_COMPLETE: goog.events.getUniqueId('odbc'),
  OPEN_DATABASE_JS_YIELD: goog.events.getUniqueId('odbjy'),
  OPEN_DATABASE_STARTED: goog.events.getUniqueId('odbs'),
  PENDING_QUEUE_CREATED: goog.events.getUniqueId('pqc'),
  TYPING_ENABLED: goog.events.getUniqueId('te'),
  WEBFONTS_RENDER: goog.events.getUniqueId('webfontsRender'),

  MODEL_DESERIALIZATION: goog.events.getUniqueId('md'),
  MODEL_LOAD: goog.events.getUniqueId('ml'),
  MODEL_PARSE: goog.events.getUniqueId('mp'),
  MODEL_PERSIST: goog.events.getUniqueId('mpe'),
  MODEL_READ: goog.events.getUniqueId('mr'),

  WEBFONTS_AVAILABLE: goog.events.getUniqueId('webfontsAvailable'),
  WEBFONTS_VARIANTS_AVAILABLE: goog.events.getUniqueId('webfontsVariantsAvailable')
};
