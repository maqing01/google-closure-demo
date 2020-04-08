
// All Rights Reserved.

/**
 * @fileoverview Utility class for dealing with directories and files selected
 * from directories.
 *
 * @author natescottdavis@google.com (Nathan Davis)
 */

goog.provide('apps.uploader.DirectoryHelper');

goog.require('apps.uploader.Directory');
goog.require('apps.uploader.File');
goog.require('goog.object');
goog.require('goog.string');


/**
 * Takes a list of files (possibly contained in multiple top level
 * directories), and reconstructs their directory structure.  For example
 * if the list specified "a/b/1.txt", "a/b/2.txt" and "a/3.txt" this method
 * would return a directory "a" with the following structure:
 * <pre>
 *     a
 *   /   \
 * 3.txt  b
 *      /   \
 *   1.txt  2.txt
 * </pre>
 * @param {Array.<apps.uploader.File>} files Array of file objects.
 * @return {Array.<apps.uploader.File>} A list of top level directories and
 *     files.
 */
apps.uploader.DirectoryHelper.unflattenFiles = function(files) {
  if (files.length == 0) {
    return null;
  }

  var separator = apps.uploader.File.PATH_SEPARATOR;
  var topLevelDirectoryMap = {};
  var topLevelDirectories = [];
  var topLevelFiles = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var path = file.getPath();

    var topLevelPath = path.substring(0, path.indexOf(separator));
    if (topLevelPath.length == 0) {
      // If the path is just a filename, assume this is a top level file.
      topLevelFiles.push(file);
      continue;
    }

    var topLevelDirectory = topLevelDirectoryMap[topLevelPath];
    if (!topLevelDirectory) {
      // Create a new top level directory.
      topLevelDirectory = new apps.uploader.Directory(topLevelPath);
      topLevelDirectoryMap[topLevelPath] = topLevelDirectory;
      topLevelDirectories.push(topLevelDirectory);
    }

    var relativePath = path.substring(0, path.lastIndexOf(separator));
    file.setRelativeDirectoryPath(relativePath);
    file.setDirectoryToUpdateOnChange(topLevelDirectory);

    // Create sub directories where they do not yet exist.
    var relativeDirNames = relativePath.split(separator);
    var currentDirectory = topLevelDirectory;
    for (var j = 1; j < relativeDirNames.length; j++) {
      var dirName = relativeDirNames[j];
      var directory = currentDirectory.getEntry(dirName);
      if (!directory) {
        directory = new apps.uploader.Directory(dirName, undefined,
            relativeDirNames.slice(0, j).join(separator));
        directory.setDirectoryToUpdateOnChange(topLevelDirectory);
        currentDirectory.addEntry(directory);
      }
      currentDirectory = directory;
    }

    currentDirectory.addEntry(file);
  }

  for (var i = 0; i < topLevelDirectories.length; i++) {
    topLevelDirectories[i].computeStats();
  }
  return topLevelDirectories.concat(topLevelFiles);
};


/**
 * @param {string} path a file path.
 * @return {string} the path with all '\'s replaced with '/'s on Windows or the
 *     path unchanged if not on Windows.
 */
apps.uploader.DirectoryHelper.ensureStandardPathSeparator = function(path) {
  if (goog.userAgent.WINDOWS) {
    return path.replace(/\\/g, apps.uploader.File.PATH_SEPARATOR);
  }
  return path;
};
