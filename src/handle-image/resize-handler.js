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
        console.log('4 ' + 'Total size:' + allSizes.length);
        let count = 1;

        const processImage = allSizes.map((size) => {
          const { width, height } = takeSize(size);
          // console.log(count++ + '  ' + width + 'x' + height);
          return handle(originalImage.Body, width, height, nameFile);
        });

        await Promise.all(processImage);
        console.log('successful');
      } catch (error) {
        console.error(error);
      }
    }
  }
};

function takeSize(size) {
  const [width, height] = size.split('x');
  console.log("take size: "+width+"x"+height);
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
async function handle(body, width, height, nameFile) {
  const buffer = await sharp(body).resize(width, height).toBuffer();
  const targetKey = `resized/${width}x${height}/` + nameFile;
  const targetParams = {
    Bucket: process.env.BUCKET,
    Key: targetKey,
    Body: buffer,
    ContentType: 'image',
  };
  console.log(width + 'x' + height);
  return s3.putObject(targetParams).promise();
}
