// background.js — corre en segundo plano, incluso con el popup cerrado.
// Revisa cada hora si toca mandar el resumen (diario o semanal, según Ajustes)
// y lo envía de verdad por EmailJS si está configurado; si no, avisa con notificación.

const ALARM_CHECK = 'resumen-check';

chrome.runtime.onInstalled.addListener(()=>{
  chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 60 });
});
chrome.runtime.onStartup.addListener(()=>{
  chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm)=>{
  if(alarm.name === ALARM_CHECK) checkAndSendResumen();
});

function fmtMoneySimple(n, country){
  const map = { CO:['es-CO','COP'], MX:['es-MX','MXN'], CL:['es-CL','CLP'], PE:['es-PE','PEN'],
    EC:['es-EC','USD'], PA:['es-PA','USD'], AR:['es-AR','ARS'], GT:['es-GT','GTQ'], CR:['es-CR','CRC'], US:['en-US','USD'] };
  const [locale, currency] = map[country] || map.CO;
  try{
    return new Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits:0 }).format(n||0);
  }catch(e){
    return '$' + Math.round(n||0).toLocaleString('es');
  }
}

async function sendViaEmailJS(settings, subject, message){
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
  if(!res.ok) throw new Error('EmailJS respondió ' + res.status);
  return true;
}

async function checkAndSendResumen(){
  const data = await chrome.storage.local.get(['productos','ventas','settings','plan','lastResumenSentAt']);
  const settings = data.settings || {};
  const plan = data.plan || 'free';

  if(plan!=='pro' || settings.resumenAuto === false) return;

  const frecuencia = settings.frecuenciaResumen || 'diario';
  const intervalMs = frecuencia === 'diario' ? (24*60*60*1000) : (7*24*60*60*1000);
  const lastSent = data.lastResumenSentAt || 0;
  if(Date.now() - lastSent < intervalMs) return; // todavía no toca

  const productos = data.productos || [];
  const ventas = data.ventas || [];
  const desde = new Date(Date.now() - intervalMs);
  const ventasPeriodo = ventas.filter(v => new Date(v.fecha) >= desde);

  const periodoLabel = frecuencia === 'diario' ? 'de hoy' : 'de la semana';

  if(ventasPeriodo.length === 0){
    chrome.notifications.create('resumen-'+Date.now(), {
      type:'basic', iconUrl:'icon128.png',
      title:`Sin ventas ${periodoLabel}`,
      message:'No registraste ventas en este período. Abre la extensión para ponerte al día.',
      priority:1
    });
    await chrome.storage.local.set({ lastResumenSentAt: Date.now() });
    return;
  }

  const totalUnidades = ventasPeriodo.reduce((s,v)=>s+Number(v.unidades),0);
  const totalValor = ventasPeriodo.reduce((s,v)=>s+Number(v.valor),0);

  const porProducto = {};
  ventasPeriodo.forEach(v=>{ porProducto[v.productoId] = (porProducto[v.productoId]||0) + Number(v.unidades); });
  const topProductos = Object.entries(porProducto)
    .sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([id, unidades])=>{
      const p = productos.find(pr=>pr.id===id);
      return `${p ? p.nombre : 'Producto'} — ${unidades} unidades`;
    });

  const resumenTexto = `Ventas ${periodoLabel}: ${ventasPeriodo.length}\nUnidades: ${totalUnidades}\nFacturado: ${fmtMoneySimple(totalValor, settings.country)}\n\nTop productos:\n${topProductos.map((t,i)=>`${i+1}. ${t}`).join('\n')}`;

  const emailjsListo = settings.emailjsEnabled && settings.emailjsService && settings.emailjsTemplate && settings.emailjsKey && settings.email;

  if(emailjsListo){
    try{
      await sendViaEmailJS(settings, `Tu resumen ${periodoLabel} — Top 10 Tracker`, resumenTexto);
      chrome.notifications.create('resumen-'+Date.now(), {
        type:'basic', iconUrl:'icon128.png',
        title:'Resumen enviado ✅',
        message:`Se envió tu resumen ${periodoLabel} a ${settings.email}.`,
        priority:1
      });
      await chrome.storage.local.set({ lastResumenSentAt: Date.now() });
      return;
    }catch(err){
      console.error('Fallo envío automático EmailJS', err);
      // sigue abajo y notifica en vez de fallar en silencio
    }
  }

  chrome.notifications.create('resumen-'+Date.now(), {
    type:'basic', iconUrl:'icon128.png',
    title:`Tu resumen ${periodoLabel}`,
    message:`${ventasPeriodo.length} ventas · ${totalUnidades} unidades · ${fmtMoneySimple(totalValor, settings.country)} facturado. Abre la extensión para enviarlo por correo.`,
    priority:1,
    buttons:[{ title:'Ver resumen' }]
  });
  await chrome.storage.local.set({ lastResumenSentAt: Date.now() });
}

chrome.notifications.onButtonClicked.addListener(()=>{
  chrome.action.openPopup().catch(()=>{});
});

// Escucha mensajes del popup para alertas puntuales de margen en rojo
chrome.runtime.onMessage.addListener((msg)=>{
  if(msg && msg.type === 'margin-alert'){
    chrome.notifications.create('margin-'+Date.now(), {
      type:'basic', iconUrl:'icon128.png',
      title:'⚠️ Producto en pérdida',
      message:`"${msg.nombre}" está dando pérdida con tus números actuales. Revisa su rentabilidad.`,
      priority:1
    });
  }
});
