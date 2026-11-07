/* Mango: pantallas. Los datos viven en la cuenta de cada persona (ver nube.js). */
(function () {
  'use strict';
  const E = window.AlDia;
  const CLAVE = 'al-dia-estado-v1';
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = E.fmt, fc = E.fmtCorto;
  const hoy = () => E.hoyISO();
  const horaAhora = () => new Date().getHours();
  const App = {
    s: null, tab: 'hoy', sub: 'deudas', texto: '', compro: '', comproHecho: false,
    plan: { cuotas: 1, interes: 'sin', valor: '', deTexto: false },
    rep: { monto: '', fecha: null, origen: null, modo: 'orden' },
    abiertos: new Set(), errorGuardado: false, toastT: null
  };
  const movimiento = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const CLASES = {
    necesario: { t: 'Necesario', k: 'bien', i: '✓' },
    gustito: { t: 'Gustito', k: 'ojo', i: '!' },
    innecesario: { t: 'Innecesario', k: 'mal', i: '×' }
  };
  const pill = (k, t, i = '') => `<span class="pill ${k}">${i ? `<span aria-hidden="true">${i}</span>` : ''}${esc(t)}</span>`;
  const pillClase = c => { const x = CLASES[c] || CLASES.gustito; return pill(x.k, x.t, x.i); };

  const ICONOS = {
    hoy: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    cargar: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    tarjetas: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10.5h18"/>',
    deudas: '<path d="M6 3h11a2 2 0 012 2v16H7a2 2 0 01-2-2V4a1 1 0 011-1z"/><path d="M9 8h7M9 12h7"/>',
    compro: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5"/><path d="M12 17.2v.1"/>',
    repartir: '<path d="M12 21v-7"/><path d="M12 14L5 7"/><path d="M12 14l7-7"/><path d="M5 12V7h5"/><path d="M19 12V7h-5"/>',
    plata: '<rect x="3" y="7" width="18" height="11" rx="2.5"/><circle cx="12" cy="12.5" r="2.4"/><path d="M6.5 10.5v.01M17.5 14.5v.01"/>',
    cobre: '<rect x="3" y="7" width="18" height="11" rx="2.5"/><circle cx="12" cy="12.5" r="2.4"/><path d="M6.5 10.5v.01M17.5 14.5v.01"/>',
    ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    arriba: '<path d="M6 15l6-6 6 6"/>',
    abajo: '<path d="M6 9l6 6 6-6"/>'
  };
  const icono = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n]}</svg>`;
  const COLORES_TARJETA = { visa: '#4F7BFF', master: '#FFB020', naranja: '#FF7A1A', mp: '#27C3F3' };
  const PALETA_TARJETAS = ['#FF9E1B', '#4CAF50', '#F4D03F', '#6FC3DF', '#FF7A6B', '#B8E986'];
  const colorTarjeta = id => COLORES_TARJETA[id] || PALETA_TARJETAS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETA_TARJETAS.length];
  const punto = id => `<span class="punto" style="background:${colorTarjeta(id)}" aria-hidden="true"></span>`;
  const TABS = [['hoy', 'Hoy'], ['cargar', 'Cargar'], ['tarjetas', 'Tarjetas'], ['deudas', 'Deudas'], ['compro', '¿Compro?'], ['repartir', 'Repartir']];

  const TABS_BASICO = [['hoy', 'Hoy'], ['cargar', 'Gasté'], ['tarjetas', 'Tarjetas'], ['cobre', 'Cobré'], ['compro', '¿Compro?']];
  const B = () => !!App.s && E.modo(App.s) === 'basico';
  const parsear = t => E.parsearCompra(t, B() ? App.s.tarjetas : undefined);

  /* ---------- Guardado ---------- */
  const LOCAL = location.hostname === 'localhost' && location.search.includes('local');
  const alErrorEscritura = e => {
    if (e && e.code === 'permission-denied') { App.fase = 'sinAcceso'; App.s = null; }
    else App.errorGuardado = true;
    render();
  };
  const guardar = () => {
    if (LOCAL) {
      try { localStorage.setItem(CLAVE, JSON.stringify(App.s)); App.errorGuardado = false; }
      catch (e) { App.errorGuardado = true; }
    } else if (App.usuario && App.s) window.Nube.guardar(App.s, alErrorEscritura);
  };
  const leer = () => {
    try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) : null; }
    catch (e) { return null; }
  };
  const mutar = (fn, msg, { deshacer = true } = {}) => {
    const antes = JSON.stringify(App.s);
    fn(App.s);
    E.tocar(App.s);
    guardar();
    render();
    if (msg) toast(msg, deshacer ? () => { const rev = App.s.rev; App.s = JSON.parse(antes); App.s.rev = rev; E.tocar(App.s); guardar(); render(); toast('Listo, lo deshice.'); } : null);
  };
  const toast = (msg, alDeshacer) => {
    const t = $('toast');
    t.innerHTML = `<span>${esc(msg)}</span>${alDeshacer ? '<button type="button" id="toast-deshacer">Deshacer</button>' : ''}`;
    t.hidden = false;
    clearTimeout(App.toastT);
    App.toastT = setTimeout(() => { t.hidden = true; }, alDeshacer ? 5000 : 3000);
    if (alDeshacer) $('toast-deshacer').onclick = () => { t.hidden = true; alDeshacer(); };
  };

  /* ---------- Hoja inferior ---------- */
  const abrirHoja = (titulo, cuerpo, sub = '', { ancha = false } = {}) => {
    const h = $('hoja');
    h.className = 'hoja';
    h.hidden = false;
    h.innerHTML = `<div class="hoja-fondo" data-a="cerrar"></div><div class="hoja-panel${ancha ? ' ancha' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="hoja-cab"><div><h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button type="button" class="cerrar" data-a="cerrar" aria-label="Cerrar">×</button></div>${cuerpo}</div>`;
    document.body.style.overflow = 'hidden';
  };
  const cerrarHoja = () => {
    const h = $('hoja');
    /* La salida la hace una copia, así la hoja real queda cerrada al instante y nada espera a la animación. */
    const panel = h.querySelector('.hoja-panel');
    if (!h.hidden && panel && movimiento()) {
      const copia = h.cloneNode(true);
      copia.removeAttribute('id');
      copia.classList.add('saliendo');
      copia.setAttribute('aria-hidden', 'true');
      copia.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      copia.querySelectorAll('[data-a],[data-form]').forEach(el => { el.removeAttribute('data-a'); el.removeAttribute('data-form'); });
      document.body.appendChild(copia);
      copia.querySelector('.hoja-panel').scrollTop = panel.scrollTop;
      setTimeout(() => copia.remove(), 220);
    }
    h.hidden = true;
    h.innerHTML = '';
    document.body.style.overflow = '';
  };
  const campo = (id, etiqueta, valor = '', { tipo = 'text', modo = '', ph = '', ayuda = '', extra = '' } = {}) =>
    `<div class="campo"><label for="${id}">${esc(etiqueta)}</label><input id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" ${modo ? `inputmode="${modo}"` : ''} ${ph ? `placeholder="${esc(ph)}"` : ''} autocomplete="off" ${extra}>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}</div>`;
  const chips = (nombre, opciones, actual) =>
    `<input type="hidden" name="${nombre}" value="${esc(actual)}"><div class="chips" role="group">${opciones.map(([v, t]) => `<button type="button" class="chip ${v === actual ? 'on' : ''}" data-a="elegir" data-campo="${nombre}" data-valor="${esc(v)}">${esc(t)}</button>`).join('')}</div>`;
  const redondo = n => Math.round(n);

  /* ---------- Hoy ---------- */
  const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

  /* ---------- Resúmenes que me pasaste en fotos ----------
     Se ofrecen una sola vez, en Hoy, y no se guarda nada hasta que tocás Cargar.
     BBVA de noviembre ya está pagado: solo quedan las cuotas que siguen. Mercado Pago de octubre y Naranja los pagó tu papá. */
  const IMPORTE = {
    id: 'resumenes-nov26',
    viejo: 'bbva-oct26',
    titulo: 'Tus tarjetas y lo de tu papá',
    bbva: { ym: '2026-11', pagado: '2026-11-04', cierre: 19, tarjetas: [
      { buscar: 'master', total: 710797.26, cuotas: [
        { nombre: 'Jetsmart', cuota: 49729.60, n: 1, de: 2, fecha: '2026-09-30' },
        { nombre: 'Modo QR Quade', cuota: 26999.68, n: 1, de: 3, fecha: '2026-10-16' }
      ] },
      { buscar: 'visa', total: 2075772.84, cuotas: [
        { nombre: 'Decathlon', cuota: 25133.33, n: 5, de: 6, fecha: '2026-06-06' },
        { nombre: 'Newsport', cuota: 30000, n: 5, de: 6, fecha: '2026-06-16' },
        { nombre: 'Plataforma 10', cuota: 74360, n: 1, de: 3, fecha: '2026-09-27' },
        { nombre: 'Trigital Cines', cuota: 9013.34, n: 1, de: 3, fecha: '2026-09-28' },
        { nombre: 'Plataforma 10 (2)', cuota: 17256.68, n: 1, de: 3, fecha: '2026-09-30' },
        { nombre: 'El Emporio Libros', cuota: 59849.70, n: 1, de: 3, fecha: '2026-10-02' }
      ] }
    ] },
    peugeot: { buscar: 'visa', nombre: 'Plan Peugeot (tu mitad)', total: 486125.19, monto: 243062.60, desde: '2026-12' },
    /* De Mercado Pago son tuyas estas 4 compras y la cuota 2 de 2 de Mercado Libre ($50.850): lo demás del resumen no es tuyo. */
    mp: { buscar: 'mp', ym: '2026-10', total: 280846.48, totalTarjeta: 752335.97, pagado: '2026-10-17', cierre: 12, cuotas: [
      { nombre: 'Newsan', cuota: 54188.77, n: 5, de: 9, fecha: '2026-05-13' },
      { nombre: 'Kiosco Finca', cuota: 108333.83, n: 2, de: 3, fecha: '2026-08-19' },
      { nombre: 'Zivals', cuota: 46973.88, n: 1, de: 3, fecha: '2026-09-21' },
      { nombre: 'Hadouken', cuota: 20500, n: 1, de: 2, fecha: '2026-09-25' }
    ] },
    naranja: { monto: 154600, detalle: '$44.600 + $110.000' }
  };
  const buscarTarjeta = (s, clave) => s.tarjetas.find(t => t.id === clave) || s.tarjetas.find(t => {
    const n = E.normalizar(t.nombre);
    return clave === 'mp' ? n.includes('mercado pago') : n.split(/\s+/).includes(clave);
  });
  const buscarPapa = s => s.deudas.find(d => /\bpap[aá]|\bviejo\b/.test(E.normalizar(d.nombre)));
  const importePendiente = s => !((s.config.importados || []).includes(IMPORTE.id)) && ['visa', 'master', 'mp'].every(k => buscarTarjeta(s, k));
  const primeraPalabra = n => E.normalizar(n).split(/[\s(]+/)[0];
  const yaEstaCuota = (s, medio, q) => s.compras.some(c => c.medio === medio && c.cuotas === q.de && primeraPalabra(c.nombre) === primeraPalabra(q.nombre) && Math.abs(c.monto / c.cuotas - q.cuota) < 2);
  const avisoImporte = s => importePendiente(s)
    ? `<div class="aviso azul"><strong>${esc(IMPORTE.titulo)}</strong><span>Las cuotas que siguen en Visa, Master y Mercado Pago, tu mitad del plan Peugeot y lo que le debés a tu papá. Revisalo antes de cargarlo.</span><button class="link" data-a="verImporte">Revisar y cargar</button></div>`
    : '';
  const filasCuotas = (s, t, cuotas, ym) => cuotas.map(q => {
    const quedan = q.de - q.n, ya = yaEstaCuota(s, t.id, q);
    const fin = E.sumarMes(ym, quedan), mesFin = fin.slice(0, 4) === hoy().slice(0, 4) ? E.mesNombre(fin) : E.mesAnio(fin);
    return `<div class="fila"><span class="izq"><span class="nom">${esc(q.nombre)}</span><span class="chico">${quedan === 1 ? `Te queda 1 cuota: termina en ${esc(mesFin)}` : `Te quedan ${quedan} cuotas: termina en ${esc(mesFin)}`}${ya ? ' · ya la tenías, no la repito' : ''}</span></span><span class="der"><span class="num">${f(q.cuota)}</span></span></div>`;
  }).join('');
  /* ---------- Consumos de Visa y Master desde el cierre del 22/10 (de tus capturas del 7/11) ----------
     Van al resumen que cierra el 19/11 y vence el 3/12. Las cuotas que ya tenías cargadas no se repiten. */
  const CONSUMOS = {
    id: 'consumos-bbva-nov26',
    titulo: 'Lo que gastaste en Visa y Master',
    tarjetas: [
      { buscar: 'visa', banco: 715144.78, previas: 83373.33, ajenos: 68310, items: [
        ['2026-11-06', 'Uber', 9002], ['2026-11-06', 'Black Torino', 39500, 3], ['2026-11-05', 'Hoyts', 19000], ['2026-11-05', 'Catuki app', 7350],
        ['2026-11-05', 'Uber', 5904], ['2026-11-05', 'Cabify', 11993.71], ['2026-11-04', 'Uber', 3668], ['2026-11-04', 'KFC Paseo del Jockey', 31493],
        ['2026-11-03', 'Uber', 7218], ['2026-11-02', 'Uber', 6847], ['2026-11-02', 'PedidosYa Risata Nueva', 8070], ['2026-11-02', 'Uber', 7623],
        ['2026-11-02', 'PedidosYa Risata Nueva', 5197.5], ['2026-11-01', 'Burger King Colón', 22500], ['2026-10-31', 'Pablo Andrés Costa', 30492.15],
        ['2026-10-27', 'Alpogo Tickets', 33034.44, 3], ['2026-10-27', 'Alpogo Tickets', 32200], ['2026-10-25', 'Farmacia SV', 15689], ['2026-10-24', 'Rappi', 37563],
        ['2026-10-24', 'Uber Eats', 16611], ['2026-10-24', 'El Balcón (perfume, regalo)', 42650], ['2026-10-23', 'El Balcón (perfume, regalo)', 14112, 2], ['2026-10-23', 'Buscalibre', 19309.15, 3],
        ['2026-10-23', 'Sanatorio Allende', 58399.51, 3], ['2026-10-23', 'Café de Barrio', 6580], ['2026-10-22', 'PedidosYa Leroma Valle', 11450],
        ['2026-09-19', 'Vaqueria', 45266.66, 3, 2]
      ] },
      { buscar: 'master', banco: 77609.60, previas: 49729.60, items: [
        ['2026-11-06', 'Mercado Libre', 20990], ['2026-10-30', 'PedidosYa Plus', 6890]
      ] }
    ]
  };
  const ymConsumos = '2026-12';
  /* Lo que me aclaraste: qué es cada una. Maidana Libros ($68.310, 23/10) es de tus papás: no se cuenta. */
  const CATEGORIA_CONSUMO = { 'el balcon': 'regalo', vaqueria: 'ropa', 'catuki app': 'delivery', 'kfc paseo del jockey': 'comida' };
  const catConsumo = nombre => CATEGORIA_CONSUMO[E.normalizar(nombre).replace(/\s*\(.*\)$/, '')] || null;
  /* Si ya los habías cargado: arregla nombres y categorías y saca lo de tus papás. Una sola vez. */
  const ajustarConsumos = s => {
    const id = 'consumos-ajuste-1';
    if (!s || (s.config.importados || []).includes(id) || !(s.config.importados || []).includes(CONSUMOS.id)) return false;
    const visa = buscarTarjeta(s, 'visa');
    let cambio = false;
    if (visa) {
      const antes = s.compras.length;
      s.compras = s.compras.filter(c => !(c.medio === visa.id && c.fecha === '2026-10-23' && Math.abs(c.monto - 68310) < 1 && /maidana/.test(E.normalizar(c.nombre))));
      cambio = s.compras.length !== antes;
      for (const c of s.compras) {
        if (c.medio !== visa.id) continue;
        const n = E.normalizar(c.nombre);
        if (n.startsWith('paseo del jockey')) { c.nombre = 'KFC Paseo del Jockey'; c.categoria = 'comida'; cambio = true; }
        else if (n === 'el balcon') { c.nombre = 'El Balcón (perfume, regalo)'; c.categoria = 'regalo'; cambio = true; }
        else if (n === 'vaqueria' || n === 'catuki app') { c.categoria = catConsumo(c.nombre); cambio = true; }
      }
    }
    s.config.importados = [...(s.config.importados || []), id];
    E.tocar(s);
    return cambio;
  };
  const consumoPendiente = s => !((s.config.importados || []).includes(CONSUMOS.id)) && CONSUMOS.tarjetas.every(x => buscarTarjeta(s, x.buscar));
  const yaEstaConsumo = (s, medio, [fecha, nombre, cuota, n = 1]) => s.compras.some(c => c.medio === medio && c.fecha === fecha && c.cuotas === n && Math.abs(c.monto / c.cuotas - cuota) < 2);
  const avisoConsumos = s => consumoPendiente(s)
    ? `<div class="aviso azul"><strong>${esc(CONSUMOS.titulo)}</strong><span>Los consumos desde el 22/10 que me pasaste: van al resumen que vence el 3/12. Revisalos antes de cargarlos.</span><button class="link" data-a="verConsumos">Revisar y cargar</button></div>`
    : '';
  function hojaConsumos() {
    const s = App.s;
    const bloques = CONSUMOS.tarjetas.map(x => {
      const t = buscarTarjeta(s, x.buscar);
      const filas = x.items.map(it => {
        const [fecha, nombre, cuota, n = 1, va = 1] = it, ya = yaEstaConsumo(s, t.id, it);
        const det = n > 1 ? `cuota ${va} de ${n} · total ${f(cuota * n)}` : '1 pago';
        return `<div class="fila"><span class="izq"><span class="nom">${esc(nombre)}</span><span class="chico">${E.fechaCorta(fecha)} · ${det}${ya ? ' · ya estaba, no la repito' : ''}</span></span><span class="der"><span class="num">${f(cuota)}</span></span></div>`;
      }).join('');
      const suma = x.items.reduce((a, it) => a + it[2], 0);
      return `<section class="bloque">
          <div class="entre"><h2>${punto(t.id)}${esc(t.nombre)}</h2><span class="num">${f(suma)}</span></div>
          <p class="chico">El banco dice ${f(x.banco)}: estos ${f(suma)} más ${f(x.previas)} de cuotas que ya tenías${x.ajenos ? ` y ${f(x.ajenos)} de tus papás` : ''}.${Math.abs(x.banco - suma - x.previas - (x.ajenos || 0)) >= 1 ? ` Faltan ${f(x.banco - suma - x.previas - (x.ajenos || 0))} que quedaron escondidos en "Mostrar más".` : ' Coincide justo.'}</p>
          <div class="lista">${filas}</div>
        </section>`;
    }).join('');
    abrirHoja(CONSUMOS.titulo, `<form data-form="consumos">
        ${bloques}
        <p class="ayuda">Trigital, Plataforma 10 y Jetsmart también aparecen en tus capturas, pero ya los tenías cargados: no los repito. Maidana Libros ($68.310) es de tus papás: no lo cuento.</p>
        <button class="btn prim lleno">Cargar</button>
        <button type="button" class="btn lleno" data-a="descartarConsumos">No cargar</button>
      </form>`, 'Van al resumen que cierra el 19/11 y vence el 3/12.');
  }
  const aplicarConsumos = s => {
    for (const x of CONSUMOS.tarjetas) {
      const t = buscarTarjeta(s, x.buscar);
      for (const it of x.items) {
        if (yaEstaConsumo(s, t.id, it)) continue;
        const [fecha, nombre, cuota, n = 1, va = 1] = it;
        const monto = Math.round(cuota * n * 100) / 100;
        const a = E.clasificar(s, { nombre, monto, cuotas: n }, fecha);
        s.compras.push({ id: E.uid(), nombre, monto, cuotas: n, medio: t.id, fecha, texto: '', clase: a.clase, motivo: a.motivo, fuente: a.fuente, categoria: catConsumo(nombre), primerVence: E.sumarMes(ymConsumos, -(va - 1)), pagadas: va - 1 });
      }
    }
    s.config.importados = [...(s.config.importados || []), CONSUMOS.id, 'consumos-ajuste-1'];
    E.tocar(s);
  };
  function hojaImporte() {
    const s = App.s, im = IMPORTE, papa = buscarPapa(s);
    const bbva = im.bbva.tarjetas.map(x => {
      const t = buscarTarjeta(s, x.buscar);
      return `<section class="bloque">
          <div class="entre"><h2>${punto(t.id)}${esc(t.nombre)}</h2>${pill('bien', 'Pagada', '✓')}</div>
          <p class="chico">El resumen de noviembre (${f(x.total)}) queda como pagado el 4/11. No te descuento nada de tu plata: ya salió.</p>
          <div class="lista">${filasCuotas(s, t, x.cuotas, im.bbva.ym)}</div>
        </section>`;
    }).join('');
    const tmp = buscarTarjeta(s, im.mp.buscar);
    const deudaHoy = papa ? f(E.deudaEnARS(s, papa)) : null;
    abrirHoja(im.titulo, `<form data-form="importe">
        ${bbva}
        <section class="bloque">
          <div class="entre"><h2>Plan Peugeot</h2><span class="num">${f(im.peugeot.monto)}</span></div>
          <p class="chico">Uno por mes en la Visa (${f(im.peugeot.total)}). Pagás la mitad y tu papá la otra, así que cuento solo tu parte. En octubre entraron dos por error.</p>
        </section>
        <section class="bloque">
          <div class="entre"><h2>${punto(tmp.id)}${esc(tmp.nombre)}</h2>${pill('azul', 'La pagó tu papá')}</div>
          <p class="chico">El resumen de octubre lo pagó tu papá. Tuyas son Newsan, Kiosco Finca, Zivals, Hadouken y la última cuota de Mercado Libre (${f(im.mp.total)}): eso se suma a lo que le debés. El resto de la tarjeta no es tuyo y no lo cuento.</p>
          <div class="lista">${filasCuotas(s, tmp, im.mp.cuotas, im.mp.ym)}</div>
        </section>
        <section class="bloque">
          <div class="entre"><h2>Le debés a tu papá</h2><span class="num v-mal">+${f(im.mp.total + im.naranja.monto)}</span></div>
          <div class="lista">
            <div class="fila"><span class="izq"><span class="nom">Mercado Pago de octubre</span><span class="chico">Newsan, Kiosco Finca, Zivals, Hadouken y Mercado Libre 2 de 2</span></span><span class="der"><span class="num">${f(im.mp.total)}</span></span></div>
            <div class="fila"><span class="izq"><span class="nom">Naranja</span><span class="chico">${esc(im.naranja.detalle)}</span></span><span class="der"><span class="num">${f(im.naranja.monto)}</span></span></div>
          </div>
          <p class="chico">${papa ? `Se suma a ${esc(papa.nombre)}, que hoy está en ${deudaHoy}.` : 'Creo la deuda "Papá".'}</p>
        </section>
        <p class="ayuda">También dejo el cierre de Visa y Master el día ${im.bbva.cierre} y el de Mercado Pago el ${im.mp.cierre}.</p>
        <button class="btn prim lleno">Cargar</button>
        <button type="button" class="btn lleno" data-a="descartarImporte">No cargar</button>
      </form>`);
  }
  const sumarCuotas = (s, t, cuotas, ym) => {
    for (const q of cuotas) {
      if (yaEstaCuota(s, t.id, q)) continue;
      const a = E.clasificar(s, { nombre: q.nombre, monto: q.cuota * q.de, cuotas: q.de }, q.fecha);
      s.compras.push({ id: E.uid(), nombre: q.nombre, monto: Math.round(q.cuota * q.de * 100) / 100, cuotas: q.de, medio: t.id, fecha: q.fecha, texto: '', clase: a.clase, motivo: a.motivo, fuente: 'resumen', primerVence: E.sumarMes(ym, -(q.n - 1)), pagadas: q.n });
    }
  };
  /* Un resumen que ya estaba pagado antes de usar Mango: queda saldado sin tocar tu plata. */
  /* Corrección: la primera versión sumaba a tu papá el resumen entero de Mercado Pago. Queda solo tu parte. */
  const corregirPapa = s => {
    const id = 'papa-con-meli';
    if (!s || (s.config.importados || []).includes(id) || !(s.config.importados || []).includes(IMPORTE.id)) return false;
    const tmp = buscarTarjeta(s, IMPORTE.mp.buscar), key = tmp ? `${tmp.id}:${IMPORTE.mp.ym}` : null, rec = key && s.resumenes[key];
    const pago = rec && (rec.pagos || []).find(p => (p.nota || '').startsWith('Lo pagó tu papá') && Math.abs(p.monto - IMPORTE.mp.total) >= 1);
    if (pago) {
      pago.monto = IMPORTE.mp.total; pago.nota = 'Lo pagó tu papá (tus compras)';
      rec.real = IMPORTE.mp.total;
      for (const d of s.deudas) for (const m of d.movs) if (m.ref === pago.id) m.monto = IMPORTE.mp.total;
    }
    s.config.importados = [...(s.config.importados || []), id];
    E.tocar(s);
    return !!pago;
  };
  const marcarPagadoAntes = (s, cardId, ym, total, fecha) => {
    const key = `${cardId}:${ym}`, rec = (s.resumenes[key] = s.resumenes[key] || {});
    rec.real = total;
    rec.pagos = (rec.pagos || []).filter(p => !p.importado);
    rec.pagos.push({ id: E.uid(), monto: total, fecha, quien: 'yo', nota: 'Pagado antes de cargarlo', importado: true });
  };
  const aplicarImporte = s => {
    const im = IMPORTE;
    for (const x of im.bbva.tarjetas) {
      const t = buscarTarjeta(s, x.buscar);
      marcarPagadoAntes(s, t.id, im.bbva.ym, x.total, im.bbva.pagado);
      t.cierre = im.bbva.cierre; t.cierreEstimado = false;
      sumarCuotas(s, t, x.cuotas, im.bbva.ym);
    }
    /* Peugeot: si ya estaba cargado (completo o sin monto), queda solo tu mitad. */
    const visa = buscarTarjeta(s, im.peugeot.buscar);
    s.fijos = s.fijos || [];
    const pg = s.fijos.find(y => E.normalizar(y.nombre).includes('peugeot'));
    if (pg) Object.assign(pg, { nombre: im.peugeot.nombre, monto: im.peugeot.monto, medio: visa.id, activo: true });
    else s.fijos.push({ id: E.uid(), nombre: im.peugeot.nombre, monto: im.peugeot.monto, medio: visa.id, desde: im.peugeot.desde, activo: true });
    /* Mercado Pago de octubre: lo pagó tu papá, así que pasa a ser deuda con él. */
    let papa = buscarPapa(s);
    if (!papa) { papa = E.nuevaDeuda(s, { nombre: 'Papá', moneda: 'ARS', monto: 0, fecha: hoy(), nota: '' }); }
    const tmp = buscarTarjeta(s, im.mp.buscar);
    tmp.cierre = im.mp.cierre; tmp.cierreEstimado = false;
    s.resumenes[`${tmp.id}:${im.mp.ym}`] = s.resumenes[`${tmp.id}:${im.mp.ym}`] || {};
    s.resumenes[`${tmp.id}:${im.mp.ym}`].real = im.mp.total;
    E.pagarResumen(s, { cardId: tmp.id, ym: im.mp.ym, monto: im.mp.total, fecha: im.mp.pagado, quien: papa.id, nota: 'Lo pagó tu papá (tus compras)' });
    sumarCuotas(s, tmp, im.mp.cuotas, im.mp.ym);
    E.sumarDeuda(s, { id: papa.id, monto: im.naranja.monto, fecha: hoy(), nota: `Naranja que pagó (${im.naranja.detalle})` });
    s.config.importados = [...(s.config.importados || []).filter(x => x !== im.viejo), im.viejo, im.id, 'papa-solo-lo-mio', 'papa-con-meli'];
    E.tocar(s);
  };

  /* Arriba, la fecha y la frase del día en pills de vidrio. La frase sale de tus números. */
  const saludo = (s, h) => {
    const fr = E.fraseDelDia(s, h, { hora: horaAhora() });
    return `<header class="cab saludo">
        <div>
          <span class="pill vidrio">${esc(E.fechaLarga(h))}</span>
          <p class="pill vidrio frase ${fr.tono}">${esc(fr.texto)}</p>
        </div>
        <button class="icono" data-a="ajustes" aria-label="Ajustes">${icono('ajustes')}</button>
      </header>`;
  };

  const textoBlue = s => {
    const b = s.config.blue;
    if (!b) return 'todavía no pude traerlo';
    return b.fecha === hoy() ? 'actualizado hoy' : `el último que pude traer es del ${E.fechaCorta(b.fecha)}`;
  };

  function vHoy() {
    const s = App.s, h = hoy(), c = E.estadoCobros(s, h), d = E.totalDeudas(s), p = E.podes(s, h), cv = E.comoVas(s, h);
    const prox = E.proximosVencimientos(s, h).slice(0, 2);
    const pieDeben = c.porVencerMes >= 1 ? `+ ${fc(c.porVencerMes)} vence en ${E.mesNombre(p.ym)}` : (c.sinMonto.length ? '+ comisión sin cargar' : 'lo vencido a hoy');
    const conDolares = s.deudas.some(x => x.moneda === 'USD' && E.saldoDeuda(x) >= 1);
    const pieDebes = d.sinMonto.length ? `+ ${esc(d.sinMonto.join(' y '))}, sin monto` : conDolares ? `sin tarjetas · dólar a ${f(E.tcDeuda(s))}` : 'sin contar tarjetas';
    const claseBarra = cv.estado === 'mal' ? 'mal' : cv.estado === 'ojo' ? 'ojo' : '';
    const pillCv = cv.estado === 'bien' ? pill('bien', cv.etiqueta, '✓') : cv.estado === 'ojo' ? pill('ojo', cv.etiqueta, '!') : pill('mal', cv.etiqueta, '×');
    const avisos = [];
    const sinTope = E.topeEsAuto(s) && p.tope < 1;
    if (App.errorGuardado) avisos.push(`<div class="aviso mal"><strong>No se pudo guardar.</strong> Revisá tu conexión y volvé a intentar.</div>`);
    avisos.push(avisoImporte(s), avisoConsumos(s));
    return `
      ${saludo(s, h)}
      ${avisos.join('')}
      <section class="heroe">
        <span class="heroe-et">Hoy podés gastar</span>
        <span class="heroe-num num" data-contar="${Math.round(p.hoy)}">${f(p.hoy)}</span>
        <span class="heroe-pie">${sinTope ? 'Falta saber cuánto cobrás' : `${f(p.mes)} en el mes`}</span>
      </section>
      <nav class="accesos" aria-label="Accesos rápidos">
        <button class="acceso" data-a="ir" data-tab="cargar"><span class="aro">${icono('cargar')}</span>Cargar</button>
        <button class="acceso" data-a="entro"><span class="aro">${icono('plata')}</span>Entró plata</button>
        <button class="acceso" data-a="ir" data-tab="compro"><span class="aro">${icono('compro')}</span>¿Lo compro?</button>
        <button class="acceso" data-a="ir" data-tab="repartir"><span class="aro">${icono('repartir')}</span>Repartir</button>
      </nav>
      <section class="bloque">
        <div class="lista">
          <button class="fila" data-a="ir" data-tab="deudas" data-sub="cobros"><span class="izq"><span class="nom">Te deben</span><span class="chico">${pieDeben}</span></span><span class="der"><span class="num num-fila v-bien">${f(c.vencido)}</span></span></button>
          <button class="fila" data-a="ir" data-tab="deudas" data-sub="deudas"><span class="izq"><span class="nom">Debés</span><span class="chico">${pieDebes}</span></span><span class="der"><span class="num num-fila v-mal">${f(d.ars)}</span></span></button>
        </div>
      </section>
      ${sinTope ? `<section class="bloque">
        <div class="entre"><h2>Cómo vas</h2>${pill('ojo', 'Falta tu tope', '!')}</div>
        <p>No hace falta que sepas tu tope: lo calculo yo con lo que te entra por mes, menos tarjetas y mensuales. Solo decime cuánto cobrás.</p>
        <div class="btns"><button class="btn mini" data-a="ajustes">Poner lo que cobro</button><button class="btn mini" data-a="cobre">Anotar un cobro</button></div>
      </section>` : `<section class="bloque">
        <div class="entre"><h2>Cómo vas</h2>${pillCv}</div>
        <div class="barra ${claseBarra}" role="img" aria-label="Usaste ${Math.round(cv.usado * 100)}% del tope, llevás ${Math.round(cv.ritmo * 100)}% del mes"><span style="width:${Math.min(100, cv.usado * 100).toFixed(1)}%"></span><i style="left:${(cv.ritmo * 100).toFixed(1)}%"></i></div>
        <p>${esc(cv.frase)}${cv.pctNoNecesario != null ? ` El ${cv.pctNoNecesario}% de tus compras no era necesario.` : ''}</p>
        ${E.topeEsAuto(s) ? `<p class="ayuda">Tu tope de ${f(p.tope)} es automático: sale de lo que te entra por mes menos tarjetas. Lo cambiás en Ajustes.</p>` : ''}
      </section>`}
      ${bloqueAnalisisTarjetas(s)}
      <section class="bloque">
        <div class="entre"><h2>Próximo pago</h2><button class="link chico" data-a="ir" data-tab="tarjetas">Ver tarjetas</button></div>
        ${prox.length ? `<div class="lista">${prox.map(r => filaPago(r)).join('')}</div>` : '<p class="sub">No hay pagos cargados.</p>'}
        ${prox.some(r => E.faltaMonto(r)) ? '<p class="ayuda">Cuando sepas el monto, cargalo en Tarjetas.</p>' : ''}
      </section>
      ${vPlan()}
      <section class="bloque">
        <div class="lista">
          <button class="fila" data-a="movimientos"><span class="izq"><span class="nom">Tu plata</span><span class="chico">Ver movimientos</span></span><span class="der"><span class="num num-fila">${f(p.caja)}</span></span></button>
          ${s.ahorro >= 1 ? `<div class="fila"><span class="izq"><span class="nom">Ahorro</span></span><span class="der"><span class="num num-fila">${f(s.ahorro)}</span></span></div>` : ''}
        </div>
      </section>`;
  }

  const filaPago = r => {
    const falta = E.faltaMonto(r);
    return `<button class="fila" data-a="ir" data-tab="tarjetas"><span class="izq"><span class="nom">${punto(r.cardId)}${esc(r.nombre)}</span><span class="chico">${r.vencido ? 'Venció el' : 'Vence'} ${esc(E.textoVence(r))}${r.quien === 'definir' ? ' · falta definir quién paga' : ''}</span></span><span class="der">${falta ? pill('ojo', 'Falta monto', '!') : `<span class="num">${f(r.restante)}</span>`}${r.vencido ? pill('mal', 'Vencido', '×') : (!falta && r.sinResumenReal ? pill('neutro', 'Mínimo') : '')}</span></button>`;
  };

  function vPlan() {
    const s = App.s;
    if (!s.plan) return '';
    const pend = s.plan.lineas.filter(l => !l.hecho && l.asigna >= 1);
    if (!pend.length) return '';
    return `<section class="bloque">
      <div class="entre"><h2>Qué hacer con los ${fc(s.plan.monto)}</h2><button class="link chico" data-a="planCerrar">Cerrar</button></div>
      <div class="lista">${pend.map(l => `<div class="fila"><span class="izq"><span class="nom">${esc(l.nombre)}</span>${l.textoVence ? `<span class="chico">Vence ${esc(l.textoVence)}</span>` : ''}</span><span class="der"><span class="num">${f(l.asigna)}</span><button class="btn mini" data-a="planPagar" data-id="${l.id}">${l.grupo === 'ahorro' ? 'Lo separé' : 'Pagué'}</button></span></div>`).join('')}</div>
    </section>`;
  }

  /* ---------- Cargar ---------- */
  const OPCIONES_MEDIO = s => [...s.tarjetas.map(t => [t.id, t.nombre]), ['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['debito', 'Débito']];
  const textoCuotas = (s, c) => {
    if (B()) {
      const tj = E.tarjeta(s, c.medio);
      if (!tj) return E.fechaLarga(c.fecha);
      return c.cuotas > 1 ? `${c.cuotas} cuotas de ${f(c.monto / c.cuotas)} · ${tj.nombre}` : tj.nombre;
    }
    if (c.cuotas <= 1) return E.nombreMedio(s, c.medio);
    return `${c.cuotas} cuotas de ${f(c.monto / c.cuotas)} · ${E.nombreMedio(s, c.medio)}`;
  };

  function previewCarga() {
    const s = App.s, t = App.texto;
    if (!t.trim()) return B()
      ? '<p class="ayuda">Escribí qué y cuánto. Si fue con tarjeta, sumá las cuotas y cuál: tele 600000 6c visa. La fecha y si era necesario los pongo yo.</p>'
      : '<p class="ayuda">Escribí qué, cuánto, las cuotas si hay, y con qué pagaste. La fecha y si era necesario los pongo yo.</p>';
    const p = parsear(t);
    if (B()) {
      if (!p.nombre || !p.monto) return `<p class="ayuda">Falta ${esc(!p.monto ? 'el monto' : 'qué compraste')}.</p>`;
      if (p.ambiguo) return `<p class="ayuda">Tenés más de una tarjeta con "${esc(p.ambiguo)}". Aclará cuál con el nombre completo.</p>`;
      const tj = p.medio ? E.tarjeta(s, p.medio) : null;
      if (p.cuotas > 1 && !tj) return '<p class="ayuda">Las cuotas van con tarjeta. Elegí cuál abajo.</p>';
      const a = E.clasificar(s, { nombre: p.nombre, monto: p.monto, cuotas: p.cuotas }, hoy(), { hora: horaAhora() });
      let detalle = p.cuotas > 1 ? `${f(p.monto)} en ${p.cuotas} cuotas de ${f(p.monto / p.cuotas)}` : f(p.monto);
      if (tj) detalle += ` · ${tj.nombre} · ${p.cuotas > 1 ? 'primera cuota' : 'se paga'} el ${E.fechaCorta(E.fechaEn(E.primerVencimiento(tj, hoy()), 1))}`;
      else detalle += ' · sale de tu plata';
      return `<div style="display:grid;gap:6px"><span class="nom">${esc(p.nombre)}</span><span class="chico">${esc(detalle)}</span><div class="entre">${pillClase(a.clase)}<span class="chico" style="flex:1 1 60%">${esc(a.motivo)}</span></div></div>`;
    }
    const partes = [];
    if (p.nombre) partes.push(`<span class="nom">${esc(p.nombre)}</span>`);
    let detalle = '';
    if (p.monto) {
      detalle = p.cuotas > 1 ? `${f(p.monto)} en ${p.cuotas} cuotas de ${f(p.monto / p.cuotas)}` : f(p.monto);
      if (p.medio) detalle += ` · ${E.nombreMedio(s, p.medio)}`;
      const tj = p.medio && E.tarjeta(s, p.medio);
      if (tj) {
        const ym = E.primerVencimiento(tj, hoy());
        const r = E.resumen(s, tj.id, ym, hoy());
        detalle += ` · ${p.cuotas > 1 ? 'primera cuota' : 'se paga'} ${E.textoVence(r)}`;
      }
    }
    let analisis = '';
    if (p.nombre && p.monto) {
      const a = E.clasificar(s, { nombre: p.nombre, monto: p.monto, cuotas: p.cuotas }, hoy(), { hora: horaAhora() });
      analisis = `<div class="entre">${pillClase(a.clase)}<span class="chico" style="flex:1 1 60%">${esc(a.motivo)}</span></div>`;
    }
    const falta = p.error ? `<p class="error">${esc(p.error)}</p>` : (p.faltan.length ? `<p class="ayuda">Falta ${esc(p.faltan.join(', '))}.</p>` : '');
    return `<div style="display:grid;gap:6px">${partes.join('')}${detalle ? `<span class="chico">${esc(detalle)}</span>` : ''}${analisis}${falta}</div>`;
  }

  const CATEGORIAS = {
    juegos: 'Videojuego', comics: 'Cómic', musica: 'Música', coleccion: 'Coleccionable', tecnologia: 'Tecnología', hogar: 'Para la casa',
    viajes: 'Viaje', ropa: 'Ropa', comida: 'Comida afuera', delivery: 'Delivery', bebida: 'Bebida', salidas: 'Salida', auto: 'Uber / taxi',
    lectura: 'Libro', suscripcion: 'Suscripción', deporte: 'Deporte', regalo: 'Regalo', apuestas: 'Apuestas', salud: 'Salud', mascotas: 'Mascota',
    estudio: 'Estudio', transporte: 'Transporte', servicio: 'Servicio', cuidado: 'Cuidado personal', belleza: 'Belleza', super: 'Súper',
    online: 'Compra online', hormiga: 'Gasto hormiga', tabaco: 'Tabaco'
  };
  const categoria = c => CATEGORIAS[c.categoria || E.categoria(c.nombre)] || 'Otra cosa';
  const mesFin = ym => (ym.slice(0, 4) === hoy().slice(0, 4) ? E.mesNombre(ym) : `${E.mesCorto(ym)} ${ym.slice(0, 4)}`);

  /* Cómo vas con las tarjetas desde el último cierre: el veredicto, en qué se fue y cuánto pagás. */
  const PLURAL = { delivery: 'pedidos', auto: 'viajes', comida: 'veces', salidas: 'salidas', hormiga: 'veces' };
  function bloqueAnalisisTarjetas(s) {
    const a = E.analisisTarjetas(s, hoy());
    if (!a) return '';
    const k = a.estado === 'mal' ? 'mal' : a.estado === 'ojo' ? 'ojo' : a.estado === 'bien' ? 'bien' : 'neutro';
    const p = k === 'bien' ? pill('bien', 'Vas bien', '✓') : k === 'ojo' ? pill('ojo', 'Vas rápido', '!') : k === 'mal' ? pill('mal', 'Frená', '×') : pill('neutro', `${a.pasaron} de ${a.dias} días`);
    const max = Math.max(1, ...a.enQue.map(x => x.monto));
    const enQue = a.enQue.slice(0, 6).map(x => `<div class="mes-f basico" style="cursor:default;grid-template-columns:118px minmax(0, 1fr) 128px"><span class="m" style="text-transform:none">${esc(CATEGORIAS[x.tipo] || 'Otra cosa')}</span><span class="mes-b"><span style="width:${(x.monto / max * 100).toFixed(1)}%"></span></span><span class="v num">${fc(x.monto)}<span class="chico tercero"> · ${x.veces} ${x.veces === 1 ? 'vez' : (PLURAL[x.tipo] || 'veces')}</span></span></div>`).join('');
    const pagos = a.tarjetas.filter(x => x.pago.restante >= 1).map(x => `<div class="fila"><span class="izq"><span class="nom">${punto(x.id)}${esc(x.nombre)}</span><span class="chico">Vence ${esc(E.textoVence(x.pago))}${x.pago.sinResumenReal ? ' · lo que llevás hasta hoy' : ''}</span></span><span class="der"><span class="num">${f(x.pago.restante)}</span></span></div>`).join('');
    return `<section class="bloque">
        <div class="entre"><h2>Tus tarjetas desde el cierre</h2>${p}</div>
        <div class="veredicto ${k === 'neutro' ? '' : k}" style="padding:12px 14px"><h3 style="font-size:19px">${esc(a.titulo)}</h3><p>${esc(a.detalle)}</p>${a.recortable.length ? `<p class="costo">Lo que más podés cortar: ${esc(a.recortable.map(x => (CATEGORIAS[x.tipo] || x.tipo).toLowerCase()).join(', '))}. Suman ${f(a.recortable.reduce((u, x) => u + x.monto, 0))} en ${a.pasaron} días.</p>` : ''}</div>
        ${a.tope >= 1 ? `<div class="barra ${k === 'mal' ? 'mal' : k === 'ojo' ? 'ojo' : ''}" role="img" aria-label="Usaste ${Math.round(a.gastado / a.tope * 100)}% del tope"><span style="width:${Math.min(100, a.gastado / a.tope * 100).toFixed(1)}%"></span><i style="left:${(a.pasaron / a.dias * 100).toFixed(1)}%"></i></div>` : ''}
        <h2 style="margin-top:4px">En qué se fue</h2>
        <div class="meses">${enQue}</div>
        ${pagos ? `<h2 style="margin-top:4px">Lo que vas a pagar</h2><div class="lista">${pagos}</div>` : ''}
      </section>`;
  }

  /* Cuotas en curso: de la que está más cerca de terminar a la más lejana. En la compu, una tabla ancha. */
  function bloqueCuotas(s) {
    const lista = s.compras.map(c => ({ c, e: E.estadoCuotas(s, c, hoy()) })).filter(x => x.e && x.e.quedan > 0)
      .sort((a, b) => (a.e.termina < b.e.termina ? -1 : a.e.termina > b.e.termina ? 1 : a.e.quedan - b.e.quedan));
    if (!lista.length) return '';
    const porMes = lista.reduce((t, x) => t + x.e.porCuota, 0);
    const quedan = q => (q === 1 ? 'Última' : `Quedan ${q}`);
    const filas = lista.map(({ c, e }) => `<tr data-a="compra" data-id="${c.id}">
        <td><span class="nom">${punto(c.medio)}${esc(c.nombre)}</span></td><td>${esc(categoria(c))}</td><td>${esc(e.tarjeta)}</td>
        <td class="num">${f(e.porCuota)}</td><td class="num">${f(e.total)}</td><td>${e.pagadas} de ${e.cuotas} · ${quedan(e.quedan)}</td><td>${esc(mesFin(e.termina))}</td></tr>`).join('');
    const celu = lista.map(({ c, e }) => `<button class="fila" data-a="compra" data-id="${c.id}">
        <span class="izq"><span class="nom">${punto(c.medio)}${esc(c.nombre)}</span><span class="chico">${esc(categoria(c))} · ${esc(e.tarjeta)}</span><span class="chico">${quedan(e.quedan)}${e.quedan > 1 ? ' cuotas' : ' cuota'} · termina en ${esc(mesFin(e.termina))}</span></span>
        <span class="der"><span class="num">${f(e.porCuota)}<span class="chico tercero"> /mes</span></span><span class="chico">Total ${f(e.total)}</span></span></button>`).join('');
    return `<section class="bloque ancho">
        <div class="entre"><h2>Cuotas en curso</h2><span class="chico">${lista.length} compras · ${f(porMes)} por mes</span></div>
        <div class="lista solo-celu">${celu}</div>
        <table class="tabla tabla-cuotas solo-ancha"><thead><tr><th>Compra</th><th>Qué es</th><th>Tarjeta</th><th>Por cuota</th><th>Total</th><th>Cuotas</th><th>Termina</th></tr></thead><tbody>${filas}</tbody></table>
      </section>`;
  }

  const filaCompra = c => {
    const s = App.s;
    const duda = c.fuente === 'duda';
    return `<div class="fila" style="align-items:flex-start">
      <button class="izq link-fila" data-a="compra" data-id="${c.id}" style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit">
        <span class="nom">${esc(c.nombre)}</span>
        <span class="chico">${esc(categoria(c))} · ${esc(textoCuotas(s, c))}</span>
      </button>
      <span class="der"><span class="num">${f(c.monto)}</span>${pillClase(c.clase)}</span>
    </div>${duda ? `<div class="chips" style="padding-bottom:8px"><span class="chico" style="align-self:center">¿Qué fue?</span>${Object.entries(CLASES).map(([k, v]) => `<button class="chip" data-a="marcarClase" data-id="${c.id}" data-clase="${k}">${v.t}</button>`).join('')}</div>` : ''}`;
  };

  function vCargar() {
    const s = App.s, h = hoy();
    const enCurso = new Set(s.compras.filter(c => { const e = E.estadoCuotas(s, c, h); return e && e.quedan > 0; }).map(c => c.id));
    const compras = [...s.compras].filter(c => !enCurso.has(c.id)).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 60);
    const grupos = [];
    for (const c of compras) {
      const titulo = c.fecha === h ? 'Hoy' : c.fecha === E.sumarDias(h, -1) ? 'Ayer' : (c.fuente === 'notion' ? 'Cuotas que traje de tu Notion' : c.fuente === 'resumen' ? 'Cuotas de tus resúmenes' : E.fechaLarga(c.fecha));
      let g = grupos[grupos.length - 1];
      if (!g || g.titulo !== titulo) { g = { titulo, items: [] }; grupos.push(g); }
      g.items.push(c);
    }
    const p = E.parsearCompra(App.texto);
    return `
      <header class="cab"><div><h1>Cargar</h1></div></header>
      <form class="bloque" data-form="cargar" autocomplete="off">
        <div class="campo">
          <label for="cargar-texto">¿Qué compraste?</label>
          <input id="cargar-texto" type="text" value="${esc(App.texto)}" placeholder="televisor 1.580.000 6c mercado pago" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
        </div>
        <div id="cargar-vista">${previewCarga()}</div>
        <div class="chips" role="group" aria-label="Con qué pagaste">${OPCIONES_MEDIO(s).map(([id, n]) => `<button type="button" class="chip ${p.medio === id ? 'on' : ''}" data-a="poneMedio" data-id="${id}">${esc(n)}</button>`).join('')}</div>
        <button class="btn prim lleno">Guardar</button>
      </form>
      ${bloqueCuotas(s)}
      ${grupos.length ? grupos.map(g => `<h2 class="grupo">${esc(g.titulo)}</h2><section class="bloque"><div class="lista">${g.items.map(filaCompra).join('')}</div></section>`).join('') : (enCurso.size ? '' : '<p class="sub">Cuando guardes una compra, aparece acá.</p>')}`;
  }

  function hojaCompra(id) {
    const s = App.s, c = s.compras.find(x => x.id === id);
    if (!c) return;
    abrirHoja('Editar compra', `<form data-form="editarCompra" data-id="${c.id}">
      ${campo('c-nombre', 'Qué fue', c.nombre)}
      <div class="fila-campos">${campo('c-monto', 'Monto total', redondo(c.monto), { modo: 'decimal' })}${campo('c-cuotas', 'Cuotas', c.cuotas, { modo: 'numeric' })}</div>
      <div class="campo"><label for="c-medio">Con qué pagaste</label><select id="c-medio" name="c-medio">${OPCIONES_MEDIO(s).map(([v, t]) => `<option value="${v}" ${v === c.medio ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      ${B() ? campo('c-pagadas', 'Cuotas que ya pagaste', c.pagadas || 0, { modo: 'numeric', ayuda: 'Para compras que ya venías pagando: si vas por la 3 de 6, poné 2.' }) : ''}
      ${campo('c-fecha', 'Fecha', c.fecha, { tipo: 'date' })}
      <div class="campo"><label for="c-categoria">Qué es</label><select id="c-categoria" name="c-categoria"><option value="">${esc(CATEGORIAS[E.categoria(c.nombre)] ? `Automático: ${CATEGORIAS[E.categoria(c.nombre)]}` : 'Otra cosa')}</option>${Object.entries(CATEGORIAS).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}" ${c.categoria === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
      <div class="campo"><span class="et-campo">¿Era necesario?</span>${chips('c-clase', Object.entries(CLASES).map(([k, v]) => [k, v.t]), c.clase)}<span class="ayuda">${esc(c.motivo || '')}</span></div>
      <button class="btn prim lleno">Guardar cambios</button>
      <button type="button" class="btn peligro lleno" data-a="borrarCompra" data-id="${c.id}">Borrar compra</button>
    </form>`);
  }

  /* ---------- Tarjetas ---------- */
  function vTarjetas() {
    const s = App.s, h = hoy(), meses = E.mesesTarjetas(s, h, 6), proy = E.proyectar(s, { hoy: h }), fin = E.mesSinDeudas(proy);
    const max = Math.max(1, ...meses.map(m => m.total));
    const ing = E.ingresoPrudente(s, h).monto;
    const margenes = meses.filter(m => m.margen != null);
    const libre = meses.slice(1, 4).map(m => m.libre);
    const libreMin = libre.length ? Math.min(...libre) : 0;
    let frase;
    if (libreMin >= 1) frase = `Tenés margen: hasta ${f(libreMin)} por mes en cuotas sin frenar tus deudas.`;
    else if (fin && fin !== 'nunca') frase = `Hoy no conviene sumar cuotas: hasta ${E.mesAnio(fin)} lo que te sobra va a deudas. Cada cuota nueva atrasa esa fecha.`;
    else if (fin === 'nunca') frase = 'Hoy no te dan los números para sumar cuotas: lo que entra no alcanza a cubrir tarjetas y deudas.';
    else frase = 'Todavía no tenés margen para sumar cuotas.';
    const filas = meses.map(m => {
      const ab = App.abiertos.has('mes-' + m.ym);
      const margen = m.margen == null ? '<span class="tercero">–</span>' : `<span class="${m.margen < 0 ? 'v-mal' : ''}">${fc(m.margen)}</span>`;
      const faltan = s.tarjetas.filter(t => { const r = E.proximoDeTarjeta(s, t.id, h); return r.ym === m.ym && E.faltaMonto(r); }).map(t => t.id);
      const valor = faltan.length ? (m.total >= 1 ? `${fc(m.total)} <span class="v-ojo">+?</span>` : '<span class="v-ojo">Falta</span>') : fc(m.total);
      return `<button class="mes-f" data-a="toggle" data-id="mes-${m.ym}" aria-expanded="${ab}"><span class="m">${esc(E.mesCorto(m.ym))}</span><span class="mes-b"><span style="width:${(m.total / max * 100).toFixed(1)}%"></span></span><span class="v num">${valor}</span><span class="v num">${margen}</span></button>
      ${ab ? `<div class="mes-d">${m.porTarjeta.map(x => `<div><span>${esc(x.nombre)}${x.pagado >= 1 && x.restante < 1 ? ' (pagada)' : ''}</span>${faltan.includes(x.id) ? '<span class="v-ojo">Falta monto</span>' : `<span class="num">${f(x.restante)}</span>`}</div>`).join('')}</div>` : ''}`;
    }).join('');
    const hayMinimos = s.tarjetas.some(t => E.proximoDeTarjeta(s, t.id, h).sinResumenReal);
    return `
      <header class="cab"><div><h1>Tarjetas</h1></div></header>
      ${bloqueAnalisisTarjetas(s)}
      <section class="bloque">
        <h2>Lo que ya tenés comprometido</h2>
        <div class="meses">
          <div class="mes-f cab-m"><span>Mes</span><span></span><span class="v">Tarjetas</span><span class="v">Te queda</span></div>
          ${filas}
        </div>
        <p>${esc(frase)}</p>
        <p class="ayuda">"Te queda" es lo que te entra por mes (${fc(ing)}) menos tarjetas y tu tope para vivir.</p>
      </section>
      ${hayMinimos ? '<div class="aviso">No cargué consumos viejos. Estos montos solo incluyen lo que cargues desde ahora y tus mensuales. Tocá "Datos del resumen" para poner el monto real de cada tarjeta.</div>' : ''}
      ${s.tarjetas.map(t => bloqueTarjeta(t, h)).join('')}`;
  }

  function bloqueTarjeta(t, h) {
    const s = App.s, r = E.proximoDeTarjeta(s, t.id, h), ab = App.abiertos.has('t-' + t.id);
    let estado;
    if (r.vencido) estado = pill('mal', 'Vencida', '×');
    else if (r.estado === 'parcial') estado = pill('ojo', 'Pago parcial', '!');
    else if (r.estado === 'pendiente') estado = r.sinResumenReal ? pill('neutro', 'Mínimo conocido') : pill('azul', 'Monto real');
    else if (E.faltaMonto(r)) estado = pill('ojo', 'Falta monto', '!');
    else estado = pill('bien', 'Sin pagos pendientes', '✓');
    const falta = E.faltaMonto(r);
    const siguientes = [1, 2, 3, 4].map(i => { const ym = E.sumarMes(r.ym, i); return { ym, r: E.resumen(s, t.id, ym, h) }; });
    const pagos = Object.keys(s.resumenes).filter(k => k.startsWith(t.id + ':')).flatMap(k => (s.resumenes[k].pagos || []).map(p => ({ ...p, key: k }))).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5);
    const nombrePagador = q => (q === 'yo' ? 'vos' : E.nombreDeuda(s, q));
    return `<section class="bloque">
      <div class="entre"><h3>${punto(t.id)}${esc(t.nombre)}</h3>${estado}</div>
      <div class="entre" style="align-items:flex-end"><div><span class="num grande">${falta ? 'Sin monto' : f(r.restante)}</span></div><span class="chico">${r.restante >= 1 || falta ? `${r.vencido ? 'Venció' : 'Vence'} ${esc(E.textoVence(r))}` : 'Nada por pagar'}</span></div>
      ${r.estado === 'parcial' ? `<p class="chico">Ya pagaste ${f(r.pagado)} de ${f(r.total)}.</p>` : ''}
      ${r.quien === 'definir' && (r.restante >= 1 || falta) ? '<p class="chico">Todavía no está definido quién la paga. No la resto de tu plata.</p>' : ''}
      <div class="btns">
        <button class="btn" data-a="pagar" data-card="${t.id}" data-ym="${r.ym}">Ya pagué</button>
        <button class="btn" data-a="datosResumen" data-card="${t.id}" data-ym="${r.ym}">Datos del resumen</button>
      </div>
      <button class="link chico" data-a="toggle" data-id="t-${t.id}" aria-expanded="${ab}">${ab ? 'Ocultar detalle' : 'Ver qué incluye y los próximos meses'}</button>
      ${ab ? `
        <div class="lista">${r.items.length ? r.items.map(i => `<div class="fila"><span class="izq"><span>${esc(i.nombre)}</span><span class="chico">${i.tipo === 'cuota' ? `Cuota ${i.n} de ${i.de}` : i.tipo === 'fijo' ? 'Todos los meses' : 'Un pago'}</span></span><span class="der"><span class="num">${f(i.monto)}</span></span></div>`).join('') : '<p class="chico">Todavía no hay nada cargado en este resumen.</p>'}</div>
        <div><h2 style="margin-bottom:4px">Próximos meses</h2>${siguientes.map(x => `<div class="entre chico"><span style="text-transform:capitalize">${esc(E.mesNombre(x.ym))}</span><span class="num">${f(x.r.restante)}</span></div>`).join('')}</div>
        ${pagos.length ? `<div><h2 style="margin-bottom:4px">Últimos pagos</h2><div class="lista">${pagos.map(p => `<div class="fila"><span class="izq"><span class="chico">${E.fechaCorta(p.fecha)} · pagó ${esc(nombrePagador(p.quien))}${p.nota ? ` · ${esc(p.nota)}` : ''}</span></span><span class="der"><span class="num">${f(p.monto)}</span><button class="link chico" data-a="borrarPago" data-key="${p.key}" data-id="${p.id}">Borrar</button></span></div>`).join('')}</div></div>` : ''}
        <p class="ayuda">Cierre ${t.cierreEstimado ? 'estimado' : ''}: día ${t.cierre}. Cambialo en Ajustes cuando lo veas en el resumen.</p>
      ` : ''}
    </section>`;
  }

  function hojaPagar(cardId, ym, lineaId = '', pref = null) {
    const s = App.s, r = E.resumen(s, cardId, ym, hoy());
    const quienes = [['yo', 'Yo'], ...E.deudasOrdenadas(s).map(d => [d.id, d.nombre])];
    const monto = pref != null ? redondo(pref) : (r.restante >= 1 ? redondo(r.restante) : '');
    abrirHoja(`Pagaste ${r.nombre}`, `<form data-form="pagar" data-card="${cardId}" data-ym="${ym}" data-linea="${lineaId}" data-resto="${r.restante}" data-real="${r.sinResumenReal ? 0 : 1}">
      ${campo('p-monto', '¿Cuánto pagaste?', monto, { modo: 'decimal' })}
      <p class="ayuda" id="p-queda"></p>
      ${campo('p-fecha', '¿Cuándo?', hoy(), { tipo: 'date' })}
      ${quienes.length > 1 ? `<div class="campo"><span class="et-campo">¿Quién pagó?</span>${chips('p-quien', quienes, 'yo')}<span class="ayuda" id="p-quien-ayuda">Sale de tu plata.</span></div>` : '<input type="hidden" name="p-quien" value="yo"><p class="ayuda">Sale de tu plata.</p>'}
      ${campo('p-nota', 'Nota (opcional)', '')}
      <button class="btn prim lleno">Guardar pago</button>
    </form>`, `Resumen de ${esc(E.mesNombre(ym))}: ${E.faltaMonto(r) ? 'todavía sin monto' : `quedan ${f(r.restante)}${r.sinResumenReal && !B() ? ' (mínimo)' : ''}`}`);
    actualizarQueda();
  }

  function actualizarQueda() {
    const form = document.querySelector('form[data-form="pagar"]');
    if (!form) return;
    const monto = E.parsearMonto(form.elements['p-monto'].value) || 0;
    const resto = Number(form.dataset.resto);
    const q = resto - monto;
    $('p-queda').textContent = !monto ? '' : q >= 1 ? `Queda pendiente ${f(q)} de esta tarjeta.` : (q <= -1 && form.dataset.real === '0' ? 'Tomo este monto como el total del resumen. Si era más, cargalo en Datos del resumen.' : 'Queda saldada.');
    const quien = form.elements['p-quien'].value;
    const ayudaQuien = $('p-quien-ayuda');
    if (ayudaQuien) ayudaQuien.textContent = quien === 'yo' ? 'Sale de tu plata.' : `Se suma a tu deuda con ${E.nombreDeuda(App.s, quien)}.`;
  }

  function hojaDatosResumen(cardId, ym) {
    const s = App.s, r = E.resumen(s, cardId, ym, hoy());
    abrirHoja(`${r.nombre}: ${E.mesNombre(ym)}`, `<form data-form="datosResumen" data-card="${cardId}" data-ym="${ym}">
      ${campo('r-real', 'Monto real del resumen', r.real == null ? '' : redondo(r.real), { modo: 'decimal', ph: `Conocido: ${f(r.calculado)}`, ayuda: 'Dejalo vacío si todavía no lo tenés.' })}
      ${campo('r-vence', 'Vence el', r.vence, { tipo: 'date' })}
      <div class="campo"><span class="et-campo">¿Quién la paga?</span>${chips('r-quien', [['yo', 'Yo'], ['definir', 'A definir']], r.quien)}<span class="ayuda">"A definir" no la resta de tu plata hasta que se sepa.</span></div>
      <button class="btn prim lleno">Guardar</button>
    </form>`);
  }

  /* ---------- Deudas y cobros ---------- */
  function vDeudas() {
    const seg = `<div class="seg" role="tablist"><button role="tab" aria-selected="${App.sub === 'deudas'}" class="${App.sub === 'deudas' ? 'on' : ''}" data-a="sub" data-sub="deudas">Deudas</button><button role="tab" aria-selected="${App.sub === 'cobros'}" class="${App.sub === 'cobros' ? 'on' : ''}" data-a="sub" data-sub="cobros">Cobros</button></div>`;
    return `<header class="cab"><div><h1>${App.sub === 'deudas' ? 'Lo que debés' : 'Lo que te deben'}</h1></div></header>
      ${seg}${App.sub === 'deudas' ? vListaDeudas() : vCobros()}`;
  }

  function vListaDeudas() {
    const s = App.s, h = hoy(), t = E.totalDeudas(s), proy = E.proyectar(s, { hoy: h }), fin = E.mesSinDeudas(proy), ing = E.ingresoPrudente(s, h).monto;
    const lista = E.deudasOrdenadas(s).filter(d => d.movs.length);
    const frase = fin === 'nunca' ? 'Con lo que te entra por mes, hoy no llegás a cerrarlas.' : fin ? `Con lo que te entra por mes (${fc(ing)}), terminás de pagar en ${E.mesAnio(fin)}.` : 'No tenés deudas cargadas.';
    return `<section class="bloque">
        <h2>Total</h2>
        <p><span class="num grande v-mal">${f(t.ars)}</span></p>
        ${t.sinMonto.length ? `<p class="chico">Más lo de ${esc(t.sinMonto.join(' y '))}: falta el monto.</p>` : ''}
        <p>${esc(frase)}</p>
        <p class="ayuda">Si una deuda crece, tocá "Sumar". Si tu papá u otra persona paga una tarjeta, se suma sola al registrar ese pago.</p>
      </section>
      ${lista.map((d, i) => bloqueDeuda(d, i, lista.length)).join('')}
      <button class="btn lleno" data-a="nuevaDeuda">Agregar otra deuda</button>`;
  }

  function bloqueDeuda(d, i, n) {
    const s = App.s, saldo = E.saldoDeuda(d), sinMonto = E.sinMontoDeuda(d), ab = App.abiertos.has('d-' + d.id);
    const usd = d.moneda === 'USD';
    const movs = [...d.movs].reverse();
    return `<section class="bloque">
      <div class="entre"><h3>${esc(d.nombre)}</h3><div class="btns" style="flex-wrap:nowrap">
        <button class="icono mini" data-a="moverDeuda" data-id="${d.id}" data-dir="-1" aria-label="Subir prioridad" ${i === 0 ? 'disabled' : ''}>${icono('arriba')}</button>
        <button class="icono mini" data-a="moverDeuda" data-id="${d.id}" data-dir="1" aria-label="Bajar prioridad" ${i === n - 1 ? 'disabled' : ''}>${icono('abajo')}</button>
      </div></div>
      <div class="entre"><span class="num grande">${saldo < 1 && sinMonto.length ? 'Sin monto' : usd ? E.fmtUSD(saldo) : f(saldo)}</span>${usd ? `<span class="chico">≈ ${f(E.deudaEnARS(s, d))} al ${s.config.tcManual != null ? 'dólar' : 'blue'} de ${f(E.tcDeuda(s))}</span>` : ''}</div>
      ${sinMonto.map(m => `<div class="fila" style="padding-block:4px;border:0"><span class="izq"><span>${esc(m.nota || 'Sin detalle')}</span></span><span class="der"><button class="btn mini" data-a="ponerMonto" data-deuda="${d.id}" data-id="${m.id}">Poner monto</button></span></div>`).join('')}
      <div class="btns"><button class="btn" data-a="pagarDeuda" data-id="${d.id}">Pagué</button><button class="btn" data-a="sumarDeuda" data-id="${d.id}">Sumar</button></div>
      <button class="link chico" data-a="toggle" data-id="d-${d.id}" aria-expanded="${ab}">${ab ? 'Ocultar historial' : 'Ver historial'}</button>
      ${ab ? `<div class="lista">${movs.map(m => `<div class="fila"><span class="izq"><span class="chico">${m.fecha ? E.fechaCorta(m.fecha) : 'Sin fecha'} · ${m.tipo === 'pago' ? 'Pagaste' : m.tipo === 'suma' ? 'Se sumó' : 'Inicial'}${m.nota ? ` · ${esc(m.nota)}` : ''}</span></span><span class="der"><span class="num ${m.tipo === 'pago' ? 'v-bien' : ''}">${m.monto == null ? 'sin monto' : (m.tipo === 'pago' ? '-' : '+') + (usd ? E.fmtUSD(m.monto) : f(m.monto))}</span><button class="link chico" data-a="borrarMovDeuda" data-deuda="${d.id}" data-id="${m.id}">Borrar</button></span></div>`).join('')}</div>` : ''}
    </section>`;
  }

  function hojaPagarDeuda(id, lineaId = '', pref = null) {
    const s = App.s, d = s.deudas.find(x => x.id === id), usd = d.moneda === 'USD';
    abrirHoja(`Le pagaste a ${d.nombre}`, `<form data-form="pagarDeuda" data-id="${id}" data-linea="${lineaId}">
      ${campo('dp-monto', '¿Cuánto?', pref != null ? redondo(pref) : '', { modo: 'decimal', ph: usd ? '300' : '500.000' })}
      ${usd ? `<div class="campo"><span class="et-campo">Moneda</span>${chips('dp-moneda', [['USD', 'Dólares'], ['ARS', 'Pesos']], 'USD')}<span class="ayuda">En pesos lo convierto a ${f(E.tcDeuda(s))} por dólar.</span></div>` : '<input type="hidden" name="dp-moneda" value="ARS">'}
      ${campo('dp-fecha', '¿Cuándo?', hoy(), { tipo: 'date' })}
      ${campo('dp-nota', 'Nota (opcional)', '')}
      <button class="btn prim lleno">Guardar pago</button>
    </form>`, `Le debés ${usd ? E.fmtUSD(E.saldoDeuda(d)) : f(E.saldoDeuda(d))}`);
  }

  function hojaSumarDeuda(id) {
    const s = App.s, d = s.deudas.find(x => x.id === id), usd = d.moneda === 'USD';
    abrirHoja(`Sumar a ${d.nombre}`, `<form data-form="sumarDeuda" data-id="${id}">
      ${campo('ds-monto', `¿Cuánto se suma${usd ? ' en dólares' : ''}?`, '', { modo: 'decimal' })}
      ${campo('ds-fecha', '¿Cuándo?', hoy(), { tipo: 'date' })}
      ${campo('ds-nota', '¿Por qué?', '', { ph: 'Me prestó para la tarjeta' })}
      <label class="check"><input type="checkbox" name="ds-entro"> Esa plata entró a mi bolsillo</label>
      <button class="btn prim lleno">Sumar</button>
    </form>`);
  }

  function vCobros() {
    const s = App.s, h = hoy(), c = E.estadoCobros(s, h);
    const filaItem = i => {
      const vencio = i.vence <= h;
      const est = i.sinMonto ? pill('ojo', 'Falta monto', '!') : i.estado === 'estimado' ? pill('neutro', 'Estimado') : pill('azul', 'Confirmado');
      return `<button class="fila" data-a="cobro" data-id="${i.id}"><span class="izq"><span class="nom">${esc(i.concepto)}</span><span class="chico">${vencio ? 'Venció' : 'Vence'} ${E.fechaCorta(i.vence)}${i.cobrado >= 1 && !i.sinMonto ? ` · ya cobraste ${f(i.cobrado)}` : ''}</span></span><span class="der"><span class="num">${i.sinMonto ? 'sin monto' : f(i.pendiente)}</span>${est}</span></button>`;
    };
    const pagos = [...s.cobros.pagos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    const ab = App.abiertos.has('cobrado');
    return `<section class="bloque">
        <h2>Vencido a hoy</h2>
        <p><span class="num grande v-bien">${f(c.vencido)}</span></p>
        ${c.porVencer >= 1 ? `<p class="chico">Y vence ${f(c.porVencer)} más.</p>` : ''}
        ${c.estimado >= 1 ? `<p class="chico">De todo esto, ${f(c.estimado)} es estimado por vos: todavía no te lo confirmaron.</p>` : ''}
        <button class="btn prim lleno" data-a="cobre">Cobré</button>
        <div class="btns"><button class="btn" data-a="sumarSueldo">Sumar sueldo</button><button class="btn" data-a="sumarComision">Sumar comisión</button></div>
        <button class="link chico" data-a="sumarCobro">Sumar otra cosa</button>
        <p class="ayuda">Solo crece cuando tocás un botón. El monto lo decidís vos cada vez.</p>
      </section>
      <section class="bloque"><h2>Qué te deben y por qué</h2><div class="lista">${c.pend.map(filaItem).join('') || '<p class="sub">No te deben nada.</p>'}</div></section>
      <section class="bloque">
        <div class="entre"><h2>Lo que ya cobraste</h2><button class="link chico" data-a="toggle" data-id="cobrado" aria-expanded="${ab}">${ab ? 'Ocultar' : `Ver ${pagos.length}`}</button></div>
        ${ab ? `<div class="lista">${pagos.map(p => `<div class="fila"><span class="izq"><span class="chico">${E.fechaCorta(p.fecha)}${p.nota ? ` · ${esc(p.nota)}` : ''}</span></span><span class="der"><span class="num">${f(p.monto)}</span><button class="link chico" data-a="borrarCobro" data-id="${p.id}">Borrar</button></span></div>`).join('')}</div>` : ''}
      </section>`;
  }

  function hojaSumarMes(tipo) {
    const p = E.propuestaCobro(App.s, tipo), esCom = tipo === 'comision';
    abrirHoja(esCom ? 'Sumar comisión' : 'Sumar sueldo', `<form data-form="sumarMes" data-tipo="${tipo}" data-periodo="${p.periodo}">
      ${campo('sm-concepto', '¿De qué mes?', p.concepto)}
      ${esCom ? `${campo('cb-ventas', 'Ventas del mes en dólares (opcional)', '', { modo: 'decimal', ph: '13631,50' })}<p class="ayuda" id="cb-calculo"></p><button type="button" class="btn mini" data-a="usarCalculo">Usar este cálculo</button>` : ''}
      ${campo('cb-monto', '¿Cuánto?', p.monto == null ? '' : redondo(p.monto), { modo: 'decimal', ayuda: esCom ? '' : 'Es el último sueldo que cargaste. Cambialo si te lo modificaron.' })}
      ${campo('sm-vence', 'Vence', p.vence, { tipo: 'date' })}
      <div class="campo"><span class="et-campo">¿Te lo confirmaron?</span>${chips('sm-estado', [['estimado', 'Es mi cálculo'], ['confirmado', 'Me lo confirmaron']], esCom ? 'estimado' : 'confirmado')}</div>
      <button class="btn prim lleno">Sumar a lo que me deben</button>
    </form>`);
    if (esCom) actualizarCalculo();
  }

  function hojaCobro(id) {
    const s = App.s, i = s.cobros.items.find(x => x.id === id);
    if (!i) return;
    const esCom = i.tipo === 'comision';
    abrirHoja(i.concepto, `<form data-form="cobro" data-id="${i.id}">
      ${esCom ? `${campo('cb-ventas', 'Ventas del mes en dólares', i.ventasUSD == null ? '' : i.ventasUSD, { modo: 'decimal', ph: '13631,50' })}<p class="ayuda" id="cb-calculo"></p><button type="button" class="btn mini" data-a="usarCalculo">Usar este cálculo</button>` : ''}
      ${campo('cb-monto', 'Lo que te tienen que pagar', i.monto == null ? '' : redondo(i.monto), { modo: 'decimal' })}
      <div class="campo"><span class="et-campo">¿Te lo confirmaron?</span>${chips('cb-estado', [['estimado', 'Es mi cálculo'], ['confirmado', 'Me lo confirmaron']], i.estado === 'confirmado' ? 'confirmado' : 'estimado')}</div>
      ${campo('cb-motivo', 'Si cambió el monto, ¿por qué?', '', { ph: 'Me descontaron ventas' })}
      ${campo('cb-vence', 'Vence', i.vence, { tipo: 'date' })}
      ${(i.ajustes || []).length ? `<div><h2 style="margin-bottom:4px">Cambios</h2>${i.ajustes.map(a => `<p class="chico">${E.fechaCorta(a.fecha)}: de ${f(a.de)} a ${f(a.a)}${a.motivo ? `. ${esc(a.motivo)}` : ''}</p>`).join('')}</div>` : ''}
      <button class="btn prim lleno">Guardar</button>
      ${i.tipo === 'otro' ? `<button type="button" class="btn peligro lleno" data-a="borrarCobroItem" data-id="${i.id}">Borrar</button>` : ''}
    </form>`);
    if (esCom) actualizarCalculo();
  }

  function actualizarCalculo() {
    const el = $('cb-calculo'), inp = $('cb-ventas');
    if (!el || !inp) return null;
    const v = E.parsearMonto(inp.value);
    if (!v) { el.textContent = 'Lo calculo con tus niveles: 15% menos y 10, 12 o 14% según lo vendido.'; return null; }
    const c = E.comision(App.s, v);
    el.textContent = c.pct ? `Nivel ${c.nivel}, ${Math.round(c.pct * 100)}%: USD ${Math.round(c.usd)} = ${f(c.ars)} a ${f(App.s.config.tc)} por dólar.` : 'No llega al nivel 1: sin comisión.';
    return c;
  }

  /* ---------- ¿Lo compro? ---------- */
  const OPCIONES_CUOTAS = [1, 3, 6, 12];
  const PLAN_VACIO = () => ({ cuotas: 1, interes: 'sin', valor: '', deTexto: false });

  const selectorPlan = () => {
    const pl = App.plan;
    const ops = OPCIONES_CUOTAS.includes(pl.cuotas) ? OPCIONES_CUOTAS : [...OPCIONES_CUOTAS, pl.cuotas].sort((a, b) => a - b);
    return `<div class="campo"><span class="et-campo">¿Cómo lo pagarías?</span>
        <div class="chips" role="group" aria-label="Forma de pago">${ops.map(n => `<button type="button" class="chip ${n === pl.cuotas ? 'on' : ''}" aria-pressed="${n === pl.cuotas}" data-a="planCuotas" data-n="${n}">${n === 1 ? '1 pago' : `${n} cuotas`}</button>`).join('')}</div>
      </div>
      ${pl.cuotas > 1 ? `<div class="seg" role="group" aria-label="Interés">
        <button type="button" class="${pl.interes === 'sin' ? 'on' : ''}" aria-pressed="${pl.interes === 'sin'}" data-a="planInteres" data-v="sin">Sin interés</button>
        <button type="button" class="${pl.interes === 'con' ? 'on' : ''}" aria-pressed="${pl.interes === 'con'}" data-a="planInteres" data-v="con">Con interés</button>
      </div>` : ''}
      ${pl.cuotas > 1 && pl.interes === 'con' ? campo('compro-cuota', '¿Cuánto sale cada cuota?', pl.valor, { modo: 'decimal', ph: '70.000', ayuda: 'Es lo que te muestra la tienda. Con eso calculo cuánto pagás de más.' }) : ''}`;
  };

  const planDeCompro = () => {
    const p = parsear(App.compro), pl = App.plan;
    const precio = p.precio != null ? p.precio : (p.valorCuota && pl.interes === 'con' ? null : p.monto);
    return { p, plan: E.armarPlan({ precio, cuotas: pl.cuotas, interes: pl.interes, valorCuota: E.parsearMonto(pl.valor) }) };
  };

  const formCompro = ejemplo => `<form class="bloque" data-form="compro" autocomplete="off">
        <div class="campo"><label for="compro-texto">¿Qué querés comprar y cuánto sale?</label><input id="compro-texto" type="text" value="${esc(App.compro)}" placeholder="${ejemplo}" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go"></div>
        <div id="compro-plan" style="display:grid;gap:10px">${selectorPlan()}</div>
        <button class="btn prim lleno">Decime si puedo</button>
      </form>`;

  const faltaCompro = (plan, ejemplo) => (plan.falta === 'cuota'
    ? '<p class="error">Decime cuánto sale cada cuota.</p>'
    : `<p class="error">Decime cuánto sale. Por ejemplo: ${ejemplo}</p>`);

  /* Si escribís con qué tarjeta, te digo cuándo cierra, cuándo pagás la primera cuota y cómo quedan esos resúmenes. */
  const bloqueConTarjeta = (s, p, plan, h) => {
    if (!p.medio || !E.esTarjeta(s, p.medio)) {
      if (!s.tarjetas.length || (p.medio && !E.esTarjeta(s, p.medio))) return '';
      const ej = `${(p.nombre || 'zelda').toLowerCase()} ${Math.round(plan.precio || plan.total || 164000)}${plan.n > 1 ? ` ${plan.n}c` : ''} ${s.tarjetas[0].nombre.toLowerCase()}`;
      return `<p class="ayuda">Sumá la tarjeta al final (por ejemplo: ${esc(ej)}) y te digo cuándo pagás la primera cuota.</p>`;
    }
    const n = plan.n, cuota = plan.cuota || plan.total;
    const c = E.cuandoPagas(s, p.medio, n, cuota, h);
    if (!c) return '';
    const mes = ym => E.mesNombre(ym);
    const frase = n > 1
      ? `La primera cuota de ${f(cuota)} la pagás el ${c.primero.texto}, con el resumen de ${mes(c.primero.ym)}. La última, en ${E.mesAnio(c.ultimo.ym)}.`
      : `La pagás el ${c.primero.texto}, con el resumen de ${mes(c.primero.ym)}.`;
    const filas = c.meses.slice(0, 6).map((m, i) => `<div class="fila"><span class="izq"><span class="nom">${n > 1 ? `Cuota ${i + 1} · ` : ''}${esc(mes(m.ym))}</span><span class="chico">Vence ${esc(m.texto)} · ${m.antes >= 1 ? `ya tenías ${f(m.antes)}` : 'no tenías nada'}${m.sinReal && m.antes >= 1 ? ' (sin resumen real)' : ''}</span></span><span class="der"><span class="num">${f(m.con)}</span></span></div>`).join('');
    const mas = c.meses.length > 6 ? `<p class="chico">Y ${c.meses.length - 6} cuotas más, hasta ${esc(E.mesAnio(c.ultimo.ym))}.</p>` : '';
    return `<section class="bloque">
        <div class="entre"><h2>${punto(p.medio)}Con ${esc(c.tarjeta.nombre)}</h2>${pill('azul', `Cierra el ${E.fechaCorta(c.cierre)}`)}</div>
        <p>${esc(frase)}</p>
        <div class="lista">${filas}</div>
        ${mas}
        ${c.cierreEstimado ? '<p class="ayuda">El día de cierre es estimado. Si lo sabés, corregilo en Ajustes.</p>' : ''}
      </section>`;
  };

  /* Mi consejo: la razón principal, los números que la explican y qué hacer en vez de comprar ya. */
  const bloqueConsejo = (s, p, plan, h, a) => {
    const c = E.consejoCompra(s, { nombre: p.nombre, plan, medio: p.medio && E.esTarjeta(s, p.medio) ? p.medio : null }, h);
    const tono = { bien: 'v-bien', ojo: 'v-ojo', mal: 'v-mal', neutro: '' };
    const ensenar = a.fuente === 'duda' && p.nombre
      ? `<div class="campo"><span class="et-campo">¿Qué es ${esc(p.nombre)} para vos?</span><div class="chips">${Object.entries(CLASES).map(([k, v]) => `<button type="button" class="chip" data-a="aprenderCompro" data-clase="${k}">${esc(v.t)}</button>`).join('')}</div></div>`
      : '';
    return `<section class="bloque">
        <div class="entre"><h2>Mi consejo</h2>${pillClase(a.clase)}</div>
        <p><strong>${esc(c.resumen)}</strong></p>
        <p class="chico">${esc(a.motivo)}</p>
        <div class="lista">${c.puntos.map(x => `<div class="fila"><span class="izq"><span class="nom ${tono[x.tono] || ''}">${esc(x.titulo)}</span><span class="chico">${esc(x.texto)}</span></span></div>`).join('')}</div>
        ${ensenar}
      </section>`;
  };

  /* El veredicto salta una sola vez por respuesta, no en cada redibujo. */
  const claseSalto = () => { if (!App.comproSalto) return ''; App.comproSalto = false; return ' salta'; };

  function vCompro() {
    const s = App.s, h = hoy();
    let res = '';
    if (App.comproHecho) {
      const { p, plan } = planDeCompro();
      res = plan.falta ? faltaCompro(plan, 'zelda 164000') : resultadoCompro(p, plan, h);
    }
    const espera = (s.espera || []).map(x => {
      const listo = x.hasta <= h;
      return `<div class="fila"><span class="izq"><span class="nom">${esc(x.nombre)}</span><span class="chico">${f(x.monto)}${x.cuotas > 1 ? ` en ${x.cuotas} cuotas` : ''} · ${listo ? 'Ya pasaron las 48 horas' : `Pensalo hasta el ${E.fechaCorta(x.hasta)}`}</span></span><span class="der"><button class="btn mini" data-a="esperaVer" data-id="${x.id}">Revisar</button><button class="link chico" data-a="esperaQuitar" data-id="${x.id}">No la quiero</button></span></div>`;
    }).join('');
    return `<header class="cab"><div><h1>¿Lo compro?</h1></div></header>
      ${formCompro('zelda 164000')}
      ${res}
      ${espera ? `<section class="bloque"><h2>En espera</h2><div class="lista">${espera}</div></section>` : ''}`;
  }

  function resultadoCompro(p, plan, h) {
    const s = App.s, v = E.evaluarCompra(s, { monto: plan.precio != null ? plan.precio : plan.total, plan }, h);
    const k = v.veredicto === 'si' ? 'bien' : (v.veredicto === 'justo' || v.veredicto === 'cuotas') ? 'ojo' : 'mal';
    const nombre = p.nombre || 'Esto';
    const a = E.clasificar(s, { nombre, monto: plan.total, cuotas: plan.n }, h, { hora: horaAhora() });
    const costo = E.textoPlan(plan);
    const cuando = x => (x.estado === 'si' ? '<span class="v-bien">Hoy sí</span>' : x.estado === 'justo' ? '<span class="v-ojo">Entra justo</span>' : x.desde ? `Desde ${esc(E.mesCorto(x.desde))} ${x.desde.slice(2, 4)}` : '<span class="v-mal">No</span>');
    const filas = v.planes.map(x => `<tr class="${x.n === plan.n ? 'elegida' : ''}"><td>${x.n === 1 ? '1 pago' : `${x.n} cuotas`}</td><td class="num">${f(x.cuota)}</td><td>${cuando(x)}</td></tr>`).join('');
    return `<section class="veredicto ${k}${claseSalto()}">
        <h3>${esc(v.titulo)}</h3>
        <p>${esc(v.detalle)}</p>
        ${costo ? `<p class="costo">${esc(costo)}</p>` : ''}
      </section>
      ${bloqueConTarjeta(s, p, plan, h)}
      ${bloqueConsejo(s, p, plan, h, a)}
      <section class="bloque">
        <h2>Cómo te entra</h2>
        <table class="tabla"><thead><tr><th>Forma</th><th>Por mes</th><th>Cuándo</th></tr></thead><tbody>${filas}</tbody></table>
        ${v.siTePagan ? `<p>${esc(v.siTePagan)}</p>` : ''}
        ${v.avisos.map(x => `<p class="ayuda">${esc(x)}</p>`).join('')}
      </section>
      <div class="btns">
        ${k !== 'bien' ? '<button class="btn" data-a="esperar">Esperar 48 horas</button>' : ''}
        <button class="btn" data-a="comproCargar">${k === 'bien' ? 'La compré' : 'La compré igual'}</button>
      </div>`;
  }

  /* ---------- Repartir ---------- */
  function planRepartir() {
    const s = App.s, r = App.rep, monto = E.parsearMonto(r.monto);
    const fecha = r.fecha || hoy();
    if (!monto) {
      const proximos = E.proximosPagos(s, fecha).slice(0, 2).map(x => `${x.nombre} ${E.textoVence(x)}`).join(' y ');
      return `<p class="sub">Poné un monto y te muestro cómo repartirlo${proximos ? `, empezando por ${esc(proximos)}` : ''}.</p>`;
    }
    const plan = E.repartir(s, monto, fecha, { modoDeudas: r.modo });
    const grupo = (g, titulo) => {
      const ls = plan.lineas.filter(l => l.grupo === g);
      if (!ls.length) return '';
      const detalle = l => [
        l.textoVence ? `Vence ${l.textoVence}` : '',
        l.sinMonto ? '' : l.falta >= 1 ? `Faltarían ${f(l.falta)}` : (g === 'ahorro' ? '' : 'Cubierto'),
        l.minimo ? 'monto mínimo' : '',
        l.usd != null && l.asigna >= 1 ? `≈ ${E.fmtUSD(l.usd)}` : ''
      ].filter(Boolean).join(' · ');
      return `<section class="bloque"><div class="entre"><h2>${titulo}</h2><span class="num">${f(ls.reduce((a, l) => a + l.asigna, 0))}</span></div><div class="lista">${ls.map(l => `<div class="fila"><span class="izq"><span class="nom">${esc(l.nombre)}</span><span class="chico">${esc(detalle(l))}</span></span><span class="der">${l.sinMonto ? pill('ojo', 'Falta monto', '!') : `<span class="num">${f(l.asigna)}</span>`}</span></div>`).join('')}</div></section>`;
    };
    const avisos = [];
    if (plan.faltaTarjetas >= 1) avisos.push(`<div class="aviso mal">No alcanza para las tarjetas: faltan ${f(plan.faltaTarjetas)}. Nada va a deudas hasta cubrirlas.</div>`);
    if (plan.tarjetasSinMonto.length) avisos.push(`<div class="aviso"><strong>Faltan montos de tarjetas</strong><span>${esc(plan.tarjetasSinMonto.join(', '))} no tienen monto, así que no les reservo nada. Cargalos primero en Tarjetas: van antes que las deudas.</span></div>`);
    else if (plan.hayMinimos) avisos.push('<div class="aviso">Algunas tarjetas figuran con el mínimo conocido. Si el resumen real es más, sale de lo de abajo.</div>');
    if (plan.sinMonto.length) avisos.push(`<p class="ayuda">${esc(plan.sinMonto.join(' y '))} no entra en el reparto hasta que cargues el monto.</p>`);
    return `${avisos.join('')}
      ${grupo('tarjetas', 'Primero: tarjetas')}
      ${grupo('vivir', 'Después: para vivir')}
      ${grupo('deudas', 'Después: deudas')}
      ${grupo('ahorro', 'Lo que sobra: ahorro')}
      <button class="btn prim lleno" data-a="confirmarEntrada">${App.rep.real ? 'Guardar: entró esta plata' : 'Entró de verdad: guardar'}</button>
      <p class="ayuda" style="text-align:center">Hasta que toques este botón, es solo una prueba.</p>`;
  }

  function vRepartir() {
    const s = App.s, r = App.rep;
    const caja = E.saldoCaja(s);
    return `<header class="cab"><div><h1>${r.real ? 'Entró plata' : 'Repartir'}</h1><p class="sub">${r.real ? 'Cargá cuánto entró y te digo a dónde va cada peso.' : 'Probá un monto y una fecha. No se guarda nada.'}</p></div></header>
      <section class="bloque">
        <div class="fila-campos">
          ${campo('rep-monto', '¿Cuánto?', r.monto, { modo: 'decimal', ph: '1.000.000' })}
          ${campo('rep-fecha', '¿Cuándo?', r.fecha || hoy(), { tipo: 'date' })}
        </div>
        <div class="campo"><span class="et-campo">¿De dónde viene?</span>
          <div class="seg" role="group" aria-label="De dónde viene"><button class="${r.origen === 'trabajo' ? 'on' : ''}" data-a="repOrigen" data-v="trabajo">Me debían</button><button class="${r.origen === 'otroTrabajo' ? 'on' : ''}" data-a="repOrigen" data-v="otroTrabajo">Otro trabajo</button><button class="${r.origen === 'otra' ? 'on' : ''}" data-a="repOrigen" data-v="otra">Otra plata</button></div>
          <span class="ayuda">${{ trabajo: 'Baja lo que te deben en el trabajo.', otroTrabajo: 'No baja lo que te deben. Cuenta para lo que te entra por mes.', otra: 'No baja lo que te deben ni cuenta para lo que te entra por mes.' }[r.origen] || 'Elegilo antes de guardar: solo "Me debían" baja lo que te deben.'}</span>
        </div>
        ${r.origen === 'otra' ? campo('rep-nota', '¿De dónde?', r.nota || '', { ph: 'Regalo, venta…' }) : ''}
        <div class="seg" role="group" aria-label="Cómo repartir entre deudas"><button class="${r.modo === 'orden' ? 'on' : ''}" data-a="repModo" data-v="orden">Deudas en orden</button><button class="${r.modo === 'parejo' ? 'on' : ''}" data-a="repModo" data-v="parejo">Deudas parejo</button></div>
        <p class="chico">Ya tenés ${f(caja)}. Este reparto es solo para la plata nueva.</p>
      </section>
      <div id="rep-plan" style="display:grid;gap:12px">${planRepartir()}</div>`;
  }

  /* ---------- Ajustes y copias ---------- */
  const bloqueCuenta = () => `<section class="bloque">
      <h2>Tu cuenta</h2>
      <p class="chico">${esc(App.usuario ? App.usuario.email : 'Sin cuenta en esta prueba')}</p>
      <p class="chico">Tus datos están guardados en tu cuenta y solo los ves vos. Al cerrar sesión se borran de este dispositivo, no de tu cuenta.</p>
      ${App.usuario ? '<button class="btn" data-a="salir">Cerrar sesión</button>' : ''}
    </section>
    <section class="bloque" id="acceso-bloque" hidden></section>`;

  const bloqueCopia = s => `<section class="bloque">
      <h2>Copia en un archivo</h2>
      <p class="chico">Es opcional: sirve para tener tus datos también fuera de tu cuenta.${s.config.ultimaCopia ? ` Última: ${E.fechaCorta(s.config.ultimaCopia)}.` : ''}</p>
      <div class="btns"><button class="btn" data-a="exportar">Guardar copia</button><button class="btn" data-a="importar">Cargar copia</button></div>
    </section>
    <button class="btn peligro lleno" data-a="borrarTodo">Borrar todos los datos</button>`;

  /* Solo la cuenta administradora puede leer esta lista: a las demás las reglas se lo niegan y la sección no aparece. */
  async function cargarAcceso() {
    const caja = $('acceso-bloque');
    if (!caja || !App.usuario) return;
    let lista;
    try { lista = await window.Nube.listarAcceso(); } catch (e) { return; }
    if (!$('acceso-bloque')) return;
    caja.hidden = false;
    caja.innerHTML = `<h2>Quién más puede entrar</h2>
      <p class="chico">Cada persona que agregues entra con su Google, arranca en la versión básica y ve solo lo suyo.</p>
      <div class="lista">${lista.map(m => `<div class="fila"><span class="izq"><span class="chico">${esc(m)}</span></span><span class="der"><button class="link chico" data-a="accesoQuitar" data-mail="${esc(m)}">Quitar</button></span></div>`).join('') || '<p class="chico">Por ahora solo vos.</p>'}</div>
      <form data-form="acceso">${campo('ac-mail', 'Mail de Google', '', { modo: 'email', ph: 'nombre@gmail.com', extra: 'autocapitalize="none" autocorrect="off" spellcheck="false"' })}<button class="btn lleno">Autorizar</button></form>`;
  }

  function hojaAjustesBasico() {
    const s = App.s;
    abrirHoja('Ajustes', `<form data-form="ajustesBasico">
      ${campo('a-caja', '¿Cuánta plata tenés ahora?', redondo(E.saldoCaja(s)), { modo: 'decimal', ayuda: 'Sumá efectivo, banco y billeteras.' })}
      <button class="btn prim lleno">Guardar</button>
    </form>
    ${bloqueCuenta()}
    ${bloqueCopia(s)}`, '', { ancha: true });
    cargarAcceso();
  }

  /* Cómo sale el tope automático, con tus números. */
  const textoTopeAuto = ta => {
    if (ta.ingreso < 1) return 'Si no sabés cuál poner, dejalo vacío y lo calculo yo. Para eso necesito saber cuánto te entra por mes: cargalo abajo o anotá lo que cobrás en Entró plata.';
    const deudas = ta.hayDeudas ? `el ${Math.round(ta.pct * 100)}% es para vivir y el resto va a deudas` : `el ${Math.round(ta.pct * 100)}% es para vivir y el resto queda de colchón`;
    return `Dejalo vacío y lo calculo yo: te entran ${f(ta.ingreso)} por mes, ${f(ta.tarjetas)} ya están atados a cuotas y mensuales de tarjeta${ta.fijos >= 1 ? `, ${f(ta.fijos)} a otros mensuales` : ''}. De lo que queda, ${deudas}. Todo lo que comprás cuenta acá, aunque sea con tarjeta.`;
  };

  function hojaAjustes() {
    if (B()) { hojaAjustesBasico(); return; }
    const s = App.s, h = hoy(), ing = E.ingresoPrudente(s, h);
    const auto = E.ingresoPrudente({ ...s, config: { ...s.config, ingresoManual: null } }, h);
    const ta = E.topeAuto(s, h);
    abrirHoja('Ajustes', `<form data-form="ajustes">
      ${campo('a-caja', '¿Cuánta plata tenés ahora?', redondo(E.saldoCaja(s)), { modo: 'decimal', ayuda: 'Sumá efectivo, banco y billeteras.' })}
      ${campo('a-tope', 'Tope de gasto por mes', E.topeEsAuto(s) ? '' : s.config.tope, { modo: 'decimal', ph: ta.monto >= 1 ? `Automático: ${f(ta.monto)}` : 'Automático', ayuda: textoTopeAuto(ta) })}
      ${campo('a-blue', 'Dólar blue', s.config.tcManual == null ? '' : s.config.tcManual, { modo: 'decimal', ph: s.config.blue ? `Automático: ${f(s.config.blue.venta)}` : 'Automático', ayuda: `Lo traigo solo, a precio de venta: es lo que pagarías para comprar esos dólares. Se usa para tus deudas en dólares (${esc(textoBlue(s))}). Si ponés un número, queda fijo.` })}
      ${campo('a-tc', 'Dólar de tus comisiones', s.config.tc, { modo: 'decimal', ayuda: 'Este lo manejás vos, porque no te pagan al blue. Solo se usa para estimar comisiones.' })}
      ${campo('a-ingreso', 'Lo que te entra por mes', s.config.ingresoManual == null ? '' : s.config.ingresoManual, { modo: 'decimal', ph: `Automático: ${f(auto.monto)}`, ayuda: `Es el promedio de lo que de verdad cobraste en los últimos 3 meses cerrados (${auto.meses.map(m => `${E.mesCorto(m.ym)} ${fc(m.monto)}`).join(', ')}), sin contar lo que te deben. Con esto calculo cuándo terminás tus deudas y si te entran cuotas. Dejalo vacío para que sea automático.` })}
      <h2>Tarjetas</h2>
      ${s.tarjetas.map(t => `<div class="fila-campos">${campo(`a-cierre-${t.id}`, `${t.nombre}: cierre`, t.cierre, { modo: 'numeric', ayuda: t.cierreEstimado ? 'Estimado' : '' })}${campo(`a-vence-${t.id}`, 'Vence el día', t.vence, { modo: 'numeric' })}</div>`).join('')}
      <h2>Mensuales</h2>
      <p class="ayuda">Lo que pagás todos los meses. Los de tarjeta entran solos en cada resumen. Los demás salen de tu tope. Dejá el monto vacío si no lo sabés.</p>
      ${(s.fijos || []).map(x => `<div class="fila" style="padding-block:6px;align-items:flex-end"><div class="izq">${campo(`a-fijo-${x.id}`, `${x.nombre} · ${E.nombreMedio(s, x.medio)}`, x.monto == null ? '' : x.monto, { modo: 'decimal', ph: 'Sin monto' })}</div><label class="check" style="flex:none;padding-bottom:12px"><input type="checkbox" name="a-activo-${x.id}" ${x.activo !== false ? 'checked' : ''}> Activo</label></div>`).join('')}
      <button type="button" class="btn mini" data-a="nuevoFijo">Agregar mensual</button>
      <button class="btn prim lleno">Guardar ajustes</button>
    </form>
    ${bloqueCuenta()}
    ${bloqueCopia(s)}`, '', { ancha: true });
    cargarAcceso();
  }

  /* ---------- Versión básica ---------- */
  function vHoyBasico() {
    const s = App.s, h = hoy(), r = E.resumenBasico(s, h);
    const movs = [
      ...s.compras.map(c => ({ gasto: true, id: c.id, nombre: c.nombre, monto: c.monto, fecha: c.fecha, clase: c.clase })),
      ...(s.otrosIngresos || []).map(i => ({ gasto: false, id: i.id, nombre: i.nota || 'Cobro', monto: i.monto, fecha: i.fecha }))
    ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 8);
    const pieHeroe = r.pago.total >= 1 ? `Libre después de tarjetas: ${f(r.libre)}` : r.gastado === 0 && r.cobrado === 0 ? `Sin movimientos en ${E.mesNombre(r.ym)}` : r.balance >= 0 ? `Este mes te sobran ${f(r.balance)}` : `Este mes gastaste ${f(-r.balance)} más de lo que cobraste`;
    const pillMes = r.estado === 'bien' ? pill('bien', r.etiqueta, '✓') : r.estado === 'mal' ? pill('mal', r.etiqueta, '×') : pill('neutro', r.etiqueta);
    return `
      ${saludo(s, h)}
      ${App.errorGuardado ? '<div class="aviso mal"><strong>No se pudo guardar.</strong> Revisá tu conexión y volvé a intentar.</div>' : ''}
      ${avisoImporte(s)}${avisoConsumos(s)}
      <section class="heroe">
        <span class="heroe-et">Tengo</span>
        <span class="heroe-num num" data-contar="${Math.round(r.tengo)}">${f(r.tengo)}</span>
        <span class="heroe-pie">${esc(pieHeroe)}</span>
      </section>
      <nav class="accesos tres" aria-label="Accesos rápidos">
        <button class="acceso" data-a="ir" data-tab="cargar"><span class="aro">${icono('cargar')}</span>Gasté</button>
        <button class="acceso" data-a="ir" data-tab="cobre"><span class="aro">${icono('plata')}</span>Cobré</button>
        <button class="acceso" data-a="ir" data-tab="compro"><span class="aro">${icono('compro')}</span>¿Lo compro?</button>
      </nav>
      ${r.pago.total >= 1 ? `<section class="bloque"><div class="lista"><button class="fila" data-a="ir" data-tab="tarjetas"><span class="izq"><span class="nom">Próximo pago de tarjetas</span><span class="chico">${r.pago.vencido ? 'Venció el' : 'Vence el'} ${E.fechaCorta(r.pago.vence)}</span></span><span class="der"><span class="num num-fila">${f(r.pago.total)}</span>${r.pago.vencido ? pill('mal', 'Vencido', '×') : ''}</span></button></div></section>` : ''}
      <section class="bloque">
        <div class="entre"><h2>Este mes</h2>${pillMes}</div>
        <div class="lista">
          <div class="fila"><span class="izq"><span class="nom">Cobré</span></span><span class="der"><span class="num num-fila v-bien">${f(r.cobrado)}</span></span></div>
          <div class="fila"><span class="izq"><span class="nom">Gasté</span></span><span class="der"><span class="num num-fila v-mal">${f(r.gastado)}</span></span></div>
        </div>
        ${r.pctNoNecesario != null ? `<p class="chico">El ${r.pctNoNecesario}% de lo que gastaste no era necesario.</p>` : ''}
      </section>
      <section class="bloque">
        <h2>Últimos movimientos</h2>
        ${movs.length ? `<div class="lista">${movs.map(m => m.gasto
          ? `<button class="fila" data-a="compra" data-id="${m.id}"><span class="izq"><span class="nom">${esc(m.nombre)}</span><span class="chico">${E.fechaCorta(m.fecha)}</span></span><span class="der"><span class="num">-${f(m.monto)}</span>${pillClase(m.clase)}</span></button>`
          : `<div class="fila"><span class="izq"><span class="nom">${esc(m.nombre)}</span><span class="chico">${E.fechaCorta(m.fecha)}</span></span><span class="der"><span class="num v-bien">+${f(m.monto)}</span></span></div>`).join('')}</div>` : '<p class="chico">Cuando cargues un gasto o un cobro, aparece acá.</p>'}
      </section>`;
  }

  function vCargarBasico() {
    const s = App.s, p = parsear(App.texto);
    const compras =[...s.compras].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 40);
    return `<header class="cab"><div><h1>Gasté</h1></div></header>
      <form class="bloque" data-form="cargar" autocomplete="off">
        <div class="campo">
          <label for="cargar-texto">¿En qué y cuánto?</label>
          <input id="cargar-texto" type="text" value="${esc(App.texto)}" placeholder="rappi 20450" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
        </div>
        <div id="cargar-vista">${previewCarga()}</div>
        ${s.tarjetas.length ? `<div class="chips" role="group" aria-label="Con qué pagaste">${[['efectivo', 'Efectivo'], ...s.tarjetas.map(t => [t.id, t.nombre])].map(([id, n]) => `<button type="button" class="chip ${(p.medio || 'efectivo') === id ? 'on' : ''}" data-a="poneMedio" data-id="${id}">${esc(n)}</button>`).join('')}</div>` : ''}
        <button class="btn prim lleno">Guardar</button>
      </form>
      ${bloqueCuotas(s)}
      ${compras.length ? `<section class="bloque ancho"><div class="lista">${compras.map(filaCompra).join('')}</div></section>` : '<p class="sub">Cuando guardes un gasto, aparece acá.</p>'}`;
  }

  function vTarjetasBasico() {
    const s = App.s, h = hoy(), filas = E.comprometidoBasico(s, h, 6), max = Math.max(1, ...filas.map(x => x.total));
    const resumen = filas.length ? `<section class="bloque">
        <h2>Lo que ya tenés comprometido</h2>
        <div class="meses">${filas.map(x => {
          const ab = App.abiertos.has('bm-' + x.ym);
          return `<button class="mes-f basico" data-a="toggle" data-id="bm-${x.ym}" aria-expanded="${ab}"><span class="m">${E.fechaCorta(x.vence)}</span><span class="mes-b"><span style="width:${(x.total / max * 100).toFixed(1)}%"></span></span><span class="v num">${fc(x.total)}</span></button>
          ${ab ? `<div class="mes-d">${x.por.map(r => `<div><span>${esc(r.nombre)}</span><span class="num">${f(r.restante)}</span></div>`).join('')}</div>` : ''}`;
        }).join('')}</div>
        <p class="ayuda">Todas se pagan el 1 de cada mes. Lo que compres este mes, se paga el 1 del mes que viene.</p>
      </section>` : '';
    const vacio = !s.tarjetas.length ? `<section class="bloque"><h2>Agregá tu primera tarjeta</h2><p class="chico">Después cargás tus compras y cuotas en Gasté, y acá ves cuánto pagás cada mes.</p></section>` : '';
    return `<header class="cab"><div><h1>Tarjetas</h1></div></header>
      ${vacio}${resumen}
      ${s.tarjetas.map(t => bloqueTarjetaBasica(t, h)).join('')}
      <button class="btn lleno" data-a="nuevaTarjeta">Agregar tarjeta</button>`;
  }

  function bloqueTarjetaBasica(t, h) {
    const s = App.s, r = E.proximoDeTarjeta(s, t.id, h), hay = r.restante >= 1, ab = App.abiertos.has('t-' + t.id);
    const estado = r.vencido ? pill('mal', 'Vencida', '×') : hay ? pill('azul', `Se paga el ${E.fechaCorta(r.vence)}`) : pill('bien', 'Al día', '✓');
    const siguientes = [1, 2, 3, 4].map(i => { const ym = E.sumarMes(r.ym, i); return { ym, r: E.resumen(s, t.id, ym, h) }; }).filter(x => x.r.restante >= 1);
    return `<section class="bloque">
      <div class="entre"><h3>${punto(t.id)}${esc(t.nombre)}</h3>${estado}</div>
      <p><span class="num grande">${f(r.restante)}</span></p>
      ${r.estado === 'parcial' ? `<p class="chico">Ya pagaste ${f(r.pagado)} de ${f(r.total)}.</p>` : ''}
      <div class="btns">
        <button class="btn" data-a="pagar" data-card="${t.id}" data-ym="${r.ym}" ${hay ? '' : 'disabled'}>Ya pagué</button>
        <button class="btn" data-a="editarTarjeta" data-id="${t.id}">Editar</button>
      </div>
      ${hay || siguientes.length ? `<button class="link chico" data-a="toggle" data-id="t-${t.id}" aria-expanded="${ab}">${ab ? 'Ocultar detalle' : 'Ver qué incluye y los próximos meses'}</button>` : ''}
      ${ab ? `<div class="lista">${r.items.map(i => `<div class="fila"><span class="izq"><span>${esc(i.nombre)}</span><span class="chico">${i.tipo === 'cuota' ? `Cuota ${i.n} de ${i.de}` : 'Un pago'}</span></span><span class="der"><span class="num">${f(i.monto)}</span></span></div>`).join('')}</div>
        ${siguientes.length ? `<div><h2 style="margin-bottom:4px">Próximos meses</h2>${siguientes.map(x => `<div class="entre chico"><span>1 de ${esc(E.mesNombre(x.ym))}</span><span class="num">${f(x.r.restante)}</span></div>`).join('')}</div>` : ''}` : ''}
    </section>`;
  }

  function hojaTarjeta(id) {
    const s = App.s, t = id ? E.tarjeta(s, id) : null, r = t ? E.proximoDeTarjeta(s, t.id, hoy()) : null;
    abrirHoja(t ? 'Editar tarjeta' : 'Nueva tarjeta', `<form data-form="tarjeta" data-id="${t ? t.id : ''}" autocomplete="off">
      ${campo('t-nombre', 'Nombre', t ? t.nombre : '', { ph: 'Visa' })}
      ${t ? campo('t-real', `Monto real del pago del ${E.fechaCorta(r.vence)}`, r.real == null ? '' : redondo(r.real), { modo: 'decimal', ph: `Cargado: ${f(r.calculado)}`, ayuda: 'Opcional: usalo si tu resumen dice otro monto.' }) : '<p class="ayuda">Se paga el 1 de cada mes.</p>'}
      <button class="btn prim lleno">Guardar</button>
      ${t ? `<button type="button" class="btn peligro lleno" data-a="borrarTarjeta" data-id="${t.id}">Borrar tarjeta</button>` : ''}
    </form>`);
  }

  function vCobre() {
    const s = App.s;
    const lista = [...(s.otrosIngresos || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 40);
    return `<header class="cab"><div><h1>Cobré</h1></div></header>
      <form class="bloque" data-form="cobre" autocomplete="off">
        <div class="fila-campos">
          ${campo('co-monto', '¿Cuánto?', '', { modo: 'decimal', ph: '500.000' })}
          ${campo('co-fecha', '¿Cuándo?', hoy(), { tipo: 'date' })}
        </div>
        ${campo('co-nota', '¿De qué?', '', { ph: 'Sueldo, venta, regalo…' })}
        <button class="btn prim lleno">Guardar</button>
      </form>
      ${lista.length ? `<section class="bloque"><div class="lista">${lista.map(i => `<div class="fila"><span class="izq"><span class="nom">${esc(i.nota || 'Cobro')}</span><span class="chico">${esc(E.fechaLarga(i.fecha))}</span></span><span class="der"><span class="num v-bien">${f(i.monto)}</span><button class="link chico" data-a="borrarEntrada" data-id="${i.id}">Borrar</button></span></div>`).join('')}</div></section>` : '<p class="sub">Cuando guardes un cobro, aparece acá.</p>'}`;
  }

  function vComproBasico() {
    const s = App.s, h = hoy();
    let res = '';
    if (App.comproHecho) {
      const { p, plan } = planDeCompro();
      if (plan.falta) res = faltaCompro(plan, 'zapatillas 90000');
      else {
        const v = E.evaluarBasico(s, plan.total, h, plan);
        const k = v.veredicto === 'si' ? 'bien' : (v.veredicto === 'justo' || v.veredicto === 'cuotas') ? 'ojo' : 'mal';
        const a = E.clasificar(s, { nombre: p.nombre || 'Compra', monto: plan.total, cuotas: plan.n }, h, { hora: horaAhora() });
        const costo = E.textoPlan(plan);
        res = `<section class="veredicto ${k}${claseSalto()}"><h3>${esc(v.titulo)}</h3><p>${esc(v.detalle)}</p>${costo ? `<p class="costo">${esc(costo)}</p>` : ''}</section>
          ${bloqueConTarjeta(s, p, plan, h)}
          ${bloqueConsejo(s, p, plan, h, a)}
          <button class="btn lleno" data-a="comproCargar">La compré</button>`;
      }
    }
    return `<header class="cab"><div><h1>¿Lo compro?</h1></div></header>
      ${formCompro('zapatillas 90000')}${res}`;
  }

  function hojaMovimientos() {
    const s = App.s, movs = [...s.caja.movs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 60);
    abrirHoja('Tu plata', `<div class="lista">${movs.map(m => `<div class="fila"><span class="izq"><span>${esc(m.concepto)}</span><span class="chico">${E.fechaCorta(m.fecha)}</span></span><span class="der"><span class="num ${m.monto >= 0 ? 'v-bien' : ''}">${m.monto >= 0 ? '+' : ''}${f(m.monto)}</span>${m.ref && E.esEntradaBorrable(s, m.ref) ? `<button class="link chico" data-a="borrarEntrada" data-id="${m.ref}">Borrar</button>` : ''}</span></div>`).join('')}</div>
      <p class="ayuda">Las compras con tarjeta no aparecen acá hasta que pagás el resumen. Si este número no coincide con lo que tenés, corregilo en Ajustes.</p>`, `Hoy: ${f(E.saldoCaja(s))}`);
  }

  async function exportar() {
    const s = App.s, texto = JSON.stringify({ app: 'mango', v: 1, exportado: hoy(), estado: s });
    const nombre = `mango-copia-${hoy()}.json`;
    let hecho = false;
    try {
      const archivo = new File([texto], nombre, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Copia de Mango' });
        hecho = true;
      } else {
        const url = URL.createObjectURL(archivo);
        const a = document.createElement('a');
        a.href = url; a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        hecho = true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('No pude crear el archivo. Probá de nuevo.');
      return;
    }
    if (hecho) {
      App.s.config.ultimaCopia = hoy();
      guardar();
      render();
      toast('Copia lista.');
    }
  }

  const validarCopia = obj => {
    const est = obj && (obj.estado || obj);
    if (!est || !est.config || !Array.isArray(est.tarjetas) || !Array.isArray(est.deudas) || !est.cobros || !est.caja) return null;
    est.compras = Array.isArray(est.compras) ? est.compras : [];
    est.resumenes = est.resumenes || {};
    est.fijos = est.fijos || [];
    est.espera = est.espera || [];
    est.aprendido = est.aprendido || {};
    est.otrosIngresos = est.otrosIngresos || [];
    return est;
  };

  function hojaImportar() {
    abrirHoja('Cargar datos', `<div class="campo"><label for="imp-archivo">Elegí el archivo</label><input id="imp-archivo" type="file" accept=".json,application/json,text/plain"></div>
      <div class="campo"><label for="imp-texto">O pegá el contenido</label><textarea id="imp-texto" rows="4" placeholder="Pegá acá el texto del archivo"></textarea></div>
      <p class="error" id="imp-error" hidden></p>
      ${App.s ? '<div class="aviso">Esto reemplaza lo que hay en este celular.</div>' : ''}
      <button class="btn prim lleno" data-a="importarTexto">Cargar</button>`);
  }

  function aplicarCopia(texto) {
    let obj = null;
    try { obj = JSON.parse(texto); } catch (e) { obj = null; }
    const est = validarCopia(obj);
    if (!est) {
      const err = $('imp-error');
      if (err) { err.hidden = false; err.textContent = 'Ese archivo no es una copia de Mango.'; }
      return;
    }
    App.s = est;
    E.tocar(App.s);
    App.fase = 'app';
    guardar();
    cerrarHoja();
    App.tab = 'hoy';
    render();
    toast('Datos cargados.');
  }

  /* ---------- Pantalla de inicio sin datos ---------- */
  const logo = () => '<img class="logo" src="icono-192.png" alt="" width="92" height="92">';

  function vInicio() {
    const local = leer();
    return `<div class="inicio centro">
      ${logo()}
      <h1>Bienvenido a Mango</h1>
      <p class="sub">${App.usuario ? esc(App.usuario.email) : 'Prueba local'}</p>
      <form class="bloque ancho" data-form="empezar" autocomplete="off">
        ${campo('em-plata', '¿Cuánta plata tenés hoy?', '', { modo: 'decimal', ph: '200.000' })}
        <button class="btn prim lleno">Empezar</button>
      </form>
      ${local && !LOCAL ? '<button class="btn lleno" data-a="usarLocal">Usar los datos de este dispositivo</button>' : ''}
      <button class="link" data-a="importar">Ya tengo un archivo con mis datos</button>
    </div>`;
  }

  function vLogin() {
    return `<div class="inicio centro">
      ${logo()}
      <h1>Mango</h1>
      <p class="sub">Tu plata, clara.</p>
      <button class="btn prim lleno" data-a="entrar" ${App.nubeLista ? '' : 'disabled'}>Entrar con Google</button>
      ${App.errorLogin ? `<p class="error">${esc(App.errorLogin)}</p>` : ''}
      <p class="ayuda">Solo entran las cuentas autorizadas. Cada una ve únicamente sus datos.</p>
    </div>`;
  }

  const vCargando = () => `<div class="inicio centro">${logo()}<h1>Mango</h1><p class="sub">${esc(App.mensajeCarga || 'Trayendo tus datos…')}</p></div>`;

  const vSinAcceso = () => `<div class="inicio centro">
      ${logo()}
      <h1>Esta cuenta no tiene acceso</h1>
      <p class="sub">${esc(App.usuario ? App.usuario.email : '')}</p>
      <p class="ayuda">Pedile al dueño de Mango que autorice este mail.</p>
      <button class="btn lleno" data-a="salir">Entrar con otra cuenta</button>
    </div>`;

  const vErrorNube = () => `<div class="inicio centro">
      ${logo()}
      <h1>No pude conectarme</h1>
      <p class="sub">La primera vez hace falta internet. Revisá tu conexión.</p>
      <button class="btn lleno" data-a="recargar">Reintentar</button>
    </div>`;

  /* ---------- Render ---------- */
  const VISTAS = {
    hoy: () => (B() ? vHoyBasico() : vHoy()),
    cargar: () => (B() ? vCargarBasico() : vCargar()),
    compro: () => (B() ? vComproBasico() : vCompro()),
    tarjetas: () => (B() ? vTarjetasBasico() : vTarjetas()),
    deudas: vDeudas, repartir: vRepartir, cobre: vCobre
  };
  /* La pill de la barra es una sola y se desliza. Los botones no se rehacen, así pueden acompañarla. */
  const ANCHA = window.matchMedia ? matchMedia('(min-width: 960px)') : null;
  const esAncha = () => !!(ANCHA && ANCHA.matches);
  const colocarFondo = (caja, conTransicion) => {
    const fondo = caja.querySelector('.tab-fondo'), activo = caja.querySelector('.tab.on');
    if (!fondo || !activo) return;
    if (!conTransicion) fondo.style.transition = 'none';
    /* En la compu la barra es un menú al costado: la pill se mueve para abajo en vez de al costado. */
    if (esAncha()) {
      fondo.style.width = '';
      fondo.style.height = `${activo.offsetHeight}px`;
      fondo.style.transform = `translateY(${activo.offsetTop}px)`;
    } else {
      fondo.style.height = '';
      fondo.style.width = `${activo.offsetWidth}px`;
      fondo.style.transform = `translateX(${activo.offsetLeft}px)`;
    }
    if (!conTransicion) { void fondo.offsetWidth; fondo.style.transition = ''; }
  };

  function pintarTabs(tabs) {
    const t = $('tabs'), firma = tabs.map(([id]) => id).join();
    let caja = t.firstElementChild;
    const nueva = !caja || caja.dataset.firma !== firma;
    if (nueva) {
      t.innerHTML = `<div data-firma="${firma}"><span class="marca"><img src="icono-192.png" alt="" width="34" height="34">Mango</span><span class="tab-fondo" aria-hidden="true"></span>${tabs.map(([id, n]) => `<button class="tab" data-a="ir" data-tab="${id}" aria-label="${n}">${icono(id)}<span>${n}</span></button>`).join('')}</div>`;
      caja = t.firstElementChild;
    }
    const botones = [...caja.querySelectorAll('.tab')];
    const anterior = botones.find(b => b.classList.contains('on'));
    const cambio = !nueva && (!anterior || anterior.dataset.tab !== App.tab);
    const antes = cambio ? new Map(botones.map(b => [b, b.getBoundingClientRect().left])) : null;
    botones.forEach(b => {
      const on = b.dataset.tab === App.tab;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    colocarFondo(caja, cambio);
    if (cambio && movimiento() && botones[0].animate && !esAncha()) {
      botones.forEach(b => {
        const dx = antes.get(b) - b.getBoundingClientRect().left;
        if (Math.abs(dx) >= 1) b.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }
  }

  /* El número grande sube contando al abrir y cuando cambia. Volver a la pantalla sin cambios no lo repite. */
  let rafContar = 0;
  const contarHeroe = () => {
    cancelAnimationFrame(rafContar);
    const el = document.querySelector('[data-contar]');
    if (!el) return;
    const fin = Number(el.dataset.contar), ini = App.heroeVisto === undefined ? 0 : App.heroeVisto;
    App.heroeVisto = fin;
    if (ini === fin || !movimiento()) return;
    const t0 = performance.now();
    el.textContent = f(ini);
    const paso = t => {
      const x = Math.min(1, Math.max(0, (t - t0) / 650)), suave = 1 - Math.pow(1 - x, 3);
      el.textContent = f(ini + (fin - ini) * suave);
      if (x < 1) rafContar = requestAnimationFrame(paso);
    };
    rafContar = requestAnimationFrame(paso);
  };

  /* Festejo breve, solo cuando terminás de pagar una deuda. */
  const festejar = nombre => {
    if (!movimiento()) return;
    const colores = ['var(--mango)', 'var(--mango-claro)', 'var(--bien)'];
    const chispas = Array.from({ length: 18 }, (_, i) => {
      const ang = (i / 18) * Math.PI * 2, dist = 110 + (i % 3) * 38;
      return `<i style="--x:${Math.round(Math.cos(ang) * dist)}px;--y:${Math.round(Math.sin(ang) * dist)}px;--c:${colores[i % 3]};--d:${(i % 4) * 30}ms"></i>`;
    }).join('');
    const capa = document.createElement('div');
    capa.className = 'festejo';
    capa.setAttribute('aria-hidden', 'true');
    capa.innerHTML = `${chispas}<div class="festejo-nucleo"><strong>Cerraste lo de ${esc(nombre)}</strong><span>Una deuda menos.</span></div>`;
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), 1900);
  };

  /* ---------- Dólar blue ---------- */
  const FUENTES_BLUE = [
    ['https://dolarapi.com/v1/dolares/blue', d => ({ venta: d.venta, compra: d.compra, actualizado: d.fechaActualizacion })],
    ['https://api.bluelytics.com.ar/v2/latest', d => ({ venta: d.blue && d.blue.value_sell, compra: d.blue && d.blue.value_buy, actualizado: d.last_update })]
  ];
  const pedirBlue = async (url, leerFuente) => {
    const corte = new AbortController(), reloj = setTimeout(() => corte.abort(), 6000);
    try {
      const r = await fetch(url, { signal: corte.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      return r.ok ? E.validarBlue(leerFuente(await r.json())) : null;
    } catch (e) { return null; } finally { clearTimeout(reloj); }
  };
  /* Se trae cada 3 horas como mucho. Sin internet o si las páginas fallan, queda el último valor. */
  const traerBlue = async () => {
    if (!App.s || B() || App.blueEnCurso) return;
    const ahora = Date.now(), b = App.s.config.blue;
    if (b && b.traido && ahora - Date.parse(b.traido) < 3 * 36e5) return;
    if (App.blueIntento && ahora - App.blueIntento < 30 * 6e4) return;
    App.blueIntento = ahora;
    App.blueEnCurso = true;
    try {
      for (const [url, leerFuente] of FUENTES_BLUE) {
        const d = await pedirBlue(url, leerFuente);
        if (d) {
          if (!App.s) return;
          App.s.config.blue = { ...d, fecha: hoy(), traido: new Date().toISOString() };
          E.tocar(App.s);
          guardar();
          renderSiSePuede();
          return;
        }
      }
    } finally { App.blueEnCurso = false; }
  };

  function render() {
    if (App.fase === 'app' && App.s && ajustarConsumos(App.s)) { guardar(); setTimeout(() => toast('Listo: saqué Maidana Libros (es de tus papás) y acomodé El Balcón, Vaquería, Catuki y KFC.'), 0); }
    if (App.fase === 'app' && App.s && corregirPapa(App.s)) { guardar(); setTimeout(() => toast(`Listo: lo de Mercado Pago que le debés a tu papá ahora es ${f(IMPORTE.mp.total)}, con los $50.850 de Mercado Libre.`), 0); }
    const v = $('vista'), t = $('tabs');
    const fuera = { cargando: vCargando, login: vLogin, sinAcceso: vSinAcceso, error: vErrorNube, sinDatos: vInicio }[App.fase];
    if (fuera) { v.innerHTML = fuera(); v.classList.remove('entra'); t.hidden = true; App.faseVista = App.fase; return; }
    t.hidden = false;
    const tabs = B() ? TABS_BASICO : TABS;
    if (!tabs.some(([id]) => id === App.tab)) App.tab = 'hoy';
    /* Las barras se llenan solo al entrar a una pantalla, no cada vez que se redibuja. */
    v.classList.toggle('entra', !!App.entrar || App.faseVista !== 'app');
    App.entrar = false;
    App.faseVista = 'app';
    const y = window.scrollY;
    v.innerHTML = VISTAS[App.tab]();
    pintarTabs(tabs);
    window.scrollTo(0, y);
    contarHeroe();
    traerBlue();
  }
  /* El teclado solo se abre cuando tocás un campo: si se abre solo, el fondo se corre y la pantalla se desarma. */
  const cerrarTeclado = () => { const a = document.activeElement; if (a && a.blur && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur(); };
  const ir = (tab, sub) => {
    if (tab !== App.tab) App.entrar = true;
    App.tab = tab;
    if (sub) App.sub = sub;
    if (location.hash.slice(1) !== tab) { try { history.replaceState(null, '', '#' + tab); } catch (e) { /* sin historial */ } }
    render();
    window.scrollTo(0, 0);
  };

  /* ---------- Acciones ---------- */
  const A = {
    cerrar: cerrarHoja,
    verImporte: () => hojaImporte(),
    verConsumos: () => hojaConsumos(),
    descartarConsumos: () => { cerrarHoja(); mutar(s => { s.config.importados = [...(s.config.importados || []), CONSUMOS.id]; E.tocar(s); }, 'Listo, no los cargo.'); },
    descartarImporte: () => { cerrarHoja(); mutar(s => { s.config.importados = [...(s.config.importados || []), IMPORTE.id]; E.tocar(s); }, 'Listo, no lo cargo.'); },
    ir: d => { if (d.tab === 'repartir') App.rep.real = false; ir(d.tab, d.sub); },
    entro: () => { App.rep.real = true; App.rep.origen = null; ir('repartir'); },
    sub: d => { App.sub = d.sub; render(); },
    toggle: d => { if (App.abiertos.has(d.id)) App.abiertos.delete(d.id); else App.abiertos.add(d.id); render(); },
    ajustes: hojaAjustes,
    movimientos: hojaMovimientos,
    exportar,
    importar: hojaImportar,
    importarTexto: () => {
      const arch = $('imp-archivo'), txt = $('imp-texto');
      if (arch && arch.files && arch.files[0]) {
        const lector = new FileReader();
        lector.onload = () => aplicarCopia(String(lector.result));
        lector.readAsText(arch.files[0]);
      } else if (txt && txt.value.trim()) aplicarCopia(txt.value);
      else { const err = $('imp-error'); err.hidden = false; err.textContent = 'Elegí un archivo o pegá el texto.'; }
    },
    entrar: async () => {
      App.errorLogin = null;
      try { await window.Nube.entrar(); }
      catch (e) {
        const c = e && e.code;
        if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
        App.errorLogin = c === 'auth/popup-blocked' ? 'El navegador bloqueó la ventana de Google. Permitila y volvé a intentar.'
          : c === 'auth/network-request-failed' ? 'No hay conexión. Revisá tu internet.'
            : (esIOS() && instalada() ? 'No se pudo abrir Google desde la app instalada. Probá entrar desde Safari.' : 'No se pudo iniciar sesión. Volvé a intentar.');
        render();
      }
    },
    salir: async () => {
      cerrarHoja();
      if (LOCAL) return;
      App.fase = 'cargando'; App.mensajeCarga = 'Cerrando sesión…'; render();
      await window.Nube.salir();
    },
    recargar: () => location.reload(),
    usarLocal: () => {
      const local = leer();
      if (!local) return;
      App.s = local; E.tocar(App.s); App.fase = 'app';
      guardar();
      try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
      render();
      toast('Tus datos ya están en tu cuenta.');
    },
    accesoQuitar: async d => {
      try { await window.Nube.quitarAcceso(d.mail); toast('Acceso quitado.'); cargarAcceso(); }
      catch (e) { toast('No se pudo quitar. Revisá tu conexión.'); }
    },
    borrarTodo: async (d, b) => {
      if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = 'Tocá de nuevo para borrar todo'; return; }
      if (LOCAL) { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } }
      else {
        const meses = {};
        App.s.compras.forEach(c => { meses[c.fecha.slice(0, 7)] = true; });
        await window.Nube.borrarTodo(meses);
      }
      App.s = null; App.fase = 'sinDatos'; App.ultimoEstado = null; cerrarHoja(); render();
    },
    elegir: (d, b) => {
      const form = b.closest('form');
      form.elements[d.campo].value = d.valor;
      b.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
      actualizarQueda();
    },
    /* Cargar */
    nuevaTarjeta: () => { hojaTarjeta(null); const i = $('t-nombre'); if (i) i.focus(); },
    editarTarjeta: d => hojaTarjeta(d.id),
    borrarTarjeta: d => {
      if (E.tarjetaEnUso(App.s, d.id)) { toast('Tiene compras cargadas. Borralas primero.'); return; }
      cerrarHoja();
      mutar(s => E.borrarTarjeta(s, d.id), 'Tarjeta borrada.');
    },
    poneMedio: d => {
      const p = parsear(App.texto);
      const tj = E.tarjeta(App.s, d.id);
      const alias = B() && tj ? tj.nombre.toLowerCase() : { visa: 'bbva visa', master: 'bbva master', naranja: 'naranja', mp: 'mercado pago', efectivo: 'efectivo', transferencia: 'transferencia', debito: 'debito' }[d.id];
      const piezas = [];
      if (p.nombre) piezas.push(p.nombre.toLowerCase());
      if (p.monto) piezas.push(String(p.monto));
      if (p.cuotas > 1) piezas.push(`${p.cuotas}c`);
      piezas.push(alias);
      App.texto = piezas.join(' ');
      render();
    },
    compra: d => hojaCompra(d.id),
    borrarCompra: d => { cerrarHoja(); mutar(s => E.borrarCompra(s, d.id), 'Compra borrada.'); },
    marcarClase: d => mutar(s => {
      const c = s.compras.find(x => x.id === d.id);
      if (!c) return;
      c.clase = d.clase; c.fuente = 'vos'; c.motivo = 'Lo marcaste vos.';
      E.aprender(s, c.nombre, d.clase);
    }, 'Anotado. La próxima lo reconozco.'),
    /* Tarjetas */
    pagar: d => hojaPagar(d.card, d.ym),
    datosResumen: d => hojaDatosResumen(d.card, d.ym),
    borrarPago: d => mutar(s => E.borrarPagoResumen(s, d.key, d.id), 'Pago borrado.'),
    /* Deudas */
    pagarDeuda: d => hojaPagarDeuda(d.id),
    sumarDeuda: d => hojaSumarDeuda(d.id),
    moverDeuda: d => mutar(s => E.moverDeuda(s, d.id, Number(d.dir))),
    borrarMovDeuda: d => mutar(s => E.borrarMovDeuda(s, d.deuda, d.id), 'Movimiento borrado.'),
    ponerMonto: d => {
      const deuda = App.s.deudas.find(x => x.id === d.deuda), m = deuda.movs.find(x => x.id === d.id);
      abrirHoja(m.nota || 'Poner monto', `<form data-form="ponerMonto" data-deuda="${d.deuda}" data-id="${d.id}">${campo('pm-monto', `¿Cuánto le debés a ${deuda.nombre} por esto?`, '', { modo: 'decimal' })}<button class="btn prim lleno">Guardar</button></form>`);
    },
    nuevaDeuda: () => abrirHoja('Nueva deuda', `<form data-form="nuevaDeuda">
      ${campo('nd-nombre', '¿A quién?', '')}
      ${campo('nd-monto', '¿Cuánto?', '', { modo: 'decimal', ayuda: 'Dejalo vacío si todavía no lo sabés.' })}
      <div class="campo"><span class="et-campo">Moneda</span>${chips('nd-moneda', [['ARS', 'Pesos'], ['USD', 'Dólares']], 'ARS')}</div>
      ${campo('nd-nota', '¿Por qué?', '')}
      <button class="btn prim lleno">Agregar</button></form>`),
    /* Cobros */
    cobro: d => hojaCobro(d.id),
    cobre: () => { App.rep.real = true; App.rep.origen = 'trabajo'; ir('repartir'); },
    sumarCobro: () => abrirHoja('Sumar a lo que te deben', `<form data-form="sumarCobro">
      ${campo('sc-concepto', '¿Qué es?', '', { ph: 'Aguinaldo, bono…' })}
      ${campo('sc-monto', '¿Cuánto?', '', { modo: 'decimal' })}
      ${campo('sc-vence', 'Vence', hoy(), { tipo: 'date' })}
      <div class="campo"><span class="et-campo">¿Te lo confirmaron?</span>${chips('sc-estado', [['estimado', 'Es mi cálculo'], ['confirmado', 'Me lo confirmaron']], 'confirmado')}</div>
      <button class="btn prim lleno">Sumar</button></form>`),
    sumarSueldo: () => hojaSumarMes('sueldo'),
    sumarComision: () => hojaSumarMes('comision'),
    usarCalculo: () => { const c = actualizarCalculo(); if (c) { $('cb-monto').value = Math.round(c.ars); } },
    borrarCobro: d => mutar(s => E.borrarCobro(s, d.id), 'Cobro borrado.'),
    borrarEntrada: d => { cerrarHoja(); mutar(s => E.borrarCobro(s, d.id), 'Entrada borrada.'); },
    borrarCobroItem: d => { cerrarHoja(); mutar(s => { s.cobros.items = s.cobros.items.filter(i => i.id !== d.id); }, 'Borrado.'); },
    /* ¿Lo compro? */
    planCuotas: d => {
      const n = Number(d.n);
      App.plan.cuotas = n;
      App.plan.valor = '';
      App.plan.deTexto = false;
      App.compro = E.cambiarCuotasEnTexto(App.compro, n);
      if (App.comproHecho) App.comproSalto = true;
      render();
    },
    planInteres: d => {
      App.plan.interes = d.v;
      App.plan.deTexto = false;
      App.compro = E.cambiarCuotasEnTexto(App.compro, App.plan.cuotas);
      if (App.comproHecho) App.comproSalto = true;
      render();
      if (d.v === 'con') { const i = $('compro-cuota'); if (i) i.focus(); }
    },
    esperar: () => {
      const { p, plan } = planDeCompro();
      if (plan.falta) return;
      mutar(s => E.agregarEspera(s, { nombre: p.nombre || 'Compra', monto: plan.total, precio: plan.precio, cuotas: plan.n, interes: plan.interes, valorCuota: plan.interes === 'con' ? plan.cuota : null }, hoy()), 'Queda en espera 48 horas.');
    },
    aprenderCompro: d => {
      const { p } = planDeCompro();
      if (!p.nombre) return;
      mutar(s => { E.aprender(s, p.nombre, d.clase); E.tocar(s); }, `Listo: ${p.nombre} es ${CLASES[d.clase].t.toLowerCase()}. Me lo acuerdo.`, { deshacer: false });
    },
    comproCargar: () => {
      const { p, plan } = planDeCompro();
      if (plan.falta) return;
      App.texto = `${(p.nombre || 'compra').toLowerCase()} ${Math.round(plan.total)}${plan.n > 1 ? ` ${plan.n}c` : ''}${p.medio ? ' ' + E.nombreMedio(App.s, p.medio).toLowerCase() : ''} `;
      ir('cargar');
    },
    esperaVer: d => {
      const x = App.s.espera.find(i => i.id === d.id);
      if (!x) return;
      App.compro = `${x.nombre}${x.precio != null ? ` ${x.precio}` : (x.valorCuota ? '' : ` ${x.monto}`)}`;
      App.plan = { ...PLAN_VACIO(), cuotas: x.cuotas || 1, interes: x.interes || 'sin', valor: x.valorCuota ? String(x.valorCuota) : '' };
      App.comproHecho = true;
      App.comproSalto = true;
      render(); window.scrollTo(0, 0);
    },
    esperaQuitar: d => mutar(s => E.quitarEspera(s, d.id), 'Bien. Plata que no se fue.'),
    /* Repartir */
    repOrigen: d => { App.rep.origen = d.v; render(); },
    repModo: d => { App.rep.modo = d.v; render(); },
    confirmarEntrada: () => {
      const r = App.rep, monto = E.parsearMonto(r.monto), fecha = r.fecha || hoy();
      if (!monto) return;
      if (!r.origen) { toast('Elegí de dónde vino la plata.'); window.scrollTo(0, 0); return; }
      mutar(s => {
        const plan = E.repartir(s, monto, fecha, { modoDeudas: r.modo });
        E.registrarEntrada(s, { monto, fecha, origen: r.origen, nota: r.nota || '' });
        E.guardarPlan(s, plan);
      }, `Entraron ${f(monto)}. Quedó el plan en Hoy.`);
      App.rep.monto = ''; App.rep.fecha = null; App.rep.nota = ''; App.rep.origen = null;
      ir('hoy');
    },
    planPagar: d => {
      const l = App.s.plan.lineas.find(x => x.id === d.id);
      if (!l) return;
      if (l.grupo === 'tarjetas') hojaPagar(l.ref.cardId, l.ref.ym, l.id, l.asigna);
      else if (l.grupo === 'deudas') hojaPagarDeuda(l.ref.deudaId, l.id, l.usd != null ? l.usd : l.asigna);
      else if (l.grupo === 'ahorro') mutar(s => E.moverAAhorro(s, l.asigna, hoy(), l.id), 'Separado para ahorro.');
    },
    planCerrar: () => mutar(s => { s.plan = null; }, 'Plan cerrado.'),
    nuevoFijo: () => abrirHoja('Nuevo mensual', `<form data-form="nuevoFijo">
      ${campo('nf-nombre', '¿Qué es?', '')}
      ${campo('nf-monto', '¿Cuánto por mes?', '', { modo: 'decimal', ayuda: 'Dejalo vacío si no lo sabés.' })}
      <div class="campo"><label for="nf-medio">¿Cómo se paga?</label><select id="nf-medio" name="nf-medio">${OPCIONES_MEDIO(App.s).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></div>
      <button class="btn prim lleno">Agregar</button></form>`)
  };

  /* ---------- Formularios ---------- */
  const F = {
    tarjeta: (form, val) => {
      const id = form.dataset.id, nombre = val('t-nombre').trim();
      if (!nombre) { toast('Poné un nombre.'); return; }
      const textoReal = id ? val('t-real').trim() : '';
      const real = textoReal ? E.parsearMonto(textoReal) : null;
      if (textoReal && real == null) { toast('Revisá el monto.'); return; }
      cerrarHoja();
      mutar(s => {
        if (id) {
          E.renombrarTarjeta(s, id, nombre);
          E.fijarResumenReal(s, id, E.proximoDeTarjeta(s, id, hoy()).ym, real);
        } else E.agregarTarjeta(s, nombre);
      }, id ? 'Tarjeta actualizada.' : 'Tarjeta agregada.');
    },
    empezar: (form, val) => {
      const plata = E.parsearMonto(val('em-plata'));
      if (plata == null) { toast('Poné cuánta plata tenés. Puede ser 0.'); return; }
      App.s = E.estadoVacio(hoy());
      if (plata > 0) E.ajustarCaja(App.s, plata, hoy());
      E.tocar(App.s);
      App.fase = 'app';
      guardar();
      render();
    },
    acceso: async (form, val) => {
      const mail = val('ac-mail').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { toast('Revisá el mail.'); return; }
      try { await window.Nube.agregarAcceso(mail); toast('Autorizado.'); cargarAcceso(); }
      catch (e) { toast('No se pudo autorizar. Revisá tu conexión.'); }
    },
    ajustesBasico: (form, val) => {
      const caja = E.parsearMonto(val('a-caja'));
      if (caja == null) { toast('Revisá el monto.'); return; }
      cerrarHoja();
      mutar(s => E.ajustarCaja(s, caja, hoy()), 'Guardado.');
    },
    cobre: (form, val) => {
      const monto = E.parsearMonto(val('co-monto'));
      if (!monto) { toast('Poné cuánto cobraste.'); return; }
      const datos = { monto, fecha: val('co-fecha') || hoy(), origen: 'otra', nota: val('co-nota').trim() || 'Cobro' };
      mutar(s => E.registrarEntrada(s, datos), `Cobraste ${f(monto)}.`);
    },
    cargar: () => {
      const s = App.s, p = parsear(App.texto);
      if (B()) {
        if (!p.nombre || !p.monto) { const i = $('cargar-texto'); if (i) i.focus(); toast(`Falta ${!p.monto ? 'el monto' : 'qué compraste'}.`); return; }
        if (p.ambiguo) { toast('Aclará qué tarjeta fue.'); return; }
        const medio = p.medio || 'efectivo', cuotas = E.esTarjeta(s, medio) ? p.cuotas : 1;
        if (p.cuotas > 1 && cuotas === 1) { toast('Las cuotas van con tarjeta. Elegí cuál.'); return; }
        const a = E.clasificar(s, { nombre: p.nombre, monto: p.monto, cuotas }, hoy(), { hora: horaAhora() });
        const n = p.nombre, m = p.monto;
        App.texto = '';
        mutar(st => E.agregarCompra(st, { nombre: n, monto: m, cuotas, medio, fecha: hoy(), clase: a.clase, motivo: a.motivo, fuente: a.fuente }), `${n}: ${f(m)} guardado.`);
        cerrarTeclado();
        return;
      }
      if (!p.ok) { const i = $('cargar-texto'); if (i) i.focus(); toast(p.error || `Falta ${p.faltan.join(', ')}.`); return; }
      const a = E.clasificar(s, { nombre: p.nombre, monto: p.monto, cuotas: p.cuotas }, hoy(), { hora: horaAhora() });
      const nombre = p.nombre, monto = p.monto;
      App.texto = '';
      mutar(st => E.agregarCompra(st, { nombre, monto, cuotas: p.cuotas, medio: p.medio, fecha: hoy(), clase: a.clase, motivo: a.motivo, fuente: a.fuente }), `${nombre}: ${f(monto)} guardado.`);
      cerrarTeclado();
    },
    editarCompra: (form, val) => {
      const id = form.dataset.id, c = App.s.compras.find(x => x.id === id);
      const monto = E.parsearMonto(val('c-monto')), cuotas = Math.max(1, Number(val('c-cuotas')) || 1), medio = val('c-medio');
      if (!monto) { toast('Revisá el monto.'); return; }
      if (cuotas > 1 && !E.esTarjeta(App.s, medio)) { toast('Las cuotas solo van con tarjeta.'); return; }
      const clase = val('c-clase'), nombre = val('c-nombre').trim() || c.nombre;
      const cambio = clase !== c.clase;
      cerrarHoja();
      mutar(s => {
        const cambios = { nombre, monto, cuotas, medio, fecha: val('c-fecha') || c.fecha, clase, categoria: val('c-categoria') || null };
        if (medio !== c.medio || (val('c-fecha') && val('c-fecha') !== c.fecha)) cambios.primerVence = undefined;
        if (B()) {
          const pagadas = Math.max(0, Number(val('c-pagadas')) || 0), tj = E.tarjeta(s, medio);
          cambios.pagadas = pagadas;
          cambios.primerVence = tj && pagadas > 0 ? E.sumarMes(E.primerVencimiento(tj, cambios.fecha), -pagadas) : null;
        }
        if (cambio) { cambios.fuente = 'vos'; cambios.motivo = 'Lo marcaste vos.'; E.aprender(s, nombre, clase); }
        E.editarCompra(s, id, cambios);
      }, 'Compra actualizada.');
    },
    pagar: (form, val) => {
      const d = form.dataset, monto = E.parsearMonto(val('p-monto'));
      if (!monto) { toast('Poné cuánto pagaste.'); return; }
      const datos = { cardId: d.card, ym: d.ym, monto, fecha: val('p-fecha') || hoy(), quien: val('p-quien'), nota: val('p-nota'), lineaPlan: d.linea || null };
      cerrarHoja();
      mutar(s => E.pagarResumen(s, datos), 'Pago guardado.');
      const r = E.resumen(App.s, d.card, d.ym, hoy());
      if (r.restante >= 1) toast(`Pago guardado. Quedan ${f(r.restante)}.`);
    },
    datosResumen: (form, val) => {
      const d = form.dataset, textoReal = val('r-real').trim();
      const real = textoReal ? E.parsearMonto(textoReal) : null;
      if (textoReal && real == null) { toast('Revisá el monto.'); return; }
      const t = E.tarjeta(App.s, d.card), base = E.fechaEn(d.ym, t.vence), vence = val('r-vence');
      cerrarHoja();
      mutar(s => {
        E.fijarResumenReal(s, d.card, d.ym, real);
        E.fijarVencimiento(s, d.card, d.ym, vence && vence !== base ? vence : null);
        E.fijarQuienPaga(s, d.card, d.ym, val('r-quien'));
      }, 'Resumen actualizado.');
    },
    pagarDeuda: (form, val) => {
      const d = form.dataset, monto = E.parsearMonto(val('dp-monto'));
      if (!monto) { toast('Poné cuánto pagaste.'); return; }
      const datos = { id: d.id, monto, moneda: val('dp-moneda'), fecha: val('dp-fecha') || hoy(), nota: val('dp-nota'), lineaPlan: d.linea || null };
      /* Pruebo el pago en una copia para saber si esto cierra la deuda. */
      const deuda = App.s.deudas.find(x => x.id === d.id), prueba = JSON.parse(JSON.stringify(App.s));
      E.pagarDeuda(prueba, datos);
      const cierra = E.saldoDeuda(deuda) >= 1 && E.saldoDeuda(prueba.deudas.find(x => x.id === d.id)) < 1;
      cerrarHoja();
      mutar(s => E.pagarDeuda(s, datos), cierra ? `Cerraste lo de ${deuda.nombre}. Una deuda menos.` : 'Pago guardado.');
      if (cierra) festejar(deuda.nombre);
    },
    sumarDeuda: (form, val) => {
      const monto = E.parsearMonto(val('ds-monto'));
      if (!monto) { toast('Poné cuánto se suma.'); return; }
      const datos = { id: form.dataset.id, monto, fecha: val('ds-fecha') || hoy(), nota: val('ds-nota'), entro: form.elements['ds-entro'].checked };
      cerrarHoja();
      mutar(s => E.sumarDeuda(s, datos), 'Deuda actualizada.');
    },
    ponerMonto: (form, val) => {
      const monto = E.parsearMonto(val('pm-monto'));
      if (!monto) { toast('Poné un monto.'); return; }
      const d = form.dataset;
      cerrarHoja();
      mutar(s => E.ponerMontoMov(s, d.deuda, d.id, monto), 'Monto guardado.');
    },
    nuevaDeuda: (form, val) => {
      const nombre = val('nd-nombre').trim();
      if (!nombre) { toast('Decime a quién le debés.'); return; }
      const texto = val('nd-monto').trim(), monto = texto ? E.parsearMonto(texto) : null;
      cerrarHoja();
      mutar(s => E.nuevaDeuda(s, { nombre, moneda: val('nd-moneda'), monto, fecha: hoy(), nota: val('nd-nota') }), 'Deuda agregada.');
    },
    cobro: (form, val) => {
      const id = form.dataset.id, texto = val('cb-monto').trim(), monto = texto ? E.parsearMonto(texto) : null;
      if (texto && monto == null) { toast('Revisá el monto.'); return; }
      const ventasTxt = form.elements['cb-ventas'] ? val('cb-ventas').trim() : null;
      const ventas = ventasTxt ? E.parsearMonto(ventasTxt) : undefined;
      const estado = monto == null ? 'sinmonto' : val('cb-estado'), vence = val('cb-vence');
      cerrarHoja();
      mutar(s => {
        E.ajustarCobro(s, id, { monto, estado, ventasUSD: ventas, motivo: val('cb-motivo'), fecha: hoy() });
        const it = s.cobros.items.find(x => x.id === id);
        if (it && vence) it.vence = vence;
      }, 'Actualizado.');
    },
    sumarMes: (form, val) => {
      const concepto = val('sm-concepto').trim(), monto = E.parsearMonto(val('cb-monto'));
      if (!concepto || !monto) { toast('Completá el mes y el monto.'); return; }
      const d = form.dataset, ventasTxt = form.elements['cb-ventas'] ? val('cb-ventas').trim() : '';
      const datos = { concepto, monto, tipo: d.tipo, periodo: d.periodo, vence: val('sm-vence') || hoy(), estado: val('sm-estado'), ventasUSD: ventasTxt ? E.parsearMonto(ventasTxt) : null };
      cerrarHoja();
      mutar(s => E.sumarCobro(s, datos), `Sumé ${f(monto)} a lo que te deben.`);
    },
    sumarCobro: (form, val) => {
      const concepto = val('sc-concepto').trim(), monto = E.parsearMonto(val('sc-monto'));
      if (!concepto || !monto) { toast('Completá qué es y cuánto.'); return; }
      cerrarHoja();
      mutar(s => E.sumarCobro(s, { concepto, monto, vence: val('sc-vence') || hoy(), estado: val('sc-estado') }), 'Sumado a lo que te deben.');
    },
    compro: () => { App.comproHecho = true; App.comproSalto = true; render(); const el = document.querySelector('.veredicto'); if (el) el.scrollIntoView({ block: 'nearest' }); },
    consumos: () => {
      cerrarHoja();
      mutar(s => aplicarConsumos(s), 'Consumos cargados.');
    },
    importe: () => {
      cerrarHoja();
      mutar(s => aplicarImporte(s), 'Listo, cargado.');
    },
    ajustes: (form, val) => {
      const s0 = App.s, caja = E.parsearMonto(val('a-caja')), topeTxt = val('a-tope').trim(), tope = topeTxt ? E.parsearMonto(topeTxt) : null, tc = E.parsearMonto(val('a-tc'));
      if (caja == null || (topeTxt && !tope) || !tc) { toast('Revisá tu plata, el tope y el dólar de comisiones.'); return; }
      const ingTxt = val('a-ingreso').trim(), blueTxt = val('a-blue').trim();
      const blue = blueTxt ? E.parsearMonto(blueTxt) : null;
      if (blueTxt && !blue) { toast('Revisá el dólar blue.'); return; }
      const valores = {
        ing: ingTxt ? E.parsearMonto(ingTxt) : null,
        tarjetas: s0.tarjetas.map(t => ({ id: t.id, cierre: Number(val(`a-cierre-${t.id}`)), vence: Number(val(`a-vence-${t.id}`)) })),
        fijos: (s0.fijos || []).map(x => ({ id: x.id, texto: val(`a-fijo-${x.id}`).trim(), activo: form.elements[`a-activo-${x.id}`].checked }))
      };
      cerrarHoja();
      mutar(s => {
        E.ajustarCaja(s, caja, hoy());
        s.config.tope = tope || null;
        if (tc !== s.config.tc) { s.config.tc = tc; s.config.tcFecha = hoy(); }
        s.config.tcManual = blue;
        s.config.ingresoManual = valores.ing;
        for (const v of valores.tarjetas) {
          const t = E.tarjeta(s, v.id);
          if (v.cierre >= 1 && v.cierre <= 31 && v.cierre !== t.cierre) { t.cierre = v.cierre; t.cierreEstimado = false; }
          if (v.vence >= 1 && v.vence <= 31 && v.vence !== t.vence) { t.vence = v.vence; delete t.venceHasta; }
        }
        for (const v of valores.fijos) {
          const x = s.fijos.find(y => y.id === v.id);
          x.monto = v.texto ? E.parsearMonto(v.texto) : null;
          x.activo = v.activo;
          x.confirmar = false;
        }
      }, 'Ajustes guardados.');
    },
    nuevoFijo: (form, val) => {
      const nombre = val('nf-nombre').trim();
      if (!nombre) { toast('Decime qué gasto es.'); return; }
      const t = val('nf-monto').trim(), monto = t ? E.parsearMonto(t) : null, medio = val('nf-medio');
      cerrarHoja();
      mutar(s => { s.fijos.push({ id: E.uid(), nombre, monto, medio, desde: E.ymDe(hoy()), activo: true }); }, 'Mensual agregado.');
    }
  };

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    e.preventDefault();
    const fn = A[b.dataset.a];
    if (fn) fn(b.dataset, b, e);
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const val = n => { const el = form.elements[n]; return el ? el.value : ''; };
    const fn = F[form.dataset.form];
    if (fn) fn(form, val);
  });
  document.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'cargar-texto') {
      App.texto = e.target.value;
      $('cargar-vista').innerHTML = previewCarga();
      const p = parsear(App.texto);
      const elegido = B() ? (p.medio || 'efectivo') : p.medio;
      document.querySelectorAll('[data-a="poneMedio"]').forEach(c => c.classList.toggle('on', c.dataset.id === elegido));
    } else if (id === 'compro-texto') {
      App.compro = e.target.value; App.comproHecho = false;
      /* Lo que escribís mueve las pills: "zelda 164000 3c" deja marcadas las 3 cuotas. */
      const p = parsear(App.compro);
      if (p.cuotasDichas) {
        App.plan.cuotas = p.cuotas;
        App.plan.deTexto = true;
        if (p.valorCuota) App.plan.valor = String(p.valorCuota);
      } else if (App.plan.deTexto) App.plan = PLAN_VACIO();
      if (p.interes) App.plan.interes = p.interes;
      $('compro-plan').innerHTML = selectorPlan();
    } else if (id === 'compro-cuota') {
      App.plan.valor = e.target.value; App.comproHecho = false;
    } else if (id === 'rep-monto') {
      App.rep.monto = e.target.value; $('rep-plan').innerHTML = planRepartir();
    } else if (id === 'rep-fecha') {
      App.rep.fecha = e.target.value || null; $('rep-plan').innerHTML = planRepartir();
    } else if (id === 'rep-nota') {
      App.rep.nota = e.target.value;
    } else if (id === 'p-monto') {
      actualizarQueda();
    } else if (id === 'cb-ventas') {
      actualizarCalculo();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('hoja').hidden) cerrarHoja(); });
  window.addEventListener('resize', () => { const caja = $('tabs').firstElementChild; if (caja && !$('tabs').hidden) colocarFondo(caja, false); });
  window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (VISTAS[t] && t !== App.tab) ir(t); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !App.s || !$('hoja').hidden) return;
    const activo = document.activeElement;
    if (!activo || !/INPUT|TEXTAREA|SELECT/.test(activo.tagName)) render();
  });

  /* ---------- Arranque ---------- */
  const firmaCompras = l => JSON.stringify(l.map(c => [c.id, c.monto, c.clase, c.fecha, c.cuotas, c.medio, c.nombre, c.motivo]).sort());
  const renderSiSePuede = () => {
    const activo = document.activeElement;
    if ($('hoja').hidden && !(activo && /INPUT|TEXTAREA|SELECT/.test(activo.tagName))) render();
  };
  let estadoRemoto, mesesRemotos, comprasEnCache;
  const aplicarRemoto = () => {
    if (estadoRemoto === undefined || mesesRemotos === undefined || window.Nube.haySinGuardar()) return;
    if (estadoRemoto === null) {
      if (App.s) return;
      App.fase = 'sinDatos';
      render();
      return;
    }
    const compras = [].concat(...Object.values(mesesRemotos));
    if (!App.s || (estadoRemoto.rev || 0) > (App.s.rev || 0)) {
      App.s = validarCopia({ ...JSON.parse(JSON.stringify(estadoRemoto)), compras: JSON.parse(JSON.stringify(compras)) });
      window.Nube.fijarBase(App.s, mesesRemotos);
      App.fase = 'app';
      renderSiSePuede();
    } else if ((estadoRemoto.rev || 0) === (App.s.rev || 0) && firmaCompras(App.s.compras) !== firmaCompras(compras)) {
      App.s.compras = JSON.parse(JSON.stringify(compras));
      delete App.s.__idx;
      window.Nube.fijarBase(App.s, mesesRemotos);
      renderSiSePuede();
    }
  };
  const alUsuario = u => {
    App.usuario = u;
    App.errorLogin = null;
    if (!u) { App.s = null; App.fase = 'login'; render(); return; }
    App.fase = 'cargando'; App.mensajeCarga = null;
    render();
    estadoRemoto = undefined; mesesRemotos = undefined; comprasEnCache = undefined;
    const sinRespuesta = setTimeout(() => { if (App.fase === 'cargando') { App.fase = 'error'; render(); } }, 15000);
    window.Nube.escuchar(u.uid, {
      alEstado: (d, meta) => {
        if (d === null && meta.fromCache) return;
        clearTimeout(sinRespuesta);
        estadoRemoto = d;
        /* Sin internet alcanza con lo guardado en el dispositivo. Si después llega algo más de la nube, se actualiza. */
        if (d && mesesRemotos === undefined) mesesRemotos = comprasEnCache || {};
        aplicarRemoto();
      },
      alCompras: (m, meta) => {
        if (!Object.keys(m).length && meta.fromCache && !estadoRemoto) { comprasEnCache = m; return; }
        mesesRemotos = m;
        aplicarRemoto();
      },
      alError: e => {
        clearTimeout(sinRespuesta);
        App.s = null;
        App.fase = e && e.code === 'permission-denied' ? 'sinAcceso' : 'error';
        render();
      }
    });
  };

  /* Al pasar de celu a compu (o al agrandar la ventana) la pill vuelve a su lugar. */
  window.addEventListener('resize', () => { const caja = $('tabs').firstElementChild; if (caja) colocarFondo(caja, false); });

  const inicial = location.hash.slice(1);
  if (VISTAS[inicial]) App.tab = inicial;
  if (LOCAL) {
    App.s = leer();
    App.fase = App.s ? 'app' : 'sinDatos';
    render();
  } else {
    App.fase = 'login';
    render();
    window.Nube.iniciar({ alUsuario }).then(() => { App.nubeLista = true; if (App.fase === 'login') render(); }).catch(() => { App.fase = 'error'; render(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') window.Nube.volcarAhora(); });
    window.addEventListener('pagehide', () => window.Nube.volcarAhora());
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && !window.__SIN_SW) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__alDia = App;
})();
