goog.provide('goog.crypt.obfuscation');

goog.require('goog.crypt');
goog.require('goog.crypt.base64');


/**
 * @param string
 * @returns {Uint8Array}
 */
goog.crypt.obfuscation.stringToUint = function(string) {
  var string = goog.crypt.base64.encodeString(unescape(encodeURIComponent(string))),
      charList = string.split(''),
      uintArray = [];
  for (var i = 0; i < charList.length; i++) {
    uintArray.push(charList[i].charCodeAt(0));
  }
  return new Uint8Array(uintArray);
};


/**
 * @param {!Uint8Array} bytes Byte array to obfuscate
 * @return {string} Resulting XOR of the two byte arrays.
 */
goog.crypt.obfuscation.obfuscateByteArray = function(bytes) {
  var ran = goog.math.randomInt(256);
  goog.array.forEach(bytes, function(currentValue, index, array) {
    array[index] = currentValue ^ ran;
  });

  return goog.crypt.byteArrayToString(bytes) + goog.crypt.byteArrayToString([ran]);
  //var result = [];
  //var ran = goog.math.randomInt(256);
  //for (var i = 0; i < bytes.length; i++) {
  //  result.push(bytes[i]);
  //}
  //var result = goog.crypt.xorByteArray(bytes, secret);
  //var result = bytes;
  //result.push(ran);
  //console.log('result: ' + result);
  //return result;
};

/**
 * @param {!string} bytes
 * @param {goog.string.Parser=} jsonParser
 * @return {string} Resulting original json array.
 */
goog.crypt.obfuscation.deobfuscate = function(obfuscatedString) {
  //var obfuscatedBa =
  //    goog.crypt.base64.decodeStringToByteArray(obfuscatedString, true);
  //var obfuscatedBa =
  //    decodeURIComponent(escape(goog.crypt.base64.decodeString(obfuscatedString)));
  var obfuscatedBa = goog.crypt.base64.decodeStringToByteArray(obfuscatedString);
  //return obfuscatedBa;
  var l = obfuscatedBa.length;
  var ran = obfuscatedBa[l - 1];
  var uintArray = [];
  for (var i = 0; i < l - 1; i++) {
    uintArray.push(obfuscatedBa[i] ^ ran);
  }
  var uint8arr = new Uint8Array(uintArray);
  //return decodeURIComponent(escape(String.fromCharCode.apply(null, uint8arr)));
  return decodeURIComponent(escape(goog.crypt.byteArrayToString(uint8arr)));
};
