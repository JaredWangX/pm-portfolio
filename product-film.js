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
  }));
  video.addEventListener('timeupdate', selectChapter);
  selectChapter();
});
