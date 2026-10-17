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
uniform vec3 uWeights;
uniform float uRadius;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    // Determine ring color based on mode
    float mixW = uWeights.x;
    float blueW = uWeights.y;
    float orangeW = uWeights.z;

    vec3 colorBlue = vec3(0.2, 0.6, 1.0); // Cyan/Blue
    vec3 colorOrange = vec3(1.0, 0.7, 0.2); // Orange/Gold

    vec3 ringColor;
    if (mixW > 0.5) {
        // Alternating colors for mixed mode based on radius index
        // Using fract(uRadius) trick from before to pick a side
        float colorSelector = fract(uRadius * 3.14);
        ringColor = mix(colorBlue, colorOrange, smoothstep(0.4, 0.6, colorSelector));
    } else if (blueW > 0.5) {
        ringColor = colorBlue;
    } else {
        ringColor = colorOrange;
    }

    // To match the reference, the ring should have a slight fading gradient based on its rotation
    // We can simulate this using the vPosition in object space
    float angle = atan(vPosition.y, vPosition.x);
    // Add time to make the brighter part rotate around
    float angularIntensity = (sin(angle + uTime * 0.5) * 0.5 + 0.5) * 0.5 + 0.5;

    // Solid, semi-transparent base for the thin line
    float baseAlpha = 0.25 * angularIntensity;

    // Output with standard blending
    gl_FragColor = vec4(ringColor * 1.5, baseAlpha);
}
`;
