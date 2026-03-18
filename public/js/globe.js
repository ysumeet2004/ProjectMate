/**
 * ProjectMate Interactive Globe Visualization
 * 3D globe with floating particles and interactive lighting
 */

class InteractiveGlobe {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.globeRadius = Math.min(this.width, this.height) * 0.25;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;
    this.rotationX = 0.5;
    this.rotationY = 0.3;
    this.targetRotationX = 0.5;
    this.targetRotationY = 0.3;

    this.particles = [];
    this.initParticles();
    this.attachEventListeners();
    this.animate();
  }

  initParticles() {
    // Create globe surface particles (dots)
    const dotCount = 4000;
    for (let i = 0; i < dotCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = this.globeRadius;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.particles.push({
        x, y, z,
        ox: x, oy: y, oz: z,
        vx: 0, vy: 0, vz: 0,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.3,
        baseOpacity: Math.random() * 0.6 + 0.3,
        color: Math.random() > 0.5 ? 'rgba(139, 92, 246' : 'rgba(94, 206, 243'
      });
    }

    // Add connecting lines (limited for performance)
    this.connections = [];
    for (let i = 0; i < 100; i++) {
      const angle = (Math.PI * 2 * i) / 100;
      this.connections.push({
        angle,
        points: []
      });
    }
  }

  attachEventListeners() {
    document.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.globeRadius = Math.min(this.width, this.height) * 0.25;
  }

  rotatePoint(x, y, z) {
    // Rotate around X axis
    let y1 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
    let z1 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);

    // Rotate around Y axis
    let x2 = x * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
    let z2 = -x * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);

    return { x: x2, y: y1, z: z2 };
  }

  projectPoint(x, y, z) {
    const scale = 500 / (500 + z);
    return {
      x: this.centerX + x * scale,
      y: this.centerY + y * scale,
      z: z,
      scale
    };
  }

  drawGlobe() {
    // Clear canvas
    this.ctx.fillStyle = 'transparent';
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Update rotation based on mouse position (smooth easing)
    const easing = 0.05;
    this.rotationY += (this.targetRotationY - this.rotationY) * easing;
    this.rotationX += (this.targetRotationX - this.rotationX) * easing;

    // Auto-rotate
    this.rotationY += 0.0005;
    this.rotationX += 0.0001;

    // Create array of particles with projected positions
    const projectedParticles = this.particles.map(p => {
      const rotated = this.rotatePoint(p.ox, p.oy, p.oz);
      const projected = this.projectPoint(rotated.x, rotated.y, rotated.z);
      return { ...p, ...rotated, ...projected };
    });

    // Draw connecting lines
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    this.ctx.lineWidth = 0.5;
    
    for (let i = 0; i < projectedParticles.length - 1; i++) {
      const p1 = projectedParticles[i];
      const p2 = projectedParticles[i + 1];
      
      if (p1.z > 0 && p2.z > 0 && 
          Math.abs(p1.x - p2.x) < 50 && 
          Math.abs(p1.y - p2.y) < 50 &&
          Math.random() > 0.98) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }

    // Sort particles by z-depth for proper rendering
    projectedParticles.sort((a, b) => a.z - b.z);

    // Draw particles
    projectedParticles.forEach(p => {
      if (p.z > 0) {
        const opacity = p.baseOpacity * (0.5 + 0.5 * (p.z + this.globeRadius) / (2 * this.globeRadius));
        
        // Inner glow for front particles
        if (p.z > this.globeRadius * 0.5) {
          this.ctx.fillStyle = p.color + ', ' + (opacity * 0.4) + ')';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Main particle
        this.ctx.fillStyle = p.color + ', ' + opacity + ')';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // Draw outer ring
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.globeRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw inner rings
    this.ctx.strokeStyle = 'rgba(94, 206, 243, 0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 0.3; i <= 0.9; i += 0.15) {
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, this.globeRadius * i, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  animate() {
    this.drawGlobe();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize globe when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new InteractiveGlobe('globeCanvas');
  });
} else {
  new InteractiveGlobe('globeCanvas');
}
