export function renderUI(): Response {
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
    const CLIENT_ID = 'YOUR_CLIENT_ID';
    const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
    const REDIRECT_URI = window.location.origin + '/';

    async function exchange(code) {
      const body = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      });
      const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
      if (!res.ok) throw new Error('token exchange failed');
      return res.json();
    }

    let tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
    const params = new URLSearchParams(window.location.search);
    if (!tokens && params.get('code')) {
      try {
        tokens = await exchange(params.get('code'));
        localStorage.setItem('tokens', JSON.stringify(tokens));
        window.history.replaceState({}, '', '/');
      } catch (err) {
        console.error(err);
      }
    }

    function authed() {
      return tokens && tokens.access_token;
    }

    async function api(url, opts) {
      opts = opts || {};
      opts.headers = Object.assign({
        'Authorization': 'Bearer ' + tokens.access_token,
        'Content-Type': 'application/json'
      }, opts.headers || {});
      const res = await fetch(url, opts);
      return res.json();
    }

    const app = document.getElementById('app');

    function render() {
      app.innerHTML = '';
      if (!authed()) {
        const btn = document.createElement('button');
        btn.textContent = 'Connect Google account';
        btn.onclick = () => {
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

      const domainStep = document.createElement('div');
      domainStep.className = 'step';
      const domainTitle = document.createElement('h2');
      domainTitle.textContent = 'Verify domain';
      const domainInput = document.createElement('input');
      domainInput.placeholder = 'example.com';
      domainStep.append(domainTitle, domainInput);

      const tokenBtn = document.createElement('button');
      tokenBtn.textContent = 'Get DNS token';
      const tokenOut = document.createElement('pre');
      tokenBtn.onclick = async () => {
        const site = domainInput.value.trim();
        if (!site) return alert('Enter domain');
        const res = await api('https://www.googleapis.com/siteVerification/v1/token', {
          method: 'POST',
          body: JSON.stringify({ site: { identifier: site, type: 'INET_DOMAIN' } })
        });
        tokenOut.textContent = res.token || (res.error && res.error.message) || 'Failed';
      };
      domainStep.append(tokenBtn, tokenOut);

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm verification';
      confirmBtn.onclick = async () => {
        const site = domainInput.value.trim();
        if (!site) return alert('Enter domain');
        const res = await api('https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT', {
          method: 'POST',
          body: JSON.stringify({ site: { identifier: site, type: 'INET_DOMAIN' } })
        });
        alert(res.error ? 'Verification failed' : 'Site verified');
      };
      domainStep.append(confirmBtn);
      app.append(domainStep);

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
        const domain = domainInput.value.trim();
        const sitemap = sitemapInput.value.trim();
        if (!domain || !sitemap) return alert('Enter domain and sitemap');
        const site = 'sc-domain:' + domain;
        await api('https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(site), { method: 'PUT' });
        const res = await api('https://searchconsole.googleapis.com/v1/sites/' + encodeURIComponent(site) + '/sitemaps/' + encodeURIComponent(sitemap), { method: 'PUT' });
        alert(res.error ? 'Sitemap submission failed' : 'Sitemap submitted');
      };
      sitemapStep.append(sitemapTitle, sitemapInput, sitemapBtn);
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
        const domain = domainInput.value.trim();
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
  </script>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
}
