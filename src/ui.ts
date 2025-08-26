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
</style>
</head>
<body>
  <h1>Welcome</h1>
  <p>This helper walks you through connecting your site to Google Search Console.</p>
  <div id="app"></div>
  <script type="module">
    async function api(path, opts){
      const res = await fetch(path, Object.assign({headers:{'Content-Type':'application/json'}}, opts));
      return res.json();
    }
    const app = document.getElementById('app');
    let state = {};
    function render(){
      app.innerHTML = '';
      if(!state.authed){
        const btn = document.createElement('button');
        btn.textContent = 'Connect Google account';
        btn.onclick = () => window.location.href = '/api/oauth/start';
        app.append(btn);
        return;
      }
      // domain input shared by multiple steps
      const domainStep = document.createElement('div');
      domainStep.className = 'step';
      const domainTitle = document.createElement('h2');
      domainTitle.textContent = 'Verify domain';
      const domainInput = document.createElement('input');
      domainInput.placeholder = 'example.com';
      domainStep.append(domainTitle, domainInput);

      // verification: get DNS token
      const tokenBtn = document.createElement('button');
      tokenBtn.textContent = 'Get DNS token';
      const tokenOut = document.createElement('pre');
      tokenBtn.onclick = async () => {
        const site = domainInput.value.trim();
        if(!site) return alert('Enter domain');
        const res = await api('/api/verify',{method:'POST',body:JSON.stringify({site,type:'INET_DOMAIN'})});
        tokenOut.textContent = res.success ? res.details.token : res.summary;
      };
      domainStep.append(tokenBtn, tokenOut);

      // verification confirmation
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm verification';
      confirmBtn.onclick = async () => {
        const site = domainInput.value.trim();
        if(!site) return alert('Enter domain');
        const res = await api('/api/confirm',{method:'POST',body:JSON.stringify({site,type:'INET_DOMAIN'})});
        alert(res.summary);
      };
      domainStep.append(confirmBtn);
      app.append(domainStep);

      // indexing step
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
        if(!url) return alert('Enter URL');
        const res = await api('/api/reindex',{method:'POST',body:JSON.stringify({url,eligible:true})});
        alert(res.summary);
      };
      indexStep.append(indexTitle, urlInput, indexBtn);
      app.append(indexStep);

      // sitemap submission step
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
        if(!domain || !sitemap) return alert('Enter domain and sitemap');
        const site = 'sc-domain:' + domain;
        await api('/api/property',{method:'POST',body:JSON.stringify({site})});
        const res = await api('/api/sitemap',{method:'POST',body:JSON.stringify({site,sitemap})});
        alert(res.summary);
      };
      sitemapStep.append(sitemapTitle, sitemapInput, sitemapBtn);
      app.append(sitemapStep);
    }
    api('/api/state').then(r=>{state=r.details||{}; render();});
  </script>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
}
