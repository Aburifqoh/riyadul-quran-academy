const sharp = require('sharp');

// Square crop of the Ilmvers emblem (crescent, dome, pen, book) from the
// official logo, stopping above the wordmark. Bounds measured on the 1080px file.
const CROP = { left: 247, top: 50, width: 580, height: 580 };

async function writeIcon(size, file) {
  await sharp('public/assets/images/logo.jpeg')
    .extract(CROP)
    .resize(size, size)
    .png()
    .toFile(file);
  console.log('wrote', file, size);
}

async function processFavicon() {
  await writeIcon(512, 'public/icon-ilmvers.png');
  await writeIcon(192, 'public/icon-ilmvers-192.png');
  await writeIcon(180, 'public/apple-touch-icon.png');
  await writeIcon(32, 'public/favicon-32.png');
  await writeIcon(512, 'public/icon-light.png');
  await writeIcon(512, 'public/icon-dark.png');
  const png = await sharp('public/assets/images/logo.jpeg').extract(CROP).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  require('fs').writeFileSync('public/favicon.ico', Buffer.concat([header, png]));
  console.log('wrote public/favicon.ico');
}

processFavicon().catch((error) => {
  console.error(error);
  process.exit(1);
});
