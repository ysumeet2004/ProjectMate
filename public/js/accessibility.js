// Accessibility helpers: make first .pm-page focusable and wire skip link
(function(){
  try {
    const page = document.querySelector('.pm-page');
    if (page && !page.hasAttribute('tabindex')) page.setAttribute('tabindex','-1');
    const skip = document.querySelector('.skip-link');
    if (skip) {
      skip.addEventListener('click', function(e){
        e.preventDefault();
        const target = document.querySelector('.pm-page');
        if (target) target.focus();
      });
    }
  } catch (e) { /* ignore in older browsers */ }
})();
