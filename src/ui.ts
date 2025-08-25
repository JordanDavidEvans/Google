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
      // placeholder for further steps
      const p = document.createElement('p');
      p.textContent = 'Account connected. Continue in your client app via API calls.';
      app.append(p);
    }
    api('/api/state').then(r=>{state=r.details||{}; render();});
  </script>
</body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });
}
