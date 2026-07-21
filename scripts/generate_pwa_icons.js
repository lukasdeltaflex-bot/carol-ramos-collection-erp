const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_IMAGE = 'C:\\Users\\lukas\\.gemini\\antigravity\\brain\\88e60e1e-552e-402d-9406-e5f8614a068e\\.user_uploaded\\media__1784666208847.jpg';

async function generateAllPwaIcons() {
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('Source image not found at:', SOURCE_IMAGE);
    return;
  }

  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Processing official logo image:', SOURCE_IMAGE);

  // Read source image buffer
  const imageBuffer = fs.readFileSync(SOURCE_IMAGE);
  const metadata = await sharp(imageBuffer).metadata();
  console.log(`Source dimensions: ${metadata.width}x${metadata.height}`);

  // Standard PWA icon sizes
  const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

  for (const size of sizes) {
    let filename;
    if (size === 16 || size === 32) {
      filename = `favicon-${size}x${size}.png`;
    } else if (size === 180) {
      filename = 'apple-touch-icon.png';
    } else {
      filename = `icon-${size}x${size}.png`;
    }

    await sharp(imageBuffer)
      .resize(size, size, { fit: 'cover' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(path.join(iconsDir, filename));

    console.log(`✓ Generated ${filename}`);
  }

  // 1. Root favicon.png & icon.png
  await sharp(imageBuffer)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('✓ Generated public/favicon.png');

  await sharp(imageBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(__dirname, '../public/icon.png'));
  console.log('✓ Generated public/icon.png');

  // Copy official logo directly
  await sharp(imageBuffer)
    .png()
    .toFile(path.join(__dirname, '../public/official_logo.png'));
  console.log('✓ Generated public/official_logo.png');

  // 2. Maskable Icon (Android Adaptive Icon with 10% safe zone padding)
  // Background blush pink color: #FAF2EE
  const padSize = Math.round(512 * 0.85); // 85% inner size
  const innerLogo = await sharp(imageBuffer)
    .resize(padSize, padSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 250, g: 242, b: 238, alpha: 1 } // Blush pink matching background
    }
  })
    .composite([{ input: innerLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  console.log('✓ Generated public/icons/icon-maskable-512x512.png (Maskable)');
}

generateAllPwaIcons().catch(console.error);
