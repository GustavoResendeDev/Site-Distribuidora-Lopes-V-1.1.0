(() => {
  const root = document.querySelector('#catalogue');
  if (!root) return;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/long[ -]?necks?/g,'longneck').replace(/red\s*bull/g,'redbull')
    .replace(/extra\s*power/g,'extrapower').replace(/mansao\s*maromba/g,'mansaomaromba')
    .replace(/(\d)\s+(ml|l|kg|g)\b/g,'$1$2').trim();
  const queryInput = root.querySelector('#product-search');
  const categoryInput = root.querySelector('#category-filter');
  const packageInput = root.querySelector('#package-filter');
  const filterButtons = [...root.querySelectorAll('[data-filter]')];
  const filterDescriptions = {
    todos: 'Bebidas e gelo para acompanhar seu momento.',
    alcoolicos: 'Cervejas, drinks, destilados e vinhos com álcool.',
    'sem-alcool': 'Bebidas sem álcool e pacotes de gelo para o seu pedido.',
    energeticos: 'Energéticos sem álcool, em diferentes sabores e volumes.',
    gin: 'Gins e drinks alcoólicos à base de gin.',
    whisky: 'Whiskies e drinks alcoólicos à base de whisky.',
    vodka: 'Vodkas e drinks alcoólicos à base de vodka.',
  };
  const count = root.querySelector('#product-count');
  const clearButton = root.querySelector('#clear-filters');
  const pagination = root.querySelector('#catalogue-pagination');
  const loadMore = root.querySelector('#load-more');
  const empty = root.querySelector('#catalogue-empty');
  const pageSize = 12;
  let activeFilter = 'todos';
  let limit = pageSize;
  let inputTimer;

  function syncLink(product) {
    const label = product.select.selectedOptions[0].textContent;
    const message = `Olá, Lopes! Gostaria de consultar preço e disponibilidade de ${product.name} — ${label}. Podem confirmar essa opção?`;
    const href = `https://wa.me/5562996943411?text=${encodeURIComponent(message)}`;
    product.element.querySelectorAll('a').forEach(link => {
      link.href = href;
      link.setAttribute('aria-label', `Consultar ${product.name} — ${label} no WhatsApp`);
    });
    product.element.querySelector('.selected-variant').textContent = label;
  }
  const products = [...root.querySelectorAll('.product-card')].map(element => {
    const select = element.querySelector('.variant-select');
    const name = element.dataset.name;
    const base = `${name} ${element.dataset.brand} ${element.dataset.kind} ${element.dataset.spiritType}`;
    const variants = [...select.options].map(option => {
      const volume = Number(option.dataset.volume);
      const weight = Number(option.dataset.weight);
      const units = Number(option.dataset.units);
      const synonyms = units > 1 ? `caixa pack fardo ${units} unidades cx${units} c${units}` : 'unidade';
      const measure = Number.isFinite(weight) && weight > 0
        ? `${weight}kg ${weight*1000}g ${weight} quilos ${weight} kilos`
        : `${volume}ml ${volume/1000}l ${String(volume/1000).replace('.',',')}l`;
      return {option, units, container: option.dataset.container,
        search: normalize(`${base} ${option.textContent} ${option.dataset.flavor} ${measure} ${synonyms}`)};
    });
    const product = {element, select, name, variants};
    select.addEventListener('change', () => syncLink(product));
    return product;
  });

  function matchesPackage(variant, packaging) {
    if (packaging === 'todas') return true;
    if (packaging === 'multipack') return variant.units > 1;
    if (packaging === 'pack12') return variant.units === 12;
    return variant.container === packaging;
  }

  function matchesTab(product) {
    const { category, kind, spiritType } = product.element.dataset;
    if (activeFilter === 'todos') return true;
    if (activeFilter === 'alcoolicos') return category === 'alcoolicos';
    if (activeFilter === 'sem-alcool') return category === 'sem-alcool';
    if (activeFilter === 'energeticos') return category === 'sem-alcool' && kind === 'energeticos';
    return category === 'alcoolicos' && spiritType === activeFilter;
  }

  function syncCategories() {
    const allowed = new Set(products.filter(matchesTab).map(p => p.element.dataset.kind));
    [...categoryInput.options].forEach(option => {
      const included = option.value === 'todas' || allowed.has(option.value);
      option.hidden = !included;
      option.disabled = !included;
    });
    if (categoryInput.selectedOptions[0]?.disabled) categoryInput.value = 'todas';
    root.querySelector('#catalogue-selection-description').textContent = filterDescriptions[activeFilter];
  }

  function render({resetLimit = true, focusNew = false} = {}) {
    if (resetLimit) limit = pageSize;
    const previousShown = products.filter(p => !p.element.hidden).map(p => p.element);
    const words = normalize(queryInput.value).split(/\s+/).filter(Boolean);
    const category = categoryInput.value;
    const packaging = packageInput.value;
    let matches = 0;
    let variantMatches = 0;
    let firstNew;
    products.forEach(product => {
      const qualifies = matchesTab(product) &&
        (category === 'todas' || product.element.dataset.kind === category);
      const options = qualifies ? product.variants.filter(v => matchesPackage(v, packaging) && words.every(word => v.search.includes(word))) : [];
      product.variants.forEach(variant => {
        const included = options.includes(variant);
        variant.option.hidden = !included;
        variant.option.disabled = !included;
      });
      if (!options.length) { product.element.hidden = true; return; }
      matches++;
      variantMatches += options.length;
      product.element.querySelector('.variant-label span').textContent = `${options.length} ${options.length === 1 ? 'opção' : 'opções'}`;
      const shown = matches <= limit;
      product.element.hidden = !shown;
      if (shown && !previousShown.includes(product.element) && !firstNew) firstNew = product;
      if (!options.some(v => v.option.selected)) {
        product.select.value = options[0].option.value;
        syncLink(product);
      }
    });
    const shown = Math.min(matches, limit);
    count.textContent = `${matches} ${matches === 1 ? 'linha encontrada' : 'linhas encontradas'} · ${variantMatches} ${variantMatches === 1 ? 'opção' : 'opções'}`;
    clearButton.hidden = !queryInput.value && activeFilter === 'todos' && category === 'todas' && packaging === 'todas';
    empty.hidden = matches !== 0;
    pagination.hidden = matches === 0 || matches <= pageSize;
    loadMore.hidden = shown >= matches;
    root.querySelector('#catalogue-progress').textContent = `Mostrando ${shown} de ${matches} produtos`;
    if (focusNew && firstNew) firstNew.element.querySelector('.product-image').focus();
  }

  filterButtons.forEach(button => button.addEventListener('click', () => {
    clearTimeout(inputTimer);
    activeFilter = button.dataset.filter;
    categoryInput.value = 'todas';
    filterButtons.forEach(other => {
      const active = other === button;
      other.classList.toggle('is-active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    syncCategories();
    render();
  }));
  queryInput.addEventListener('input', () => { clearTimeout(inputTimer); inputTimer = setTimeout(render, 120); });
  categoryInput.addEventListener('change', () => render());
  packageInput.addEventListener('change', () => render());
  loadMore.addEventListener('click', () => { limit += pageSize; render({resetLimit:false, focusNew:true}); });
  function reset() {
    clearTimeout(inputTimer);
    queryInput.value = '';
    categoryInput.value = 'todas';
    packageInput.value = 'todas';
    activeFilter = 'todos';
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === 'todos';
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    syncCategories();
    render();
    queryInput.focus({preventScroll:true});
  }
  clearButton.addEventListener('click',reset);
  root.querySelector('#reset-search').addEventListener('click',reset);
  root.querySelector('.catalogue-controls').hidden = false;
  syncCategories();
  render();
})();
