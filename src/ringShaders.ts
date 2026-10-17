export const ringVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

export const ringFragmentShader = `
uniform float uTime;
uniform vec3 uWeights;
uniform float uRadius;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    // Determine ring color based on mode
    float mixW = uWeights.x;
    float blueW = uWeights.y;
    float orangeW = uWeights.z;

    vec3 colorBlue = vec3(0.3, 0.55, 1.0);
    vec3 colorOrange = vec3(1.0, 0.6, 0.15);

    // Calculate angle for gradient
    float angle = atan(vPosition.y, vPosition.x); // -PI to PI

    vec3 ringColor;
    if (mixW > 0.5) {
        // Smooth gradient based on x position, exactly like the orb
        // vPosition.x represents left-to-right
        float mixFactor = smoothstep(-uRadius * 0.8, uRadius * 0.8, vPosition.x);
        ringColor = mix(colorBlue, colorOrange, mixFactor);
    } else if (blueW > 0.5) {
        ringColor = colorBlue;
    } else {
        ringColor = colorOrange;
    }

    // The rings in the reference vary in intensity
    // We add a soft pulse that travels around the ring
    // Add offset based on radius so they don't pulse together
    float angularIntensity = (sin(angle * 2.0 + uTime + uRadius * 10.0) * 0.5 + 0.5);

    // Very faint base transparency, peaks at thicker spots
    float baseAlpha = mix(0.1, 0.5, angularIntensity);

    // Increase color brightness to punch through bloom
    gl_FragColor = vec4(ringColor * 2.0, baseAlpha);
}
`;
