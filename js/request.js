(function() {
  let reqCache = [];
  let reqLoaded = false;
  let reqDebounce = null;

  const requestSection = document.getElementById('requestSection');
  const requestToggle = document.getElementById('requestToggle');
  const requestPanel = document.getElementById('requestPanel');
  const requestClose = document.getElementById('requestClose');
  const requestSearch = document.getElementById('requestSearch');
  const requestResults = document.getElementById('requestResults');
  const requestEmpty = document.getElementById('requestEmpty');
  const searchCount = document.getElementById('searchCount');
  const requestToast = document.getElementById('requestToast');

  function toggleRequestPanel() {
    const isOpen = requestPanel.classList.contains('open');
    if (isOpen) {
      requestPanel.classList.remove('open');
      requestToggle.innerHTML = '&#x1F4FB; Request a Song';
    } else {
      requestPanel.classList.add('open');
      requestToggle.innerHTML = '&#x1F4FB; Close Requests';
      setTimeout(() => {
        requestSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        requestSearch.focus();
      }, 50);
      if (!reqLoaded) loadCatalog();
    }
  }

  requestToggle.addEventListener('click', toggleRequestPanel);
  requestClose.addEventListener('click', () => {
    requestPanel.classList.remove('open');
    requestToggle.innerHTML = '&#x1F4FB; Request a Song';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && requestPanel.classList.contains('open')) {
      requestPanel.classList.remove('open');
      requestToggle.innerHTML = '&#x1F4FB; Request a Song';
    }
  });

  async function loadCatalog() {
    requestResults.innerHTML = '<div class="request-loading">LOADING CATALOG...</div>';
    try {
      const res = await fetch(STATION.catalogUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      reqCache = await res.json();
      reqLoaded = true;
      requestEmpty.querySelector('span:last-child').textContent =
        'Search ' + reqCache.length.toLocaleString() + ' requestable tracks';
      showRequestResults('');
    } catch (err) {
      console.warn('[' + STATION.name + '] Catalog load failed:', err);
      requestResults.innerHTML = '<div class="request-empty"><span class="empty-icon">&#x26A1;</span><span>Eep! Could not load the catalog. Try again in a bit!</span></div>';
    }
  }

  function showRequestResults(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
      requestResults.innerHTML = '';
      requestResults.appendChild(requestEmpty);
      requestEmpty.style.display = 'flex';
      searchCount.textContent = '';
      return;
    }

    requestEmpty.style.display = 'none';

    const terms = q.split(/\s+/);
    const matches = reqCache.filter(item => {
      const haystack = ((item.a || '') + ' ' + (item.t || '') + ' ' + (item.b || '')).toLowerCase();
      return terms.every(t => haystack.includes(t));
    }).slice(0, 50);

    searchCount.textContent = matches.length + (matches.length === 50 ? '+' : '') + ' found';

    if (matches.length === 0) {
      requestResults.innerHTML = '<div class="request-empty"><span class="empty-icon">&#x1F50D;</span><span>No matches \u2014 try different keywords</span></div>';
      return;
    }

    const frag = document.createDocumentFragment();
    matches.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'request-item';
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.2s ease ' + (idx * 0.025) + 's';

      const artUrl = fixArtUrl(item.art);
      let artEl;
      if (artUrl) {
        artEl = document.createElement('img');
        artEl.className = 'request-item-art';
        artEl.src = artUrl;
        artEl.alt = '';
        artEl.loading = 'lazy';
        artEl.onerror = function() {
          const ph = document.createElement('div');
          ph.className = 'request-item-art-ph';
          ph.textContent = '\u266A';
          this.parentNode.replaceChild(ph, this);
        };
      } else {
        artEl = document.createElement('div');
        artEl.className = 'request-item-art-ph';
        artEl.textContent = '\u266A';
      }

      const info = document.createElement('div');
      info.className = 'request-item-info';
      info.innerHTML = '<div class="request-item-title">' + escHtml(item.t || '?') + '</div>' +
        '<div class="request-item-meta"><span class="artist">' + escHtml(item.a || '?') + '</span>' +
        (item.b ? ' &mdash; ' + escHtml(item.b) : '') + '</div>';

      const btn = document.createElement('button');
      btn.className = 'request-item-btn';
      btn.textContent = 'REQUEST';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        submitRequest(item.url || item.id, btn, item);
      });

      div.appendChild(artEl);
      div.appendChild(info);
      div.appendChild(btn);
      div.addEventListener('click', () => btn.click());
      frag.appendChild(div);

      requestAnimationFrame(() => { requestAnimationFrame(() => { div.style.opacity = '1'; }); });
    });

    requestResults.innerHTML = '';
    requestResults.appendChild(frag);
  }

  async function submitRequest(reqUrl, btnEl, song) {
    btnEl.textContent = '...';
    btnEl.style.pointerEvents = 'none';

    try {
      const url = reqUrl.startsWith('/') ? reqUrl : '/api/station/1/request/' + reqUrl;
      const res = await fetch(url, { method: 'POST' });

      if (res.ok) {
        btnEl.textContent = 'SENT \u2713';
        btnEl.classList.add('sent');
        showToast('Requested: ' + (song.a || '') + ' \u2014 ' + (song.t || ''), false);
      } else {
        let msg = 'Request failed';
        try { msg = (await res.json()).message || msg; } catch(e) {}
        btnEl.textContent = 'NOPE';
        btnEl.classList.add('failed');
        showToast(msg, true);
        setTimeout(() => { btnEl.textContent = 'REQUEST'; btnEl.className = 'request-item-btn'; btnEl.style.pointerEvents = ''; }, 3000);
      }
    } catch (err) {
      btnEl.textContent = 'ERROR';
      btnEl.classList.add('failed');
      showToast('Network error \u2014 try again', true);
      setTimeout(() => { btnEl.textContent = 'REQUEST'; btnEl.className = 'request-item-btn'; btnEl.style.pointerEvents = ''; }, 3000);
    }
  }

  function showToast(msg, isError) {
    requestToast.textContent = msg;
    requestToast.className = 'request-toast show' + (isError ? ' error' : '');
    setTimeout(() => { requestToast.className = 'request-toast'; }, 3000);
  }

  requestSearch.addEventListener('input', () => {
    clearTimeout(reqDebounce);
    reqDebounce = setTimeout(() => showRequestResults(requestSearch.value), 150);
  });
})();
