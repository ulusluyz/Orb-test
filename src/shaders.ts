// GLSL 3D simplex noise function
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
    // We compute a very simple normal. In standard meshes, normal is provided.
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // Low-frequency displacement to avoid the "bumpy" planet look
    float disp = snoise(position * 2.0 + uTime * 0.2) * 0.01;
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

// Smooth min function for blending noise fields
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
    vec3 p = vPosition;
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = clamp(1.0 - dot(viewDir, vNormal), 0.0, 1.0);

    // 1. Dark base color (very dark blue/black)
    vec3 baseColor = vec3(0.005, 0.01, 0.02);

    // Weights for color modes
    float mixW = uWeights.x;
    float blueW = uWeights.y;
    float orangeW = uWeights.z;

    // Fixed color palettes
    vec3 colorBlue = vec3(0.2, 0.6, 1.0); // Cyan/Blue
    vec3 colorOrange = vec3(1.0, 0.7, 0.2); // Orange/Gold

    // Determine the base color of the glow and veins based on position and mode
    vec3 mainColor;
    if (mixW > 0.5) {
        // In mixed mode, left is blue, right is orange (based on x position)
        float mixFactor = smoothstep(-0.6, 0.6, p.x);
        mainColor = mix(colorBlue, colorOrange, mixFactor);
    } else if (blueW > 0.5) {
        mainColor = colorBlue;
    } else {
        mainColor = colorOrange;
    }

    // 2. Caustic-like sharp veins
    // We use a combination of noise functions to create flowy, sharp lines
    vec3 flowDir = vec3(0.0, uTime * 0.05, uTime * 0.08); // slowed down
    vec3 noisePos = p * 1.5 + flowDir; // lower frequency for sparser veins

    // Sharp ridged noise
    float n1 = 1.0 - abs(snoise(noisePos));
    float n2 = 1.0 - abs(snoise(noisePos * 2.1 - flowDir * 1.5));

    // Sharpen heavily to make them very thin and stringy, not blotchy
    float combinedNoise = (n1 + n2 * 0.5) / 1.5;
    // VERY high power makes it extremely sharp and mostly black
    float veinIntensity = pow(combinedNoise, 12.0) * 4.0;

    // Soften the veins towards the edges (fresnel mask)
    float veinMask = smoothstep(0.9, 0.3, fresnel);
    veinIntensity *= veinMask;

    // Remove the volume cloud entirely, the reference is very dark inside

    // 3. Edge Glow (Fresnel)
    // The reference has a very distinct, soft, but bright edge glow
    float edgeGlow = pow(fresnel, 3.5) * 1.2; // Tighter, brighter edge

    // Combine visual elements
    vec3 colorOutput = baseColor;
    colorOutput += mainColor * veinIntensity;
    colorOutput += mainColor * edgeGlow;

    // 4. Alpha / Transparency Control
    // The sphere is largely transparent except for the glowing parts
    float lum = dot(colorOutput, vec3(0.299, 0.587, 0.114));
    // Keep alpha low in dark areas
    float alpha = clamp(0.1 + lum * 1.2, 0.0, 1.0);

    gl_FragColor = vec4(colorOutput, alpha);
}
`;
