import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { orbVertexShader, orbFragmentShader } from './shaders';
import { ringVertexShader, ringFragmentShader } from './ringShaders';

// --- Setup basic scene ---
const appContainer = document.getElementById('app')!;
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Tone mapping to prevent extreme white blown-out areas
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
appContainer.appendChild(renderer.domElement);

// --- Colors ---
// Slightly adjusted to match the requested look
const colorBlue = new THREE.Color(0x00aaff); // Cyan/Blue
const colorOrange = new THREE.Color(0xff6600); // Orange/Gold

// --- Uniforms ---
const sharedUniforms = {
    uTime: { value: 0 },
    uColor1: { value: colorBlue },
    uColor2: { value: colorOrange },
    uWeights: { value: new THREE.Vector3(1, 0, 0) } // Mixed mode default
};

// --- Orb ---
const orbGeometry = new THREE.SphereGeometry(1, 256, 256); // High res for smooth noise displacement
const orbMaterial = new THREE.ShaderMaterial({
    vertexShader: orbVertexShader,
    fragmentShader: orbFragmentShader,
    uniforms: sharedUniforms,
    transparent: true,
    depthWrite: false,
    // Additive blending works, but for a "glassy" dark look with emissive veins,
    // we might want standard blending with pre-multiplied alpha or custom blending.
    // Let's stick to CustomBlending to have fine control, or just use NormalBlending
    // since we handle darkness and opacity in the shader.
    blending: THREE.NormalBlending,
    side: THREE.FrontSide
});
const orb = new THREE.Mesh(orbGeometry, orbMaterial);
scene.add(orb);

// --- Rings ---
const numRings = 4;
const rings: THREE.Mesh[] = [];

for (let i = 0; i < numRings; i++) {
    const radius = 1.3 + i * 0.4;
    // Make rings much thinner
    const tube = 0.005 + i * 0.002;

    const ringGeometry = new THREE.TorusGeometry(radius, tube, 16, 200);

    const ringUniforms = {
        ...sharedUniforms,
        uRadius: { value: radius }
    };

    const ringMaterial = new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        uniforms: ringUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // Additive is fine for these faint glows
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    ring.rotation.z = Math.random() * Math.PI * 2;
    ring.rotation.x = Math.random() * 0.1; // Very slight tilt
    ring.rotation.y = Math.random() * 0.1;

    rings.push(ring);
    scene.add(ring);
}

// --- Post-processing for bloom ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, // strength: lower so it doesn't blow out the core
    0.8, // radius: wide, soft bloom
    0.3  // threshold: only brightest veins glow
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Resize handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI and Mode Transitions ---
const btnMixed = document.getElementById('btn-mixed')!;
const btnBlue = document.getElementById('btn-blue')!;
const btnOrange = document.getElementById('btn-orange')!;

const buttons = [btnMixed, btnBlue, btnOrange];

let targetWeights = new THREE.Vector3(1, 0, 0);

function setMode(mode: 'mixed' | 'blue' | 'orange') {
    buttons.forEach(btn => btn.classList.remove('active'));
    if (mode === 'mixed') {
        btnMixed.classList.add('active');
        targetWeights.set(1, 0, 0);
    } else if (mode === 'blue') {
        btnBlue.classList.add('active');
        targetWeights.set(0, 1, 0);
    } else if (mode === 'orange') {
        btnOrange.classList.add('active');
        targetWeights.set(0, 0, 1);
    }
}

btnMixed.addEventListener('click', () => setMode('mixed'));
btnBlue.addEventListener('click', () => setMode('blue'));
btnOrange.addEventListener('click', () => setMode('orange'));

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    sharedUniforms.uTime.value = elapsedTime;

    // Smooth transition
    sharedUniforms.uWeights.value.lerp(targetWeights, 0.05);

    // Slow rotations
    orb.rotation.y = elapsedTime * 0.05;
    orb.rotation.z = elapsedTime * 0.02;

    rings.forEach((ring, i) => {
        ring.rotation.z = elapsedTime * (0.01 + i * 0.005) * (i % 2 === 0 ? 1 : -1);
    });

    composer.render();
}

animate();
