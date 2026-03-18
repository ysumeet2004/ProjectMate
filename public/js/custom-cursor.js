// Custom Animated Cursor Handler
class CustomCursor {
  constructor() {
    this.cursor = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isActive = false;
    this.init();
  }

  init() {
    // Create cursor element
    this.cursor = document.createElement('div');
    this.cursor.className = 'custom-cursor';
    document.body.appendChild(this.cursor);

    // Track mouse movement
    document.addEventListener('mousemove', (e) => this.updateCursorPosition(e));
    
    // Detect hover on clickable elements
    document.addEventListener('mouseenter', (e) => this.handleElementHover(e), true);
    document.addEventListener('mouseleave', (e) => this.handleElementLeave(e), true);
    document.addEventListener('mousedown', () => this.setActive(true));
    document.addEventListener('mouseup', () => this.setActive(false));
  }

  updateCursorPosition(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (this.cursor) {
      this.cursor.style.left = this.mouseX + 'px';
      this.cursor.style.top = this.mouseY + 'px';
    }
  }

  handleElementHover(e) {
    const target = e.target;
    if (this.isClickable(target)) {
      this.setActive(true);
    }
  }

  handleElementLeave(e) {
    const target = e.target;
    if (this.isClickable(target)) {
      this.setActive(false);
    }
  }

  isClickable(element) {
    if (!element) return false;
    
    const clickableTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
    if (clickableTags.includes(element.tagName)) return true;
    
    const clickableClasses = ['pm-btn', 'pm-nav-link', 'pm-tooltip', 'pm-link-hover', 'pm-pill'];
    const classList = element.className;
    
    return clickableClasses.some(cls => classList.includes(cls)) ||
           element.getAttribute('role') === 'button' ||
           element.onclick !== null ||
           window.getComputedStyle(element).cursor === 'pointer';
  }

  setActive(active) {
    this.isActive = active;
    if (this.cursor) {
      if (active) {
        this.cursor.classList.add('active');
      } else {
        this.cursor.classList.remove('active');
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CustomCursor();
  });
} else {
  new CustomCursor();
}
