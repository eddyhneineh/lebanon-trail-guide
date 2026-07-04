import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5sUMuE5BjAdN8vcUThsOEt1fvNTXCmVM",
  authDomain: "lebanon-trail-guide.firebaseapp.com",
  projectId: "lebanon-trail-guide",
  storageBucket: "lebanon-trail-guide.firebasestorage.app",
  messagingSenderId: "599191302968",
  appId: "1:599191302968:web:31ab578f8c638034f6c7cd",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
