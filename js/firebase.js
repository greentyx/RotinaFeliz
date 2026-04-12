/**
 * firebase.js — Configuração centralizada do Firebase
 *
 * 🔒 SEGURANÇA:
 * As chaves abaixo são públicas por natureza em aplicações web Firebase.
 * A proteção real vem de duas fontes:
 *   1. Regras do Firestore — só usuários autenticados acessam os dados
 *   2. Restrição de domínio na API Key — configure em:
 *      console.cloud.google.com → APIs & Services → Credentials → sua chave
 *      Em "Application restrictions" selecione "HTTP referrers (websites)"
 *      e adicione apenas: https://rotina-feliz.vercel.app/*
 *
 * ⚠️  COMO USAR:
 * 1. Acesse https://console.firebase.google.com
 * 2. Configurações do projeto → Seus aplicativos → Web (</>)
 * 3. Copie o objeto firebaseConfig e substitua abaixo
 *
 * Este arquivo é importado como módulo ES em todas as páginas.
 * Exemplo de uso numa página HTML:
 *
 *   <script type="module">
 *     import { auth, db, storage } from './js/firebase.js';
 *     // use auth, db, storage normalmente
 *   </script>
 */

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth,
         onAuthStateChanged,
         signOut,
         updatePassword,
         deleteUser,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword }
                                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore,
         collection, doc,
         addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
         query, where, orderBy,
         onSnapshot }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage,
         ref, uploadBytes, getDownloadURL }
                                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── SUBSTITUA AQUI com suas credenciais ─────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCe-c-p0N0fUF5gSGHDDaVHv9IqWPKuAyQ",
  authDomain: "rotinafelizac.firebaseapp.com",
  projectId: "rotinafelizac",
  storageBucket: "rotinafelizac.firebasestorage.app",
  messagingSenderId: "571656067722",
  appId: "1:571656067722:web:1c2d43f11a372ce8edeb73",
  measurementId: "G-8Z6JPRG7H7"
};
// ────────────────────────────────────────────────────────────

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Re-export Auth helpers
export { onAuthStateChanged, signOut, updatePassword, deleteUser,
         createUserWithEmailAndPassword, signInWithEmailAndPassword };

// Re-export Firestore helpers
export { collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
         query, where, orderBy, onSnapshot };

// Re-export Storage helpers
export { ref, uploadBytes, getDownloadURL };
