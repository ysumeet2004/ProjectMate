class SelectionMarkers {
  constructor() {
    this.selectionBox = null;
    this.vignetteOverlay = null;
    this.isAnimating = false;
    this.currentRange = null;
    this.init();
  }

  init() {
    document.addEventListener('selectionchange', () => this.handleSelectionChange());
    window.addEventListener('scroll', () => this.handleScroll());
  }

  handleSelectionChange() {
    const selection = window.getSelection();

    // If selection is empty or collapsed
    if (selection.isCollapsed || !selection.toString().trim()) {
      this.removeSelectionBox();
      this.removeVignette();
      this.currentRange = null;
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      this.currentRange = range.cloneRange();
      this.updateSelectionBox(range);
      this.updateVignette(range);
    } catch (err) {
      this.removeSelectionBox();
      this.removeVignette();
      this.currentRange = null;
    }
  }

  handleScroll() {
    // If there's an active selection, update box position on scroll
    if (this.currentRange && this.selectionBox) {
      try {
        this.updateSelectionBox(this.currentRange);
      } catch (err) {
        this.removeSelectionBox();
        this.currentRange = null;
      }
    }
  }

  updateSelectionBox(range) {
    const clientRects = range.getClientRects();
    
    if (clientRects.length === 0) {
      this.removeSelectionBox();
      return;
    }

    // Create or reuse selection box
    if (!this.selectionBox) {
      this.selectionBox = document.createElement('div');
      this.selectionBox.className = 'selection-box';
      document.body.appendChild(this.selectionBox);
      requestAnimationFrame(() => {
        this.selectionBox.classList.add('box-active');
      });
    }

    // Get bounding box for all rects
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    for (let rect of clientRects) {
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    }

    // Apply padding around selection
    const padding = 8;
    this.selectionBox.style.left = (minLeft - padding) + 'px';
    this.selectionBox.style.top = (minTop - padding) + 'px';
    this.selectionBox.style.width = (maxRight - minLeft + padding * 2) + 'px';
    this.selectionBox.style.height = (maxBottom - minTop + padding * 2) + 'px';
  }

  updateVignette(range) {
    if (!this.vignetteOverlay) {
      this.vignetteOverlay = document.createElement('div');
      this.vignetteOverlay.className = 'selection-vignette';
      document.body.appendChild(this.vignetteOverlay);
    }

    // Get all selection rectangles
    const clientRects = range.getClientRects();
    if (clientRects.length === 0) return;

    // Apply vignette
    this.vignetteOverlay.classList.add('vignette-active');
  }

  removeSelectionBox() {
    if (this.selectionBox) {
      this.selectionBox.classList.remove('box-active');
      this.selectionBox.classList.add('box-remove');
      setTimeout(() => {
        if (this.selectionBox && this.selectionBox.parentNode) {
          this.selectionBox.remove();
          this.selectionBox = null;
        }
      }, 200);
    }
  }

  removeVignette() {
    if (this.vignetteOverlay) {
      this.vignetteOverlay.classList.remove('vignette-active');
      this.vignetteOverlay.classList.add('vignette-remove');
      setTimeout(() => {
        if (this.vignetteOverlay && this.vignetteOverlay.parentNode) {
          this.vignetteOverlay.remove();
          this.vignetteOverlay = null;
        }
      }, 200);
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.selectionMarkers = new SelectionMarkers();
  });
} else {
  window.selectionMarkers = new SelectionMarkers();
}






