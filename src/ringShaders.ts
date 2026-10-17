export const ringVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const ringFragmentShader = `
uniform float uTime;
uniform vec3 uColor1; // Blue / Cyan
uniform vec3 uColor2; // Orange / Gold
uniform vec3 uWeights; // x: Mixed, y: Blue, z: Orange
uniform float uRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;

// Simple 2D noise
float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
        mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
        mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
    return res*res;
}

void main() {
    // Rings are very thin, subtle, and atmospheric

    // vUv.y is across the thickness. Create a sharp core and soft edge.
    float dist = abs(vUv.y - 0.5) * 2.0; // 0 at center, 1 at edges
    float core = pow(1.0 - dist, 4.0);
    float halo = pow(1.0 - dist, 1.5) * 0.3;
    float glow = core + halo;

    // Slowly moving noise along the ring (vUv.x)
    float movingNoise = noise(vec2(vUv.x * 15.0 + uTime * 0.1, uTime * 0.05));

    // Mixed color logic based on position around the ring
    float angleColorMix = (sin(vUv.x * 3.14159 * 2.0 + uTime * 0.1) + 1.0) * 0.5;
    vec3 mixedColor = mix(uColor1, uColor2, angleColorMix);

    // Final base color determined by weights
    vec3 baseColor = mixedColor * uWeights.x + uColor1 * uWeights.y + uColor2 * uWeights.z;

    vec3 finalColor = baseColor * glow * (0.5 + movingNoise * 0.5);

    // Keep opacity extremely low for the atmospheric look
    float alpha = glow * (0.1 + movingNoise * 0.1);

    gl_FragColor = vec4(finalColor, alpha);
}
`;
