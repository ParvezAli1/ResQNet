import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
apiKey: "AIzaSyBnmkaCZd1E-fQgZtR1UPoFUqpMJHDDBQw",
  authDomain: "resqnet-48c9c.firebaseapp.com",
  databaseURL: "https://resqnet-48c9c-default-rtdb.firebaseio.com",
  projectId: "resqnet-48c9c",
  storageBucket: "resqnet-48c9c.firebasestorage.app",
  messagingSenderId: "767225483005",
  appId: "1:767225483005:web:5d78e722677109750d3894"

};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
