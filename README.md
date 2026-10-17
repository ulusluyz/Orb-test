# 3D Animated AI Orb

This project demonstrates a real-time, animated 3D orb using Three.js, GLSL shaders, and Vite. It features a glowing, fluid-like core with concentric neon rings and a bloom post-processing effect. You can transition smoothly between "Mixed", "Blue", and "Orange" color modes.

## Requirements

- Node.js (v16+ recommended)
- npm

## Setup & Run

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Build for production:**
   \`\`\`bash
   npm run build
   \`\`\`
   The production files will be generated in the `dist` directory.

## Features

- **Custom GLSL Shaders:** Utilizes 3D simplex noise for dynamic fluid motion on the orb and 2D noise for the rings.
- **UnrealBloomPass:** Applies a soft neon glow to the scene.
- **Mode Transitions:** Smoothly interpolates uniform weights between color modes without sudden jumps.
- **Responsive:** Automatically resizes with the browser window.
