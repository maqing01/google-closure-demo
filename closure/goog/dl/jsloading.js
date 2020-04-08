goog.provide('goog.jsloading');

goog.jsloading.loadingScript = function(inserts, callback) {
  var nextInsert = inserts.shift();
  if (nextInsert != undefined) {
    jQuery.getScript(
        nextInsert, function() {
          getScripts(inserts, callback); }
    ).fail(function(jqxhr, settings, exception){
          alert("including "+nextInsert+" failed:\n" +exception)
        }
    );
  } else {
    if (callback != undefined) callback();
  }
};
