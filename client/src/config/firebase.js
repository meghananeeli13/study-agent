import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCW9REIE-UPbscgxP2BofW-LUVduhx34YY",
  authDomain: "study-agent-9c159.firebaseapp.com",
  projectId: "study-agent-9c159",
  storageBucket: "study-agent-9c159.firebasestorage.app",
  messagingSenderId: "813538557634",
  appId: "1:813538557634:web:5710b848415d9b9911855b",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export { auth, googleProvider }