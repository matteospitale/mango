/* Mango: cuenta de Google y datos en la nube.
   Esta configuración es pública por diseño de Firebase. Lo que protege los datos son las reglas del proyecto:
   cada cuenta autorizada lee y escribe solo lo suyo, y nadie más entra. */
(function () {
  'use strict';
  const CONFIG = {
    apiKey: 'AIzaSyDY-iw0cm46k9IhvaCUEopB2QRcArSl-u4',
    authDomain: 'mango-f9af1.firebaseapp.com',
    projectId: 'mango-f9af1',
    storageBucket: 'mango-f9af1.firebasestorage.app',
    messagingSenderId: '323314168443',
    appId: '1:323314168443:web:f272ecad073e35c8fa68de'
  };
  const BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';
  let A, F, auth, db, uid = null, escuchas = [], temporizador = null, ultimo = null;
  let estadoGuardado = null, mesesGuardados = {};
  const N = {};

  N.iniciar = async ({ alUsuario }) => {
    const [ap, au, fs] = await Promise.all([import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')]);
    A = au; F = fs;
    const app = ap.initializeApp(CONFIG);
    auth = au.getAuth(app);
    auth.languageCode = 'es';
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    au.onAuthStateChanged(auth, alUsuario);
  };

  N.entrar = () => {
    const p = new A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return A.signInWithPopup(auth, p);
  };

  N.escuchar = (usuarioId, { alEstado, alCompras, alError }) => {
    N.dejarDeEscuchar();
    uid = usuarioId;
    estadoGuardado = null; mesesGuardados = {};
    const dEstado = F.doc(db, 'usuarios', uid, 'datos', 'estado');
    const cCompras = F.collection(db, 'usuarios', uid, 'compras');
    /* includeMetadataChanges: avisa también cuando el servidor confirma lo que había en el dispositivo, aunque no haya cambiado nada. Sin esto, una cuenta vacía se queda esperando. */
    const opciones = { includeMetadataChanges: true };
    escuchas.push(F.onSnapshot(dEstado, opciones, snap => {
      if (snap.metadata.hasPendingWrites) return;
      alEstado(snap.exists() ? snap.data() : null, snap.metadata);
    }, alError));
    escuchas.push(F.onSnapshot(cCompras, opciones, snap => {
      if (snap.metadata.hasPendingWrites) return;
      const meses = {};
      snap.forEach(d => { meses[d.id] = d.data().items || []; });
      alCompras(meses, snap.metadata);
    }, alError));
  };

  N.dejarDeEscuchar = () => { escuchas.forEach(u => u()); escuchas = []; };

  N.haySinGuardar = () => temporizador !== null;

  /* Guarda lo que cambió. Sin internet queda en cola y sale solo cuando vuelve la conexión. */
  N.guardar = (estado, alError) => {
    ultimo = { estado, alError };
    clearTimeout(temporizador);
    temporizador = setTimeout(volcar, 300);
  };

  const volcar = () => {
    clearTimeout(temporizador);
    temporizador = null;
    if (!ultimo || !uid) return;
    const { estado, alError } = ultimo;
    const limpio = JSON.parse(JSON.stringify(estado));
    const compras = limpio.compras || [];
    delete limpio.compras;
    const porMes = {};
    compras.forEach(c => { const m = c.fecha.slice(0, 7); (porMes[m] = porMes[m] || []).push(c); });
    const error = e => { if (alError) alError(e); };
    for (const m of new Set([...Object.keys(porMes), ...Object.keys(mesesGuardados)])) {
      const texto = JSON.stringify(porMes[m] || []);
      if (texto !== mesesGuardados[m]) {
        mesesGuardados[m] = texto;
        F.setDoc(F.doc(db, 'usuarios', uid, 'compras', m), { items: porMes[m] || [] }).catch(error);
      }
    }
    const textoEstado = JSON.stringify(limpio);
    if (textoEstado !== estadoGuardado) {
      estadoGuardado = textoEstado;
      F.setDoc(F.doc(db, 'usuarios', uid, 'datos', 'estado'), limpio).catch(error);
    }
  };
  N.volcarAhora = () => { if (temporizador !== null) volcar(); };

  /* Lo que llega de la nube ya está guardado: no hace falta volver a escribirlo. */
  N.fijarBase = (estado, meses) => {
    const copia = JSON.parse(JSON.stringify(estado));
    delete copia.compras;
    estadoGuardado = JSON.stringify(copia);
    mesesGuardados = {};
    Object.keys(meses).forEach(m => { mesesGuardados[m] = JSON.stringify(meses[m]); });
  };

  N.borrarTodo = async meses => {
    clearTimeout(temporizador);
    temporizador = null;
    ultimo = null;
    await Promise.all(Object.keys(meses).map(m => F.deleteDoc(F.doc(db, 'usuarios', uid, 'compras', m))));
    await F.deleteDoc(F.doc(db, 'usuarios', uid, 'datos', 'estado'));
    estadoGuardado = null; mesesGuardados = {};
  };

  /* Cerrar sesión también borra la copia que queda en este dispositivo. */
  N.salir = async () => {
    N.volcarAhora();
    N.dejarDeEscuchar();
    await A.signOut(auth);
    try { await F.terminate(db); await F.clearIndexedDbPersistence(db); } catch (e) { /* si otra pestaña la usa, se limpia al cerrarla */ }
    location.reload();
  };

  /* Quién puede entrar. Las reglas solo le permiten esto a la cuenta administradora. */
  N.listarAcceso = async () => (await F.getDocs(F.collection(db, 'acceso'))).docs.map(d => d.id).sort();
  N.agregarAcceso = email => F.setDoc(F.doc(db, 'acceso', email), { agregado: new Date().toISOString().slice(0, 10) });
  N.quitarAcceso = email => F.deleteDoc(F.doc(db, 'acceso', email));

  window.Nube = N;
})();
