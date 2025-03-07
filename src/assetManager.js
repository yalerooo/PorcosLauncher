// --- FILE: src/assetManager.js ---
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // Import app
const { getLauncherBasePath } = require('./config');

function ensureAssets() {
  const assetsDir = path.join(app.getAppPath(), "assets")
  const versionsAssetsDir = path.join(assetsDir, "versions") // Subdirectory for version images

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }
  if (!fs.existsSync(versionsAssetsDir)) {
    fs.mkdirSync(versionsAssetsDir, { recursive: true })
  }

  // Create background.png if it doesn't exist
  const backgroundPath = path.join(assetsDir, "background.png")
  if (!fs.existsSync(backgroundPath)) {
    // Create a simple dark purple background
    const { createCanvas } = require("canvas")
    const canvas = createCanvas(1920, 1080)
    const ctx = canvas.getContext("2d")

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080)
    gradient.addColorStop(0, "#300a24")
    gradient.addColorStop(1, "#4a1942")

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1920, 1080)

    // Add some texture
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 1920
      const y = Math.random() * 1080
      const radius = Math.random() * 2
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
    }

    // Save the background
    const buffer = canvas.toBuffer("image/png")
    fs.writeFileSync(backgroundPath, buffer)
  }

  // Create pig-logo.png if it doesn't exist
  const logoPath = path.join(assetsDir, "logo.jpg")
  if (!fs.existsSync(logoPath)) {
    // Copy from a default location or create a simple logo
    const defaultLogo = path.join(__dirname, "../assets/logo.jpg")
    if (fs.existsSync(defaultLogo)) {
      fs.copyFileSync(defaultLogo, logoPath)
    }
  }

  // Create minecraft-pig.png if it doesn't exist
  const pigImagePath = path.join(assetsDir, "pigimage.png")
  if (!fs.existsSync(pigImagePath)) {
    const defaultPig = path.join(__dirname, "../assets/pigimage.png")
    if (fs.existsSync(defaultPig)) {
      fs.copyFileSync(defaultPig, pigImagePath)
    }
  }
  // Copy default version images (if you have any)
  const defaultVersionImages = [
    "default1.png",
    "default2.png",
    "default3.jpg",
    "logo.jpg", // Example default images.  Add your filenames here.
  ]
  defaultVersionImages.forEach((imageName) => {
    const srcPath = path.join(
      __dirname,
      "../assets/versions",
      imageName
    ) // Assuming they are in project assets
    const destPath = path.join(versionsAssetsDir, imageName)
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath)
    }
  })
}


module.exports = { ensureAssets };