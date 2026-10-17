// GLSL 3D simplex noise function
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

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;

export const orbVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

${snoise}

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);

    // Slight surface deformation using noise
    float noiseVal = snoise(position * 1.5 + uTime * 0.4);
    vec3 newPosition = position + normal * noiseVal * 0.08;

    // Breathing effect
    float breath = sin(uTime * 1.2) * 0.03;
    newPosition += normal * breath;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

export const orbFragmentShader = `
uniform float uTime;
uniform vec3 uColor1; // Blue / Cyan
uniform vec3 uColor2; // Orange / Gold
uniform vec3 uWeights; // x: Mixed, y: Blue, z: Orange

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

${snoise}

void main() {
    // Generate complex flowing noise patterns
    vec3 p = vPosition * 1.5;
    float n1 = snoise(p + vec3(uTime * 0.15, uTime * 0.25, 0.0));
    float n2 = snoise(p * 2.0 - vec3(uTime * 0.3, 0.0, uTime * 0.1));
    float n3 = snoise(p * 4.0 + vec3(0.0, uTime * 0.4, uTime * 0.2));

    // Combine noises to create fluid "veins"
    // Map noise from [-1, 1] to [0, 1] range
    float fluid = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
    fluid = fluid * 0.5 + 0.5;

    // Calculate a color mix based on noise
    // Using smoothstep to create sharper transitions between colors
    float colorMix = smoothstep(0.3, 0.7, fluid + n2 * 0.3);
    vec3 mixedColor = mix(uColor1, uColor2, colorMix);

    // Final base color determined by weights
    vec3 baseColor = mixedColor * uWeights.x + uColor1 * uWeights.y + uColor2 * uWeights.z;

    // Edge glow (Fresnel effect)
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = dot(viewDirection, normalize(vNormal));
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    float edgeGlow = pow(fresnel, 2.0); // Adjust power for edge sharpness

    // Core intensity - darker core, brighter veins
    float coreIntensity = smoothstep(0.4, 0.6, fluid);

    // Combine everything
    vec3 finalColor = baseColor * (coreIntensity * 0.5 + edgeGlow * 1.5);

    // Soften and blend the colors better for bloom
    finalColor *= 1.1;

    // Alpha mapping to make edges slightly transparent and inner parts solid
    float alpha = clamp(coreIntensity * 0.8 + edgeGlow, 0.2, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
}
`;
