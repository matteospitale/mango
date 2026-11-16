/* Mango: datos inventados para la muestra pública (?demo). Nada de esto es de una persona real. */
(function () {
  'use strict';
  window.mangoDemo = (E, hoy) => {
    const dia = n => E.sumarDias(hoy, -n);
    const s = E.estadoVacio(dia(60));
    s.config.modo = 'completo';
    s.config.tope = 650000;
    s.config.tc = 1500;
    s.config.blue = { venta: 1565, compra: 1545, actualizado: null, fecha: hoy, traido: new Date().toISOString() };
    s.config.importados = ['sin-ingresos'];
    s.tarjetas = [
      { id: 'visa', nombre: 'Visa', cierre: 20, vence: 2, venceHasta: 4 },
      { id: 'master', nombre: 'Mastercard', cierre: 20, vence: 2, venceHasta: 4 },
      { id: 'mp', nombre: 'Mercado Pago', cierre: 8, vence: 18 }
    ];
    s.config.inicio = E.ymDe(hoy);
    const desde = E.sumarMes(E.ymDe(hoy), 1);
    s.fijos = [
      { id: 'f1', nombre: 'Netflix', monto: 11999, medio: 'visa', activo: true, desde },
      { id: 'f2', nombre: 'Spotify', monto: 6499, medio: 'master', activo: true, desde },
      { id: 'f3', nombre: 'Gimnasio', monto: 38000, medio: 'transferencia', activo: true }
    ];

    E.ajustarCaja(s, 180000, dia(45));
    E.registrarEntrada(s, { monto: 950000, fecha: dia(12), origen: 'otroTrabajo', nota: 'Sueldo' });

    /* Compras de las últimas semanas, todas después del último cierre de cada tarjeta. */
    const compra = (dias, nombre, monto, medio, cuotas = 1) => {
      const fecha = dia(dias);
      const a = E.clasificar(s, { nombre, monto, cuotas }, fecha);
      E.agregarCompra(s, { nombre, monto, cuotas, medio, fecha, clase: a.clase, motivo: a.motivo, fuente: a.fuente });
    };
    const ultimoCierre = c => { const ym = E.ymDe(hoy); return Number(hoy.slice(8)) > c ? E.fechaEn(ym, c) : E.fechaEn(E.sumarMes(ym, -1), c); };
    const visaDias = Math.max(1, E.difDias(ultimoCierre(20), hoy) - 1);
    const lim = n => Math.min(n, visaDias);
    compra(lim(24), 'Supermercado Coto', 68450, 'visa');
    compra(lim(20), 'Zapatillas', 189000, 'visa', 6);
    compra(lim(16), 'Cine', 18500, 'visa');
    compra(lim(13), 'Rappi', 21300, 'visa');
    compra(lim(10), 'Farmacia', 15200, 'master');
    compra(lim(9), 'Auriculares', 96000, 'master', 3);
    compra(lim(7), 'Uber', 8900, 'visa');
    compra(lim(6), 'PedidosYa', 17450, 'visa');
    compra(lim(4), 'Libro', 24900, 'master');
    compra(lim(3), 'Uber', 7600, 'visa');
    compra(lim(2), 'Rappi', 19800, 'visa');
    compra(2, 'Verdulería', 9400, 'efectivo');
    compra(1, 'Café', 4800, 'efectivo');
    compra(0, 'Colectivo', 2400, 'efectivo');
    const mpDias = Math.max(1, E.difDias(ultimoCierre(8), hoy) - 1);
    compra(Math.min(5, mpDias), 'Mercado Libre', 54000, 'mp', 3);

    /* Deudas con gente, una en pesos y otra en dólares. */
    const lu = E.nuevaDeuda(s, { nombre: 'Lucía', moneda: 'ARS', monto: 350000, fecha: dia(50), nota: 'Me prestó para la tarjeta' });
    E.pagarDeuda(s, { id: lu.id, monto: 100000, moneda: 'ARS', fecha: dia(11), nota: '' });
    E.nuevaDeuda(s, { nombre: 'Tío Jorge', moneda: 'USD', monto: 400, fecha: dia(40), nota: 'Préstamo en dólares' });

    E.agregarEspera(s, { nombre: 'Consola', monto: 950000 }, dia(1));
    E.tocar(s);
    return s;
  };
})();
