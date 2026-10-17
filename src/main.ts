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
camera.position.set(0, 0, 3.5); // Moved back slightly to show all 3 rings
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
appContainer.appendChild(renderer.domElement);

// --- Uniforms ---
const sharedUniforms = {
    uTime: { value: 0 },
    uWeights: { value: new THREE.Vector3(1, 0, 0) } // Mixed mode default
};

// --- Orb ---
const orbGeometry = new THREE.SphereGeometry(1, 256, 256); // High res for smooth displacement
const orbMaterial = new THREE.ShaderMaterial({
    vertexShader: orbVertexShader,
    fragmentShader: orbFragmentShader,
    uniforms: sharedUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide
});
const orb = new THREE.Mesh(orbGeometry, orbMaterial);
orb.position.set(0, 0, 0);
scene.add(orb);

// --- Rings ---
// The reference has 3 distinct rings with increasing gaps
const ringRadii = [1.2, 1.45, 1.8];
const rings: THREE.Mesh[] = [];

for (let i = 0; i < ringRadii.length; i++) {
    const radius = ringRadii[i];
    // Slightly varying thickness
    const tube = 0.003 + (i * 0.001);

    const ringGeometry = new THREE.TorusGeometry(radius, tube, 32, 256);

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
        blending: THREE.AdditiveBlending, // Additive to make them pop and glow softly
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    ring.rotation.x = 0;
    ring.rotation.y = 0;
    ring.position.set(0, 0, 0);

    rings.push(ring);
    scene.add(ring);
}

// --- Post-processing for bloom ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, // strength: Stronger for atmospheric glow
    1.5, // radius: Very wide to simulate camera lens flare/atmosphere
    0.1  // threshold: Low to catch the faint rings
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

    sharedUniforms.uWeights.value.lerp(targetWeights, 0.05);

    // Very subtle rotations for the orb to maintain gradient alignment
    orb.rotation.y = Math.sin(elapsedTime * 0.05) * 0.1;
    orb.rotation.z = Math.cos(elapsedTime * 0.05) * 0.05;

    // Rings slowly spin
    rings.forEach((ring, i) => {
        ring.rotation.z = elapsedTime * (0.01 + i * 0.005) * (i % 2 === 0 ? 1 : -1);
    });

    composer.render();
}

animate();
