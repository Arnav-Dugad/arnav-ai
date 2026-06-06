import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut as fbOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, limit, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBA0_MCIYEWGuZyk_fYZWngtKVY7Pwnf8I",
  authDomain: "arnavai-e9446.firebaseapp.com",
  projectId: "arnavai-e9446",
  storageBucket: "arnavai-e9446.firebasestorage.app",
  messagingSenderId: "1045376806966",
  appId: "1:1045376806966:web:50d74fca783a0a61f3a897",
  measurementId: "G-98H8SQH0NN"
};

const MODEL_API_URL  = "https://arnavdug-arnav-ai.hf.space/chat";
const MODEL_NAME     = "Arnav AI";
const STRIPE_PK      = "pk_test_51TeJPqRM4RXOuINwROniWawUvZ9UgsldZD5t9cv2mMUdQfUpOph49nKnQsNe8SZ1NfQXY02N2RInJt8SDtUe7gZb00uN3FWd1W";

// Stripe server: local when developing, HuggingFace in production
const _isLocal = ['localhost','127.0.0.1',''].includes(window.location.hostname);
const BACKEND_BASE = _isLocal
  ? 'http://localhost:3001'
  : 'https://arnavdug-arnav-ai.hf.space';

const fb   = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db   = getFirestore(fb);
const gp   = new GoogleAuthProvider();

window._auth=auth; window._fbOut=fbOut;
window._signIn=signInWithEmailAndPassword;
window._signUp=createUserWithEmailAndPassword;
window._gp=gp; window._gPop=signInWithPopup;
window._upPro=updateProfile;
window.API_URL=MODEL_API_URL;
window.BACKEND_URL=BACKEND_BASE;
window.STRIPE_PK=STRIPE_PK;
window.MODEL=MODEL_NAME;
document.getElementById('model-name').textContent=MODEL_NAME;

// Firestore helpers exposed for main script
window._db=db;
window._fsDoc=(...a)=>doc(...a);
window._fsColl=(...a)=>collection(...a);
window._fsSet=(...a)=>setDoc(...a);
window._fsGetDoc=(...a)=>getDoc(...a);
window._fsGetAll=(...a)=>getDocs(...a);
window._fsDel=(...a)=>deleteDoc(...a);
window._fsQuery=(...a)=>query(...a);
window._fsOrderBy=(...a)=>orderBy(...a);
window._fsLimit=n=>limit(n);
window._fsTimestamp=serverTimestamp;
window._fsIncrement=n=>increment(n);

// 5-second fallback in case Firebase is slow
const _fbFb = setTimeout(()=>onLogout(), 5000);
onAuthStateChanged(auth, u => {
  clearTimeout(_fbFb);
  u ? onLogin(u) : onLogout();
});
