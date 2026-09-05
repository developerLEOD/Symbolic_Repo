import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalAutoDetectLongPolling to ensure connectivity in preview sandboxes and proxy environments
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  (firebaseConfig as any).firestoreDatabaseId || "(default)"
);

export const auth = getAuth(app);

// Verify connection as specified in Firebase guidelines with graceful offline detection
async function testConnection() {
  try {
    // Delay connection verification slightly to allow web channel initialization
    setTimeout(async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        const message = error?.message || String(error);
        if (message.includes('the client is offline') || message.includes('unavailable')) {
          console.info("Firestore: Operating with offline persistence/connecting in background.");
        }
      }
    }, 1500);
  } catch {
    // Silent catch
  }
}
testConnection();

