// GLSL 3D simplex noise function (already provided by ashima arts)
const snoise = `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

// Curl noise derived from simplex noise for more organic fluid motion
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  float x = snoise(p + dy) - snoise(p - dy) - (snoise(p + dz) - snoise(p - dz));
  float y = snoise(p + dz) - snoise(p - dz) - (snoise(p + dx) - snoise(p - dx));
  float z = snoise(p + dx) - snoise(p - dx) - (snoise(p + dy) - snoise(p - dy));

  return normalize(vec3(x, y, z)) * 0.5;
}
`;

export const orbVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

${snoise}

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    // Slow, organic, subtle surface deformation (domain warping technique)
    vec3 warp = vec3(
        snoise(position * 1.2 + uTime * 0.2),
        snoise(position * 1.2 + uTime * 0.25 + 10.0),
        snoise(position * 1.2 + uTime * 0.15 + 20.0)
    );

    float noiseVal = snoise(position * 2.0 + warp * 0.5 + uTime * 0.1);

    // Keep the deformation very small to maintain the glass orb feel
    vec3 newPosition = position + normal * noiseVal * 0.03;

    // Slight breathing
    newPosition += normal * sin(uTime * 0.5) * 0.01;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(newPosition, 1.0);
}
`;

export const orbFragmentShader = `
uniform float uTime;
uniform vec3 uColor1; // Cyan / Blue
uniform vec3 uColor2; // Orange / Gold
uniform vec3 uWeights; // x: Mixed, y: Blue, z: Orange
uniform vec3 cameraPos; // Automatically provided by three.js (cameraPosition is standard)

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

${snoise}

void main() {
    // 1. Domain Warping for fluid motion
    vec3 p = vPosition * 2.5;
    vec3 q = vec3(
        snoise(p + vec3(0.0, uTime * 0.3, uTime * 0.2)),
        snoise(p + vec3(uTime * 0.2, 0.0, uTime * 0.4)),
        snoise(p + vec3(uTime * 0.4, uTime * 0.1, 0.0))
    );

    vec3 r = vec3(
        snoise(p + 2.0 * q + vec3(uTime * 0.1, uTime * 0.3, 0.0)),
        snoise(p + 2.0 * q + vec3(uTime * 0.2, 0.0, uTime * 0.1)),
        snoise(p + 2.0 * q + vec3(0.0, uTime * 0.2, uTime * 0.3))
    );

    // 2. Generate thin, organic light veins using inverse absolute noise
    // By taking 1.0 - abs(noise), values near 0 become 1 (the lines), and others fade out.
    // Raising it to a high power makes the lines thin and sharp.
    float rawNoise1 = snoise(p + r * 1.5 + uTime * 0.15);
    float vein1 = pow(1.0 - abs(rawNoise1), 6.0);

    float rawNoise2 = snoise(p + r * 1.2 - uTime * 0.1);
    float vein2 = pow(1.0 - abs(rawNoise2), 6.0);

    // 3. Color mapping
    // We keep colors somewhat separate to avoid muddy pinks when mixed.
    // In Mixed mode, vein1 is Blue/Cyan, vein2 is Orange/Gold.
    vec3 veinColor1 = uColor1; // Blue
    vec3 veinColor2 = uColor2; // Orange

    // If pure Blue mode, both veins are blue but slightly varied.
    // If pure Orange mode, both veins are orange but slightly varied.
    vec3 colorMix1 = mix(veinColor1 * uWeights.x + veinColor1 * uWeights.y + veinColor2 * uWeights.z, veinColor1, 0.5 * uWeights.y);
    vec3 colorMix2 = mix(veinColor2 * uWeights.x + veinColor1 * uWeights.y + veinColor2 * uWeights.z, veinColor2, 0.5 * uWeights.z);

    // Combine veins
    vec3 emissive = (colorMix1 * vein1) + (colorMix2 * vein2 * 0.8);

    // Add some soft background glow inside the sphere
    float innerGlow = snoise(p * 0.5 + uTime * 0.05) * 0.5 + 0.5;
    vec3 ambientInnerColor = mix(uColor1, uColor2, 0.5) * uWeights.x + uColor1 * uWeights.y + uColor2 * uWeights.z;
    emissive += ambientInnerColor * innerGlow * 0.05; // Very subtle

    // 4. Fresnel effect for the glass sphere look
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    // Use the perturbed normal from the vertex shader for the edge
    float fresnelTerm = dot(viewDirection, vNormal);
    fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);

    // Outer glass edge glow
    float fresnelPow = pow(fresnelTerm, 3.0);
    vec3 glassEdge = ambientInnerColor * fresnelPow * 0.3; // Dark glass, subtle edge

    // 5. Final composition
    // Base color of the sphere is black/dark
    vec3 baseGlassColor = vec3(0.01, 0.01, 0.02);

    vec3 finalColor = baseGlassColor + emissive + glassEdge;

    // 6. Transparency control
    // Dark areas between veins should be highly transparent to see inside/through
    // Edges (Fresnel) are slightly more opaque
    // Veins are opaque/emissive
    float alpha = clamp(vein1 + vein2 + fresnelPow * 0.5 + 0.1, 0.0, 1.0);

    // Output with premultiplied alpha or additive blending setup handled in main.js
    gl_FragColor = vec4(finalColor, alpha);
}
`;
