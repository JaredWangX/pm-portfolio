document.querySelectorAll('[data-product-film]').forEach(film => {
  const video = film.querySelector('video');
  const chapters = [...film.querySelectorAll('[data-film-seek]')];
  const selectChapter = () => {
    const active = chapters.findLast(button => Number(button.dataset.filmSeek) <= video.currentTime);
    chapters.forEach(button => {
      if (button === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };
  chapters.forEach(button => button.addEventListener('click', async () => {
    video.currentTime = Number(button.dataset.filmSeek);
    try { await video.play(); } catch { video.focus(); }
    selectChapter();
    const rect = video.getBoundingClientRect();
    const fixedBottom = Math.max(0, ...[...document.querySelectorAll('body > header, .study-nav')]
      .map(el => el.getBoundingClientRect().bottom));
    const visibleHeight = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, fixedBottom);
    if (visibleHeight < Math.min(rect.height, innerHeight - fixedBottom) * .5) {
      window.scrollBy({
        top: rect.top - fixedBottom - 16,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    }
  }));
  video.addEventListener('timeupdate', selectChapter);
  selectChapter();
});
