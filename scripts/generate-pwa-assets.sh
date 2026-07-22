#!/bin/bash
set -e

# Define directories
WORKSPACE_DIR="/Users/syedmustafaahmed/Documents/grotrack"
PUBLIC_DIR="$WORKSPACE_DIR/public"
ICONS_DIR="$PUBLIC_DIR/icons"
SPLASH_DIR="$PUBLIC_DIR/splash"
BASE_LOGO="/Users/syedmustafaahmed/.gemini/antigravity-ide/brain/6c76f309-b03b-4d1b-a1a2-67e894bfa71a/grotrack_logo_1780213427465.png"

echo "Creating PWA directories..."
mkdir -p "$ICONS_DIR"
mkdir -p "$SPLASH_DIR"
mkdir -p "$PUBLIC_DIR/images"

# Copy base logo
cp "$BASE_LOGO" "$PUBLIC_DIR/images/grotrack_pwa_logo.png"
echo "Base logo saved to public/images/grotrack_pwa_logo.png"

# Generate Icons using sips
echo "Generating PWA icons..."
sips -z 72 72     "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-72x72.png"
sips -z 96 96     "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-96x96.png"
sips -z 128 128   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-128x128.png"
sips -z 144 144   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-144x144.png"
sips -z 152 152   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-152x152.png"
sips -z 180 180   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-180x180.png"
sips -z 192 192   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-192x192.png"
sips -z 384 384   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-384x384.png"
sips -z 512 512   "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$ICONS_DIR/icon-512x512.png"
echo "PWA icons generated successfully!"

# Temporary files for splash screen generation
TEMP_384="$PUBLIC_DIR/images/temp_384.png"
TEMP_256="$PUBLIC_DIR/images/temp_256.png"
TEMP_512="$PUBLIC_DIR/images/temp_512.png"

sips -z 384 384 "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$TEMP_384"
sips -z 256 256 "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$TEMP_256"
sips -z 512 512 "$PUBLIC_DIR/images/grotrack_pwa_logo.png" --out "$TEMP_512"

echo "Generating iPad & iPhone splash screens..."
# iPhone 14/15/16 Pro Max (1290x2796)
sips -p 2796 1290 --padColor 05010D "$TEMP_384" --out "$SPLASH_DIR/apple-splash-1290-2796.png"

# iPhone 14/15/16 Pro (1179x2556)
sips -p 2556 1179 --padColor 05010D "$TEMP_384" --out "$SPLASH_DIR/apple-splash-1179-2556.png"

# iPhone SE / 8 / 7 (750x1334)
sips -p 1334 750  --padColor 05010D "$TEMP_256" --out "$SPLASH_DIR/apple-splash-750-1334.png"

# iPad Pro 12.9" (2048x2732)
sips -p 2732 2048 --padColor 05010D "$TEMP_512" --out "$SPLASH_DIR/apple-splash-2048-2732.png"

# iPad Air 10.9" (1640x2360)
sips -p 2360 1640 --padColor 05010D "$TEMP_512" --out "$SPLASH_DIR/apple-splash-1640-2360.png"

# Clean up temp files
rm "$TEMP_384" "$TEMP_256" "$TEMP_512"

echo "Splash screens generated successfully!"
