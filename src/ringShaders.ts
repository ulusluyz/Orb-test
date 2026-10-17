// 2D noise for the rings (already provided by ashima arts)
const snoise2d = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

export const ringVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    // Simple pass-through for the torus rings
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const ringFragmentShader = `
uniform float uTime;
uniform vec3 uColor1; // Blue
uniform vec3 uColor2; // Orange
uniform vec3 uWeights;
uniform float uRadius;

varying vec2 vUv;
varying vec3 vPosition;

${snoise2d}

void main() {
    // We want the rings to be very soft, almost ethereal, and not solid.
    // They should have slight variations in intensity around the circle.

    // Calculate polar coordinates (angle)
    float angle = atan(vPosition.y, vPosition.x);

    // Animate the noise moving along the ring
    float noiseVal = snoise(vec2(angle * 2.0 + uTime * 0.5, uRadius * 10.0));

    // Soften the noise
    float intensity = smoothstep(-1.0, 1.0, noiseVal) * 0.4 + 0.1; // Base glow + noise

    // Apply colors based on mode
    float mixW = uWeights.x;
    float blueW = uWeights.y;
    float orangeW = uWeights.z;

    vec3 colorBlue = vec3(0.0, 0.7, 1.0);
    vec3 colorOrange = vec3(1.0, 0.4, 0.0);

    vec3 ringColor = vec3(0.0);
    ringColor += colorBlue * (mixW + blueW);
    ringColor += colorOrange * (mixW + orangeW);

    // In mixed mode, interleave colors based on radius to create alternating blue/orange rings
    if (mixW > 0.5) {
       // Use uRadius to pick a dominant color for this specific ring
       float colorSelector = fract(uRadius * 2.73);
       vec3 mixedColor = mix(colorBlue, colorOrange, smoothstep(0.4, 0.6, colorSelector));
       ringColor = mixedColor;
    }

    // Multiply by intensity and a base very low opacity so they are subtle atmospheric rings
    // We will use standard transparent blending (not additive) to keep them soft but visible against dark.
    float finalAlpha = intensity * 0.15; // Very subtle

    gl_FragColor = vec4(ringColor * 1.5, finalAlpha);
}
`;
