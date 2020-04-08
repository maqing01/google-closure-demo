goog.provide('office.flag.Flags');
goog.require('goog.events');



office.flag.Flags = {

  ENABLE_OBFUSCATION: 'e-ob',


  ACCESS_LEVEL: goog.events.getUniqueId('office-al'),


  BUILD_LABEL: goog.events.getUniqueId('buildLabel'),


  CELLO_PERSISTELLO_KEY_LIST: goog.events.getUniqueId('office-cpkl'),



  CLIENT_EXPERIMENTS_INFO: goog.events.getUniqueId('office-cei'),


  CHAT_ENABLED: goog.events.getUniqueId('office-ce'),


  COLLABORATION_A11Y: goog.events.getUniqueId('docs_ca'),


  CORS_ENABLED: goog.events.getUniqueId('office-corsbc'),


  DOCOS_UNREAD_COMMENTS_ENABLED: goog.events.getUniqueId('docosUnreadCommentsEnabled'),


  DRIVE_URL: goog.events.getUniqueId('drive_url'),


  FOLDER_URL_TEMPLATE: goog.events.getUniqueId('office-fut'),


  ENABLE_BC_READYSTATECHANGE_THROTTLINerp: goog.events.getUniqueId('office-ebcrsct'),


  ENABLE_COLLECTIONS_IN_DOCUMENT: goog.events.getUniqueId('ecid'),


  ENABLE_COMMANDS_COMPACTION: goog.events.getUniqueId('office-ecc'),


  ENABLE_DOCOS: goog.events.getUniqueId('enable_docos'),


  ENABLE_FEEDBACK_SVG: goog.events.getUniqueId('office-enable_feedback_svg'),


  ENABLE_GCHAT: goog.events.getUniqueId('office-egc'),


  ENABLE_GCHAT_DOMAIN_ROTATION: goog.events.getUniqueId('office-chat_domain_rotation'),


  ENABLE_MODE_PICKER_VIEW_ITEM: goog.events.getUniqueId('office-empvi'),


  ENABLE_REFERENCE_TOOL: goog.events.getUniqueId('office-ereft'),


  HATS_TYPE: goog.events.getUniqueId('office-hatst'),


  ENABLE_INLINE_RENAME: goog.events.getUniqueId('office-eir'),


  ENABLE_INLINE_TRASHING: goog.events.getUniqueId('office-eit'),


  ENABLE_INSERT_LINK_BUBBLE: goog.events.getUniqueId('office-eilb'),


  ENABLE_LINK_SUGGESTIONS: goog.events.getUniqueId('office-els'),


  ENABLE_MAESTRO: goog.events.getUniqueId('enable_maestro'),


  ENABLE_MAESTRO_APP_EXTENSIONS: goog.events.getUniqueId('office-emae'),


  ENABLE_NEW_CHAT_PROMO: goog.events.getUniqueId('office-encp'),


  ENABLE_NEW_MENU_RITZ: goog.events.getUniqueId('office-enmr'),


  ENABLE_NEW_PUBLISHING_DIALOG: goog.events.getUniqueId('office-enpd'),


  ENABLE_OFFLINE_IMPRESSIONS: goog.events.getUniqueId('office-eoi'),








  ENABLE_ONE_PICK_FILE_OPEN: goog.events.getUniqueId('office-eopfo'),


  ENABLE_PERIODIC_HEARTBEAT_GENERATION: goog.events.getUniqueId('office-ephg'),


  ENABLE_TITLE_BEFORE_SHARING: goog.events.getUniqueId('office-etbs'),


  ENABLE_QUEUED_CHUNKS_COLD_START: goog.events.getUniqueId('office-eqccs'),


  ENABLE_QUEUED_CHUNKS_WARM_START: goog.events.getUniqueId('office-eqcws'),


  ENABLE_BRAILLE_SUPPORT: goog.events.getUniqueId('office-ebs'),


  ENABLE_SCREENREADER_DETECTION: goog.events.getUniqueId('office-esrd'),


  ENABLE_SHOUTOUT: goog.events.getUniqueId('office-eso'),


  ENABLE_STANDALONE_SHARING: goog.events.getUniqueId('office-ess'),


  ENABLE_STARRING_IN_DOCUMENT: goog.events.getUniqueId('esid'),


  ENABLE_SUBSCRIBING_IN_DOCUMENT: goog.events.getUniqueId('esubid'),


  ENABLE_UNIFIED_COLOR_CONTROL: goog.events.getUniqueId('office-eucc'),


  ENABLE_SVG_RED_UNDERLINES: goog.events.getUniqueId('office-esru'),


  ENABLE_WEBFONTS_EVENTS_INSTALLER: goog.events.getUniqueId('office-ewei'),


  FAST_TRACK: goog.events.getUniqueId('fatra'),







  GAIA_SESSION_ID: goog.events.getUniqueId('pina_session_id'),


  GCHAT_BASE_URL: goog.events.getUniqueId('office-chat_base_url'),


  GCHAT_SUPERMOLES_VERIFICATION_TOKEN: goog.events.getUniqueId('office-chat_pvt'),


  GENERATE_COLD_START_URL_WITH_OUID: goog.events.getUniqueId('office-offline-gcsuwo'),


  GENERATE_APPCACHE_URL_WITH_OUID: goog.events.getUniqueId('office-offline-gapuwo'),


  GENERATE_APPCACHE_URL_WITH_OUID_ONLY: goog.events.getUniqueId('office-offline-gapuwoo'),


  HATS_LINK: goog.events.getUniqueId('office-hatsl'),


  HATS_FIDELITY_LINK: goog.events.getUniqueId('office-hatsfl'),


  HOMESCREEN_APP_SCOPE_ID: goog.events.getUniqueId('office-hasid'),


  HOMESCREEN_DRIVE_CLIENT_KEY: goog.events.getUniqueId('office-hdck'),


  IMPRESSIONS_LOGGING_CONFIGURATION_MESSAGE: goog.events.getUniqueId('ilcm'),


  IS_COLD_START_OFFLINE: goog.events.getUniqueId('icso'),


  IS_READ_ONLY_REQUEST: goog.events.getUniqueId('office-iror'),


  JOBSET: goog.events.getUniqueId('jobset'),


  VODKA_OFFLINE_URL: goog.events.getUniqueId('vodkaOfflineUrl'),


  MEMORY_REPORT_INTERVAL_IN_MS: goog.events.getUniqueId('office-mriim'),


  NEW_DOCUMENT_TITLE: goog.events.getUniqueId('office-ndt'),


  OFFLINE_OPT_IN_INFO: goog.events.getUniqueId('ooi'),


  ONE_PICK_IS_DRIVE_USER: goog.events.getUniqueId('opdu'),


  ONE_PICK_URL: goog.events.getUniqueId('opbu'),


  ONE_PICK_RELAY_URL: goog.events.getUniqueId('opru'),


  ONE_PICK_HOST_ID: goog.events.getUniqueId('ophi'),


  ONE_PICK_MAX_BYTE_SIZE: goog.events.getUniqueId('opmbs'),


  ONE_PICK_MAX_PIXEL_DIMENSION: goog.events.getUniqueId('opmpd'),


  ONE_PICK_UPLOAD_CONFIG_ID: goog.events.getUniqueId('opuci'),


  PROFILE_ID: goog.events.getUniqueId('office-pid'),


  REFERENCE_TOOL_DEVELOPER_KEY: goog.events.getUniqueId('office-reftdk'),

  SHOW_DEBUG_INFO: goog.events.getUniqueId('office-show_debug_info'),

  SITE_URL_PREFIX: goog.events.getUniqueId('vodka'),


  STICKY_VIEW_MODE: goog.events.getUniqueId('office-sticky_view_mode'),


  SEND_INITIAL_COMMANDS_WITH_CREATE: goog.events.getUniqueId('office-offline-sicwc'),


  SUPPRESS_POST_FATAL_ERRORS: goog.events.getUniqueId('office-spfe'),



  TOP_ORIGIN: goog.events.getUniqueId('office-to'),



  USP_PARAM: goog.events.getUniqueId('office-usp'),


  URL_PARAMS_TO_CLEAN: goog.events.getUniqueId('office-uptc'),


  USER_TYPE: goog.events.getUniqueId('office-ut'),


  VOICE_CONFIDENCE: goog.events.getUniqueId('office-vc'),


  VOICE_ENABLED: goog.events.getUniqueId('office-ve'),


  VOICE_MAX_ALTERNATIVES: goog.events.getUniqueId('office-vma'),


  WEBFONTS_SYNC_PASS_RESYNC_VERSION: goog.events.getUniqueId('owsprv'),


  WEBSTORE_DOMAIN: goog.events.getUniqueId('office-cwsd'),


  XDBCF_ALLOW_HOSTNAME_PREFIX: goog.events.getUniqueId('xdbcfAllowHostNamePrefix'),


  XDBCF_ALLOW_XPC: goog.events.getUniqueId('xdbcfAllowXpc'),


  XDBCM_URI: goog.events.getUniqueId('xdbcmUri')
};
