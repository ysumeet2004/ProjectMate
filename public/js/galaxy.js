/**
 * ProjectMate Galaxy Nebula Background
 * Three.js particle system with spiral galaxy, nebula sprites, and parallax interaction
 */

let scene, camera, renderer, galaxy, nebulaSprites, backgroundStars, clock;
let mouseTarget = { x: 0, y: 0 };
let scrollOffset = 0;

function init() {
  const canvas = document.getElementById('galaxy-bg');
  if (!canvas) {
    console.error('Canvas #galaxy-bg not found');
    return;
  }

  console.log('Initializing galaxy background...');
  
  // Scene setup
  scene = new THREE.Scene();
  
  // Camera
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 2.5, 7);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x03040a, 1);
  renderer.setSize(width, height);

  console.log('Renderer initialized:', {
    width,
    height,
    clearColor: '0x03040a',
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  });

  // Clock for animation timing
  clock = new THREE.Clock();

  // Create galaxy particles
  createGalaxy();
  console.log('Galaxy created');

  // Create nebula sprites
  createNebulas();
  console.log('Nebulas created');

  // Create background stars
  createBackgroundStars();
  console.log('Background stars created');

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('scroll', onScroll);

  // Start animation
  console.log('Starting animation loop...');
  animate();
}

function createGalaxy() {
  const particleCount = 80000;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Color palette
  const color1 = new THREE.Color(0xffffff);  // white
  const color2 = new THREE.Color(0x8b5cf6);  // purple
  const color3 = new THREE.Color(0xec4899);  // pink

  for (let i = 0; i < particleCount; i++) {
    const armIndex = i % 3;
    const r = Math.pow(Math.random(), 1.4) * 5.5;
    const angle = (armIndex / 3) * Math.PI * 2 + r * 1.2 + (Math.random() - 0.5) * 0.3;

    // Position with Gaussian scatter
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * Math.exp(-r * 0.3);
    const y = (Math.random() - 0.5) * Math.exp(-r * 0.5);
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * Math.exp(-r * 0.3);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Color interpolation based on radius
    const t = r / 5.5;
    let color;
    if (t < 0.5) {
      color = color1.clone().lerp(color2, t * 2);
    } else {
      color = color2.clone().lerp(color3, (t - 0.5) * 2);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85
  });

  galaxy = new THREE.Points(geometry, material);
  scene.add(galaxy);
}

function createCanvasTexture(radius, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, radius);
  
  // Parse RGB color
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;

  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(canvas);
}

function createNebulas() {
  nebulaSprites = [];
  
  const nebulas = [
    { pos: [-1.5, 0.4, -0.5], color: 0x581cdc, size: 7.0, opacity: 0.55 },
    { pos: [2.2, -0.3, -0.8], color: 0xdb2777, size: 5.5, opacity: 0.45 },
    { pos: [-2.8, -0.2, 0.3], color: 0x14b8a6, size: 4.0, opacity: 0.30 },
    { pos: [0.2, 0.1, 0.0], color: 0x6366f1, size: 3.5, opacity: 0.50 },
    { pos: [3.0, 0.5, -1.0], color: 0xf59e0b, size: 3.0, opacity: 0.20 }
  ];

  nebulas.forEach(nebula => {
    const texture = createCanvasTexture(128, nebula.color);
    const material = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(...nebula.pos);
    sprite.scale.set(nebula.size, nebula.size, 1);
    sprite.material.opacity = nebula.opacity;

    scene.add(sprite);
    nebulaSprites.push(sprite);
  });
}

function createBackgroundStars() {
  const starCount = 3000;
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const colorOptions = [
    new THREE.Color(0xffffff),  // white
    new THREE.Color(0xadd8ff),  // light blue
    new THREE.Color(0xffccaa)   // warm
  ];

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = -20 + Math.random() * 18;

    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.6
  });

  backgroundStars = new THREE.Points(geometry, material);
  scene.add(backgroundStars);
}

function onMouseMove(event) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const targetX = ((event.clientX - centerX) / centerX);
  const targetY = ((event.clientY - centerY) / centerY);

  mouseTarget.x += (targetX - mouseTarget.x) * 0.04;
  mouseTarget.y += (targetY - mouseTarget.y) * 0.04;
}

function onScroll() {
  scrollOffset = window.scrollY;
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Galaxy rotation
  if (galaxy) {
    galaxy.rotation.y = elapsed * 0.04;
    galaxy.rotation.x = -0.35 + mouseTarget.y * 0.08;
  }

  // Camera parallax
  camera.position.x = mouseTarget.x * 1.2;
  camera.position.y = 2.5 - mouseTarget.y * 0.8 - scrollOffset * 0.002;
  camera.position.z = 7 + scrollOffset * 0.003;

  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// Initialize when DOM is ready and Three.js is loaded
function initGalaxy() {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded yet, retrying...');
    setTimeout(initGalaxy, 100);
    return;
  }

  const canvas = document.getElementById('galaxy-bg');
  if (!canvas) {
    console.error('Canvas #galaxy-bg not found in DOM');
    return;
  }

  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGalaxy);
} else {
  initGalaxy();
}
