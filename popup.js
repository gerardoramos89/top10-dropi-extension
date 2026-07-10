(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // ⚠️ Reemplaza esto por el Product ID real de tu producto en Gumroad antes de publicar.
  const GUMROAD_PRODUCT_ID = '6F0E4C97-B72A4E69-A11BF6C4-AF6517E7';
  // ⚠️ Link público de tu producto en Gumroad (el que compartes con clientes).
  const GUMROAD_PRODUCT_URL = 'https://coordtss.gumroad.com/l/dmjex';
  // ⚠️ Tu número de WhatsApp para ventas manuales, formato internacional sin "+" ni espacios (ej. 573001234567).
  const WHATSAPP_NUMBER = '573183863469';

  // Códigos especiales para pruebas (no pasan por Gumroad). No son secretos reales: cualquiera
  // que lea el código fuente publicado puede verlos. Se les dio forma de código de licencia
  // random para que no sean adivinables a simple vista, pero cámbialos o quítalos si no los quieres.
  const DEMO_CODE = 'ZP3K-9WQL-4XMT-2GHD';       // activa Pro + carga 10 productos, ventas y gasto de Ads simulados, para mostrar la app "viva".
  const DEMO_DAYS = 30;                      // 👈 edita este número para cambiar cuántos días dura el Pro del demo.
  const TRIAL_CODE = 'RT8N-3LKQ-9XZP-6MWV';      // activa Pro por tiempo limitado.
  const TRIAL_DAYS = 5;                      // 👈 edita este número para cambiar cuántos días dura el Pro de prueba.

  // 📬 Notificación A TI (el desarrollador) cada vez que alguien activa Pro — usa TU PROPIA cuenta de EmailJS,
  // separada de la que usa el cliente para sus resúmenes. Llena esto antes de publicar; si lo dejas vacío, simplemente no se envía nada.
  const DEV_NOTIFY_EMAIL = '';        // tu correo, ej. 'gerardo@tudominio.com'
  const DEV_EMAILJS_SERVICE = '';     // service_xxxxxxx de TU cuenta EmailJS
  const DEV_EMAILJS_TEMPLATE = '';    // template_xxxxxxx de TU cuenta EmailJS
  const DEV_EMAILJS_KEY = '';         // tu Public Key de EmailJS

  let productos = [];
  let ventas = [];
  let settings = { country:'CO', email:'', resumenAuto:true, frecuenciaResumen:'diario', emailjsEnabled:false, emailjsService:'', emailjsTemplate:'', emailjsKey:'' };
  let plan = 'free';
  let rentSelectedId = null;

  const PLAN_LIMITS = { free: { maxProductos: 3 }, pro: { maxProductos: 10 } };

  const CURRENCY_MAP = {
    CO:{locale:'es-CO',currency:'COP'}, MX:{locale:'es-MX',currency:'MXN'},
    CL:{locale:'es-CL',currency:'CLP'}, PE:{locale:'es-PE',currency:'PEN'},
    EC:{locale:'es-EC',currency:'USD'}, PA:{locale:'es-PA',currency:'USD'},
    AR:{locale:'es-AR',currency:'ARS'}, GT:{locale:'es-GT',currency:'GTQ'},
    CR:{locale:'es-CR',currency:'CRC'}, US:{locale:'en-US',currency:'USD'}
  };

  const todayISO = () => new Date().toISOString().slice(0,10);

  function escapeHtml(str){
    return String(str==null ? '' : str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  $('#todayLabel').textContent = new Date().toLocaleDateString('es-CO', {
    weekday:'short', day:'numeric', month:'short'
  });

  function fmtCOP(n){
    const cfg = CURRENCY_MAP[settings.country] || CURRENCY_MAP.CO;
    try{
      return new Intl.NumberFormat(cfg.locale, { style:'currency', currency:cfg.currency, maximumFractionDigits:0 }).format(n||0);
    }catch(e){
      return '$' + Math.round(n||0).toLocaleString('es-CO');
    }
  }

  // ---------- storage ----------
  let planExpiresAt = null;
  function loadData(){
    chrome.storage.local.get(['productos','ventas','settings','plan','planExpiresAt'], (data)=>{
      productos = data.productos || [];
      ventas = data.ventas || [];
      settings = Object.assign({ country:'CO', email:'', resumenAuto:true, frecuenciaResumen:'diario', emailjsEnabled:false, emailjsService:'', emailjsTemplate:'', emailjsKey:'' }, data.settings || {});
      plan = data.plan || 'free';
      planExpiresAt = data.planExpiresAt || null;

      if(plan==='pro' && planExpiresAt && Date.now() > planExpiresAt){
        plan = 'free';
        planExpiresAt = null;
        chrome.storage.local.set({ plan:'free', planExpiresAt:null });
        setTimeout(()=>alert('Tu Pro de prueba terminó. Puedes comprar el plan Pro en Ajustes cuando quieras.'), 300);
      }

      hydrateSettingsForm();
      applyPlanUI();
      renderAll();
    });
  }
  function saveProductos(){ chrome.storage.local.set({ productos }); }
  function saveVentas(){ chrome.storage.local.set({ ventas }); }
  function saveSettings(){ chrome.storage.local.set({ settings }); }
  function savePlan(){ chrome.storage.local.set({ plan, planExpiresAt }); }

  // ---------- tabs ----------
  $$('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.view').forEach(v=>v.classList.remove('active'));
      $('#view-'+btn.dataset.view).classList.add('active');
      if(btn.dataset.view === 'historial') renderHistorial();
      if(btn.dataset.view === 'rentabilidad') renderRentTab();
      if(btn.dataset.view === 'metaads') applyPlanUI();
      if(btn.dataset.view === 'distribucion'){ applyPlanUI(); renderDistribucion(); }
    });
  });

  // ---------- plan / paywall ----------
  function goToAjustes(){
    $$('.tab-btn').forEach(b=>b.classList.remove('active'));
    $('.tab-btn[data-view="ajustes"]').classList.add('active');
    $$('.view').forEach(v=>v.classList.remove('active'));
    $('#view-ajustes').classList.add('active');
  }

  function applyPlanUI(){
    let planLabel = `<span>👑 Plan <b class="badge-pro">PRO</b> activo</span>`;
    if(planExpiresAt){
      const diasRestantes = Math.max(0, Math.ceil((planExpiresAt - Date.now()) / (24*60*60*1000)));
      planLabel = `<span>⏳ Pro de prueba: <b class="badge-pro">${diasRestantes} día${diasRestantes===1?'':'s'}</b></span>`;
    }
    $('#planStrip').innerHTML = plan==='pro'
      ? `${planLabel}<span>${productos.length}/${PLAN_LIMITS.pro.maxProductos} productos</span>`
      : `<span>Plan <b class="badge-free">Free</b></span><span>${productos.length}/${PLAN_LIMITS.free.maxProductos} productos · <a href="#" id="planStripUpgrade" style="color:var(--guayaba);">mejorar a Pro</a></span>`;

    const upgradeLink = $('#planStripUpgrade');
    if(upgradeLink){
      upgradeLink.addEventListener('click', (e)=>{ e.preventDefault(); goToAjustes(); });
    }

    const isPro = plan==='pro';
    document.body.classList.toggle('pro-theme', isPro);
    $('#metaLockedBanner').style.display = isPro ? 'none' : 'block';
    $('#metaUnlocked').classList.toggle('is-locked', !isPro);
    const metaLink = $('#metaLockedLink');
    if(metaLink){ metaLink.onclick = (e)=>{ e.preventDefault(); goToAjustes(); }; }

    $('#distLockedBanner').style.display = isPro ? 'none' : 'block';
    $('#distUnlocked').classList.toggle('is-locked', !isPro);
    const distLink = $('#distLockedLink');
    if(distLink){ distLink.onclick = (e)=>{ e.preventDefault(); goToAjustes(); }; }

    renderPlanInfo();
  }

  function renderPlanInfo(){
    $('#planInfo').innerHTML = plan==='pro'
      ? 'Tienes el plan <b style="color:var(--guayaba)">Pro</b> activo: 10 productos, Meta Ads, exportar CSV y resumen automático.'
      : 'Tienes el plan <b>Free</b>: hasta 3 productos y rentabilidad básica. Con Pro desbloqueas Meta Ads, exportar CSV y el resumen semanal automático.';
  }

  $('#btnComprarGumroad').addEventListener('click', ()=>{
    if(GUMROAD_PRODUCT_URL.includes('REEMPLAZA')){
      alert('Falta configurar el link de Gumroad (GUMROAD_PRODUCT_URL en popup.js).');
      return;
    }
    chrome.tabs.create({ url: GUMROAD_PRODUCT_URL });
  });

  $('#btnComprarWhatsapp').addEventListener('click', ()=>{
    if(WHATSAPP_NUMBER.includes('REEMPLAZA')){
      alert('Falta configurar el número de WhatsApp (WHATSAPP_NUMBER en popup.js).');
      return;
    }
    const msg = encodeURIComponent('Hola, quiero comprar la licencia Pro de Top 10 Tracker 🙌');
    chrome.tabs.create({ url: `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}` });
  });

  $('#btnComprarPersonalizada').addEventListener('click', ()=>{
    if(WHATSAPP_NUMBER.includes('REEMPLAZA')){
      alert('Falta configurar el número de WhatsApp (WHATSAPP_NUMBER en popup.js).');
      return;
    }
    const msg = encodeURIComponent('Hola, quiero una versión personalizada de Top 10 Tracker para mi negocio ✨');
    chrome.tabs.create({ url: `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}` });
  });

  function seedDemoData(){
    const cats = {};
    productos = [
      { nombre:'Audífonos Bluetooth TWS', categoria:'Tecnología', tipo:'dropshipping', precio:89900, meta:60, costoProveedor:32000, fleteIda:8500, fleteRetorno:3200, cpa:12400, tasaEntrega:78 },
      { nombre:'Faja Moldeadora Colombiana', categoria:'Moda', tipo:'dropshipping', precio:79900, meta:50, costoProveedor:28000, fleteIda:8000, fleteRetorno:3000, cpa:15800, tasaEntrega:70 },
      { nombre:'Crema Anti-edad Facial', categoria:'Belleza', tipo:'dropshipping', precio:69900, meta:40, costoProveedor:26000, fleteIda:7800, fleteRetorno:4500, cpa:21000, tasaEntrega:58 },
      { nombre:'Smartwatch Serie X', categoria:'Tecnología', tipo:'dropshipping', precio:129900, meta:35, costoProveedor:48000, fleteIda:9000, fleteRetorno:3500, cpa:18200, tasaEntrega:74 },
      { nombre:'Plancha para Cabello Pro', categoria:'Belleza', tipo:'dropshipping', precio:99900, meta:30, costoProveedor:35000, fleteIda:8500, fleteRetorno:3200, cpa:17500, tasaEntrega:72 },
      { nombre:'Camiseta Oversize Unisex', categoria:'Moda', tipo:'stock', precio:49900, meta:80, stock:34, costoProveedor:18000, fleteIda:0, fleteRetorno:0, cpa:6000, tasaEntrega:92 },
      { nombre:'Gorra Bordada Streetwear', categoria:'Moda', tipo:'stock', precio:39900, meta:60, stock:6, costoProveedor:14000, fleteIda:0, fleteRetorno:0, cpa:8500, tasaEntrega:90 },
      { nombre:'Zapatillas Urbanas Retro', categoria:'Calzado', tipo:'stock', precio:159900, meta:25, stock:11, costoProveedor:72000, fleteIda:0, fleteRetorno:0, cpa:19000, tasaEntrega:88 },
      { nombre:'Mini Parlante Portátil', categoria:'Tecnología', tipo:'dropshipping', precio:59900, meta:70, costoProveedor:19000, fleteIda:7000, fleteRetorno:2800, cpa:17000, tasaEntrega:65 },
      { nombre:'Kit Skincare Coreano', categoria:'Belleza', tipo:'dropshipping', precio:109900, meta:28, costoProveedor:42000, fleteIda:8200, fleteRetorno:4000, cpa:24500, tasaEntrega:55 }
    ].map(p=>({ id:'p_demo_'+Math.random().toString(36).slice(2,9), ...p }));

    ventas = [];
    const now = new Date();
    productos.forEach(p=>{
      // genera ventas de los últimos 28 días, en proporción a qué tan "vendible" es el producto
      const ritmo = p.tasaEntrega >= 70 ? [1,2] : [0,1]; // productos con mejor entrega venden más seguido
      for(let d=27; d>=0; d--){
        const vendeHoy = Math.random() < (p.tasaEntrega/100) * 0.35;
        if(!vendeHoy) continue;
        const unidades = ritmo[Math.floor(Math.random()*ritmo.length)] || 1;
        if(unidades<=0) continue;
        const fecha = new Date(now.getTime() - d*24*60*60*1000).toISOString().slice(0,10);
        const valor = unidades * p.precio;
        ventas.push({
          id:'v_demo_'+Math.random().toString(36).slice(2,9),
          productoId:p.id, unidades, valor, fecha
        });
      }
    });

    saveProductos();
    saveVentas();
  }

  // ---------- Notificación a TI cuando un cliente activa Pro ----------
  async function notifyDevActivation(tipo){
    if(!DEV_NOTIFY_EMAIL || !DEV_EMAILJS_SERVICE || !DEV_EMAILJS_TEMPLATE || !DEV_EMAILJS_KEY) return; // no configurado, no hace nada
    const pais = settings.country || 'sin especificar';
    const fecha = new Date().toLocaleString('es-CO');
    const mensaje = `Nueva activación Pro en Top 10 Tracker.\n\nTipo: ${tipo}\nPaís del cliente: ${pais}\nFecha: ${fecha}\n\n(Este aviso solo incluye el tipo de activación y el país configurado — no incluye productos ni ventas del cliente.)`;
    try{
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          service_id: DEV_EMAILJS_SERVICE,
          template_id: DEV_EMAILJS_TEMPLATE,
          user_id: DEV_EMAILJS_KEY,
          template_params: { to_email: DEV_NOTIFY_EMAIL, subject: 'Nueva activación Pro — Top 10 Tracker', message: mensaje }
        })
      });
    }catch(err){
      console.error('No se pudo notificar al desarrollador', err);
    }
  }

  function licenciaSetStatus(msg, type){
    const el = $('#licenciaStatus');
    el.style.display = 'block';
    el.textContent = msg;
    el.className = 'empty-state' + (type==='error' ? ' status-error' : (type==='ok' ? ' status-ok' : ''));
  }

  $('#btnActivarPro').addEventListener('click', async ()=>{
    const code = $('#setLicencia').value.trim();
    if(!code){ licenciaSetStatus('Escribe tu código de licencia.', 'error'); return; }

    const codeUpper = code.toUpperCase();

    if(codeUpper === TRIAL_CODE.toUpperCase()){
      plan = 'pro';
      planExpiresAt = Date.now() + TRIAL_DAYS*24*60*60*1000;
      savePlan();
      applyPlanUI();
      licenciaSetStatus(`Pro de prueba activado por ${TRIAL_DAYS} días. Vuelve a Free automáticamente cuando termine.`, 'ok');
      notifyDevActivation(`Trial de ${TRIAL_DAYS} días`);
      return;
    }

    if(codeUpper === DEMO_CODE.toUpperCase()){
      if(productos.length>0 || ventas.length>0){
        if(!confirm('Esto va a REEMPLAZAR tus productos y ventas actuales con datos de ejemplo (incluye gasto de Ads simulado). ¿Continuar?')) return;
      }
      plan = 'pro'; planExpiresAt = Date.now() + DEMO_DAYS*24*60*60*1000;
      savePlan();
      seedDemoData();
      applyPlanUI();
      renderAll();
      licenciaSetStatus(`Demo cargada: 10 productos, ~28 días de ventas y gasto de publicidad simulado (CPA por producto). Pro activo por ${DEMO_DAYS} días. Explora Ranking, Rentabilidad, Distribución e Historial.`, 'ok');
      notifyDevActivation('Demo (DEMO-2026)');
      return;
    }

    if(GUMROAD_PRODUCT_ID === 'REEMPLAZA_CON_TU_PRODUCT_ID'){
      licenciaSetStatus('Falta configurar GUMROAD_PRODUCT_ID en popup.js con el ID real de tu producto de Gumroad.', 'error');
      return;
    }

    licenciaSetStatus('Verificando con Gumroad…', null);
    try{
      const params = new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: code,
        increment_uses_count: 'false'
      });
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const json = await res.json();
      if(json.success){
        plan = 'pro';
        savePlan();
        applyPlanUI();
        licenciaSetStatus('¡Licencia válida! Plan Pro activado.', 'ok');
        notifyDevActivation('Compra real (Gumroad)');
      } else {
        licenciaSetStatus('Gumroad dice: ' + (json.message || 'licencia no válida.'), 'error');
      }
    } catch(err){
      licenciaSetStatus('No se pudo conectar con Gumroad. Revisa tu internet e inténtalo de nuevo.', 'error');
      console.error(err);
    }
  });
  $('#btnVolverFree').addEventListener('click', ()=>{
    plan = 'free';
    savePlan();
    applyPlanUI();
  });

  // ---------- ajustes / settings ----------
  function hydrateSettingsForm(){
    $('#setCountry').value = settings.country || 'CO';
    $('#setEmail').value = settings.email || '';
    $('#setResumenAuto').checked = settings.resumenAuto !== false;
    $('#setFrecuencia').value = settings.frecuenciaResumen || 'diario';
    $('#setEmailjsEnabled').checked = !!settings.emailjsEnabled;
    $('#setEmailjsService').value = settings.emailjsService || '';
    $('#setEmailjsTemplate').value = settings.emailjsTemplate || '';
    $('#setEmailjsKey').value = settings.emailjsKey || '';
    updateEmailModeHint();
  }
  function updateEmailModeHint(){
    const hint = $('#emailModeHint');
    if(settings.emailjsEnabled && settings.emailjsService && settings.emailjsTemplate && settings.emailjsKey){
      hint.textContent = 'EmailJS configurado: el resumen se enviará solo, sin abrir tu correo.';
    } else {
      hint.textContent = 'Sin EmailJS configurado: esto abre tu app de correo con el resumen ya escrito.';
    }
  }
  ['setEmailjsEnabled','setEmailjsService','setEmailjsTemplate','setEmailjsKey'].forEach(id=>{
    $('#'+id).addEventListener('input', ()=>{
      settings.emailjsEnabled = $('#setEmailjsEnabled').checked;
      settings.emailjsService = $('#setEmailjsService').value.trim();
      settings.emailjsTemplate = $('#setEmailjsTemplate').value.trim();
      settings.emailjsKey = $('#setEmailjsKey').value.trim();
      saveSettings();
      updateEmailModeHint();
    });
  });

  async function sendViaEmailJS(subject, message){
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        service_id: settings.emailjsService,
        template_id: settings.emailjsTemplate,
        user_id: settings.emailjsKey,
        template_params: { to_email: settings.email, subject, message }
      })
    });
    if(!res.ok){
      const text = await res.text();
      throw new Error(text || ('EmailJS respondió ' + res.status));
    }
    return true;
  }

  $('#btnTestEmailjs').addEventListener('click', async ()=>{
    if(!settings.email){ alert('Primero escribe tu correo arriba.'); return; }
    try{
      await sendViaEmailJS('Prueba — Top 10 Tracker', 'Este es un correo de prueba. Si te llegó, EmailJS está bien configurado.');
      alert('Correo de prueba enviado. Revisa tu bandeja de entrada (y spam).');
    }catch(err){
      alert('No se pudo enviar con EmailJS: ' + err.message + '\n\nRevisa Service ID, Template ID, Public Key, y que tu dominio/chrome-extension esté permitido en tu cuenta de EmailJS.');
    }
  });
  $('#setCountry').addEventListener('change', ()=>{
    settings.country = $('#setCountry').value;
    saveSettings();
    renderAll();
    if($('#view-rentabilidad').classList.contains('active')) updateRentResults();
  });
  $('#setEmail').addEventListener('input', ()=>{
    settings.email = $('#setEmail').value.trim();
    saveSettings();
  });
  $('#setResumenAuto').addEventListener('change', ()=>{
    if(plan!=='pro' && $('#setResumenAuto').checked){
      alert('El aviso automático es una función Pro.');
      $('#setResumenAuto').checked = false;
      return;
    }
    settings.resumenAuto = $('#setResumenAuto').checked;
    saveSettings();
  });

  $('#setFrecuencia').addEventListener('change', ()=>{
    settings.frecuenciaResumen = $('#setFrecuencia').value;
    saveSettings();
  });

  // ---------- email resumen (mailto) ----------
  $('#btnEnviarResumen').addEventListener('click', async ()=>{
    const totalUnidades = ventas.reduce((s,v)=>s+Number(v.unidades),0);
    const totalValor = ventas.reduce((s,v)=>s+Number(v.valor),0);
    const topProductos = [...productos]
      .map(p=>({nombre:p.nombre, unidades:unidadesVendidas(p.id)}))
      .sort((a,b)=>b.unidades-a.unidades)
      .slice(0,3);

    let body = `Resumen de ventas:\n\n`;
    body += `Ventas registradas: ${ventas.length}\n`;
    body += `Unidades vendidas: ${totalUnidades}\n`;
    body += `Total facturado: ${fmtCOP(totalValor)}\n\n`;
    body += `Top productos por unidades:\n`;
    topProductos.forEach((p,i)=>{ body += `${i+1}. ${p.nombre} — ${p.unidades} unidades\n`; });
    body += `\nEnviado desde Top 10 Tracker.`;
    const subject = 'Mi resumen de ventas — Top 10 Tracker';

    const useEmailjs = settings.emailjsEnabled && settings.emailjsService && settings.emailjsTemplate && settings.emailjsKey;

    if(useEmailjs){
      if(!settings.email){ alert('Escribe tu correo arriba primero.'); return; }
      try{
        await sendViaEmailJS(subject, body);
        alert('Resumen enviado automáticamente por correo.');
      }catch(err){
        alert('Falló el envío automático (' + err.message + '). Se abrirá tu correo como respaldo.');
        chrome.tabs.create({ url: `mailto:${encodeURIComponent(settings.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` });
      }
    } else {
      const mailtoUrl = `mailto:${encodeURIComponent(settings.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      chrome.tabs.create({ url: mailtoUrl });
    }
  });

  // ---------- CSV export ----------
  function toCsv(rows){
    return rows.map(r => r.map(cell=>{
      const s = String(cell ?? '');
      return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',')).join('\n');
  }
  function downloadCsv(filename, csvContent){
    const blob = new Blob(['\uFEFF'+csvContent], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }
  function exportCsvs(){
    if(plan!=='pro'){
      if(confirm('Exportar CSV es una función Pro. ¿Quieres ir a Ajustes → Plan para activarla?')) goToAjustes();
      return;
    }
    const prodRows = [['id','nombre','categoria','tipo','precio','stock','meta','costoProveedor','fleteIda','fleteRetorno','cpa','tasaEntrega']];
    productos.forEach(p=> prodRows.push([p.id,p.nombre,p.categoria,p.tipo||'dropshipping',p.precio,p.stock ?? '', p.meta, p.costoProveedor, p.fleteIda, p.fleteRetorno, p.cpa, p.tasaEntrega]));
    downloadCsv('productos.csv', toCsv(prodRows));

    const ventaRows = [['id','fecha','productoId','producto','unidades','valor']];
    ventas.forEach(v=>{
      const p = productos.find(pr=>pr.id===v.productoId);
      ventaRows.push([v.id, v.fecha, v.productoId, p?p.nombre:'', v.unidades, v.valor]);
    });
    downloadCsv('ventas.csv', toCsv(ventaRows));
  }
  $('#btnExportCsv').addEventListener('click', exportCsvs);
  $('#btnExportCsv2').addEventListener('click', exportCsvs);

  // ---------- helpers ----------
  function unidadesVendidas(productoId){
    return ventas.filter(v=>v.productoId===productoId).reduce((s,v)=>s+Number(v.unidades),0);
  }

  // ---------- render: rankboard ----------
  function renderRankboard(){
    const board = $('#rankboard');
    if(productos.length===0){
      board.innerHTML = '<div class="rankboard-empty">Agrega tu primer producto para ver el ranking.</div>';
      return;
    }
    board.innerHTML = '';
    productos.forEach((p, i)=>{
      const meta = Number(p.meta)||0;
      const vendidas = unidadesVendidas(p.id);
      const pct = meta>0 ? Math.min(100, Math.round((vendidas/meta)*100)) : 0;
      const div = document.createElement('div');
      div.className = 'rankbar';
      div.innerHTML = `
        <div class="pct">${pct}%</div>
        <div class="bar" style="height:${Math.max(pct,3)}%"></div>
        <div class="num">${String(i+1).padStart(2,'0')}</div>
        <div class="name" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</div>
      `;
      board.appendChild(div);
    });
  }

  // ---------- render: product list ----------
  function renderProductList(){
    const list = $('#productList');
    const empty = $('#productEmpty');
    list.innerHTML = '';
    if(productos.length===0){
      empty.style.display='block';
      return;
    }
    empty.style.display='none';
    productos.forEach((p, i)=>{
      const meta = Number(p.meta)||0;
      const vendidas = unidadesVendidas(p.id);
      const pct = meta>0 ? Math.min(100, Math.round((vendidas/meta)*100)) : 0;
      const margin = computeMargin(p);
      const badge = margin ? `<span class="margin-badge ${margin.status}">${margin.marginPct}%</span>` : '';
      let stockTag = '';
      if(p.tipo==='stock'){
        const stock = Number(p.stock)||0;
        stockTag = `<span class="stock-tag ${stock<=3?'low':''}">${stock} en stock${stock<=3?' ⚠':''}</span>`;
      }
      const card = document.createElement('div');
      card.className = 'prod-card';
      card.innerHTML = `
        <div class="rank">${i+1}</div>
        <div class="info">
          <div class="name">${escapeHtml(p.nombre)} ${badge}</div>
          <div class="meta">${escapeHtml(p.categoria) || 'Sin categoría'} · ${fmtCOP(p.precio)} ${stockTag}</div>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar"><span style="width:${pct}%"></span></div>
          <div class="progress-label">${vendidas}/${meta || '—'} · ${pct}%</div>
        </div>
        <div class="actions">
          <button class="icon" data-action="up" data-id="${p.id}" title="Subir">▲</button>
          <button class="icon" data-action="down" data-id="${p.id}" title="Bajar">▼</button>
          <button class="icon" data-action="edit" data-id="${p.id}" title="Editar">✎</button>
          <button class="icon danger" data-action="del" data-id="${p.id}" title="Eliminar">✕</button>
        </div>
      `;
      list.appendChild(card);
    });

    $$('[data-action]', list).forEach(btn=>{
      btn.addEventListener('click', ()=> handleProductAction(btn.dataset.action, btn.dataset.id));
    });

    if(margenEnRojo()){
      // no-op aquí; la alerta puntual se dispara al guardar/editar (ver checkMarginAlert)
    }
  }

  function margenEnRojo(){
    return productos.some(p=>{
      const m = computeMargin(p);
      return m && m.status==='perdida';
    });
  }

  function handleProductAction(action, id){
    const idx = productos.findIndex(p=>p.id===id);
    if(idx===-1) return;
    if(action==='up' && idx>0){
      [productos[idx-1], productos[idx]] = [productos[idx], productos[idx-1]];
    } else if(action==='down' && idx<productos.length-1){
      [productos[idx+1], productos[idx]] = [productos[idx], productos[idx+1]];
    } else if(action==='del'){
      if(confirm('¿Eliminar este producto del top 10?')){
        productos.splice(idx,1);
      }
    } else if(action==='edit'){
      openProductForm(productos[idx]);
      return;
    }
    saveProductos();
    renderAll();
  }

  // ---------- product form (inline, no prompts) ----------
  function toggleStockField(){
    $('#pfStockWrap').style.display = $('#pfTipo').value === 'stock' ? 'flex' : 'none';
  }
  $('#pfTipo').addEventListener('change', toggleStockField);

  function openProductForm(existing){
    const form = $('#productForm');
    form.style.display = 'flex';
    $('#pfId').value = existing ? existing.id : '';
    $('#pfNombre').value = existing ? existing.nombre : '';
    $('#pfCategoria').value = existing ? (existing.categoria||'') : '';
    $('#pfPrecio').value = existing ? (existing.precio||0) : '';
    $('#pfMeta').value = existing ? (existing.meta||0) : 10;
    $('#pfTipo').value = existing ? (existing.tipo||'dropshipping') : 'dropshipping';
    $('#pfStock').value = existing ? (existing.stock ?? '') : '';
    toggleStockField();
    $('#pfNombre').focus();
  }
  $('#btnAddProduct').addEventListener('click', ()=>{
    if(plan==='free' && productos.length >= PLAN_LIMITS.free.maxProductos){
      alert(`El plan Free permite hasta ${PLAN_LIMITS.free.maxProductos} productos. Mejora a Pro en Ajustes para agregar más.`);
      return;
    }
    openProductForm(null);
  });
  $('#pfCancel').addEventListener('click', ()=>{ $('#productForm').style.display='none'; });

  $('#productForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = $('#pfId').value;
    const nombre = $('#pfNombre').value.trim();
    if(!nombre) return;
    const categoria = $('#pfCategoria').value.trim();
    const precio = Number($('#pfPrecio').value)||0;
    const meta = Number($('#pfMeta').value)||0;
    const tipo = $('#pfTipo').value;
    const stock = tipo==='stock' ? (Number($('#pfStock').value)||0) : null;

    if(id){
      const p = productos.find(pr=>pr.id===id);
      if(p){
        p.nombre=nombre; p.categoria=categoria; p.precio=precio; p.meta=meta; p.tipo=tipo;
        if(tipo==='stock') p.stock = stock;
      }
    } else {
      const limit = PLAN_LIMITS[plan].maxProductos;
      if(productos.length>=limit){
        alert(`Llegaste al límite de ${limit} productos de tu plan.`);
        return;
      }
      productos.push({
        id:'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        nombre, categoria, precio, meta, tipo, stock,
        costoProveedor:0, fleteIda:0, fleteRetorno:0, cpa:0, tasaEntrega:70
      });
    }
    saveProductos();
    $('#productForm').style.display='none';
    renderAll();
  });

  // ---------- RENTABILIDAD module ----------
  function computeMargin(p){
    const precio = Number(p.precio)||0;
    const costo = Number(p.costoProveedor)||0;
    const fleteIda = Number(p.fleteIda)||0;
    const fleteRetorno = Number(p.fleteRetorno)||0;
    const empaque = Number(p.empaque)||0;
    const comisionPct = Number(p.comisionPct)||0;
    const otrosGastos = Number(p.otrosGastos)||0;
    const cpa = Number(p.cpa)||0;
    const tasa = Number(p.tasaEntrega)||0;
    if(precio<=0 || tasa<=0) return null;

    const N = 100;
    const entregados = N * (tasa/100);
    const noEntregados = N - entregados;

    const ingresos = entregados * precio;
    const costoProductoTotal = N * (costo + fleteIda + empaque + otrosGastos);
    const costoRetornoTotal = noEntregados * fleteRetorno;
    const costoComisionTotal = entregados * precio * (comisionPct/100); // la pasarela solo cobra sobre lo efectivamente cobrado
    const costoAdsTotal = N * cpa;

    const utilidadTotal = ingresos - costoProductoTotal - costoRetornoTotal - costoComisionTotal - costoAdsTotal;
    const utilidadPorPedido = utilidadTotal / N;
    const marginPct = ingresos>0 ? Math.round((utilidadTotal/ingresos)*100) : 0;
    const cpaMax = (ingresos - costoProductoTotal - costoRetornoTotal - costoComisionTotal) / N;

    let status = 'perdida';
    if(marginPct >= 15) status = 'rentable';
    else if(marginPct >= 5) status = 'ajustado';

    return { entregados, noEntregados, ingresos, costoProductoTotal, costoRetornoTotal, costoComisionTotal, costoAdsTotal, utilidadTotal, utilidadPorPedido, marginPct, cpaMax, status };
  }

  function renderRentTab(){
    const select = $('#rentProducto');
    const sinProductos = $('#rentSinProductos');
    const body = $('#rentBody');

    if(productos.length===0){
      sinProductos.style.display='block';
      body.style.display='none';
      return;
    }
    sinProductos.style.display='none';
    body.style.display='block';

    const prevSelection = rentSelectedId;
    select.innerHTML = '';
    productos.forEach(p=>{
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      select.appendChild(opt);
    });
    if(prevSelection && productos.some(p=>p.id===prevSelection)){
      select.value = prevSelection;
      rentSelectedId = prevSelection;
    } else {
      rentSelectedId = productos[0].id;
      select.value = rentSelectedId;
    }
    loadProductIntoRentForm(rentSelectedId);
  }

  $('#rentProducto').addEventListener('change', (e)=>{
    rentSelectedId = e.target.value;
    loadProductIntoRentForm(rentSelectedId);
  });

  function loadProductIntoRentForm(id){
    const p = productos.find(pr=>pr.id===id);
    if(!p) return;
    $('#rentPrecio').value = p.precio || 0;
    $('#rentCosto').value = p.costoProveedor || 0;
    $('#rentFleteIda').value = p.fleteIda || 0;
    $('#rentFleteRetorno').value = p.fleteRetorno || 0;
    $('#rentEmpaque').value = p.empaque || 0;
    $('#rentComision').value = p.comisionPct || 0;
    $('#rentOtros').value = p.otrosGastos || 0;
    $('#rentCpa').value = p.cpa || 0;
    $('#rentTasa').value = p.tasaEntrega || 70;
    $('#rentTasaLabel').textContent = (p.tasaEntrega || 70) + '%';
    updateRentResults();
  }

  const rentInputs = ['rentPrecio','rentCosto','rentFleteIda','rentFleteRetorno','rentEmpaque','rentComision','rentOtros','rentCpa','rentTasa'];
  rentInputs.forEach(id=>{
    $('#'+id).addEventListener('input', ()=>{
      if(id==='rentTasa') $('#rentTasaLabel').textContent = $('#rentTasa').value + '%';
      persistRentFieldsToProduct();
      updateRentResults();
    });
  });

  function persistRentFieldsToProduct(){
    const p = productos.find(pr=>pr.id===rentSelectedId);
    if(!p) return;
    p.precio = Number($('#rentPrecio').value)||0;
    p.costoProveedor = Number($('#rentCosto').value)||0;
    p.fleteIda = Number($('#rentFleteIda').value)||0;
    p.fleteRetorno = Number($('#rentFleteRetorno').value)||0;
    p.empaque = Number($('#rentEmpaque').value)||0;
    p.comisionPct = Number($('#rentComision').value)||0;
    p.otrosGastos = Number($('#rentOtros').value)||0;
    p.cpa = Number($('#rentCpa').value)||0;
    p.tasaEntrega = Number($('#rentTasa').value)||70;
    saveProductos();
    checkMarginAlert(p);
  }

  let lastAlertedStatus = {};
  function checkMarginAlert(p){
    const m = computeMargin(p);
    if(m && m.status==='perdida' && lastAlertedStatus[p.id] !== 'perdida'){
      chrome.runtime.sendMessage({ type:'margin-alert', nombre:p.nombre });
    }
    if(m) lastAlertedStatus[p.id] = m.status;
  }

  function updateRentResults(){
    const p = productos.find(pr=>pr.id===rentSelectedId);
    if(!p) return;
    const m = computeMargin(p);
    const dot = $('#semaforoDot');
    const label = $('#semaforoLabel');
    const sub = $('#semaforoSub');
    dot.className = 'semaforo-dot';

    if(!m){
      label.textContent = 'Faltan datos';
      sub.textContent = 'Completa precio y tasa de entrega.';
      $('#kpiUtilidadPedido').textContent = '—';
      $('#kpiMargen').textContent = '—';
      $('#kpiCpaMax').textContent = '—';
      $('#stackbar').innerHTML = '';
      $('#stackbarLegend').innerHTML = '';
      return;
    }

    dot.classList.add(m.status);
    if(m.status==='rentable'){ label.textContent='Rentable'; sub.textContent='Margen saludable con tus números actuales.'; }
    else if(m.status==='ajustado'){ label.textContent='Ajustado'; sub.textContent='Rentable, pero con poco margen de error.'; }
    else { label.textContent='Pérdida'; sub.textContent='Con estos números, estás perdiendo plata.'; }

    $('#kpiUtilidadPedido').textContent = fmtCOP(m.utilidadPorPedido);
    $('#kpiUtilidadPedido').className = 'value ' + (m.utilidadPorPedido>=0 ? 'menta' : 'danger-text');
    $('#kpiMargen').textContent = m.marginPct + '%';
    $('#kpiMargen').className = 'value ' + (m.marginPct>=15 ? 'menta' : (m.marginPct>=5 ? '' : 'danger-text'));
    $('#kpiCpaMax').textContent = fmtCOP(m.cpaMax);
    $('#kpiCpaMax').className = 'value guayaba';

    const scale = Math.max(m.ingresos, m.costoProductoTotal + m.costoRetornoTotal + m.costoComisionTotal + m.costoAdsTotal + Math.max(m.utilidadTotal,0)) || 1;
    const segs = [
      {cls:'seg-producto', label:'Producto+flete+empaque', val:m.costoProductoTotal},
      {cls:'seg-retorno', label:'Flete retorno', val:m.costoRetornoTotal},
      {cls:'seg-comision', label:'Comisión pasarela', val:m.costoComisionTotal},
      {cls:'seg-ads', label:'Publicidad (CPA)', val:m.costoAdsTotal}
    ];
    if(m.utilidadTotal>=0) segs.push({cls:'seg-utilidad', label:'Utilidad neta', val:m.utilidadTotal});
    else segs.push({cls:'seg-perdida', label:'Pérdida', val:Math.abs(m.utilidadTotal)});

    $('#stackbar').innerHTML = segs.map(s=>{
      const pct = Math.max(0, Math.min(100, (s.val/scale)*100));
      return `<div class="seg ${s.cls}" style="width:${pct}%"></div>`;
    }).join('');
    $('#stackbarLegend').innerHTML = segs.map(s=>`<span class="item"><span class="dot ${s.cls}"></span>${s.label}: ${fmtCOP(s.val)}</span>`).join('');
  }

  // ---------- venta form ----------
  function renderVentaForm(){
    const select = $('#ventaProducto');
    const sinProductos = $('#ventaSinProductos');
    const form = $('#formVenta');
    select.innerHTML = '';
    if(productos.length===0){
      sinProductos.style.display='block';
      form.style.display='none';
      return;
    }
    sinProductos.style.display='none';
    form.style.display='flex';
    productos.forEach(p=>{
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre + (p.tipo==='stock' ? ` (${p.stock ?? 0} en stock)` : '');
      select.appendChild(opt);
    });
    $('#ventaFecha').value = todayISO();
  }

  $('#formVenta').addEventListener('submit', (e)=>{
    e.preventDefault();
    const productoId = $('#ventaProducto').value;
    const unidades = Number($('#ventaUnidades').value)||1;
    const valor = Number($('#ventaValor').value)||0;
    const fecha = $('#ventaFecha').value || todayISO();

    const p = productos.find(pr=>pr.id===productoId);
    if(p && p.tipo==='stock'){
      const stockActual = Number(p.stock)||0;
      if(unidades > stockActual){
        if(!confirm(`Solo tienes ${stockActual} unidades en stock registradas. ¿Registrar la venta igual?`)) return;
      }
      p.stock = Math.max(0, stockActual - unidades);
    }

    ventas.push({ id:'v_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), productoId, unidades, valor, fecha });
    saveVentas();
    saveProductos();
    $('#ventaUnidades').value = 1;
    $('#ventaValor').value = '';
    renderAll();

    if(p && p.tipo==='stock' && Number(p.stock)<=3){
      alert(`Atención: a "${p.nombre}" le quedan ${p.stock} unidades en stock.`);
    }
  });

  // ---------- historial ----------
  function renderHistorial(){
    const list = $('#ventasList');
    const empty = $('#historialEmpty');
    const count = $('#ventasCount');
    list.innerHTML = '';
    count.textContent = ventas.length + (ventas.length===1 ? ' venta' : ' ventas');

    if(ventas.length===0){
      empty.style.display='block';
    } else {
      empty.style.display='none';
      const sorted = [...ventas].sort((a,b)=> b.fecha.localeCompare(a.fecha));
      sorted.forEach(v=>{
        const p = productos.find(pr=>pr.id===v.productoId);
        const row = document.createElement('div');
        row.className = 'sale-row';
        row.innerHTML = `
          <div class="date">${v.fecha}</div>
          <div class="name">${p ? escapeHtml(p.nombre) : '(eliminado)'}</div>
          <div class="qty">${v.unidades}u</div>
          <div class="val">${fmtCOP(v.valor)}</div>
          <button class="icon danger" data-id="${v.id}" title="Eliminar">✕</button>
        `;
        list.appendChild(row);
      });
      $$('button[data-id]', list).forEach(btn=>{
        btn.addEventListener('click', ()=>{
          if(confirm('¿Eliminar esta venta?')){
            ventas = ventas.filter(v=>v.id!==btn.dataset.id);
            saveVentas();
            renderAll();
          }
        });
      });
    }

    const totalVentas = ventas.length;
    const totalUnidades = ventas.reduce((s,v)=>s+Number(v.unidades),0);
    const totalValor = ventas.reduce((s,v)=>s+Number(v.valor),0);
    $('#kpiRow').innerHTML = `
      <div class="kpi"><div class="label">Ventas</div><div class="value">${totalVentas}</div></div>
      <div class="kpi"><div class="label">Unidades</div><div class="value menta">${totalUnidades}</div></div>
      <div class="kpi"><div class="label">Facturado</div><div class="value guayaba">${fmtCOP(totalValor)}</div></div>
    `;
  }

  // ---------- Distribución (donut chart) ----------
  const GOLD_PALETTE = ['#f3d98a','#d9ad4f','#b9862a','#e8c878','#c99a3c','#8a6a24','#f6e2a6','#c2922f','#a97e2e','#e0b45e'];
  const COOL_PALETTE = ['#4fd0c4','#ff7a45','#8b6fd6','#5b6b86','#f0c14b','#e8646b','#3fb6ab','#d9925f','#7a8ba3','#b98cd6'];
  let distMetric = 'ingresos';

  $$('.dist-tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.dist-tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      distMetric = btn.dataset.metric;
      renderDistribucion();
    });
  });

  function renderDistribucion(){
    if(productos.length===0){
      $('#distEmpty').style.display = 'block';
      $('.donut-row').style.display = 'none';
      return;
    }

    const palette = plan==='pro' ? GOLD_PALETTE : COOL_PALETTE;
    const data = productos.map(p=>{
      const vendidas = unidadesVendidas(p.id);
      const m = computeMargin(p);
      let valor = 0;
      if(distMetric==='ingresos') valor = ventas.filter(v=>v.productoId===p.id).reduce((s,v)=>s+Number(v.valor),0);
      else if(distMetric==='utilidad') valor = m ? Math.max(0, m.utilidadPorPedido * vendidas) : 0;
      else if(distMetric==='gasto') valor = Number(p.cpa||0) * vendidas;
      return { nombre:p.nombre, valor };
    }).filter(d=>d.valor>0).sort((a,b)=>b.valor-a.valor);

    const total = data.reduce((s,d)=>s+d.valor,0);

    if(data.length===0 || total<=0){
      $('#distEmpty').style.display = 'block';
      $('.donut-row').style.display = 'none';
      return;
    }
    $('#distEmpty').style.display = 'none';
    $('.donut-row').style.display = 'flex';

    let acc = 0;
    const stops = data.map((d,i)=>{
      const start = (acc/total)*360;
      acc += d.valor;
      const end = (acc/total)*360;
      const color = palette[i % palette.length];
      return `${color} ${start}deg ${end}deg`;
    });
    $('#donutChart').style.background = `conic-gradient(${stops.join(', ')})`;

    const metricLabel = distMetric==='ingresos' ? 'Ingresos totales' : (distMetric==='utilidad' ? 'Utilidad estimada' : 'Gasto en Ads (est.)');
    $('#donutCenter').innerHTML = `<div class="dc-value">${fmtCOP(total)}</div><div class="dc-label">${metricLabel}</div>`;

    $('#donutLegend').innerHTML = data.slice(0,10).map((d,i)=>{
      const color = palette[i % palette.length];
      const pct = Math.round((d.valor/total)*100);
      return `<div class="dl-item"><span class="dl-dot" style="background:${color}"></span><span class="dl-name" title="${escapeHtml(d.nombre)}">${escapeHtml(d.nombre)}</span><span class="dl-pct">${pct}%</span></div>`;
    }).join('');
  }

  // ---------- Audio / voz de agente (Web Speech API — sin costo, sin servicios externos) ----------
  let vipVoice = null;
  function pickFemaleSpanishVoice(){
    const voices = speechSynthesis.getVoices();
    if(!voices.length) return null;
    const esVoices = voices.filter(v=>v.lang && v.lang.toLowerCase().startsWith('es'));
    const pool = esVoices.length ? esVoices : voices;
    const femaleHints = ['female','mujer','sabina','helena','paulina','lucia','lupe','mónica','monica','elena','laura','isabela'];
    const female = pool.find(v=> femaleHints.some(h=>v.name.toLowerCase().includes(h)));
    return female || pool[0];
  }
  if('speechSynthesis' in window){
    speechSynthesis.onvoiceschanged = ()=>{ vipVoice = pickFemaleSpanishVoice(); };
    vipVoice = pickFemaleSpanishVoice();
  }

  function speak(text, btnEl){
    if(!('speechSynthesis' in window)){ alert('Tu navegador no soporta voz. Prueba en Chrome de escritorio.'); return; }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-CO';
    utter.rate = 1.02;
    utter.pitch = 1.05;
    if(vipVoice) utter.voice = vipVoice;
    if(btnEl){
      utter.onstart = ()=> btnEl.classList.add('speaking');
      utter.onend = ()=> btnEl.classList.remove('speaking');
      utter.onerror = ()=> btnEl.classList.remove('speaking');
    }
    speechSynthesis.speak(utter);
  }

  $$('.audio-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> speak(btn.dataset.speech));
  });

  function buildAnalysisSpeech(p, m){
    if(!m){
      return `Todavía no tengo suficientes datos de ${p.nombre} para darte un análisis. Completa el precio de venta y la tasa de entrega real primero, y vuelve a intentarlo.`;
    }
    let veredicto, consejo;
    if(m.status === 'rentable'){
      veredicto = 'este producto es rentable';
      consejo = `Mi recomendación: mantenlo, y si quieres, sube tu inversión en publicidad poco a poco, sin superar los ${fmtCOP(m.cpaMax)} de costo por pedido.`;
    } else if(m.status === 'ajustado'){
      veredicto = 'este producto está en zona ajustada, con poco margen de error';
      consejo = `Mi recomendación: mejóralo antes de escalarlo. Negocia un mejor flete, sube un poco el precio, o baja tu costo de publicidad. Si no logras subir el margen en las próximas semanas, considera bajarle prioridad frente a tus otros productos.`;
    } else {
      veredicto = 'este producto te está haciendo perder plata con cada pedido';
      consejo = `Mi recomendación: descártalo, o hazle un cambio grande — otro proveedor, otro precio, o una publicidad más barata. Tal como está hoy, entre más vendas, más pierdes.`;
    }
    return `Analizando ${p.nombre}. Con tus números actuales, ${veredicto}. Tu margen neto es de ${m.marginPct} por ciento, y tu utilidad por cada pedido es de ${fmtCOP(m.utilidadPorPedido)}. ${consejo}`;
  }

  $('#btnAudioAnalisis').addEventListener('click', function(){
    const p = productos.find(pr=>pr.id===rentSelectedId);
    if(!p){ alert('Selecciona un producto primero.'); return; }
    persistRentFieldsToProduct();
    const m = computeMargin(p);
    speak(buildAnalysisSpeech(p, m), this);
  });

  function renderAll(){
    renderRankboard();
    renderProductList();
    renderVentaForm();
    applyPlanUI();
  }

  // ---------- META ADS module ----------
  chrome.storage.local.get(['metaAccountId','metaToken'], (data)=>{
    if(data.metaAccountId) $('#metaAccountId').value = data.metaAccountId;
    if(data.metaToken) $('#metaToken').value = data.metaToken;
  });

  $('#metaHowTo').addEventListener('click', ()=>{
    const box = $('#metaHowToBox');
    box.style.display = box.style.display==='none' ? 'block' : 'none';
  });

  function metaSetStatus(msg, type){
    const el = $('#metaStatus');
    el.style.display = 'block';
    el.textContent = msg;
    el.className = 'empty-state' + (type==='error' ? ' status-error' : (type==='ok' ? ' status-ok' : ''));
  }

  $('#metaFetchBtn').addEventListener('click', async ()=>{
    if(plan!=='pro'){ alert('Meta Ads es una función Pro.'); return; }
    const accountIdRaw = $('#metaAccountId').value.trim();
    const token = $('#metaToken').value.trim();
    const accountId = accountIdRaw.startsWith('act_') ? accountIdRaw : ('act_'+accountIdRaw);

    if(!accountIdRaw || !token){
      metaSetStatus('Completa el ID de cuenta y el token de acceso.', 'error');
      return;
    }
    chrome.storage.local.set({ metaAccountId: accountIdRaw, metaToken: token });

    metaSetStatus('Consultando Meta Ads…', null);
    $('#metaResults').innerHTML = '';

    const fields = 'campaign_name,spend,actions,cost_per_action_type';
    const url = `https://graph.facebook.com/v20.0/${accountId}/insights?level=campaign&fields=${fields}&date_preset=last_30d&limit=50&access_token=${encodeURIComponent(token)}`;

    try{
      const res = await fetch(url);
      const json = await res.json();
      if(json.error){ metaSetStatus('Meta devolvió un error: ' + json.error.message, 'error'); return; }
      const rows = json.data || [];
      if(rows.length === 0){ metaSetStatus('No se encontraron campañas con gasto en los últimos 30 días.', null); return; }
      metaSetStatus(`Se encontraron ${rows.length} campañas.`, 'ok');
      renderMetaResults(rows);
    } catch(err){
      metaSetStatus('No se pudo conectar con Meta. Revisa tu token y conexión.', 'error');
      console.error(err);
    }
  });

  function extractResultCount(actions){
    if(!actions) return null;
    const priority = ['offsite_conversion.fb_pixel_purchase','omni_purchase','purchase','lead','onsite_conversion.lead_grouped'];
    for(const type of priority){
      const found = actions.find(a=>a.action_type===type);
      if(found) return { count:Number(found.value), type };
    }
    if(actions.length>0) return { count:Number(actions[0].value), type:actions[0].action_type };
    return null;
  }

  function renderMetaResults(rows){
    const container = $('#metaResults');
    container.innerHTML = '';
    rows.forEach((row, idx)=>{
      const spend = Number(row.spend)||0;
      const result = extractResultCount(row.actions);
      const cpa = result && result.count>0 ? (spend/result.count) : null;

      const card = document.createElement('div');
      card.className = 'campaign-card';
      const cardId = 'meta_'+idx;
      card.innerHTML = `
        <div class="cname" title="${escapeHtml(row.campaign_name)}">${escapeHtml(row.campaign_name) || 'Campaña sin nombre'}</div>
        <div class="crow"><span>Gasto (30d)</span><b>${fmtCOP(spend)}</b></div>
        <div class="crow"><span>Resultados${result ? ' ('+result.type+')' : ''}</span><b>${result ? result.count : '—'}</b></div>
        <div class="crow"><span>CPA calculado</span><b>${cpa ? fmtCOP(cpa) : '—'}</b></div>
        <div class="capply">
          <select id="${cardId}-select"></select>
          <button class="ghost" data-cpa="${cpa||''}" data-select="${cardId}-select">Aplicar CPA</button>
        </div>
      `;
      container.appendChild(card);
      const sel = card.querySelector('#'+cardId+'-select');
      productos.forEach(p=>{
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        sel.appendChild(opt);
      });
    });

    $$('.capply button', container).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const cpa = Number(btn.dataset.cpa);
        if(!cpa){ alert('Esta campaña no tiene un CPA calculable (sin resultados registrados).'); return; }
        const selectId = btn.dataset.select;
        const productoId = $('#'+selectId).value;
        const p = productos.find(pr=>pr.id===productoId);
        if(!p) return;
        p.cpa = Math.round(cpa);
        saveProductos();
        checkMarginAlert(p);
        alert(`CPA de ${fmtCOP(cpa)} aplicado a "${p.nombre}". Revísalo en la pestaña Rentabilidad.`);
      });
    });
  }

  loadData();
})();
