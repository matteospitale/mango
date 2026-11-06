/* Mango: motor de cálculos. No toca la pantalla: recibe el estado y devuelve números. */
(function (root) {
  'use strict';
  const E = {};

  /* ---------- Fechas ---------- */
  const pad = n => String(n).padStart(2, '0');
  E.hoyISO = () => {
    if (root.__HOY) return root.__HOY;
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const partes = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };
  const ymDe = iso => iso.slice(0, 7);
  const sumarMes = (ym, n) => {
    let [y, m] = ym.split('-').map(Number);
    m += n;
    y += Math.floor((m - 1) / 12);
    m = (((m - 1) % 12) + 12) % 12 + 1;
    return `${y}-${pad(m)}`;
  };
  const diasMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const fechaEn = (ym, dia) => `${ym}-${pad(Math.min(dia, diasMes(ym)))}`;
  const difMeses = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
  const aUTC = iso => { const { y, m, d } = partes(iso); return Date.UTC(y, m - 1, d); };
  const difDias = (a, b) => Math.round((aUTC(b) - aUTC(a)) / 864e5);
  const sumarDias = (iso, n) => { const t = new Date(aUTC(iso) + n * 864e5); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const mesNombre = ym => MESES[Number(ym.split('-')[1]) - 1];
  const mesAnio = ym => `${mesNombre(ym)} ${ym.slice(0, 4)}`;
  const mesCorto = ym => mesNombre(ym).slice(0, 3);
  const fechaCorta = iso => { if (!iso) return 'sin fecha'; const { m, d } = partes(iso); return `${d}/${m}`; };
  const fechaLarga = iso => { const { y, m, d } = partes(iso); return `${DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`; };
  Object.assign(E, { ymDe, sumarMes, diasMes, fechaEn, difMeses, difDias, sumarDias, mesNombre, mesAnio, mesCorto, fechaCorta, fechaLarga });

  /* ---------- Plata ---------- */
  const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  E.fmt = n => (n == null ? 'sin monto' : (n < 0 ? '-$' : '$') + miles(Math.abs(n)));
  E.fmtUSD = n => 'USD ' + miles(n);
  E.fmtCorto = n => {
    if (n == null) return 'sin monto';
    const a = Math.abs(n), sig = n < 0 ? '-$' : '$';
    if (a >= 1e6) return sig + (a / 1e6).toFixed(2).replace('.', ',') + ' M';
    if (a >= 1e4) return sig + Math.round(a / 1000) + ' mil';
    return sig + miles(a);
  };
  const suma = (lista, f) => lista.reduce((t, x) => t + (f ? f(x) : x), 0);
  E.uid = () => Math.random().toString(36).slice(2, 10);
  E.tocar = s => { s.rev = (s.rev || 0) + 1; };

  /* ---------- Lectura de lo que escribís ---------- */
  const normalizar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  E.normalizar = normalizar;

  E.parsearMonto = crudo => {
    if (crudo == null) return null;
    let t = String(crudo).trim().toLowerCase().replace(/\$/g, '').replace(/\s+/g, '');
    if (!t) return null;
    let mult = 1;
    const suf = t.match(/(k|m|mil|lucas?|palos?)$/);
    if (suf) {
      mult = /^(k|mil|luca|lucas)$/.test(suf[1]) ? 1000 : 1e6;
      t = t.slice(0, -suf[1].length);
    }
    if (!/^\d[\d.,]*$/.test(t)) return null;
    const puntos = (t.match(/\./g) || []).length, comas = (t.match(/,/g) || []).length;
    if (puntos && comas) {
      const dec = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.';
      const mil = dec === ',' ? '.' : ',';
      t = t.split(mil).join('').replace(dec, '.');
    } else if (puntos + comas > 1) {
      t = t.replace(/[.,]/g, '');
    } else if (puntos + comas === 1) {
      const sep = puntos ? '.' : ',';
      const trasSep = t.split(sep)[1];
      t = trasSep.length === 3 && mult === 1 ? t.replace(sep, '') : t.replace(sep, '.');
    }
    const n = Number(t) * mult;
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  };

  const ALIAS_MEDIO = [
    ['tarjeta naranja', 'naranja'], ['naranja x', 'naranja'], ['naranja', 'naranja'],
    ['bbva visa', 'visa'], ['visa bbva', 'visa'], ['visa', 'visa'],
    ['bbva mastercard', 'master'], ['bbva master', 'master'], ['master bbva', 'master'], ['master card', 'master'], ['mastercard', 'master'], ['master', 'master'],
    ['mercado pago', 'mp'], ['mercadopago', 'mp'], ['mp', 'mp'],
    ['efectivo', 'efectivo'], ['cash', 'efectivo'],
    ['transferencia', 'transferencia'], ['transf', 'transferencia'],
    ['debito', 'debito'],
    ['bbva', '?bbva']
  ].map(([a, id]) => ({ palabras: a.split(' '), id })).sort((x, y) => y.palabras.length - x.palabras.length);

  E.MEDIOS_SIN_TARJETA = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito' };

  /* Reconoce las tarjetas que cargó cada persona: por su nombre completo o por una palabra que no se repita entre ellas. */
  const aliasDeTarjetas = tarjetas => {
    const genericas = new Set(['tarjeta', 'credito', 'debito', 'banco', 'pago', 'del']);
    const cuenta = {};
    const listas = tarjetas.map(t => ({ id: t.id, palabras: normalizar(t.nombre).split(/\s+/).filter(Boolean) }));
    listas.forEach(t => new Set(t.palabras).forEach(p => { cuenta[p] = (cuenta[p] || 0) + 1; }));
    const lista = ALIAS_MEDIO.filter(a => E.MEDIOS_SIN_TARJETA[a.id]).slice();
    listas.forEach(t => {
      lista.push({ palabras: t.palabras, id: t.id });
      t.palabras.forEach(p => {
        if (p.length >= 3 && !genericas.has(p)) lista.push({ palabras: [p], id: cuenta[p] === 1 ? t.id : '?' + p });
      });
      if (t.palabras.join(' ') === 'mercado pago') lista.push({ palabras: ['mp'], id: t.id });
    });
    return lista.sort((x, y) => y.palabras.length - x.palabras.length);
  };

  E.parsearCompra = (texto, tarjetas) => {
    const alias = tarjetas ? aliasDeTarjetas(tarjetas) : ALIAS_MEDIO;
    const r = { nombre: '', monto: null, cuotas: 1, medio: null, faltan: [], error: null, ok: false };
    const tokens = (texto || '').normalize('NFC').replace(/\$\s+/g, '$').trim().split(/\s+/).filter(Boolean);
    let norm = tokens.map(normalizar);
    const quitar = (i, n) => { tokens.splice(i, n); norm.splice(i, n); };

    /* Medio de pago: el último que aparezca, porque suele ir al final. Si hay dos que terminan igual, gana el más largo ("bbva visa" antes que "visa"). */
    let medio = null;
    for (let i = 0; i < norm.length; i++) {
      for (const a of alias) {
        const n = a.palabras.length;
        if (i + n <= norm.length && a.palabras.every((p, k) => norm[i + k] === p)) {
          const fin = i + n;
          if (!medio || fin > medio.fin || (fin === medio.fin && n > medio.n)) medio = { i, n, fin, id: a.id };
        }
      }
    }
    if (medio) {
      if (medio.id.startsWith('?')) r.ambiguo = medio.id.slice(1); else r.medio = medio.id;
      quitar(medio.i, medio.n);
    }

    /* Cuotas: 6c, 6 c, 6 cuotas, x6, 6x */
    for (let i = norm.length - 1; i >= 0; i--) {
      const t = norm[i];
      let m = t.match(/^(\d{1,2})(c|cts?|cuotas?|x)$/) || t.match(/^x(\d{1,2})$/);
      if (m) {
        r.cuotas = Number(m[1]);
        quitar(i, 1);
        if (i > 0 && norm[i - 1] === 'en') quitar(i - 1, 1);
        break;
      }
      if (/^(c|cts?|cuotas?)$/.test(t) && i > 0 && /^\d{1,2}$/.test(norm[i - 1])) {
        r.cuotas = Number(norm[i - 1]);
        quitar(i - 1, 2);
        if (i - 2 >= 0 && norm[i - 2] === 'en') quitar(i - 2, 1);
        break;
      }
    }

    /* Monto: el número más grande que quede. */
    let mejor = null;
    norm.forEach((t, i) => {
      const sig = norm[i + 1];
      const conPalabra = sig && /^(mil|k|m|lucas?|palos?)$/.test(sig);
      const valor = E.parsearMonto(conPalabra ? t + sig : t);
      if (valor != null && /^\$?\d/.test(t) && (!mejor || valor > mejor.valor)) mejor = { valor, i, n: conPalabra ? 2 : 1 };
    });
    if (mejor) { r.monto = mejor.valor; quitar(mejor.i, mejor.n); }

    r.nombre = tokens.join(' ');
    if (r.nombre) r.nombre = r.nombre[0].toUpperCase() + r.nombre.slice(1);
    if (!r.nombre) r.faltan.push('qué compraste');
    if (!r.monto) r.faltan.push('el monto');
    if (!r.medio) r.faltan.push(r.ambiguo ? 'si fue Visa o Master' : 'con qué pagaste');
    if (r.medio && E.MEDIOS_SIN_TARJETA[r.medio] && r.cuotas > 1) r.error = 'Las cuotas solo van con tarjeta.';
    if (r.cuotas < 1 || r.cuotas > 60) r.error = 'Revisá la cantidad de cuotas.';
    r.ok = !r.faltan.length && !r.error;
    return r;
  };

  /* ---------- Tarjetas y resúmenes ---------- */
  E.tarjeta = (s, id) => s.tarjetas.find(t => t.id === id) || null;
  E.esTarjeta = (s, id) => !!E.tarjeta(s, id);
  E.nombreMedio = (s, id) => { const t = E.tarjeta(s, id); return t ? t.nombre : (E.MEDIOS_SIN_TARJETA[id] || id); };

  /* En qué mes vence la primera cuota de una compra hecha en esa fecha. */
  E.primerVencimiento = (t, fecha) => {
    const { d } = partes(fecha);
    const cierreYm = d <= t.cierre ? ymDe(fecha) : sumarMes(ymDe(fecha), 1);
    return t.vence > t.cierre ? cierreYm : sumarMes(cierreYm, 1);
  };

  const indice = s => {
    if (s.__idx && s.__idx.rev === s.rev) return s.__idx.mapa;
    const mapa = new Map();
    const poner = (key, item) => { if (!mapa.has(key)) mapa.set(key, []); mapa.get(key).push(item); };
    for (const c of s.compras) {
      const t = E.tarjeta(s, c.medio);
      if (!t) continue;
      const primero = c.primerVence || E.primerVencimiento(t, c.fecha);
      const cuota = c.monto / c.cuotas;
      /* Las cuotas que ya estaban pagadas al cargar la compra no vuelven a aparecer como deuda. */
      for (let i = c.pagadas || 0; i < c.cuotas; i++) {
        poner(`${c.medio}:${sumarMes(primero, i)}`, { nombre: c.nombre, monto: cuota, n: i + 1, de: c.cuotas, compraId: c.id, tipo: c.cuotas > 1 ? 'cuota' : 'compra' });
      }
    }
    Object.defineProperty(s, '__idx', { value: { rev: s.rev, mapa, }, enumerable: false, configurable: true, writable: true });
    return mapa;
  };

  const fijosDeMes = (s, medio, ym) => (s.fijos || []).filter(f => f.activo !== false && f.medio === medio && f.monto != null && (!f.desde || f.desde <= ym) && (!f.hasta || ym <= f.hasta));

  E.resumen = (s, cardId, ym, hoy = E.hoyISO()) => {
    const t = E.tarjeta(s, cardId), key = `${cardId}:${ym}`, rec = (s.resumenes && s.resumenes[key]) || {};
    const items = [...(indice(s).get(key) || [])];
    for (const f of fijosDeMes(s, cardId, ym)) items.push({ nombre: f.nombre, monto: f.monto, tipo: 'fijo', fijoId: f.id });
    const calculado = suma(items, i => i.monto);
    const cuotasYFijos = suma(items.filter(i => i.tipo !== 'compra'), i => i.monto);
    const pagos = rec.pagos || [];
    const pagado = suma(pagos, p => p.monto);
    const real = rec.real == null ? null : rec.real;
    const total = real != null ? real : Math.max(calculado, pagado);
    const restante = Math.max(0, total - pagado);
    const vence = rec.vence || fechaEn(ym, t.vence);
    let estado = 'vacio';
    if (total > 0 && restante < 1) estado = 'pagado';
    else if (pagado > 0 && restante >= 1) estado = 'parcial';
    else if (restante >= 1) estado = 'pendiente';
    const vencido = restante >= 1 && vence < hoy;
    return {
      key, cardId, ym, tarjeta: t, nombre: t.nombre, items, calculado, cuotasYFijos, pagos, pagado, real, total, restante, vence,
      venceHasta: t.venceHasta && !rec.vence ? fechaEn(ym, t.venceHasta) : null, estado, vencido,
      sinResumenReal: real == null, quien: rec.quien || 'yo'
    };
  };

  E.textoVence = r => (r.venceHasta ? `${partes(r.vence).d} al ${fechaCorta(r.venceHasta)}` : fechaCorta(r.vence));

  E.proximosPagos = (s, hoy = E.hoyISO(), meses = 8) => {
    const desde = s.config.inicio && s.config.inicio < ymDe(hoy) ? s.config.inicio : ymDe(hoy);
    const salida = [];
    const total = difMeses(desde, ymDe(hoy)) + meses;
    for (let i = 0; i <= total; i++) {
      const ym = sumarMes(desde, i);
      for (const t of s.tarjetas) {
        const r = E.resumen(s, t.id, ym, hoy);
        if (r.restante >= 1) salida.push(r);
      }
    }
    return salida.sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : 0));
  };

  /* El próximo vencimiento de una tarjeta, aunque todavía no tenga monto cargado. */
  E.proximoDeTarjeta = (s, cardId, hoy = E.hoyISO()) => {
    const desde = s.config.inicio && s.config.inicio < ymDe(hoy) ? s.config.inicio : ymDe(hoy);
    const total = difMeses(desde, ymDe(hoy)) + 14;
    for (let i = 0; i <= total; i++) {
      const r = E.resumen(s, cardId, sumarMes(desde, i), hoy);
      if (r.restante >= 1) return r;
      if (r.estado === 'vacio' && r.sinResumenReal && r.vence >= hoy) return r;
    }
    return E.resumen(s, cardId, sumarMes(ymDe(hoy), 1), hoy);
  };

  /* Un renglón por tarjeta, de la fecha más cercana a la más lejana. */
  E.proximosVencimientos = (s, hoy = E.hoyISO()) => s.tarjetas
    .map(t => E.proximoDeTarjeta(s, t.id, hoy))
    .sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : 0));
  E.faltaMonto = r => r.estado === 'vacio' && r.sinResumenReal;

  /* ---------- Plata en mano ---------- */
  E.saldoCaja = s => suma(s.caja.movs, m => m.monto);
  const movCaja = (s, fecha, monto, concepto, ref) => s.caja.movs.push({ id: E.uid(), fecha, monto, concepto, ref: ref || null });
  const borrarMovCaja = (s, ref) => { s.caja.movs = s.caja.movs.filter(m => m.ref !== ref); };

  E.ajustarCaja = (s, nuevoSaldo, fecha) => {
    const dif = nuevoSaldo - E.saldoCaja(s);
    if (Math.abs(dif) >= 0.01) movCaja(s, fecha, dif, 'Corrección manual');
  };

  /* ---------- Gastos del mes ---------- */
  const montoQueCuenta = c => (c.cuotas > 1 ? c.monto / c.cuotas : c.monto);
  E.montoQueCuenta = montoQueCuenta;
  E.topeMes = s => s.config.tope;

  E.gastoMes = (s, ym) => {
    const compras = s.compras.filter(c => ymDe(c.fecha) === ym);
    const deCompras = suma(compras, montoQueCuenta);
    const fijos = suma((s.fijos || []).filter(f => f.activo !== false && f.monto != null && !E.esTarjeta(s, f.medio)), f => f.monto);
    return { total: deCompras + fijos, compras: deCompras, fijos, lista: compras };
  };

  E.podes = (s, hoy = E.hoyISO()) => {
    const ym = ymDe(hoy), tope = E.topeMes(s), g = E.gastoMes(s, ym);
    const gastadoHoy = suma(g.lista.filter(c => c.fecha === hoy), montoQueCuenta);
    const caja = E.saldoCaja(s);
    const delMes = s.tarjetas.map(t => E.resumen(s, t.id, ym, hoy));
    const reserva = suma(delMes.filter(r => r.quien === 'yo'), r => r.restante);
    const reservaTodas = suma(delMes, r => r.restante);
    const restanteTope = Math.max(0, tope - g.total);
    const libreCaja = Math.max(0, caja - reserva);
    const mes = Math.min(restanteTope, libreCaja);
    const { d } = partes(hoy);
    const dias = diasMes(ym) - d + 1;
    const porDia = (mes + gastadoHoy) / dias;
    const deHoy = Math.max(0, porDia - gastadoHoy);
    return { ym, tope, gastado: g.total, gastadoHoy, caja, reserva, reservaTodas, restanteTope, libreCaja, mes, hoy: deHoy, dias, porDia, limitadoPorCaja: libreCaja < restanteTope };
  };

  E.comoVas = (s, hoy = E.hoyISO()) => {
    const p = E.podes(s, hoy), ym = p.ym, { d } = partes(hoy), dm = diasMes(ym);
    const esperado = p.tope * (d / dm);
    const g = E.gastoMes(s, ym);
    const noNec = suma(g.lista.filter(c => c.clase !== 'necesario'), montoQueCuenta);
    const pctNoNecesario = g.compras > 0 ? Math.round((noNec / g.compras) * 100) : null;
    const usado = p.tope > 0 ? p.gastado / p.tope : 0;
    const ritmo = d / dm;
    let estado, etiqueta, frase;
    if (p.gastado > p.tope) {
      estado = 'mal'; etiqueta = 'Te pasaste';
      frase = `Gastaste ${E.fmt(p.gastado)}: ${E.fmt(p.gastado - p.tope)} más que tu tope de ${E.fmt(p.tope)}.`;
    } else if (p.mes <= 0 && p.gastado < p.tope) {
      estado = 'mal'; etiqueta = 'Sin plata libre';
      frase = `Lo que tenés (${E.fmt(p.caja)}) ya está reservado para tarjetas de este mes.`;
    } else if (p.gastado > esperado * 1.25 && p.gastado > 0) {
      estado = 'mal'; etiqueta = 'Vas rápido';
      frase = `Gastaste ${E.fmt(p.gastado)}. A esta altura del mes ibas a ir por ${E.fmt(esperado)}.`;
    } else if (p.gastado > esperado && p.gastado > 0) {
      estado = 'ojo'; etiqueta = 'Vas justo';
      frase = `Gastaste ${E.fmt(p.gastado)}, un poco más de los ${E.fmt(esperado)} esperados a hoy.`;
    } else {
      estado = 'bien'; etiqueta = 'Vas bien';
      frase = `Gastaste ${E.fmt(p.gastado)} de ${E.fmt(p.tope)}. Te quedan ${E.fmt(p.mes)} para ${p.dias} ${p.dias === 1 ? 'día' : 'días'}.`;
    }
    return { estado, etiqueta, frase, usado, ritmo, pctNoNecesario, gastado: p.gastado, tope: p.tope };
  };

  /* ---------- Deudas ---------- */
  E.saldoDeuda = d => {
    let saldo = 0;
    for (const m of d.movs) {
      if (m.monto == null) continue;
      saldo += m.tipo === 'pago' ? -m.monto : m.monto;
    }
    return Math.max(0, saldo);
  };
  E.sinMontoDeuda = d => d.movs.filter(m => m.tipo !== 'pago' && m.monto == null);
  E.deudaEnARS = (s, d) => E.saldoDeuda(d) * (d.moneda === 'USD' ? s.config.tc : 1);
  E.deudasOrdenadas = s => [...s.deudas].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  E.totalDeudas = s => ({
    ars: suma(s.deudas, d => E.deudaEnARS(s, d)),
    sinMonto: s.deudas.filter(d => E.sinMontoDeuda(d).length).map(d => d.nombre)
  });
  E.nombreDeuda = (s, id) => { const d = s.deudas.find(x => x.id === id); return d ? d.nombre : id; };

  E.pagarDeuda = (s, { id, monto, moneda, fecha, nota, lineaPlan }) => {
    const d = s.deudas.find(x => x.id === id);
    const tc = s.config.tc;
    const ars = moneda === 'USD' ? monto * tc : monto;
    const enMonedaDeuda = d.moneda === 'USD' ? (moneda === 'USD' ? monto : monto / tc) : (moneda === 'USD' ? monto * tc : monto);
    const mov = { id: E.uid(), tipo: 'pago', monto: enMonedaDeuda, fecha, nota: nota || '' };
    if (d.moneda !== moneda) mov.original = { monto, moneda, tc };
    d.movs.push(mov);
    movCaja(s, fecha, -ars, `Pago a ${d.nombre}`, mov.id);
    marcarLinea(s, lineaPlan);
    E.tocar(s);
    return mov;
  };

  E.sumarDeuda = (s, { id, monto, fecha, nota, entro, ref }) => {
    const d = s.deudas.find(x => x.id === id);
    const mov = { id: E.uid(), tipo: 'suma', monto, fecha, nota: nota || '', ref: ref || null };
    d.movs.push(mov);
    if (entro && monto) movCaja(s, fecha, monto * (d.moneda === 'USD' ? s.config.tc : 1), `Me prestó ${d.nombre}`, mov.id);
    E.tocar(s);
    return mov;
  };

  E.borrarMovDeuda = (s, deudaId, movId) => {
    const d = s.deudas.find(x => x.id === deudaId);
    d.movs = d.movs.filter(m => m.id !== movId);
    borrarMovCaja(s, movId);
    E.tocar(s);
  };

  E.ponerMontoMov = (s, deudaId, movId, monto) => {
    const d = s.deudas.find(x => x.id === deudaId);
    const m = d.movs.find(x => x.id === movId);
    if (m) m.monto = monto;
    E.tocar(s);
  };

  E.moverDeuda = (s, deudaId, dir) => {
    const lista = E.deudasOrdenadas(s);
    const i = lista.findIndex(d => d.id === deudaId), j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    lista.forEach((d, k) => { d.orden = k + 1; });
    E.tocar(s);
  };

  E.nuevaDeuda = (s, { nombre, moneda, monto, fecha, nota }) => {
    const d = { id: E.uid(), nombre, moneda: moneda || 'ARS', orden: Math.max(0, ...s.deudas.map(x => x.orden || 0)) + 1, movs: [] };
    d.movs.push({ id: E.uid(), tipo: 'alta', monto: monto == null ? null : monto, fecha, nota: nota || '' });
    s.deudas.push(d);
    E.tocar(s);
    return d;
  };

  /* ---------- Pagos de tarjeta ---------- */
  E.pagarResumen = (s, { cardId, ym, monto, fecha, quien, nota, lineaPlan }) => {
    const key = `${cardId}:${ym}`;
    s.resumenes[key] = s.resumenes[key] || {};
    const rec = s.resumenes[key];
    rec.pagos = rec.pagos || [];
    const pago = { id: E.uid(), monto, fecha, quien: quien || 'yo', nota: nota || '' };
    rec.pagos.push(pago);
    const t = E.tarjeta(s, cardId);
    if (pago.quien === 'yo') movCaja(s, fecha, -monto, `Pago ${t.nombre}`, pago.id);
    else E.sumarDeuda(s, { id: pago.quien, monto, fecha, nota: `Pagó ${t.nombre} de ${mesNombre(ym)}`, ref: pago.id });
    marcarLinea(s, lineaPlan);
    E.tocar(s);
    return pago;
  };

  E.borrarPagoResumen = (s, key, pagoId) => {
    const rec = s.resumenes[key];
    if (!rec || !rec.pagos) return;
    rec.pagos = rec.pagos.filter(p => p.id !== pagoId);
    borrarMovCaja(s, pagoId);
    for (const d of s.deudas) d.movs = d.movs.filter(m => m.ref !== pagoId);
    E.tocar(s);
  };

  E.fijarResumenReal = (s, cardId, ym, real) => {
    const key = `${cardId}:${ym}`;
    s.resumenes[key] = s.resumenes[key] || {};
    if (real == null) delete s.resumenes[key].real; else s.resumenes[key].real = real;
    E.tocar(s);
  };

  E.fijarVencimiento = (s, cardId, ym, fecha) => {
    const key = `${cardId}:${ym}`;
    s.resumenes[key] = s.resumenes[key] || {};
    if (fecha) s.resumenes[key].vence = fecha; else delete s.resumenes[key].vence;
    E.tocar(s);
  };

  E.fijarQuienPaga = (s, cardId, ym, quien) => {
    const key = `${cardId}:${ym}`;
    s.resumenes[key] = s.resumenes[key] || {};
    s.resumenes[key].quien = quien;
    E.tocar(s);
  };

  /* ---------- Compras ---------- */
  E.agregarCompra = (s, { nombre, monto, cuotas, medio, fecha, texto, clase, motivo, fuente }) => {
    const c = { id: E.uid(), nombre, monto, cuotas: cuotas || 1, medio, fecha, texto: texto || '', clase: clase || 'gustito', motivo: motivo || '', fuente: fuente || 'regla' };
    s.compras.push(c);
    if (!E.esTarjeta(s, medio)) movCaja(s, fecha, -monto, nombre, c.id);
    E.tocar(s);
    return c;
  };
  E.borrarCompra = (s, id) => {
    s.compras = s.compras.filter(c => c.id !== id);
    borrarMovCaja(s, id);
    E.tocar(s);
  };
  E.editarCompra = (s, id, cambios) => {
    const c = s.compras.find(x => x.id === id);
    if (!c) return;
    Object.assign(c, cambios);
    borrarMovCaja(s, id);
    if (!E.esTarjeta(s, c.medio)) movCaja(s, c.fecha, -c.monto, c.nombre, c.id);
    E.tocar(s);
  };

  /* ---------- ¿Era necesario? ---------- */
  const REGLAS = [
    { re: /\b(rappi|pedidos ?ya|uber ?eats|delivery|glovo)\b/, clase: 'innecesario', tipo: 'delivery', motivo: 'Es delivery: había comida en casa.' },
    { re: /\b(temu|shein|aliexpress)\b/, clase: 'innecesario', tipo: 'online', motivo: 'Compra online de impulso. Nada de esto era urgente.' },
    { re: /\b(kiosco|starbucks|cafe|cafeteria|alfajor|golosinas?|havanna|bonafide)\b/, clase: 'innecesario', tipo: 'hormiga', motivo: 'Gasto hormiga: poco cada vez, mucho a fin de mes.' },
    { re: /\b(xbox|playstation|ps[345]|nintendo|switch|steam|fortnite|juegos?|videojuegos?|consola)\b/, clase: 'innecesario', tipo: 'juegos', motivo: 'Es entretenimiento: si no te sobra, puede esperar.' },
    { re: /\b(tv|televisor|tele|heladera|lavarropas|aire|notebook|iphone|celular nuevo|tablet|kindle|silla|parlante|auriculares)\b/, clase: 'innecesario', tipo: 'bien', motivo: 'Es un bien caro. Si el que tenés funciona, hoy puede esperar.' },
    { re: /\b(farmacia|remedios?|medicamentos?|medico|psicolog[oa]|dentista|odontolog[oa]|oculista|prepaga|osde|swiss|analisis|estudios?|guardia|lentes)\b/, clase: 'necesario', tipo: 'salud', motivo: 'Es salud. Eso no se recorta.' },
    { re: /\b(colectivo|subte|sube|tren|nafta|ypf|shell|axion)\b/, clase: 'necesario', tipo: 'transporte', motivo: 'Transporte de todos los días.' },
    { re: /\b(alquiler|expensas|luz|gas|agua|internet|seguro|monotributo|impuesto)\b/, clase: 'necesario', tipo: 'servicio', motivo: 'Es un servicio o una obligación.' },
    { re: /\b(peluqueria|barberia)\b/, clase: 'necesario', tipo: 'cuidado', motivo: 'Cuidado personal básico.' },
    { re: /\b(uber|didi|cabify|taxi|remis)\b/, clase: 'gustito', tipo: 'auto', motivo: 'Si había colectivo o subte, se podía evitar.' },
    { re: /\b(mc|mcdonalds?|burger|mostaza|kfc|wendys|subway|pizzeria|pizza|sushi|empanadas?|hamburguesa|restaurant|parrilla|bar|helado|grido)\b/, clase: 'gustito', tipo: 'comida', motivo: 'Comer afuera es un gusto. Vale si no se repite mucho.' },
    { re: /\b(cine|cinemark|hoyts|recital|entradas?|movistar arena|alpogo|teatro|cancha|abono)\b/, clase: 'gustito', tipo: 'salidas', motivo: 'Salida o evento. Es un gusto, no una necesidad.' },
    { re: /\b(ropa|remera|buzo|zapatillas?|jean|pantalon|campera|newsport|dexter|decathlon|nike|adidas)\b/, clase: 'gustito', tipo: 'ropa', motivo: 'Ropa. Salvo que te haga falta de verdad, es un gusto.' },
    { re: /\b(perfume|maquillaje|crema)\b/, clase: 'gustito', tipo: 'belleza', motivo: 'Es un gusto personal.' },
    { re: /\b(libros?|yenny|cuspide|comics?|manga)\b/, clase: 'gustito', tipo: 'lectura', motivo: 'Lectura y colección: un gusto.' },
    { re: /\b(spotify|netflix|hbo|max|disney|youtube|suscripcion)\b/, clase: 'gustito', tipo: 'suscripcion', motivo: 'Suscripción. Revisá si la usás de verdad.' },
    { re: /\b(super|supermercado|carrefour|coto|jumbo|disco|vea|changomas|almacen|verduleria)\b/, clase: 'gustito', tipo: 'super', motivo: 'Si no era para la casa, fue un gusto.' },
    { re: /\b(mercado libre|meli|amazon)\b/, clase: 'gustito', tipo: 'online', motivo: 'Depende de qué compraste. Sin más datos, lo tomo como gusto.' }
  ];

  /* Analiza la compra con todo lo que la app sabe: qué es, cuántas veces se repitió, cuánto pesa frente a tu tope y tus deudas, si va en cuotas y a qué hora fue. */
  E.clasificar = (s, { nombre, monto, cuotas = 1 }, hoy = E.hoyISO(), { hora = null } = {}) => {
    const clave = normalizar(nombre || '').trim();
    const aprendido = s.aprendido && s.aprendido[clave];
    if (aprendido) return { clase: aprendido, motivo: 'Así lo marcaste vos la última vez.', fuente: 'aprendido', tipo: null };
    const regla = REGLAS.find(r => r.re.test(clave));
    let clase = regla ? regla.clase : 'gustito';
    const notas = [regla ? regla.motivo : 'No lo reconozco. Decime qué fue y la próxima lo sé.'];
    let fuente = regla ? 'regla' : 'duda';
    const tipo = regla ? regla.tipo : null;
    const subir = () => { if (clase === 'gustito') clase = 'innecesario'; };

    if (regla) {
      const hace7 = sumarDias(hoy, -7);
      const mismos = s.compras.filter(c => c.fecha >= hace7 && REGLAS.find(r => r.re.test(normalizar(c.nombre || ''))) === regla).length;
      if (mismos >= 2 && clase !== 'necesario') {
        subir();
        notas.unshift(`Ya es la vez ${mismos + 1} en 7 días.`);
      }
    }
    if (hora != null && hora < 6 && clase !== 'necesario') {
      subir();
      notas.push('De madrugada: ojo con el impulso.');
    }
    const tope = E.topeMes(s);
    const deudas = E.totalDeudas(s).ars;
    if (clase !== 'necesario' && deudas > 0 && monto >= tope * 0.5) {
      subir();
      if (fuente === 'duda') fuente = 'duda-cara';
      notas.push(`Es mucho mientras debés ${E.fmtCorto(deudas)}.`);
    }
    if (clase !== 'necesario' && cuotas > 1) notas.push(`Te ata ${cuotas} meses.`);
    return { clase, motivo: notas.join(' '), fuente: fuente === 'duda-cara' ? 'duda' : fuente, tipo };
  };

  E.aprender = (s, nombre, clase) => {
    s.aprendido = s.aprendido || {};
    s.aprendido[normalizar(nombre).trim()] = clase;
  };

  /* ---------- Lo que te deben ---------- */
  E.estadoCobros = (s, hoy = E.hoyISO()) => {
    const items = [...s.cobros.items].sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : (a.orden || 0) - (b.orden || 0)));
    let resto = suma(s.cobros.pagos, p => p.monto);
    const filas = items.map(i => {
      const monto = i.monto == null ? 0 : i.monto;
      const cobrado = Math.min(resto, monto);
      resto -= cobrado;
      return { ...i, cobrado, pendiente: i.monto == null ? 0 : monto - cobrado, sinMonto: i.monto == null };
    });
    const pend = filas.filter(f => f.pendiente >= 1 || f.sinMonto);
    const vencido = suma(pend.filter(f => f.vence <= hoy), f => f.pendiente);
    const ymHoy = ymDe(hoy);
    const porVencer = suma(pend.filter(f => f.vence > hoy), f => f.pendiente);
    const porVencerMes = suma(pend.filter(f => f.vence > hoy && ymDe(f.vence) === ymHoy), f => f.pendiente);
    const estimado = suma(pend.filter(f => f.estado === 'estimado'), f => f.pendiente);
    return { filas, pend, vencido, porVencer, porVencerMes, estimado, total: vencido + porVencer, aFavor: resto, sinMonto: pend.filter(f => f.sinMonto) };
  };

  E.comision = (s, ventasUSD, tc = s.config.tc) => {
    const c = s.config.comision;
    const neto = ventasUSD * (1 - c.descuento);
    let pct = 0, nivel = 0;
    c.niveles.forEach((n, i) => { if (ventasUSD >= n.desde) { pct = n.pct; nivel = i + 1; } });
    const usd = neto * pct;
    return { neto, pct, nivel, usd, ars: Math.round(usd * tc * 100) / 100 };
  };

  /* Lo que te deben crece solo cuando tocás un botón. Esto arma la propuesta: el mes que sigue al último cargado y el último monto de sueldo. Se puede cambiar todo. */
  E.propuestaCobro = (s, tipo) => {
    const previos = s.cobros.items.filter(i => i.tipo === tipo && i.periodo).sort((a, b) => (a.periodo < b.periodo ? -1 : 1));
    const ultimo = previos[previos.length - 1];
    const periodo = ultimo ? sumarMes(ultimo.periodo, 1) : sumarMes(ymDe(E.hoyISO()), -1);
    const cobraEn = sumarMes(periodo, 1), cfg = s.config;
    if (tipo === 'sueldo') return { tipo, periodo, concepto: `Sueldo de ${mesNombre(periodo)}`, monto: ultimo ? ultimo.monto : cfg.sueldo, vence: fechaEn(cobraEn, cfg.sueldoDia) };
    return { tipo, periodo, concepto: `Comisión de ${mesNombre(periodo)}`, monto: null, vence: fechaEn(cobraEn, cfg.comisionDia) };
  };

  E.registrarEntrada = (s, { monto, fecha, origen, nota }) => {
    const id = E.uid();
    /* Solo "trabajo" baja lo que te deben. El otro trabajo cuenta para el promedio; el resto solo suma a la plata en mano. */
    if (origen === 'trabajo') s.cobros.pagos.push({ id, monto, fecha, nota: nota || '' });
    else {
      s.otrosIngresos = s.otrosIngresos || [];
      s.otrosIngresos.push({ id, monto, fecha, origen, nota: nota || '' });
    }
    const concepto = origen === 'trabajo' ? 'Cobré del trabajo' : origen === 'otroTrabajo' ? 'Cobré del otro trabajo' : (nota || 'Entró plata');
    movCaja(s, fecha, monto, concepto, id);
    E.tocar(s);
    return id;
  };

  E.esEntradaBorrable = (s, id) => (s.otrosIngresos || []).some(x => x.id === id);

  E.borrarCobro = (s, id) => {
    s.cobros.pagos = s.cobros.pagos.filter(p => p.id !== id);
    s.otrosIngresos = (s.otrosIngresos || []).filter(p => p.id !== id);
    borrarMovCaja(s, id);
    E.tocar(s);
  };

  E.ajustarCobro = (s, id, { monto, estado, ventasUSD, motivo, fecha }) => {
    const it = s.cobros.items.find(x => x.id === id);
    if (!it) return;
    if (monto !== undefined && monto !== it.monto) {
      it.ajustes = it.ajustes || [];
      it.ajustes.push({ de: it.monto, a: monto, fecha, motivo: motivo || '' });
      it.monto = monto;
    }
    if (estado) it.estado = estado;
    if (ventasUSD !== undefined) it.ventasUSD = ventasUSD;
    E.tocar(s);
  };

  E.sumarCobro = (s, { concepto, monto, vence, estado, tipo, periodo, ventasUSD }) => {
    const item = { id: E.uid(), concepto, tipo: tipo || 'otro', monto, vence, estado: estado || 'confirmado', ajustes: [] };
    if (periodo) item.periodo = periodo;
    if (ventasUSD != null) item.ventasUSD = ventasUSD;
    s.cobros.items.push(item);
    E.tocar(s);
    return item;
  };

  /* ---------- Lo que entra de verdad ---------- */
  E.ingresoPrudente = (s, hoy = E.hoyISO()) => {
    if (s.config.ingresoManual != null) return { monto: s.config.ingresoManual, manual: true, meses: [] };
    const m = ymDe(hoy);
    const meses = [1, 2, 3].map(i => {
      const ym = sumarMes(m, -i);
      const delTrabajo = suma(s.cobros.pagos.filter(p => ymDe(p.fecha) === ym), p => p.monto);
      const delOtro = suma((s.otrosIngresos || []).filter(p => p.origen === 'otroTrabajo' && ymDe(p.fecha) === ym), p => p.monto);
      return { ym, monto: delTrabajo + delOtro };
    });
    return { monto: suma(meses, x => x.monto) / 3, manual: false, meses };
  };

  /* Salida de plata esperada para un mes futuro: tarjetas + gasto corriente, sin contar dos veces. */
  const salidaMes = (s, ym, hoy) => {
    const rs = s.tarjetas.map(t => E.resumen(s, t.id, ym, hoy));
    const tarjetas = suma(rs, r => r.restante);
    const compromisos = suma(rs, r => Math.max(0, r.cuotasYFijos - r.pagado));
    return { tarjetas, compromisos, salida: Math.max(tarjetas, compromisos + E.topeMes(s)) };
  };

  E.proyectar = (s, { hoy = E.hoyISO(), extra = 0, meses = 36, plan = null } = {}) => {
    const m0 = ymDe(hoy), ingreso = E.ingresoPrudente(s, hoy).monto;
    const p = E.podes(s, hoy);
    let deuda = E.totalDeudas(s).ars;
    const deudaInicial = deuda;
    const filas = [];
    for (let i = 0; i <= meses; i++) {
      const ym = sumarMes(m0, i);
      let disponible, salida = 0, tarjetas = 0;
      if (i === 0) {
        tarjetas = p.reservaTodas;
        disponible = p.caja - p.reservaTodas - p.restanteTope + extra;
      } else {
        const sm = salidaMes(s, ym, hoy);
        salida = sm.salida; tarjetas = sm.tarjetas;
        disponible = ingreso - salida;
      }
      if (plan && i >= plan.desde && i < plan.desde + plan.n) disponible -= plan.cuota;
      if (disponible < 0) { deuda -= disponible; disponible = 0; }
      const pagoDeuda = Math.min(deuda, disponible);
      deuda -= pagoDeuda;
      filas.push({ ym, ingreso: i === 0 ? 0 : ingreso, salida, tarjetas, disponible, pagoDeuda, deudaFin: deuda, libre: disponible - pagoDeuda });
    }
    return { filas, deudaInicial, ingreso };
  };

  E.mesSinDeudas = proy => {
    if (proy.deudaInicial < 1 && proy.filas[0].deudaFin < 1) return null;
    const f = proy.filas.find(r => r.deudaFin < 1);
    return f ? f.ym : 'nunca';
  };

  E.mesesTarjetas = (s, hoy = E.hoyISO(), n = 6) => {
    const proy = E.proyectar(s, { hoy, meses: n + 1 });
    return proy.filas.slice(0, n).map(f => {
      const porTarjeta = s.tarjetas.map(t => { const r = E.resumen(s, t.id, f.ym, hoy); return { id: t.id, nombre: t.nombre, restante: r.restante, sinReal: r.sinResumenReal, pagado: r.pagado }; });
      const total = suma(porTarjeta, x => x.restante);
      const margen = f.ym === ymDe(hoy) ? null : f.ingreso - f.salida;
      return { ym: f.ym, total, porTarjeta, margen, libre: f.libre, pagoDeuda: f.pagoDeuda };
    });
  };

  /* ---------- ¿Lo compro? ---------- */
  const analizarPlanes = (filas, monto) => {
    let acum = 0, desde1 = null;
    for (const r of filas) { acum += r.libre; if (acum >= monto) { desde1 = r.ym; break; } }
    const cuotas = [3, 6, 9, 12].map(n => {
      const cuota = monto / n;
      let desde = null;
      for (let c = 0; c + n < filas.length; c++) {
        let ok = true;
        for (let i = 1; i <= n; i++) if (filas[c + i].libre < cuota) { ok = false; break; }
        if (ok) { desde = filas[c].ym; break; }
      }
      return { n, cuota, desde };
    });
    return { desde1, cuotas };
  };

  const mejorOpcion = ({ desde1, cuotas }) => {
    const ops = [];
    if (desde1) ops.push({ n: 1, desde: desde1, cuota: null });
    cuotas.filter(c => c.desde).forEach(c => ops.push(c));
    ops.sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : a.n - b.n));
    return ops[0] || null;
  };

  const textoOpcion = o => (o.n === 1 ? 'en 1 pago' : `en ${o.n} cuotas de ${E.fmt(o.cuota)}`);

  E.evaluarCompra = (s, { monto }, hoy = E.hoyISO()) => {
    const m0 = ymDe(hoy), p = E.podes(s, hoy), base = E.proyectar(s, { hoy });
    const a = analizarPlanes(base.filas, monto);
    const sinDeudas = E.mesSinDeudas(base);
    const r = { monto, planes: [], avisos: [], sinDeudas, ingreso: base.ingreso };
    const dentroDelMes = monto <= p.mes;
    r.planes.push({ n: 1, cuota: monto, hoy: dentroDelMes || a.desde1 === m0, desde: dentroDelMes ? m0 : a.desde1 });
    a.cuotas.forEach(c => r.planes.push({ n: c.n, cuota: c.cuota, hoy: c.desde === m0, desde: c.desde }));

    const mej = mejorOpcion(a);
    const cuotaHoy = a.cuotas.find(c => c.desde === m0);
    const razonDeudas = sinDeudas && sinDeudas !== 'nunca' && sinDeudas > m0
      ? `Hasta ${mesAnio(sinDeudas)} todo lo que te sobra va a deudas y tarjetas.`
      : (sinDeudas === 'nunca' ? 'Con lo que entra hoy no llegás a cerrar tus deudas.' : '');

    if (monto <= p.hoy) {
      r.veredicto = 'si';
      r.titulo = 'Sí, podés';
      r.detalle = `Entra en lo que podés gastar hoy (${E.fmt(p.hoy)}). Te quedan ${E.fmt(p.mes - monto)} para el resto del mes.`;
    } else if (dentroDelMes) {
      const resto = p.mes - monto, diasResto = Math.max(1, p.dias - 1);
      r.veredicto = 'justo';
      r.titulo = 'Podés, pero te ajusta';
      r.detalle = `Pasa lo de hoy (${E.fmt(p.hoy)}) pero entra en el mes. Te dejaría ${E.fmt(resto)} para ${diasResto} ${diasResto === 1 ? 'día' : 'días'}: ${E.fmt(resto / diasResto)} por día.`;
    } else if (cuotaHoy) {
      r.veredicto = 'cuotas';
      r.titulo = `En 1 pago no. En ${cuotaHoy.n} cuotas sí`;
      r.detalle = `Serían ${cuotaHoy.n} cuotas de ${E.fmt(cuotaHoy.cuota)}. Es lo más corto que te entra sin frenar las deudas.`;
    } else if (mej) {
      r.veredicto = 'desde';
      r.titulo = 'Hoy no, ni en 1 pago ni en cuotas';
      const pago1 = a.desde1 && a.desde1 !== mej.desde && mej.n !== 1 ? ` En 1 pago, desde ${mesAnio(a.desde1)}.` : '';
      r.detalle = `Podés a partir de ${mesAnio(mej.desde)} ${textoOpcion(mej)}.${pago1} ${razonDeudas}`.trim();
    } else {
      r.veredicto = 'no';
      r.titulo = 'No podés en nada';
      r.detalle = `Ni esperando 3 años te entra con lo que cobrás hoy en promedio (${E.fmt(base.ingreso)} por mes). ${razonDeudas}`.trim();
    }
    r.mejor = mej;

    /* Si te pagan lo que te deben */
    const c = E.estadoCobros(s, hoy);
    if (c.vencido >= 1 && !['si', 'justo'].includes(r.veredicto)) {
      const prog = E.proyectar(s, { hoy, extra: c.vencido });
      const pa = analizarPlanes(prog.filas, monto);
      const pm = mejorOpcion(pa);
      if (pm) {
        const cuando = pm.desde === m0 ? 'podrías ya' : `podrías desde ${mesAnio(pm.desde)}`;
        r.siTePagan = `Si te pagan lo vencido (${E.fmtCorto(c.vencido)}), ${cuando} ${textoOpcion(pm)}.`;
      } else {
        r.siTePagan = `Aunque te paguen lo vencido (${E.fmtCorto(c.vencido)}), no te entra.`;
      }
    }

    /* Si igual la comprás */
    if (!['si', 'justo'].includes(r.veredicto) && sinDeudas && sinDeudas !== 'nunca') {
      const con = (n, cuota) => E.mesSinDeudas(E.proyectar(s, { hoy, plan: { n, cuota, desde: 1 } }));
      const fin1 = con(1, monto), fin6 = con(6, monto / 6);
      const atraso = fin => (fin === 'nunca' ? null : difMeses(sinDeudas, fin));
      r.siIgual = { sinDeudas, fin1, fin6, atraso1: atraso(fin1), atraso6: atraso(fin6) };
    }

    /* Lo que puede cambiar la cuenta */
    const totalD = E.totalDeudas(s);
    if (totalD.sinMonto.length) r.avisos.push(`No cuenta lo que le debés a ${totalD.sinMonto.join(' y ')}: falta el monto.`);
    const sinReal = E.proximosVencimientos(s, hoy).filter(x => x.sinResumenReal);
    if (sinReal.length) r.avisos.push(`Esta cuenta no incluye lo que todavía no cargaste de ${sinReal.map(x => x.nombre).join(', ')}. Con los montos reales puede cambiar.`);
    return r;
  };

  /* ---------- Repartir lo que entra ---------- */
  E.repartir = (s, monto, fecha = E.hoyISO(), { modoDeudas = 'orden' } = {}) => {
    let resto = monto;
    const lineas = [];
    const limite = sumarDias(fecha, 30);

    /* 1. Tarjetas siempre primero, por fecha */
    const conMonto = E.proximosPagos(s, fecha).filter(r => r.vence <= limite);
    const sinMontoT = E.proximosVencimientos(s, fecha).filter(r => E.faltaMonto(r) && r.vence <= limite);
    const tarjetas = [...conMonto, ...sinMontoT].sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : 0));
    for (const r of tarjetas) {
      const asigna = Math.min(resto, r.restante);
      resto -= asigna;
      lineas.push({ id: E.uid(), grupo: 'tarjetas', ref: { cardId: r.cardId, ym: r.ym }, nombre: r.nombre, vence: r.vence, textoVence: E.textoVence(r), debe: r.restante, asigna, falta: r.restante - asigna, minimo: r.sinResumenReal && r.restante >= 1, sinMonto: E.faltaMonto(r), hecho: !!E.faltaMonto(r) });
    }

    /* 2. Plata para vivir: completa el tope del mes con lo que ya no tengas en mano */
    const p = E.podes(s, fecha);
    const necesita = Math.max(0, p.restanteTope - p.caja);
    if (necesita >= 1) {
      const asigna = Math.min(resto, necesita);
      resto -= asigna;
      lineas.push({ id: E.uid(), grupo: 'vivir', nombre: `Para vivir en ${mesNombre(p.ym)}`, debe: necesita, asigna, falta: necesita - asigna, hecho: true });
    }

    /* 3. Deudas */
    const deudas = E.deudasOrdenadas(s).map(d => ({ d, ars: E.deudaEnARS(s, d) }));
    const conSaldo = deudas.filter(x => x.ars >= 1);
    const totalD = suma(conSaldo, x => x.ars);
    if (modoDeudas === 'parejo' && totalD > 0) {
      const disponible = Math.min(resto, totalD);
      let usado = 0;
      conSaldo.forEach((x, i) => {
        const asigna = i === conSaldo.length - 1 ? disponible - usado : Math.floor((x.ars / totalD) * disponible);
        usado += asigna;
        lineas.push({ id: E.uid(), grupo: 'deudas', ref: { deudaId: x.d.id }, nombre: x.d.nombre, moneda: x.d.moneda, debe: x.ars, asigna, falta: x.ars - asigna, usd: x.d.moneda === 'USD' ? asigna / s.config.tc : null, hecho: false });
      });
      resto -= disponible;
    } else {
      for (const x of conSaldo) {
        const asigna = Math.min(resto, x.ars);
        resto -= asigna;
        lineas.push({ id: E.uid(), grupo: 'deudas', ref: { deudaId: x.d.id }, nombre: x.d.nombre, moneda: x.d.moneda, debe: x.ars, asigna, falta: x.ars - asigna, usd: x.d.moneda === 'USD' ? asigna / s.config.tc : null, hecho: false });
      }
    }
    const sinMonto = deudas.filter(x => E.sinMontoDeuda(x.d).length).map(x => x.d.nombre);

    /* 4. Ahorro, solo con lo que sobre */
    if (resto >= 1) lineas.push({ id: E.uid(), grupo: 'ahorro', nombre: 'Ahorro', debe: resto, asigna: resto, falta: 0, hecho: false });

    const faltaTarjetas = suma(lineas.filter(l => l.grupo === 'tarjetas'), l => l.falta);
    const hayMinimos = lineas.some(l => l.grupo === 'tarjetas' && l.minimo);
    const tarjetasSinMonto = lineas.filter(l => l.grupo === 'tarjetas' && l.sinMonto).map(l => `${l.nombre} (${l.textoVence})`);
    return { monto, fecha, modoDeudas, lineas, faltaTarjetas, hayMinimos, sinMonto, tarjetasSinMonto, sobra: resto };
  };

  const marcarLinea = (s, lineaId) => {
    if (!lineaId || !s.plan) return;
    const l = s.plan.lineas.find(x => x.id === lineaId);
    if (l) l.hecho = true;
  };
  E.marcarLinea = marcarLinea;

  E.guardarPlan = (s, plan) => {
    s.plan = { ...plan, creado: E.hoyISO() };
    E.tocar(s);
  };

  E.moverAAhorro = (s, monto, fecha, lineaId) => {
    s.ahorro = (s.ahorro || 0) + monto;
    movCaja(s, fecha, -monto, 'Separé para ahorro');
    marcarLinea(s, lineaId);
    E.tocar(s);
  };

  /* ---------- Lista de espera ---------- */
  E.agregarEspera = (s, { nombre, monto }, hoy = E.hoyISO()) => {
    s.espera = s.espera || [];
    s.espera.push({ id: E.uid(), nombre, monto, fecha: hoy, hasta: sumarDias(hoy, 2) });
    E.tocar(s);
  };
  E.quitarEspera = (s, id) => {
    s.espera = (s.espera || []).filter(x => x.id !== id);
    E.tocar(s);
  };

  /* ---------- Versión básica: tengo, gasté, cobré, ¿puedo comprar? ---------- */
  E.modo = s => (s.config && s.config.modo) || 'completo';

  /* Cuánto entra y sale por mes, mirando hasta los últimos 90 días. Con menos de 14 días de historia no se estima. */
  E.agregarTarjeta = (s, nombre) => {
    /* En la versión básica todas las tarjetas se pagan el 1: lo de este mes se paga el 1 del mes que viene. */
    const t = { id: E.uid(), nombre: nombre.trim(), cierre: 31, vence: 1 };
    s.tarjetas.push(t);
    E.tocar(s);
    return t;
  };
  E.renombrarTarjeta = (s, id, nombre) => {
    const t = E.tarjeta(s, id);
    if (t) t.nombre = nombre.trim();
    E.tocar(s);
  };
  E.tarjetaEnUso = (s, id) => s.compras.some(c => c.medio === id);
  E.borrarTarjeta = (s, id) => {
    s.tarjetas = s.tarjetas.filter(t => t.id !== id);
    Object.keys(s.resumenes).filter(k => k.startsWith(id + ':')).forEach(k => { delete s.resumenes[k]; });
    E.tocar(s);
  };

  /* El próximo 1 con algo para pagar, sumando todas las tarjetas. */
  E.proximoPagoBasico = (s, hoy = E.hoyISO()) => {
    const rs = s.tarjetas.map(t => E.proximoDeTarjeta(s, t.id, hoy)).filter(r => r.restante >= 1);
    if (!rs.length) return { total: 0, vence: null, porTarjeta: [], vencido: false };
    const vence = rs.map(r => r.vence).sort()[0];
    const del = rs.filter(r => r.vence === vence);
    return { vence, total: suma(del, r => r.restante), porTarjeta: del, vencido: vence < hoy };
  };

  E.comprometidoBasico = (s, hoy = E.hoyISO(), n = 6) => {
    const filas = [];
    for (let i = 0; i <= n; i++) {
      const ym = sumarMes(ymDe(hoy), i);
      const por = s.tarjetas.map(t => E.resumen(s, t.id, ym, hoy)).filter(r => r.restante >= 1);
      const total = suma(por, r => r.restante);
      if (total >= 1) filas.push({ ym, vence: fechaEn(ym, 1), total, por, vencido: fechaEn(ym, 1) < hoy });
    }
    return filas;
  };

  E.ritmoBasico = (s, hoy = E.hoyISO()) => {
    const gastos = s.compras.map(c => ({ fecha: c.fecha, monto: montoQueCuenta(c) }));
    const cobros = (s.otrosIngresos || []).map(c => ({ fecha: c.fecha, monto: c.monto }));
    const todas = [...gastos, ...cobros].map(x => x.fecha).sort();
    if (!todas.length) return { dias: 0, gastoMes: null, cobroMes: null, ahorroMes: null };
    const dias = Math.min(90, Math.max(1, difDias(todas[0], hoy) + 1));
    if (dias < 14) return { dias, gastoMes: null, cobroMes: null, ahorroMes: null };
    const desde = sumarDias(hoy, -dias);
    const enVentana = l => suma(l.filter(x => x.fecha > desde), x => x.monto);
    const gastoMes = (enVentana(gastos) / dias) * 30, cobroMes = (enVentana(cobros) / dias) * 30;
    return { dias, gastoMes, cobroMes, ahorroMes: cobroMes - gastoMes };
  };

  E.resumenBasico = (s, hoy = E.hoyISO()) => {
    const ym = ymDe(hoy);
    const gastos = s.compras.filter(c => ymDe(c.fecha) === ym);
    const cobros = (s.otrosIngresos || []).filter(c => ymDe(c.fecha) === ym);
    const gastado = suma(gastos, montoQueCuenta), cobrado = suma(cobros, c => c.monto);
    const noNec = suma(gastos.filter(c => c.clase !== 'necesario'), montoQueCuenta);
    const balance = cobrado - gastado;
    let estado = 'bien', etiqueta = 'Vas bien';
    if (gastado === 0 && cobrado === 0) { estado = 'neutro'; etiqueta = 'Sin movimientos'; }
    else if (balance < 0) { estado = 'mal'; etiqueta = 'Gastás más de lo que cobrás'; }
    const tengo = E.saldoCaja(s), pago = E.proximoPagoBasico(s, hoy);
    return { ym, tengo, pago, libre: tengo - pago.total, gastado, cobrado, balance, estado, etiqueta, pctNoNecesario: gastado > 0 ? Math.round((noNec / gastado) * 100) : null };
  };

  E.evaluarBasico = (s, monto, hoy = E.hoyISO()) => {
    const tengo = E.saldoCaja(s), r = E.ritmoBasico(s, hoy), pago = E.proximoPagoBasico(s, hoy);
    const libre = tengo - pago.total;
    const separado = pago.total >= 1 ? ` Ya descontaste ${E.fmt(pago.total)} de tarjetas del ${fechaCorta(pago.vence)}.` : '';
    if (monto <= libre) {
      const queda = libre - monto;
      if (r.gastoMes != null && queda < r.gastoMes) {
        return { veredicto: 'justo', titulo: 'Te alcanza, pero quedás justo', detalle: `Te quedarían ${E.fmt(queda)} y gastás unos ${E.fmt(r.gastoMes)} por mes.${separado}` };
      }
      return { veredicto: 'si', titulo: 'Sí, te alcanza', detalle: `Te quedarían ${E.fmt(queda)}.${separado}` };
    }
    if (s.tarjetas.length && r.ahorroMes != null && r.ahorroMes >= 1) {
      const m0 = ymDe(hoy);
      const comprometido = ym => suma(s.tarjetas.map(t => E.resumen(s, t.id, ym, hoy)), x => x.restante);
      for (const n of [3, 6, 12]) {
        const cuota = monto / n;
        let entra = true;
        for (let i = 1; i <= n; i++) if (cuota > r.ahorroMes - comprometido(sumarMes(m0, i))) { entra = false; break; }
        if (entra) return { veredicto: 'cuotas', titulo: `En 1 pago no. En ${n} cuotas sí`, detalle: `Serían ${n} cuotas de ${E.fmt(cuota)} con tarjeta. Te sobran unos ${E.fmt(r.ahorroMes)} por mes.${separado}` };
      }
    }
    const falta = monto - Math.max(0, libre);
    if (r.ahorroMes != null && r.ahorroMes >= 1) {
      const meses = Math.ceil(falta / r.ahorroMes);
      const cuando = sumarMes(ymDe(hoy), meses);
      return { veredicto: 'desde', titulo: 'Todavía no te alcanza', detalle: `Te faltan ${E.fmt(falta)}. A tu ritmo, te sobran unos ${E.fmt(r.ahorroMes)} por mes: llegarías en ${mesAnio(cuando)}.` };
    }
    if (r.ahorroMes != null) {
      return { veredicto: 'no', titulo: 'No te alcanza', detalle: `Te faltan ${E.fmt(falta)}, y hoy gastás tanto o más de lo que cobrás.` };
    }
    return { veredicto: 'no', titulo: 'No te alcanza', detalle: `Te faltan ${E.fmt(falta)}.` };
  };

  /* ---------- Estado inicial vacío ---------- */
  E.estadoVacio = (hoy = E.hoyISO()) => ({
    v: 1, rev: 1,
    config: {
      modo: 'basico', inicio: ymDe(hoy), tc: 1480, tcFecha: hoy, tope: 0, ingresoManual: null, ultimaCopia: null,
      sueldo: null, sueldoDia: 10, comisionDia: 25,
      comision: { descuento: 0, niveles: [] }
    },
    tarjetas: [],
    compras: [], resumenes: {}, deudas: [], fijos: [], aprendido: {}, espera: [], ahorro: 0, plan: null,
    cobros: { items: [], pagos: [] }, otrosIngresos: [],
    caja: { movs: [] }
  });

  root.AlDia = E;
})(typeof window !== 'undefined' ? window : globalThis);
