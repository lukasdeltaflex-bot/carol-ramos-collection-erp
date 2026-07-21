const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Sharp not available yet:', e.message);
    return;
  }

  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/icon.svg'));
  const iconsDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

  for (const size of sizes) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, filename));
    console.log(`Generated ${filename}`);
  }

  // Maskable icon with 10% padding
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  console.log('Generated icon-maskable-512x512.png');

  // Root icon.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '../public/icon.png'));
  console.log('Generated root public/icon.png');
}

generateIcons().catch(console.error);
