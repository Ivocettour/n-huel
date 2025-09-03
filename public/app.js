// ---- Config ----
const API_BASE = ''; // mismo host (Render) - si usás subdominio/backend aparte, ponelo aquí

// ---- Login fijo ----
const FIXED_USER = "Nahuel";
const FIXED_PASS = "45508227";
let token = null;

// ---- DOM helpers ----
const $ = (s) => document.querySelector(s);
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');

// UI refs
const productsGrid = $('#productsGrid');
const filterCategory = $('#filterCategory');
const searchInput = $('#searchInput');
const adminBtn = $('#adminBtn');
const adminPanel = $('#adminPanel');
const adminList = $('#adminList');
const signOutBtn = $('#signOutBtn');
const adminEmailLabel = $('#adminEmailLabel');

// Form
const pId = $('#pId');
const pTitle = $('#pTitle');
const pPrice = $('#pPrice');
const pCategory = $('#pCategory');
const pDimensions = $('#pDimensions');
const pMaterials = $('#pMaterials');
const pFinish = $('#pFinish');
const pStock = $('#pStock');
const pImage = $('#pImage');
const imagePreview = $('#imagePreview');
const saveBtn = $('#saveBtn');
const resetBtn = $('#resetBtn');
const formMsg = $('#formMsg');

// Login modal
const loginModal = $('#loginModal');
const closeLogin = $('#closeLogin');
const loginEmail = $('#loginEmail');
const loginPass = $('#loginPass');
const loginBtn = $('#loginBtn');
const loginMsg = $('#loginMsg');

function currency(n){ return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS' }).format(Number(n || 0)); }
function toast(msg, type='info'){
  const el = document.createElement('div');
  el.textContent = msg;
  el.className = 'fixed bottom-4 right-4 px-3 py-2 rounded-lg text-sm ' + (type==='error' ? 'bg-red-600' : 'bg-slate-700');
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2500);
}

// ---- API helpers ----
async function api(path, opts={}){
  const headers = opts.headers || {};
  if(token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if(!res.ok){
    const t = await res.text().catch(()=>'');
    throw new Error(t || ('HTTP ' + res.status));
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ---- Catalog ----
let allProducts = [];

async function loadProducts(){
  const list = await api('/api/products');
  allProducts = list;
  renderGrid();
  renderAdminList();
}

function matchFilters(p){
  const cat = (filterCategory?.value || '').trim();
  const term = (searchInput?.value || '').trim().toLowerCase();
  let ok = true;
  if(cat) ok = ok && (p.category || '').toLowerCase().includes(cat.toLowerCase());
  if(term){
    const blob = [p.title, p.materials, p.finish, p.dimensions].join(' ').toLowerCase();
    ok = ok && blob.includes(term);
  }
  return ok;
}

function renderGrid(){
  if(!productsGrid) return;
  productsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  allProducts.filter(matchFilters).forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card overflow-hidden';
    card.innerHTML = `
      <img src="${p.imageURL || 'https://picsum.photos/seed/fallback/1200/900'}" class="w-full h-56 object-cover border-b border-white/10" alt="${p.title||''}">
      <div class="p-4">
        <div class="flex items-center justify-between gap-2 mb-1">
          <h4 class="font-semibold">${p.title || 'Sin título'}</h4>
          <div class="text-sm">${p.price ? currency(p.price) : ''}</div>
        </div>
        <div class="muted text-sm">${p.materials || ''}</div>
        <div class="muted text-xs">${p.dimensions || ''}</div>
        <div class="mt-3 flex gap-2">
          <a class="btn-ghost" href="https://wa.me/549XXXXXXXXXX?text=${encodeURIComponent('Hola! Me interesa: ' + (p.title||'') + (p.price ? ' ('+currency(p.price)+')' : ''))}" target="_blank">Consultar</a>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  productsGrid.appendChild(frag);
}

filterCategory && filterCategory.addEventListener('change', renderGrid);
searchInput && searchInput.addEventListener('input', renderGrid);

// ---- Admin ----
adminBtn && adminBtn.addEventListener('click', ()=>{
  show(loginModal);
  loginMsg.textContent = '';
});
closeLogin && closeLogin.addEventListener('click', ()=> hide(loginModal));

loginBtn && loginBtn.addEventListener('click', async ()=>{
  const user = (loginEmail?.value || '').trim();
  const pass = (loginPass?.value || '').trim();
  if(user !== 'Nahuel' || pass !== '45508227'){
    loginMsg.textContent = 'Usuario o clave incorrecta';
    return;
  }
  try{
    const res = await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass })
    });
    token = res.token;
    loginMsg.textContent = 'OK';
    hide(loginModal);
    show(adminPanel);
    adminEmailLabel.textContent = user;
    await loadProducts();
  }catch(err){
    loginMsg.textContent = 'Error de login';
  }
});

signOutBtn && signOutBtn.addEventListener('click', ()=>{
  token = null;
  hide(adminPanel);
  adminEmailLabel.textContent = '';
});

function fillForm(p){
  pId.value = p?.id || '';
  pTitle.value = p?.title || '';
  pPrice.value = p?.price || '';
  pCategory.value = p?.category || '';
  pDimensions.value = p?.dimensions || '';
  pMaterials.value = p?.materials || '';
  pFinish.value = p?.finish || '';
  pStock.value = p?.stock || '';
  imagePreview.innerHTML = p?.imageURL ? `<a href="${p.imageURL}" target="_blank" class="underline">Ver imagen actual</a>` : '<span class="muted">Sin imagen</span>';
  pImage.value = '';
}
resetBtn && resetBtn.addEventListener('click', ()=> fillForm(null));

async function uploadImage(file){
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(API_BASE + '/api/upload', {
    method: 'POST',
    headers: token ? { 'Authorization': 'Bearer ' + token } : {},
    body: fd
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json(); // { url, path }
}

saveBtn && saveBtn.addEventListener('click', async ()=>{
  if(!token){ toast('No autorizado', 'error'); return; }
  try{
    formMsg.textContent = 'Guardando...';
    const payload = {
      title: pTitle.value.trim(),
      price: Number(pPrice.value || 0),
      category: pCategory.value.trim(),
      dimensions: pDimensions.value.trim(),
      materials: pMaterials.value.trim(),
      finish: pFinish.value.trim(),
      stock: Number(pStock.value || 0)
    };
    if(!payload.title){ toast('Completá el título','error'); formMsg.textContent=''; return; }

    let id = pId.value.trim();
    if(!id){
      // crear base
      const created = await api('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      id = created.id;
      if(pImage.files[0]){
        const up = await uploadImage(pImage.files[0]);
        await api('/api/products/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageURL: up.url, imagePath: up.path })
        });
      }
      toast('Producto creado');
    }else{
      // editar
      if(pImage.files[0]){
        const up = await uploadImage(pImage.files[0]);
        payload.imageURL = up.url;
        payload.imagePath = up.path;
      }
      await api('/api/products/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      toast('Producto actualizado');
    }

    formMsg.textContent = 'Listo ✔︎';
    await loadProducts();
    fillForm(null);
  }catch(err){
    console.error(err);
    toast(err.message || 'Error al guardar', 'error');
    formMsg.textContent = 'Error';
  }
});

function renderAdminList(){
  if(!adminList) return;
  adminList.innerHTML = '';
  const list = document.createElement('div');
  (allProducts || []).forEach(p=>{
    const row = document.createElement('div');
    row.className = 'p-2 rounded bg-slate-800/50 border border-white/10 flex items-center justify-between';
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${p.imageURL || 'https://picsum.photos/seed/fb/100/70'}" class="w-16 h-12 object-cover rounded">
        <div>
          <div class="font-semibold">${p.title}</div>
          <div class="muted text-xs">${p.category || ''} · ${p.dimensions || ''}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost text-xs" data-edit="${p.id}">Editar</button>
        <button class="btn-danger text-xs" data-del="${p.id}">Eliminar</button>
      </div>`;
    list.appendChild(row);
  });
  adminList.appendChild(list);

  list.addEventListener('click', async (e)=>{
    const id = e.target.dataset.edit || e.target.dataset.del;
    if(!id) return;
    if(e.target.dataset.edit){
      const p = (allProducts || []).find(x => x.id === id);
      if(p) fillForm(p);
      window.scrollTo({ top: adminPanel.offsetTop - 80, behavior: 'smooth' });
    }else if(e.target.dataset.del){
      if(!token){ toast('No autorizado', 'error'); return; }
      if(!confirm('¿Eliminar este producto?')) return;
      await api('/api/products/' + id, { method: 'DELETE' });
      toast('Producto eliminado');
      await loadProducts();
    }
  });
}

// Load initial
loadProducts().catch(console.error);
