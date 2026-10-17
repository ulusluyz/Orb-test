// GLSL 3D simplex noise function and FBM
const snoise = `
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

float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
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
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // More prominent, lower-frequency wobble to break perfect sphere shape
    // using time and position to deform the vertices
    float time = uTime * 0.15;
    float noiseVal = snoise(position * 1.2 + time);
    // Add a secondary noise to make it less uniform
    noiseVal += 0.5 * snoise(position * 2.5 - time * 1.5);

    // Deform outward and inward
    float disp = noiseVal * 0.06;
    vec3 newPos = position + normal * disp;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(newPos, 1.0);
}
`;

export const orbFragmentShader = `
uniform float uTime;
uniform vec3 uWeights; // x: mixed, y: blue, z: orange

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

${snoise}

void main() {
    vec3 p = vPosition;
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = clamp(1.0 - dot(viewDir, vNormal), 0.0, 1.0);

    // Deep black base color
    vec3 baseColor = vec3(0.00, 0.005, 0.015);

    // Weights for color modes
    float mixW = uWeights.x;
    float blueW = uWeights.y;
    float orangeW = uWeights.z;

    // Adjusted color palettes to match reference more closely
    // Blue is softer and slightly more indigo/cyan
    vec3 colorBlue = vec3(0.3, 0.55, 1.0);
    // Orange is slightly more yellow/gold
    vec3 colorOrange = vec3(1.0, 0.6, 0.15);

    // Gradient based on horizontal position for mixed mode
    vec3 mainColor;
    if (mixW > 0.5) {
        // -0.3 to 0.3 for a softer blend in the middle
        float mixFactor = smoothstep(-0.3, 0.3, p.x);
        mainColor = mix(colorBlue, colorOrange, mixFactor);
    } else if (blueW > 0.5) {
        mainColor = colorBlue;
    } else {
        mainColor = colorOrange;
    }

    // --- Smoke / Silk Veins ---
    // Domain warping: distort the coordinates used for noise
    vec3 q = vec3(
        fbm(p + uTime * 0.05),
        fbm(p + vec3(5.2, 1.3, 2.8) - uTime * 0.04),
        fbm(p + vec3(3.1, 8.4, 1.9) + uTime * 0.03)
    );

    vec3 r = vec3(
        fbm(p + 4.0 * q + vec3(1.7, 9.2, 4.3) + uTime * 0.1),
        fbm(p + 4.0 * q + vec3(8.3, 2.8, 1.4) - uTime * 0.12),
        fbm(p + 4.0 * q + vec3(5.1, 3.7, 7.2) + uTime * 0.08)
    );

    // Smooth flowing field
    float f = fbm(p + 3.0 * r);

    // Create sharp but smooth wisps from the warped field
    // sin() creates repeating bands, which we sharpen
    float wisp = sin(f * 15.0 + uTime * 0.5) * 0.5 + 0.5;

    // Power controls thickness of the silk threads
    float veinIntensity = pow(wisp, 8.0) * 1.5;

    // Add some soft overall volume clouds behind the sharp wisps
    float softVolume = f * 0.4;

    // Mask veins near the very center to give depth, and also mask at the extreme edge
    float depthMask = smoothstep(0.0, 0.6, fresnel) * smoothstep(1.0, 0.7, fresnel);

    // --- Edge Glow (Fresnel Atmospheric Rim) ---
    // Soft, wide glow on the edge
    float rim = smoothstep(0.4, 1.0, fresnel);
    // Add a sharper rim right at the edge
    float sharpRim = pow(fresnel, 4.0) * 2.0;
    float edgeGlow = rim * 0.8 + sharpRim;

    // Combine visual elements
    vec3 colorOutput = baseColor;

    // The inner volume is very dim
    colorOutput += mainColor * softVolume * 0.2 * depthMask;

    // The silk veins are bright
    colorOutput += mainColor * veinIntensity * depthMask * 2.0;

    // The edge glow defines the sphere
    colorOutput += mainColor * edgeGlow;

    // Transparency control
    // Very transparent in the middle, opaque at edges and on veins
    float alpha = clamp(veinIntensity + edgeGlow * 1.5 + 0.1, 0.0, 1.0);

    gl_FragColor = vec4(colorOutput, alpha);
}
`;
