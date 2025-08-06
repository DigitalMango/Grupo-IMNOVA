// Configuración e inicialización de Firebase para uso con scripts CDN
// Incluye este archivo después de los scripts de Firebase en tu HTML

var firebaseConfig = {
  apiKey: "AIzaSyB0U75g6quPZIss7oK8Dyb3J3847iOeyKU",
  authDomain: "grupo-imnova.firebaseapp.com",
  projectId: "grupo-imnova",
  storageBucket: "grupo-imnova.appspot.com",
  messagingSenderId: "94521506018",
  appId: "1:94521506018:web:70e3856b23f7e818d346bb",
  measurementId: "G-WC1NG06J19"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
  firebase.analytics();
} 