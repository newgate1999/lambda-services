const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sharp = require('sharp');
const path = require('path');
require('dotenv').config();

exports.resizeImage = async (event, context) => {
  // console.log(
  //   'Reading options from event:\n',
  //   util.inspect(event, {
  //     depth: 5,
  //   }),
  // );
  for (const record of event.Records) {
    console.log('1');
    const sourceKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, ' '),
    );
    console.log('2');
    if (validFile(sourceKey)) {
      const nameFile = path.basename(sourceKey);
      const allSizes = process.env.ALL_SIZE.split(',');
      console.log(sourceKey);
      try {
        const originalImage = await getImage(sourceKey);
        console.log('4 ' + 'Total size: ' + allSizes.length);

        const sizes = allSizes.map((size) => takeSize(size));
        const imagesProcessed = await Promise.all(
          sizes.map((size) => {
            return handleImage(originalImage.Body, size);
          }),
        );
        console.log("resized");
        const dataMapping = sizes.map((size, index) => {
          return {
            targetKey: `resized/${size.width}x${size.height}/` + nameFile,
            buffer: imagesProcessed[index],
          };
        });
        console.log("mapping");
        const imagesPut = await Promise.all(dataMapping.map(data => {
          return putImage(data.buffer, data.targetKey)
        }));
        console.log('successful');
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
  return;
};

function takeSize(size) {
  const [width, height] = size.split('x');
  return { width: Number(width), height: Number(height) };
}
function validFile(sourceKey) {
  const typeMatch = sourceKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log('Could not determine the image type.');
    return false;
  }
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != 'jpg' && imageType != 'png') {
    console.log(`Unsupported image type: ${imageType}`);
    return false;
  }
  return true;
}
function getImage(sourceKey) {
  const params = {
    Bucket: process.env.BUCKET,
    Key: sourceKey,
  };
  console.log('3');
  return s3.getObject(params).promise();
}
function handleImage(body, size) {
  // return new Promise((resolve) =>{
  //   return resolve(sharp(body).resize(size.width, size.height).toBuffer())
  // });
  return sharp(body).resize(size.width, size.height).toBuffer();
}
function putImage(body, targetKey) {
  const targetParams = {
    Bucket: process.env.BUCKET,
    Key: targetKey,
    Body: body,
    ContentType: 'image',
  };
  return s3.putObject(targetParams).promise();
}
