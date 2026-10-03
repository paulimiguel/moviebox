const MOVIEBOX_URL = 'https://moviebox.beweb.com.ar/';

const titleInput = document.querySelector('#title');
const statusText = document.querySelector('#status');
const hostText = document.querySelector('#page-host');
const openButton = document.querySelector('#open-moviebox');

const setStatus = (message, isError = false) => {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
};

const updateButton = () => {
  openButton.disabled = !titleInput.value.trim();
};

const detectTitleInPage = () => {
  const mediaTypes = new Set([
    'Movie',
    'TVSeries',
    'TVSeason',
    'TVEpisode',
    'VideoObject',
  ]);

  const readType = (value) => {
    if (Array.isArray(value)) return value.find((item) => mediaTypes.has(item));
    return mediaTypes.has(value) ? value : null;
  };

  const findMediaEntity = (value) => {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findMediaEntity(item);
        if (found) return found;
      }
      return null;
    }

    const type = readType(value['@type']);
    if (type && typeof value.name === 'string' && value.name.trim()) {
      return { title: value.name.trim(), type };
    }

    if (value['@graph']) {
      const found = findMediaEntity(value['@graph']);
      if (found) return found;
    }
    return null;
  };

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const found = findMediaEntity(JSON.parse(script.textContent || 'null'));
      if (found) return found;
    } catch {
      // Algunas páginas publican bloques JSON-LD incompletos. Se prueban las demás fuentes.
    }
  }

  const metaTitle = document.querySelector('meta[property="og:title"]')?.content
    || document.querySelector('meta[name="twitter:title"]')?.content;
  const heading = document.querySelector('main h1, article h1, h1')?.textContent;
  const rawTitle = metaTitle || heading || document.title;
  const hostname = window.location.hostname.replace(/^www\./, '');
  return { title: rawTitle?.trim() || '', type: null, hostname };
};

const cleanDetectedTitle = (value) => {
  let title = String(value || '').replace(/\s+/g, ' ').trim();
  const knownSuffix = /\s+(?:\||[-–—])\s+(?:Netflix|IMDb|Prime Video|Amazon Prime Video|Disney\+|Max|HBO Max|JustWatch|TMDB|The Movie Database|Rotten Tomatoes|Wikipedia).*$/i;
  title = title.replace(knownSuffix, '').trim();
  return title;
};

const initialize = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    setStatus('No se pudo identificar la pestaña actual.', true);
    return;
  }

  try {
    hostText.textContent = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    hostText.textContent = '';
  }

  if (!/^https?:/i.test(tab.url)) {
    const fallbackTitle = cleanDetectedTitle(tab.title);
    titleInput.value = fallbackTitle;
    updateButton();
    setStatus('Chrome no permite leer esta página. Podés escribir el título manualmente.', true);
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectTitleInPage,
    });
    const detectedTitle = cleanDetectedTitle(result?.title || tab.title);
    titleInput.value = detectedTitle;
    updateButton();
    setStatus(detectedTitle
      ? 'Revisá el título y abrilo en MovieBox.'
      : 'No se detectó un título. Podés escribirlo manualmente.');
    titleInput.select();
  } catch {
    titleInput.value = cleanDetectedTitle(tab.title);
    updateButton();
    setStatus('No se pudo leer esta página. Revisá o escribí el título manualmente.', true);
  }
};

titleInput.addEventListener('input', updateButton);
titleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !openButton.disabled) openButton.click();
});

openButton.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  if (!title) return;
  const url = new URL(MOVIEBOX_URL);
  url.searchParams.set('agregar', '1');
  url.searchParams.set('titulo', title);
  url.searchParams.set('origen', 'extension');
  await chrome.tabs.create({ url: url.toString() });
  window.close();
});

initialize().catch(() => {
  setStatus('No se pudo iniciar la extensión. Volvé a intentarlo.', true);
});
