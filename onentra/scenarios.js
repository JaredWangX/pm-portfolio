const scenarioNav = document.querySelector('.scenario-nav');
const scenarioTabs = Array.from(scenarioNav.querySelectorAll('a'));
const scenarioPanels = scenarioTabs.map(tab => document.getElementById(tab.hash.slice(1)));

scenarioNav.setAttribute('role', 'tablist');
function showScenario(index, updateAddress = false) {
  scenarioTabs.forEach((tab, i) => {
    const active = i === index;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    scenarioPanels[i].hidden = !active;
  });
  if (updateAddress) history.replaceState(history.state, '', scenarioTabs[index].hash);
}
scenarioTabs.forEach((tab, index) => {
  tab.id = scenarioPanels[index].id + '-tab';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', scenarioPanels[index].id);
  scenarioPanels[index].setAttribute('role', 'tabpanel');
  scenarioPanels[index].setAttribute('aria-labelledby', tab.id);
  tab.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    showScenario(index, true);
  });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % scenarioTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + scenarioTabs.length - 1) % scenarioTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = scenarioTabs.length - 1;
    else return;
    event.preventDefault();
    showScenario(next, true);
    scenarioTabs[next].focus();
  });
});
function matchScenarioHash() {
  const index = scenarioTabs.findIndex(tab => tab.hash === location.hash);
  if (index >= 0) showScenario(index);
}
showScenario(0);
matchScenarioHash();
window.addEventListener('hashchange', matchScenarioHash);
