/**
 * ProjectMate Spotlight Effect (Huly.io style)
 * 
 * LAYER ARCHITECTURE:
 * - Layer 1 (z-0): Dark background
 * - Layer 2 (z-1): Ghost/decorative elements (masked reveal based on cursor)
 * - Layer 3 (z-10): Main page content (ALWAYS fully visible)
 * 
 * The mask reveals ghost elements only where the cursor is.
 * Main content is never darkened or affected.
 */

(function initSpotlight() {
  // Create ghost layer container (sits behind main content)
  const ghostLayer = document.createElement('div');
  ghostLayer.id = 'pm-ghost-layer';
  ghostLayer.className = 'pm-ghost-layer';
  document.body.insertBefore(ghostLayer, document.body.firstChild);

  // Initialize CSS custom properties for cursor position
  document.documentElement.style.setProperty('--spotlight-x', '-500px');
  document.documentElement.style.setProperty('--spotlight-y', '-500px');

  // Track mouse position and update mask gradient
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    
    document.documentElement.style.setProperty('--spotlight-x', `${x}px`);
    document.documentElement.style.setProperty('--spotlight-y', `${y}px`);
  });

  // Initialize ghost elements
  setTimeout(() => {
    initGhostElements(ghostLayer);
    ghostLayer.classList.add('pm-ghost-active');
  }, 300);

  // Reduce ghost visibility on mouse leave
  document.addEventListener('mouseleave', () => {
    document.documentElement.style.setProperty('--spotlight-x', '-500px');
    document.documentElement.style.setProperty('--spotlight-y', '-500px');
  });
})();

/**
 * Creates decorative ghost elements scattered across viewport
 * These are revealed only where the spotlight mask is visible
 */
function initGhostElements(container) {
  const ghostElements = [
    // Task cards
    { type: 'task-card', icon: '📋', text: 'Stakeholder Communication', subtitle: '75% complete' },
    { type: 'task-card', icon: '✅', text: 'Code Review', subtitle: 'Due Friday' },
    
    // Stat chips
    { type: 'stat-chip', icon: '⬆️', text: '12 tasks', subtitle: 'Assigned' },
    { type: 'stat-chip', icon: '🔄', text: '3 in review', subtitle: 'Pending' },
    
    // Code snippets
    { type: 'code-snippet', icon: '💻', text: 'const buildMagic = () => {}' },
    { type: 'code-snippet', icon: '⚙️', text: 'function deployment()' },
    
    // Status badges
    { type: 'status-badge', icon: '🔵', text: 'IN_PROGRESS' },
    { type: 'status-badge', icon: '🟡', text: 'REVIEW' },
    
    // Feature list
    { type: 'feature-item', icon: '✓', text: 'Feature Testing' },
    { type: 'feature-item', icon: '◻', text: 'Implementation' },
    { type: 'feature-item', icon: '◻', text: 'Debug Sessions' },
    
    // Floating labels
    { type: 'label', icon: '🏷️', text: '50% Complete' },
    { type: 'label', icon: '⭐', text: 'High Priority' },
    { type: 'label', icon: '👥', text: 'Team: 8 members' },
    
    // More variety
    { type: 'metric', icon: '📊', text: 'Performance: 98%' },
    { type: 'metric', icon: '⏱️', text: 'Est. 2 days' },
  ];

  ghostElements.forEach((el, index) => {
    const element = document.createElement('div');
    element.className = `pm-ghost-element pm-ghost-${el.type}`;
    
    // Build HTML based on type
    if (el.subtitle) {
      element.innerHTML = `
        <span class="pm-ghost-icon">${el.icon}</span>
        <div class="pm-ghost-content">
          <div class="pm-ghost-title">${el.text}</div>
          <div class="pm-ghost-subtitle">${el.subtitle}</div>
        </div>
      `;
    } else {
      element.innerHTML = `
        <span class="pm-ghost-icon">${el.icon}</span>
        <span class="pm-ghost-text">${el.text}</span>
      `;
    }
    
    // Random positioning across viewport
    const randomX = Math.random() * 85 + 7.5;
    const randomY = Math.random() * 80 + 10;
    const randomRotation = (Math.random() - 0.5) * 6; // -3 to +3 degrees
    const randomDelay = Math.random() * 1.5;
    
    element.style.left = randomX + '%';
    element.style.top = randomY + '%';
    element.style.transform = `rotate(${randomRotation}deg)`;
    element.style.setProperty('--delay', randomDelay + 's');
    
    container.appendChild(element);
  });
}
