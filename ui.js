/* Al Día: pantallas. Los datos se guardan solo en este dispositivo. */
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
    rep: { monto: '', fecha: null, origen: null, modo: 'orden' },
    abiertos: new Set(), errorGuardado: false, toastT: null
  };

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
    ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    arriba: '<path d="M6 15l6-6 6 6"/>',
    abajo: '<path d="M6 9l6 6 6-6"/>'
  };
  const icono = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n]}</svg>`;
  const COLORES_TARJETA = { visa: '#4F7BFF', master: '#FFB020', naranja: '#FF7A1A', mp: '#27C3F3' };
  const punto = id => `<span class="punto" style="background:${COLORES_TARJETA[id] || '#fff'}" aria-hidden="true"></span>`;
  const TABS = [['hoy', 'Hoy'], ['cargar', 'Cargar'], ['tarjetas', 'Tarjetas'], ['deudas', 'Deudas'], ['compro', '¿Compro?'], ['repartir', 'Repartir']];

  /* ---------- Guardado ---------- */
  const guardar = () => {
    try { localStorage.setItem(CLAVE, JSON.stringify(App.s)); App.errorGuardado = false; }
    catch (e) { App.errorGuardado = true; }
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
    if (msg) toast(msg, deshacer ? () => { App.s = JSON.parse(antes); E.tocar(App.s); guardar(); render(); toast('Listo, lo deshice.'); } : null);
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
  const abrirHoja = (titulo, cuerpo, sub = '') => {
    const h = $('hoja');
    h.className = 'hoja';
    h.hidden = false;
    h.innerHTML = `<div class="hoja-fondo" data-a="cerrar"></div><div class="hoja-panel" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="hoja-cab"><div><h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</div><button type="button" class="cerrar" data-a="cerrar" aria-label="Cerrar">×</button></div>${cuerpo}</div>`;
    document.body.style.overflow = 'hidden';
  };
  const cerrarHoja = () => {
    const h = $('hoja');
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

  function vHoy() {
    const s = App.s, h = hoy(), c = E.estadoCobros(s, h), d = E.totalDeudas(s), p = E.podes(s, h), cv = E.comoVas(s, h);
    const prox = E.proximosVencimientos(s, h).slice(0, 2);
    const pieDeben = c.porVencerMes >= 1 ? `+ ${fc(c.porVencerMes)} vence en ${E.mesNombre(p.ym)}` : (c.sinMonto.length ? '+ comisión sin cargar' : 'lo vencido a hoy');
    const pieDebes = d.sinMonto.length ? `+ ${esc(d.sinMonto.join(' y '))}, sin monto` : 'sin contar tarjetas';
    const claseBarra = cv.estado === 'mal' ? 'mal' : cv.estado === 'ojo' ? 'ojo' : '';
    const pillCv = cv.estado === 'bien' ? pill('bien', cv.etiqueta, '✓') : cv.estado === 'ojo' ? pill('ojo', cv.etiqueta, '!') : pill('mal', cv.etiqueta, '×');
    const avisos = [];
    if (App.errorGuardado) avisos.push(`<div class="aviso mal"><strong>No se pudo guardar.</strong> Guardá una copia desde Ajustes antes de cerrar.</div>`);
    if (esIOS() && !instalada()) avisos.push(`<div class="aviso azul"><strong>Instalala en el inicio.</strong> Tocá Compartir y después "Agregar a inicio". Lo que cargues en Safari no pasa a la app instalada.</div>`);
    const ultima = s.config.ultimaCopia;
    if ((!ultima && s.rev > 8) || (ultima && E.difDias(ultima, h) >= 14)) avisos.push(`<div class="aviso"><span>Tus datos viven solo en este celular. ${ultima ? `Tu última copia es del ${E.fechaCorta(ultima)}.` : 'Todavía no guardaste ninguna copia.'}</span><button class="link" data-a="exportar">Guardar copia ahora</button></div>`);
    return `
      <header class="cab"><span class="pill vidrio">${esc(E.fechaLarga(h))}</span><button class="icono" data-a="ajustes" aria-label="Ajustes">${icono('ajustes')}</button></header>
      ${avisos.join('')}
      <section class="heroe">
        <span class="heroe-et">Hoy podés gastar</span>
        <span class="heroe-num num">${f(p.hoy)}</span>
        <span class="heroe-pie">${f(p.mes)} en el mes</span>
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
      <section class="bloque">
        <div class="entre"><h2>Cómo vas</h2>${pillCv}</div>
        <div class="barra ${claseBarra}" role="img" aria-label="Usaste ${Math.round(cv.usado * 100)}% del tope, llevás ${Math.round(cv.ritmo * 100)}% del mes"><span style="width:${Math.min(100, cv.usado * 100).toFixed(1)}%"></span><i style="left:${(cv.ritmo * 100).toFixed(1)}%"></i></div>
        <p>${esc(cv.frase)}${cv.pctNoNecesario != null ? ` El ${cv.pctNoNecesario}% de tus compras no era necesario.` : ''}</p>
      </section>
      <section class="bloque">
        <div class="entre"><h2>Próximo pago</h2><button class="link chico" data-a="ir" data-tab="tarjetas">Ver tarjetas</button></div>
        ${prox.length ? `<div class="lista">${prox.map(r => filaPago(r)).join('')}</div>` : '<p class="sub">No hay pagos cargados.</p>'}
        ${prox.some(r => E.faltaMonto(r)) ? '<p class="ayuda">Cuando sepas el monto, cargalo en Tarjetas.</p>' : ''}
      </section>
      ${vPlan()}
      <section class="bloque">
        <div class="lista">
          <button class="fila" data-a="movimientos"><span class="izq"><span class="nom">Plata en mano</span><span class="chico">Ver movimientos</span></span><span class="der"><span class="num num-fila">${f(p.caja)}</span></span></button>
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
    if (c.cuotas <= 1) return E.nombreMedio(s, c.medio);
    return `${c.cuotas} cuotas de ${f(c.monto / c.cuotas)} · ${E.nombreMedio(s, c.medio)}`;
  };

  function previewCarga() {
    const s = App.s, t = App.texto;
    if (!t.trim()) return '<p class="ayuda">Escribí qué, cuánto, las cuotas si hay, y con qué pagaste. La fecha y si era necesario los pongo yo.</p>';
    const p = E.parsearCompra(t);
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

  const filaCompra = c => {
    const s = App.s;
    const duda = c.fuente === 'duda';
    return `<div class="fila" style="align-items:flex-start">
      <button class="izq link-fila" data-a="compra" data-id="${c.id}" style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit">
        <span class="nom">${esc(c.nombre)}</span>
        <span class="chico">${esc(textoCuotas(s, c))}</span>
        ${c.motivo && c.fuente !== 'notion' ? `<span class="chico tercero">${esc(c.motivo)}</span>` : ''}
      </button>
      <span class="der"><span class="num">${f(c.monto)}</span>${pillClase(c.clase)}</span>
    </div>${duda ? `<div class="chips" style="padding-bottom:8px"><span class="chico" style="align-self:center">¿Qué fue?</span>${Object.entries(CLASES).map(([k, v]) => `<button class="chip" data-a="marcarClase" data-id="${c.id}" data-clase="${k}">${v.t}</button>`).join('')}</div>` : ''}`;
  };

  function vCargar() {
    const s = App.s, h = hoy();
    const compras = [...s.compras].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 60);
    const grupos = [];
    for (const c of compras) {
      const titulo = c.fecha === h ? 'Hoy' : c.fecha === E.sumarDias(h, -1) ? 'Ayer' : (c.fuente === 'notion' ? 'Cuotas que traje de tu Notion' : E.fechaLarga(c.fecha));
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
      ${grupos.length ? grupos.map(g => `<h2 class="grupo">${esc(g.titulo)}</h2><section class="bloque"><div class="lista">${g.items.map(filaCompra).join('')}</div></section>`).join('') : '<p class="sub">Cuando guardes una compra, aparece acá.</p>'}`;
  }

  function hojaCompra(id) {
    const s = App.s, c = s.compras.find(x => x.id === id);
    if (!c) return;
    abrirHoja('Editar compra', `<form data-form="editarCompra" data-id="${c.id}">
      ${campo('c-nombre', 'Qué fue', c.nombre)}
      <div class="fila-campos">${campo('c-monto', 'Monto total', redondo(c.monto), { modo: 'decimal' })}${campo('c-cuotas', 'Cuotas', c.cuotas, { modo: 'numeric' })}</div>
      <div class="campo"><label for="c-medio">Con qué pagaste</label><select id="c-medio" name="c-medio">${OPCIONES_MEDIO(s).map(([v, t]) => `<option value="${v}" ${v === c.medio ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      ${campo('c-fecha', 'Fecha', c.fecha, { tipo: 'date' })}
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
      <section class="bloque">
        <h2>Lo que ya tenés comprometido</h2>
        <div class="meses">
          <div class="mes-f cab-m"><span>Mes</span><span></span><span class="v">Tarjetas</span><span class="v">Te queda</span></div>
          ${filas}
        </div>
        <p>${esc(frase)}</p>
        <p class="ayuda">"Te queda" es lo que entra en promedio (${fc(ing)}) menos tarjetas y tu tope para vivir.</p>
      </section>
      ${hayMinimos ? '<div class="aviso">No cargué consumos viejos. Estos montos solo incluyen lo que cargues desde ahora y tus gastos fijos. Tocá "Datos del resumen" para poner el monto real de cada tarjeta.</div>' : ''}
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
      <div class="campo"><span class="et-campo">¿Quién pagó?</span>${chips('p-quien', quienes, 'yo')}<span class="ayuda" id="p-quien-ayuda">Sale de tu plata en mano.</span></div>
      ${campo('p-nota', 'Nota (opcional)', '')}
      <button class="btn prim lleno">Guardar pago</button>
    </form>`, `Resumen de ${esc(E.mesNombre(ym))}: ${E.faltaMonto(r) ? 'todavía sin monto' : `quedan ${f(r.restante)}${r.sinResumenReal ? ' (mínimo)' : ''}`}`);
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
    $('p-quien-ayuda').textContent = quien === 'yo' ? 'Sale de tu plata en mano.' : `Se suma a tu deuda con ${E.nombreDeuda(App.s, quien)}.`;
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
    return `<header class="cab"><div><h1>${App.sub === 'deudas' ? 'Lo que debés' : 'Lo que te deben'}</h1></div></header>${seg}${App.sub === 'deudas' ? vListaDeudas() : vCobros()}`;
  }

  function vListaDeudas() {
    const s = App.s, h = hoy(), t = E.totalDeudas(s), proy = E.proyectar(s, { hoy: h }), fin = E.mesSinDeudas(proy), ing = E.ingresoPrudente(s, h).monto;
    const lista = E.deudasOrdenadas(s).filter(d => d.movs.length);
    const frase = fin === 'nunca' ? 'Con lo que entra en promedio, hoy no llegás a cerrarlas.' : fin ? `Con lo que entra en promedio (${fc(ing)} por mes), terminás de pagar en ${E.mesAnio(fin)}.` : 'No tenés deudas cargadas.';
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
      <div class="entre"><span class="num grande">${saldo < 1 && sinMonto.length ? 'Sin monto' : usd ? E.fmtUSD(saldo) : f(saldo)}</span>${usd ? `<span class="chico">≈ ${f(E.deudaEnARS(s, d))} al dólar de ${f(s.config.tc)}</span>` : ''}</div>
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
      ${usd ? `<div class="campo"><span class="et-campo">Moneda</span>${chips('dp-moneda', [['USD', 'Dólares'], ['ARS', 'Pesos']], 'USD')}<span class="ayuda">En pesos lo convierto a ${f(s.config.tc)} por dólar.</span></div>` : '<input type="hidden" name="dp-moneda" value="ARS">'}
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
  function vCompro() {
    const s = App.s, h = hoy();
    const p = E.parsearCompra(App.compro);
    let res = '';
    if (App.comproHecho) {
      if (!p.monto) res = '<p class="error">Decime cuánto sale. Por ejemplo: xbox 1.500.000</p>';
      else res = resultadoCompro(p, h);
    }
    const espera = (s.espera || []).map(x => {
      const listo = x.hasta <= h;
      return `<div class="fila"><span class="izq"><span class="nom">${esc(x.nombre)}</span><span class="chico">${f(x.monto)} · ${listo ? 'Ya pasaron las 48 horas' : `Pensalo hasta el ${E.fechaCorta(x.hasta)}`}</span></span><span class="der"><button class="btn mini" data-a="esperaVer" data-id="${x.id}">Revisar</button><button class="link chico" data-a="esperaQuitar" data-id="${x.id}">No la quiero</button></span></div>`;
    }).join('');
    return `<header class="cab"><div><h1>¿Lo compro?</h1></div></header>
      <form class="bloque" data-form="compro" autocomplete="off">
        <div class="campo"><label for="compro-texto">¿Qué querés comprar y cuánto sale?</label><input id="compro-texto" type="text" value="${esc(App.compro)}" placeholder="xbox 1.500.000" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go"></div>
        <button class="btn prim lleno">Decime si puedo</button>
      </form>
      ${res}
      ${espera ? `<section class="bloque"><h2>En espera</h2><div class="lista">${espera}</div></section>` : ''}`;
  }

  function resultadoCompro(p, h) {
    const s = App.s, v = E.evaluarCompra(s, { monto: p.monto }, h);
    const k = v.veredicto === 'si' ? 'bien' : (v.veredicto === 'justo' || v.veredicto === 'cuotas') ? 'ojo' : 'mal';
    const nombre = p.nombre || 'Esto';
    const a = E.clasificar(s, { nombre, monto: p.monto, cuotas: p.cuotas }, h, { hora: horaAhora() });
    const filas = v.planes.map(x => `<tr><td>${x.n === 1 ? '1 pago' : `${x.n} cuotas`}</td><td class="num">${f(x.cuota)}</td><td>${x.hoy ? '<span class="v-bien">Hoy sí</span>' : x.desde ? `Desde ${esc(E.mesCorto(x.desde))} ${x.desde.slice(2, 4)}` : '<span class="v-mal">No</span>'}</td></tr>`).join('');
    const atraso = (fin, at, etiqueta) => (fin === 'nunca' ? `${etiqueta}: no llegás a cerrar tus deudas.` : at >= 1 ? `${etiqueta}: terminás tus deudas en ${E.mesAnio(fin)}, ${at} ${at === 1 ? 'mes' : 'meses'} más tarde.` : `${etiqueta}: no cambia cuándo terminás tus deudas.`);
    return `<section class="veredicto ${k}">
        <h3>${esc(v.titulo)}</h3>
        <p>${esc(v.detalle)}</p>
      </section>
      <section class="bloque">
        <div class="entre"><h2>¿Es necesario?</h2>${pillClase(a.clase)}</div>
        <p>${esc(a.motivo)}</p>
      </section>
      <section class="bloque">
        <h2>Cómo te entra</h2>
        <table class="tabla"><thead><tr><th>Forma</th><th>Por mes</th><th>Cuándo</th></tr></thead><tbody>${filas}</tbody></table>
        ${v.siTePagan ? `<p>${esc(v.siTePagan)}</p>` : ''}
        ${v.siIgual ? `<div class="aviso"><strong>Si igual la comprás</strong><span>${esc(atraso(v.siIgual.fin1, v.siIgual.atraso1, 'En 1 pago'))}</span><span>${esc(atraso(v.siIgual.fin6, v.siIgual.atraso6, 'En 6 cuotas'))}</span></div>` : ''}
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
          <span class="ayuda">${{ trabajo: 'Baja lo que te deben en el trabajo.', otroTrabajo: 'No baja lo que te deben. Cuenta para tu ingreso promedio.', otra: 'No baja lo que te deben ni cuenta para tu promedio.' }[r.origen] || 'Elegilo antes de guardar: solo "Me debían" baja lo que te deben.'}</span>
        </div>
        ${r.origen === 'otra' ? campo('rep-nota', '¿De dónde?', r.nota || '', { ph: 'Regalo, venta…' }) : ''}
        <div class="seg" role="group" aria-label="Cómo repartir entre deudas"><button class="${r.modo === 'orden' ? 'on' : ''}" data-a="repModo" data-v="orden">Deudas en orden</button><button class="${r.modo === 'parejo' ? 'on' : ''}" data-a="repModo" data-v="parejo">Deudas parejo</button></div>
        <p class="chico">Ya tenés ${f(caja)} en mano. Este reparto es solo para la plata nueva.</p>
      </section>
      <div id="rep-plan" style="display:grid;gap:12px">${planRepartir()}</div>`;
  }

  /* ---------- Ajustes y copias ---------- */
  function hojaAjustes() {
    const s = App.s, h = hoy(), ing = E.ingresoPrudente(s, h);
    const auto = E.ingresoPrudente({ ...s, config: { ...s.config, ingresoManual: null } }, h);
    abrirHoja('Ajustes', `<form data-form="ajustes">
      ${campo('a-caja', 'Plata en mano', redondo(E.saldoCaja(s)), { modo: 'decimal' })}
      ${campo('a-tope', 'Tope de gasto por mes', s.config.tope, { modo: 'decimal', ayuda: 'Todo lo que comprás cuenta acá, aunque sea con tarjeta.' })}
      ${campo('a-tc', 'Dólar', s.config.tc, { modo: 'decimal', ayuda: 'Se usa para la deuda en dólares y para estimar comisiones.' })}
      ${campo('a-ingreso', 'Ingreso promedio por mes', s.config.ingresoManual == null ? '' : s.config.ingresoManual, { modo: 'decimal', ph: `Automático: ${f(auto.monto)}`, ayuda: `Lo calculo con lo que de verdad cobraste los últimos 3 meses (${auto.meses.map(m => `${E.mesCorto(m.ym)} ${fc(m.monto)}`).join(', ')}). Dejalo vacío para que sea automático.` })}
      <h2>Tarjetas</h2>
      ${s.tarjetas.map(t => `<div class="fila-campos">${campo(`a-cierre-${t.id}`, `${t.nombre}: cierre`, t.cierre, { modo: 'numeric', ayuda: t.cierreEstimado ? 'Estimado' : '' })}${campo(`a-vence-${t.id}`, 'Vence el día', t.vence, { modo: 'numeric' })}</div>`).join('')}
      <h2>Gastos fijos</h2>
      <p class="ayuda">Los de tarjeta entran solos en cada resumen. Los demás salen de tu tope. Dejá el monto vacío si no lo sabés.</p>
      ${(s.fijos || []).map(x => `<div class="fila" style="padding-block:6px;align-items:flex-end"><div class="izq">${campo(`a-fijo-${x.id}`, `${x.nombre} · ${E.nombreMedio(s, x.medio)}`, x.monto == null ? '' : x.monto, { modo: 'decimal', ph: 'Sin monto' })}</div><label class="check" style="flex:none;padding-bottom:12px"><input type="checkbox" name="a-activo-${x.id}" ${x.activo !== false ? 'checked' : ''}> Activo</label></div>`).join('')}
      <button type="button" class="btn mini" data-a="nuevoFijo">Agregar gasto fijo</button>
      <button class="btn prim lleno">Guardar ajustes</button>
    </form>
    <section class="bloque">
      <h2>Copia de tus datos</h2>
      <p class="chico">Tus datos están solo en este celular. Guardá una copia de vez en cuando en Archivos o iCloud.${s.config.ultimaCopia ? ` Última: ${E.fechaCorta(s.config.ultimaCopia)}.` : ''}</p>
      <div class="btns"><button class="btn" data-a="exportar">Guardar copia</button><button class="btn" data-a="importar">Cargar copia</button></div>
    </section>
    <button class="btn peligro lleno" data-a="borrarTodo">Borrar todos los datos</button>`);
  }

  function hojaMovimientos() {
    const s = App.s, movs = [...s.caja.movs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 60);
    abrirHoja('Plata en mano', `<div class="lista">${movs.map(m => `<div class="fila"><span class="izq"><span>${esc(m.concepto)}</span><span class="chico">${E.fechaCorta(m.fecha)}</span></span><span class="der"><span class="num ${m.monto >= 0 ? 'v-bien' : ''}">${m.monto >= 0 ? '+' : ''}${f(m.monto)}</span>${m.ref && E.esEntradaBorrable(s, m.ref) ? `<button class="link chico" data-a="borrarEntrada" data-id="${m.ref}">Borrar</button>` : ''}</span></div>`).join('')}</div>
      <p class="ayuda">Las compras con tarjeta no aparecen acá hasta que pagás el resumen. Si este número no coincide con lo que tenés, corregilo en Ajustes.</p>`, `Hoy: ${f(E.saldoCaja(s))}`);
  }

  async function exportar() {
    const s = App.s, texto = JSON.stringify({ app: 'al-dia', v: 1, exportado: hoy(), estado: s });
    const nombre = `al-dia-copia-${hoy()}.json`;
    let hecho = false;
    try {
      const archivo = new File([texto], nombre, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Copia de Al Día' });
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
      if (err) { err.hidden = false; err.textContent = 'Ese archivo no es una copia de Al Día.'; }
      return;
    }
    App.s = est;
    E.tocar(App.s);
    guardar();
    cerrarHoja();
    App.tab = 'hoy';
    render();
    toast('Datos cargados.');
  }

  /* ---------- Pantalla de inicio sin datos ---------- */
  function vInicio() {
    const ios = esIOS(), inst = instalada();
    return `<div class="inicio">
      <h1>Al Día</h1>
      <p class="sub">Cuánto te deben, cuánto debés y cuánto podés gastar hoy. Todo queda guardado solo en este dispositivo.</p>
      ${ios && !inst ? `<section class="bloque"><h2>Primero instalala</h2><ol class="pasos"><li>Tocá el botón Compartir de Safari.</li><li>Elegí "Agregar a inicio".</li><li>Abrí Al Día desde la pantalla de inicio.</li><li>Cargá tus datos ahí adentro.</li></ol><p class="ayuda">Safari y la app instalada no comparten datos.</p></section>` : ''}
      <button class="btn prim lleno" data-a="importar">Cargar mis datos</button>
      <button class="btn lleno" data-a="empezar">Empezar de cero</button>
    </div>`;
  }

  /* ---------- Render ---------- */
  const VISTAS = { hoy: vHoy, cargar: vCargar, tarjetas: vTarjetas, deudas: vDeudas, compro: vCompro, repartir: vRepartir };
  function render() {
    const v = $('vista'), t = $('tabs');
    if (!App.s) { v.innerHTML = vInicio(); t.hidden = true; return; }
    t.hidden = false;
    const y = window.scrollY;
    v.innerHTML = VISTAS[App.tab]();
    t.innerHTML = `<div>${TABS.map(([id, n]) => `<button class="tab ${App.tab === id ? 'on' : ''}" data-a="ir" data-tab="${id}" aria-label="${n}" ${App.tab === id ? 'aria-current="page"' : ''}>${icono(id)}<span>${n}</span></button>`).join('')}</div>`;
    window.scrollTo(0, y);
  }
  const ir = (tab, sub) => {
    App.tab = tab;
    if (sub) App.sub = sub;
    if (location.hash.slice(1) !== tab) { try { history.replaceState(null, '', '#' + tab); } catch (e) { /* sin historial */ } }
    render();
    window.scrollTo(0, 0);
    if (tab === 'cargar') { const i = $('cargar-texto'); if (i) i.focus(); }
  };

  /* ---------- Acciones ---------- */
  const A = {
    cerrar: cerrarHoja,
    ir: d => { if (d.tab === 'repartir') App.rep.real = false; ir(d.tab, d.sub); },
    entro: () => { App.rep.real = true; App.rep.origen = null; ir('repartir'); const i = $('rep-monto'); if (i) i.focus(); },
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
    empezar: () => { App.s = E.estadoVacio(hoy()); guardar(); render(); },
    borrarTodo: (d, b) => {
      if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = 'Tocá de nuevo para borrar todo'; return; }
      try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
      App.s = null; cerrarHoja(); render();
    },
    elegir: (d, b) => {
      const form = b.closest('form');
      form.elements[d.campo].value = d.valor;
      b.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
      actualizarQueda();
    },
    /* Cargar */
    poneMedio: d => {
      const p = E.parsearCompra(App.texto);
      const alias = { visa: 'bbva visa', master: 'bbva master', naranja: 'naranja', mp: 'mercado pago', efectivo: 'efectivo', transferencia: 'transferencia', debito: 'debito' }[d.id];
      const piezas = [];
      if (p.nombre) piezas.push(p.nombre.toLowerCase());
      if (p.monto) piezas.push(String(p.monto));
      if (p.cuotas > 1) piezas.push(`${p.cuotas}c`);
      piezas.push(alias);
      App.texto = piezas.join(' ');
      render();
      const i = $('cargar-texto');
      if (i) i.focus();
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
    cobre: () => { App.rep.real = true; App.rep.origen = 'trabajo'; ir('repartir'); const i = $('rep-monto'); if (i) i.focus(); },
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
    esperar: () => {
      const p = E.parsearCompra(App.compro);
      mutar(s => E.agregarEspera(s, { nombre: p.nombre || 'Compra', monto: p.monto }, hoy()), 'Queda en espera 48 horas.');
    },
    comproCargar: () => {
      const p = E.parsearCompra(App.compro);
      App.texto = `${(p.nombre || 'compra').toLowerCase()} ${p.monto}${p.cuotas > 1 ? ` ${p.cuotas}c` : ''}${p.medio ? ' ' + E.nombreMedio(App.s, p.medio).toLowerCase() : ''} `;
      ir('cargar');
    },
    esperaVer: d => {
      const x = App.s.espera.find(i => i.id === d.id);
      if (!x) return;
      App.compro = `${x.nombre} ${x.monto}`; App.comproHecho = true;
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
    nuevoFijo: () => abrirHoja('Nuevo gasto fijo', `<form data-form="nuevoFijo">
      ${campo('nf-nombre', '¿Qué es?', '')}
      ${campo('nf-monto', '¿Cuánto por mes?', '', { modo: 'decimal', ayuda: 'Dejalo vacío si no lo sabés.' })}
      <div class="campo"><label for="nf-medio">¿Cómo se paga?</label><select id="nf-medio" name="nf-medio">${OPCIONES_MEDIO(App.s).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></div>
      <button class="btn prim lleno">Agregar</button></form>`)
  };

  /* ---------- Formularios ---------- */
  const F = {
    cargar: () => {
      const s = App.s, p = E.parsearCompra(App.texto);
      if (!p.ok) { const i = $('cargar-texto'); if (i) i.focus(); toast(p.error || `Falta ${p.faltan.join(', ')}.`); return; }
      const a = E.clasificar(s, { nombre: p.nombre, monto: p.monto, cuotas: p.cuotas }, hoy(), { hora: horaAhora() });
      const nombre = p.nombre, monto = p.monto;
      App.texto = '';
      mutar(st => E.agregarCompra(st, { nombre, monto, cuotas: p.cuotas, medio: p.medio, fecha: hoy(), clase: a.clase, motivo: a.motivo, fuente: a.fuente }), `${nombre}: ${f(monto)} guardado.`);
      const i = $('cargar-texto');
      if (i) i.focus();
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
        const cambios = { nombre, monto, cuotas, medio, fecha: val('c-fecha') || c.fecha, clase };
        if (medio !== c.medio || (val('c-fecha') && val('c-fecha') !== c.fecha)) cambios.primerVence = undefined;
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
      cerrarHoja();
      mutar(s => E.pagarDeuda(s, datos), 'Pago guardado.');
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
    compro: () => { App.comproHecho = true; render(); const el = document.querySelector('.veredicto'); if (el) el.scrollIntoView({ block: 'nearest' }); },
    ajustes: (form, val) => {
      const s0 = App.s, caja = E.parsearMonto(val('a-caja')), tope = E.parsearMonto(val('a-tope')), tc = E.parsearMonto(val('a-tc'));
      if (caja == null || !tope || !tc) { toast('Revisá plata en mano, tope y dólar.'); return; }
      const ingTxt = val('a-ingreso').trim();
      const valores = {
        ing: ingTxt ? E.parsearMonto(ingTxt) : null,
        tarjetas: s0.tarjetas.map(t => ({ id: t.id, cierre: Number(val(`a-cierre-${t.id}`)), vence: Number(val(`a-vence-${t.id}`)) })),
        fijos: (s0.fijos || []).map(x => ({ id: x.id, texto: val(`a-fijo-${x.id}`).trim(), activo: form.elements[`a-activo-${x.id}`].checked }))
      };
      cerrarHoja();
      mutar(s => {
        E.ajustarCaja(s, caja, hoy());
        s.config.tope = tope;
        if (tc !== s.config.tc) { s.config.tc = tc; s.config.tcFecha = hoy(); }
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
      mutar(s => { s.fijos.push({ id: E.uid(), nombre, monto, medio, desde: E.ymDe(hoy()), activo: true }); }, 'Gasto fijo agregado.');
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
      const p = E.parsearCompra(App.texto);
      document.querySelectorAll('[data-a="poneMedio"]').forEach(c => c.classList.toggle('on', c.dataset.id === p.medio));
    } else if (id === 'compro-texto') {
      App.compro = e.target.value; App.comproHecho = false;
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
  window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (VISTAS[t] && t !== App.tab) ir(t); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !App.s || !$('hoja').hidden) return;
    const activo = document.activeElement;
    if (!activo || !/INPUT|TEXTAREA|SELECT/.test(activo.tagName)) render();
  });

  /* ---------- Arranque ---------- */
  App.s = leer();
  const inicial = location.hash.slice(1);
  if (VISTAS[inicial]) App.tab = inicial;
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && !window.__SIN_SW) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__alDia = App;
})();
