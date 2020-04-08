goog.provide('office.localstore.idb.CommandBasedDocumentAdapterFactory');

goog.require('office.localstore.Document');
goog.require('office.localstore.idb.CommandBasedDocumentAdapter');


/**
 * @param {!office.commands.CommandSerializer} serializer
 * @param {!office.localstore.idb.DocsDatabase} indexedDb
 * @return {!Array.<!office.localstore.CommandBasedDocumentAdapter>}
 */
office.localstore.idb.CommandBasedDocumentAdapterFactory.create = function(
    serializer, indexedDb) {
  var vodkaIdbCommandBasedDocumentAdapter = new office.localstore.idb.CommandBasedDocumentAdapter(
      office.localstore.Document.Type.VODKA,
      // TODO(jcai): storage upgrade
      1008 /* localStorageSchemaVersion */,
      1008 /* localStorageSchemaVersion */,
      serializer,
      indexedDb);
  //var punchIdbCommandBasedDocumentAdapter =
  //    new office.localstore.idb.CommandBasedDocumentAdapter(
  //    office.localstore.Document.Type.PUNCH,
  //    4 /* minSchemaVersion */,
  //    6 /* maxSchemaVersion */,
  //    serializer,
  //    indexedDb);
  var ritzIdbCommandBasedDocumentAdapter = new office.localstore.idb.CommandBasedDocumentAdapter(
      office.localstore.Document.Type.TACO,
      // TODO(jcai): storage upgrade
      1008 /* localStorageSchemaVersion */,
      1008 /* localStorageSchemaVersion */,
      serializer,
      indexedDb);
  //var drawingsIdbCommandBasedDocumentAdapter =
  //    new office.localstore.idb.CommandBasedDocumentAdapter(
  //    office.localstore.Document.Type.DRAWING,
  //    4 /* minSchemaVersion */,
  //    6 /* maxSchemaVersion */,
  //    serializer,
  //    indexedDb);
  return [
    ritzIdbCommandBasedDocumentAdapter,
    vodkaIdbCommandBasedDocumentAdapter
    //punchIdbCommandBasedDocumentAdapter,
    //drawingsIdbCommandBasedDocumentAdapter
  ];
};
