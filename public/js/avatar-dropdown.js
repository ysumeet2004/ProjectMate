// Avatar Dropdown Menu Handler
class AvatarDropdown {
  constructor() {
    this.init();
  }

  init() {
    const dropdowns = document.querySelectorAll('.pm-avatar-dropdown');
    
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.pm-avatar-toggle');
      const menu = dropdown.querySelector('.pm-avatar-menu');
      
      if (!toggle || !menu) return;

      // Toggle menu on click
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu(dropdown, toggle);
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          this.closeMenu(dropdown, toggle);
        }
      });

      // Close menu on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.contains(document.activeElement)) {
          this.closeMenu(dropdown, toggle);
        }
      });

      // Close menu when clicking a menu item
      const items = menu.querySelectorAll('.pm-avatar-menu-item');
      items.forEach(item => {
        item.addEventListener('click', () => {
          this.closeMenu(dropdown, toggle);
        });
      });
    });
  }

  toggleMenu(dropdown, toggle) {
    const menu = dropdown.querySelector('.pm-avatar-menu');
    const isOpen = menu.style.opacity === '1';
    
    if (isOpen) {
      this.closeMenu(dropdown, toggle);
    } else {
      this.openMenu(dropdown, toggle);
    }
  }

  openMenu(dropdown, toggle) {
    const menu = dropdown.querySelector('.pm-avatar-menu');
    toggle.setAttribute('aria-expanded', 'true');
  }

  closeMenu(dropdown, toggle) {
    toggle.setAttribute('aria-expanded', 'false');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AvatarDropdown();
  });
} else {
  new AvatarDropdown();
}
