# Guion — Video tutorial "Top 10 Tracker"
**Versión 2: usa el audio nativo 🔊 de la app como narración real (no voz en off separada) en las escenas donde existe.**

> Verificado contra el código actual (`popup.html`): hay botón 🔊 con `data-speech` en Ranking, Rentabilidad, Meta Ads, Distribución y Ayuda. Vender, Historial y Ajustes NO tienen audio nativo — ahí sí se necesita voz en off tuya o de una IA.

## Cómo grabar el audio nativo (importante, hazlo antes de grabar todo lo demás)

El botón 🔊 usa `speechSynthesis` del navegador — es audio que sale por la **salida de sonido del sistema**, no por el micrófono. Para que OBS lo capture:

1. En OBS, agrega una fuente **"Captura de audio de aplicación"** (Application Audio Capture) apuntando a Chrome, o agrega **"Salida de audio del escritorio"** (Desktop Audio) si no tienes esa opción.
2. Silencia el micrófono mientras suena el 🔊 (para no mezclar ruido de fondo con la voz sintética).
3. Haz una prueba corta primero: graba 5 segundos con un clic al 🔊 y confirma en la grabación que se escucha claro.

## Escena 1 — Ranking (usa el audio nativo tal cual)

| Acción en pantalla | Detalle |
|---|---|
| Abrir la extensión, pestaña **Ranking** ya activa por defecto | Se ve el gráfico de barras (01–10) y la lista "Tus productos" |
| Esperar 1–2s mostrando el gráfico completo | Deja que se vea el semáforo de colores en los porcentajes |
| Clic en el botón 🔊 junto a "Tus productos" | Se dispara el audio nativo — grábalo tal cual, sin voz en off tuya |
| Mientras suena, mover el mouse/scroll suave por la lista de productos (sin hacer clic) para acompañar visualmente lo que dice el audio | No cortes el audio a la mitad |

**Texto exacto que sonará (para subtítulos, o para calcular cuánto dura la escena):**
> "Aquí ves tu top diez de productos. Cada barra te muestra qué tan cerca estás de tu meta mensual. El número de color junto al nombre es tu margen real: verde es rentable, amarillo es ajustado, y rojo significa que estás perdiendo plata con ese producto. Agrega uno nuevo con el botón de arriba a la derecha."

Captura de referencia ya validada: pestaña Ranking con gráfico de barras 01–10 y lista de productos (Audífonos Bluetooth, Faja Moldeadora, Crema Anti-edad, Smartwatch...).

---

## Escena 2 — Rentabilidad (dos audios nativos en esta escena)

**2a. Explicación general** — clic en 🔊 junto a "Rentabilidad real":
> "Esta es tu calculadora de rentabilidad real. Escoge un producto y completa precio, costos y publicidad. El semáforo te dice de un vistazo si ese producto te está dejando plata o no. El dato más importante es el C P A máximo: es el límite de gasto en publicidad antes de empezar a perder dinero."

Mientras suena: mostrar los campos (precio, costo proveedor, fletes, empaque, comisión) sin tocarlos todavía.

**2b. Análisis por producto** — mueve el slider de "Tasa de entrega real" en vivo, luego clic en **"Analizar este producto en voz"**. Este texto es dinámico (lo genera el código según el margen calculado), por ejemplo con "Audífonos Bluetooth TWS" en verde (Rentable, margen 24%):
> "Analizando Audífonos Bluetooth TWS. Con tus números actuales, este producto es rentable. Tu margen neto es de 24 por ciento, y tu utilidad por cada pedido es de $16.518. Mi recomendación: mantenlo, y si quieres, sube tu inversión en publicidad poco a poco, sin superar los $28.918 de costo por pedido."

Tip del guion original sigue aplicando aquí: repite esta escena con un producto en rojo (pérdida) para que el semáforo cambie de color y el audio diga "descártalo" — es el momento más "wow" del video.

**Verificado con el producto "Crema Anti-edad Facial" (margen -40%, Pérdida):**
> "Analizando Crema Anti-edad Facial. Con tus números actuales, este producto te está haciendo perder plata con cada pedido. Tu margen neto es de -40 por ciento, y tu utilidad por cada pedido es de -$16.148. Mi recomendación: descártalo, o hazle un cambio grande — otro proveedor, otro precio, o una publicidad más barata. Tal como está hoy, entre más vendas, más pierdes."

Grábalo así: selecciona primero "Audífonos Bluetooth TWS" (verde, rentable) → clic en analizar → luego cambia el selector a "Crema Anti-edad Facial" (rojo, pérdida) → clic en analizar de nuevo. El corte de verde a rojo en una sola toma es el clip que más funciona para Reels/Shorts.

---

## Escena 3 — Meta Ads (audio nativo)

Clic en 🔊 junto a "Conectar Meta Ads":
> "Aquí conectas tu cuenta de publicidad de Facebook e Instagram. Pega tu token y tu I D de cuenta, y voy a traer el gasto real de cada campaña. Luego aplicas ese costo directo al producto correspondiente, para que tu cálculo de rentabilidad use tus números reales de publicidad, no un estimado."

Mientras suena: mostrar los campos "ID de cuenta publicitaria" y "Token de acceso" vacíos (no muestres un token real en cámara).

---

## Escena 4 — Distribución (audio nativo)

Clic en 🔊 junto a "Distribución de tus 10 productos":
> "Esta gráfica te muestra de dónde viene realmente tu plata. Puedes verla por ingresos, por utilidad, o por gasto en publicidad. Así identificas rápido cuál producto es tu verdadero motor de ganancias, y cuál te está consumiendo presupuesto de anuncios sin aportar tanto."

Mientras suena o justo después: alternar clic entre **Ingresos → Utilidad → Gasto en Ads** para mostrar el donut cambiando.

---

## Escenas sin audio nativo (necesitan voz en off tuya o de IA)

**Escena 5 — Vender (15s)**
Pantalla: registrar una venta rápida.
> "Registrar una venta toma diez segundos."

**Escena 6 — Historial (15s)**
Pantalla: KPIs del historial, exportar CSV.
> "Y en el historial ves tus totales, con opción de exportarlo todo a Excel."

**Escena 7 — Ajustes (30s)**
Pantalla: moneda/país, resumen por correo, plan Free vs Pro dorado.
> "Eliges tu moneda y país, activas tu resumen de ventas directo a tu correo, y cuando estés listo, pasas a Pro."

**Escena 8 — Cierre (10s)**
Pantalla: botón "Comprar Pro" con tema dorado activo.
> "Empieza gratis hoy. El link está abajo."

---

## Storyboard verificado — completo

Se armó un harness de prueba local (popup.html/js/css con `chrome.storage`/`chrome.tabs`/`chrome.runtime` simulados) para recorrer la app entera con el código DEMO-2026 sin depender de la extensión real. Con esto se verificaron y capturaron las 8 escenas:

1. Ranking — ✅ capturado, audio verificado
2. Rentabilidad (caso rentable + caso pérdida) — ✅ capturado, ambos audios verificados
3. Meta Ads — ✅ capturado, audio verificado
4. Distribución — ✅ capturado, audio verificado
5. Vender — ✅ capturado
6. Historial (71 ventas, 91 unidades, $8.730.900 facturado) — ✅ capturado
7. Ajustes (moneda/correo/plan) — ✅ capturado
8. Cierre "Comprar Pro" — ✅ visible en la misma captura de Ajustes

**Importante:** este harness solo sirvió para verificar textos y capturar pantallazos de referencia — no genera el video final. La grabación real (con el audio 🔊 sonando de verdad y el movimiento de mouse en vivo) se hace en la extensión instalada de verdad, en Chrome, con OBS capturando pantalla + audio del sistema, siguiendo escena por escena este guion.
