export const ringVertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragmentShader = `
uniform float uTime;
uniform vec3 uColor1; // Blue / Cyan
uniform vec3 uColor2; // Orange / Gold
uniform vec3 uWeights; // x: Mixed, y: Blue, z: Orange
uniform float uRadius;

varying vec2 vUv;

// Simple 2D noise for the rings
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
    // The rings will use TorusGeometry, so vUv.x wraps around the ring, vUv.y is across the thickness

    // Create a smooth gradient across the thickness (vUv.y) to make it look like a glowing tube
    float thicknessGlow = sin(vUv.y * 3.14159);
    thicknessGlow = pow(thicknessGlow, 2.0); // Sharpen the glow

    // Add some variation along the ring (vUv.x)
    float movingNoise = noise(vec2(vUv.x * 10.0 + uTime * 0.5, uTime * 0.2));

    // Mixed color logic based on position around the ring (to simulate one side orange, one side blue)
    float angleColorMix = (sin(vUv.x * 3.14159 * 2.0 + uTime * 0.2) + 1.0) * 0.5;
    vec3 mixedColor = mix(uColor1, uColor2, angleColorMix);

    // Final base color determined by weights
    vec3 baseColor = mixedColor * uWeights.x + uColor1 * uWeights.y + uColor2 * uWeights.z;

    // Final color and alpha
    float alpha = thicknessGlow * (0.5 + movingNoise * 0.5);
    vec3 finalColor = baseColor * 1.5; // Boost for bloom

    gl_FragColor = vec4(finalColor, alpha * 0.6); // Base transparency
}
`;
