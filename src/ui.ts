import { Env } from './types';

export function renderUI(env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Get into Google</title>
<style>
body { font-family: sans-serif; margin: 2rem; max-width: 40rem; }
button { padding: 0.5rem 1rem; }
.step { margin-bottom: 1.5rem; }
input { margin-right: 0.5rem; }
</style>
</head>
<body>
  <h1>Welcome</h1>
  <p>This helper walks you through connecting your site to Google Search Console without a separate API layer.</p>
  <div id="app"></div>
  <script type="module">
    (async () => {
    const CLIENT_ID = '${env.GOOGLE_CLIENT_ID}';
    const CLIENT_SECRET = '${env.GOOGLE_CLIENT_SECRET}';
    const REDIRECT_URI = window.location.origin + '/';

    const logEl = document.createElement('pre');
    logEl.style.background = '#eee';
    logEl.style.padding = '0.5rem';
    document.body.append(logEl);
    function log(msg) {
      console.log(msg);
      logEl.textContent += msg + '\n';
    }

    async function exchange(code) {
      log('Exchanging authorization code');
      const body = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      });
      const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
      if (!res.ok) throw new Error('token exchange failed');
      const data = await res.json();
      log('Token response: ' + JSON.stringify(data));
      return data;
    }

    let tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    log('Tokens loaded: ' + (tokens ? 'yes' : 'no'));
    const params = new URLSearchParams(window.location.search);
    if (!tokens && params.get('code')) {
      try {
        tokens = await exchange(params.get('code'));
        localStorage.setItem('tokens', JSON.stringify(tokens));
        log('Tokens stored');
        window.history.replaceState({}, '', '/');
      } catch (err) {
        log('Exchange failed: ' + err.message);
      }
    }

    function authed() {
      return tokens && tokens.access_token;
    }

    async function api(url, opts) {
      log('API request: ' + url);
      opts = opts || {};
      opts.headers = Object.assign({
        'Authorization': 'Bearer ' + tokens.access_token,
        'Content-Type': 'application/json'
      }, opts.headers || {});
      const res = await fetch(url, opts);
      const data = await res.json();
      log('API response: ' + JSON.stringify(data));
      return data;
    }

    const app = document.getElementById('app');

    function render() {
      log('Rendering UI');
      app.innerHTML = '';
      if (!authed()) {
        const btn = document.createElement('button');
        btn.textContent = 'Sign in with Google';
        btn.onclick = () => {
          log('Redirecting to Google OAuth');
          const p = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/siteverification',
            access_type: 'offline',
            prompt: 'consent'
          });
          window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
        };
        app.append(btn);
        return;
      }

      const siteStep = document.createElement('div');
      siteStep.className = 'step';
      const siteTitle = document.createElement('h2');
      siteTitle.textContent = 'Verify site';
      const typeSelect = document.createElement('select');
      const optDomain = new Option('Domain (DNS TXT)', 'DOMAIN');
      const optUrl = new Option('URL prefix (HTML tag)', 'URL_PREFIX');
      typeSelect.append(optDomain, optUrl);
      const siteInput = document.createElement('input');
      siteInput.placeholder = 'example.com';
      typeSelect.onchange = () => {
        siteInput.placeholder = typeSelect.value === 'DOMAIN' ? 'example.com' : 'https://example.com/';
      };
      siteStep.append(siteTitle, typeSelect, siteInput);

      const tokenBtn = document.createElement('button');
      tokenBtn.textContent = 'Get verification token';
      const tokenOut = document.createElement('pre');
      tokenBtn.onclick = async () => {
        const site = siteInput.value.trim();
        const type = typeSelect.value;
        if (!site) return alert('Enter site');
        const method = type === 'DOMAIN' ? 'DNS_TXT' : 'META';
        const siteType = type === 'DOMAIN' ? 'INET_DOMAIN' : 'SITE';
        const res = await api('https://www.googleapis.com/siteVerification/v1/token?verificationMethod=' + method, {
          method: 'POST',
          body: JSON.stringify({ site: { identifier: site, type: siteType } })
        });
        if (res.token) {
          tokenOut.textContent = type === 'DOMAIN'
            ? res.token
            : '<meta name="google-site-verification" content="' + res.token + '">';
        } else {
          tokenOut.textContent = (res.error && res.error.message) || 'Failed';
        }
      };
      siteStep.append(tokenBtn, tokenOut);

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm verification';
      confirmBtn.onclick = async () => {
        const site = siteInput.value.trim();
        const type = typeSelect.value;
        if (!site) return alert('Enter site');
        const method = type === 'DOMAIN' ? 'DNS_TXT' : 'META';
        const siteType = type === 'DOMAIN' ? 'INET_DOMAIN' : 'SITE';
        const res = await api('https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=' + method, {
          method: 'POST',
          body: JSON.stringify({ site: { identifier: site, type: siteType } })
        });
        alert(res.error ? 'Verification failed' : 'Site verified');
      };
      siteStep.append(confirmBtn);
      app.append(siteStep);

      const indexStep = document.createElement('div');
      indexStep.className = 'step';
      const indexTitle = document.createElement('h2');
      indexTitle.textContent = 'Index URL';
      const urlInput = document.createElement('input');
      urlInput.placeholder = 'https://example.com/';
      const indexBtn = document.createElement('button');
      indexBtn.textContent = 'Index URL';
      indexBtn.onclick = async () => {
        const url = urlInput.value.trim();
        if (!url) return alert('Enter URL');
        const res = await api('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          body: JSON.stringify({ url, type: 'URL_UPDATED' })
        });
        alert(res.error ? 'Indexing request failed' : 'Indexing notified');
      };
      indexStep.append(indexTitle, urlInput, indexBtn);
      app.append(indexStep);

      const sitemapStep = document.createElement('div');
      sitemapStep.className = 'step';
      const sitemapTitle = document.createElement('h2');
      sitemapTitle.textContent = 'Submit sitemap';
      const sitemapInput = document.createElement('input');
      sitemapInput.placeholder = 'https://example.com/sitemap.xml';
      const sitemapBtn = document.createElement('button');
      sitemapBtn.textContent = 'Submit sitemap';
      sitemapBtn.onclick = async () => {
        const domain = siteInput.value.trim();
        const sitemap = sitemapInput.value.trim();
        if (!domain || !sitemap) return alert('Enter domain and sitemap');
        const site = 'sc-domain:' + domain;
        await api('https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(site), { method: 'PUT' });
        const res = await api('https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(site) + '/sitemaps/' + encodeURIComponent(sitemap), { method: 'PUT' });
        alert(res.error ? 'Sitemap submission failed' : 'Sitemap submitted');
      };

      // Allow bulk indexing of sitemap URLs with progress
      const indexMapBtn = document.createElement('button');
      indexMapBtn.textContent = 'Index sitemap URLs';
      const progressEl = document.createElement('progress');
      progressEl.value = 0;
      progressEl.max = 0;
      progressEl.style.display = 'block';
      progressEl.style.marginTop = '0.5rem';
      const sitemapLogEl = document.createElement('pre');
      sitemapLogEl.style.maxHeight = '10rem';
      sitemapLogEl.style.overflowY = 'auto';
      indexMapBtn.onclick = async () => {
        const sitemap = sitemapInput.value.trim();
        if (!sitemap) return alert('Enter sitemap');
        indexMapBtn.disabled = true;
        progressEl.value = 0;
        progressEl.max = 0;
        sitemapLogEl.textContent = '';
        try {
          const res = await fetch(sitemap);
          const xml = await res.text();
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          const locs = Array.from(doc.getElementsByTagName('loc'));
          const urls = locs.map(l => l.textContent?.trim()).filter(Boolean) as string[];
          if (!urls.length) {
            sitemapLogEl.textContent = 'No URLs found';
            return;
          }
          progressEl.max = urls.length;
          for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            sitemapLogEl.textContent += 'Indexing ' + url + '\n';
            const r = await api('https://indexing.googleapis.com/v3/urlNotifications:publish', {
              method: 'POST',
              body: JSON.stringify({ url, type: 'URL_UPDATED' })
            });
            if (r.error) {
              sitemapLogEl.textContent += '  Failed: ' + (r.error.message || r.error) + '\n';
            } else {
              sitemapLogEl.textContent += '  OK\n';
            }
            progressEl.value = i + 1;
          }
          sitemapLogEl.textContent += 'Done';
        } catch (err) {
          sitemapLogEl.textContent += 'Error: ' + err.message;
        } finally {
          indexMapBtn.disabled = false;
        }
      };

      sitemapStep.append(sitemapTitle, sitemapInput, sitemapBtn, indexMapBtn, progressEl, sitemapLogEl);
      app.append(sitemapStep);

      const inspectStep = document.createElement('div');
      inspectStep.className = 'step';
      const inspectTitle = document.createElement('h2');
      inspectTitle.textContent = 'Inspect URL';
      const inspectInput = document.createElement('input');
      inspectInput.placeholder = 'https://example.com/';
      const inspectBtn = document.createElement('button');
      inspectBtn.textContent = 'Inspect URL';
      inspectBtn.onclick = async () => {
        const domain = siteInput.value.trim();
        const target = inspectInput.value.trim();
        if (!domain || !target) return alert('Enter domain and URL');
        const site = 'sc-domain:' + domain;
        const res = await api('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
          method: 'POST',
          body: JSON.stringify({ inspectionUrl: target, siteUrl: site })
        });
        const verdict = res.inspectionResult && res.inspectionResult.indexStatusResult && res.inspectionResult.indexStatusResult.verdict;
        alert(verdict || (res.error && res.error.message) || 'Done');
      };
      inspectStep.append(inspectTitle, inspectInput, inspectBtn);
      app.append(inspectStep);
    }

    render();
    })();
  </script>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
}
