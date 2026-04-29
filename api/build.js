const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  console.log('📦 Starting API Build...');

  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath);
  }

  try {
    await esbuild.build({
      entryPoints: ['server.js'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: 'dist/app.js',
      minify: true,
      sourcemap: true,
      // We exclude certain node_modules if needed, but for esbuild bundle: true is fine for simple apps
      external: [
        'bcryptjs', 'express', 'socket.io', 'multer', 'winston', 'morgan', 'helmet', 'compression', 'cors', 'dotenv', 'jsonwebtoken', 'moment', 'qrcode', 'razorpay', 'uuid'],
    });

    console.log('✅ Build complete: dist/app.js');
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

build();
