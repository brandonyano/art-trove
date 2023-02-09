const functions = require("firebase-functions");
const mkdirp = require('mkdirp');
const admin = require('firebase-admin');
admin.initializeApp();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');


// Max height and width of the thumbnail in pixels.
const THUMB_MAX_HEIGHT = 200;
const THUMB_MAX_WIDTH = 2000;
// Thumbnail prefix added to file names.
//const THUMB_PREFIX = 'thumb_';

exports.generateThumbnail = functions.storage.object().onFinalize(async (object) => {
  // File and directory paths.
  const filePath = object.name;
  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(filePath);
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const thumbFilePath = path.normalize(path.join("thumbs", `${fileName}`));
  const thumbFile = bucket.file(thumbFilePath);
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const tempLocalThumbFile = path.join(os.tmpdir(), fileName);

  // Exit if this is triggered on a file that is not an image.
  if (!object.contentType.startsWith('image/')) {
    console.log('This is not an image.');
    return;
  }

  // Exit if the image is already a thumbnail.
  if (fileDir === 'thumbs') {
    console.log('Already a Thumbnail.');
    return;
  }

  // Create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir);
  console.log("TempLocal Dir has been created", tempLocalDir);
  await bucket.file(filePath).download({destination: tempLocalFile});
  console.log('The file has been downloaded to', tempLocalFile);
  await spawn('convert', [tempLocalFile, '-thumbnail', `${THUMB_MAX_WIDTH}x${THUMB_MAX_HEIGHT}>`, tempLocalThumbFile]);
  console.log('JPEG image created at', tempLocalThumbFile);
  await bucket.upload(tempLocalThumbFile, {destination: thumbFilePath});
  console.log('JPEG image uploaded to Storage at', thumbFilePath);
  fs.unlinkSync(tempLocalThumbFile);
  fs.unlinkSync(tempLocalFile);
  return null;
});
