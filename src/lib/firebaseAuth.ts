// Firebase Auth — само за админ панела и входа (/login-vip). Отделно от firebase.ts, за да не се зарежда на
// публичните страници: getAuth() тегли ~100 KB скриптове от Google (iframe.js, gapi) при всяко отваряне.
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

export const auth = getAuth(app);
