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

// Add a slight ambient light (though materials are custom shaders, this might not be needed, but good practice if adding other objects)
// scene.add(new THREE.AmbientLight(0xffffff, 0.1));

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
appContainer.appendChild(renderer.domElement);

// --- Colors ---
const colorBlue = new THREE.Color(0x0088ff); // Cyan/Blue
const colorOrange = new THREE.Color(0xff8800); // Orange/Gold

// --- Uniforms ---
const sharedUniforms = {
    uTime: { value: 0 },
    uColor1: { value: colorBlue },
    uColor2: { value: colorOrange },
    uWeights: { value: new THREE.Vector3(1, 0, 0) } // Mixed mode default
};

// --- Orb ---
const orbGeometry = new THREE.SphereGeometry(1, 128, 128);
const orbMaterial = new THREE.ShaderMaterial({
    vertexShader: orbVertexShader,
    fragmentShader: orbFragmentShader,
    uniforms: sharedUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending // Helps with the glowing ethereal look
});
const orb = new THREE.Mesh(orbGeometry, orbMaterial);
scene.add(orb);

// --- Rings ---
const numRings = 3;
const rings: THREE.Mesh[] = [];

for (let i = 0; i < numRings; i++) {
    // Inner to outer radius
    const radius = 1.4 + i * 0.3;
    const tube = 0.015 + i * 0.005; // Slightly thicker towards the outside, or keep thin

    // TorusGeometry(radius, tube, radialSegments, tubularSegments)
    const ringGeometry = new THREE.TorusGeometry(radius, tube, 16, 100);

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
        blending: THREE.AdditiveBlending
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    // Ensure rings are flat facing the camera
    // Torus is created lying on the XY plane by default in Three.js? No, it's on XY.
    // Wait, TorusGeometry in Three.js is on the XY plane.
    // Let's verify. Actually, it is on the XY plane. So it faces the Z axis.

    // Slight random rotation offset on Z so they don't look identical if noise matches
    ring.rotation.z = Math.random() * Math.PI * 2;

    rings.push(ring);
    scene.add(ring);
}

// --- Post-processing for bloom ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, // strength
    0.5, // radius
    0.2  // threshold - lower threshold so more things glow
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

// Target weights: [Mixed, Blue, Orange]
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

    // Update uniforms
    sharedUniforms.uTime.value = elapsedTime;

    // Smoothly interpolate weights
    sharedUniforms.uWeights.value.lerp(targetWeights, 0.05);

    // Rotate orb slowly
    orb.rotation.y = elapsedTime * 0.1;
    orb.rotation.z = elapsedTime * 0.05;

    // Rotate rings slowly
    rings.forEach((ring, i) => {
        ring.rotation.z = elapsedTime * (0.02 + i * 0.01) * (i % 2 === 0 ? 1 : -1);
    });

    composer.render();
}

animate();
