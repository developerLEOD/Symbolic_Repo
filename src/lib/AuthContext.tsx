import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "../types";
import { generateUserReferralCode } from "./referralService";
import firebaseConfig from "../../firebase-applet-config.json";

const OWNER_EMAILS = [
  "araizhasan60@gmail.com",
  "araizhasan00@gmail.com",
  "developertwl@gmail.com",
  "araizhasan41@gmail.com",
  "araizhasan@gmail.com",
  "thewisdomlounge1@gmail.com",
  "thewisdomlounge@gmail.com"
];

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    OWNER_EMAILS.includes(clean) ||
    clean.includes("araizhasan") ||
    clean.includes("developertwl") ||
    clean.includes("thewisdomlounge") ||
    clean.startsWith("araiz")
  );
}

export function isFirestoreQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Quota limit exceeded") ||
    msg.includes("Quota exceeded") ||
    msg.includes("Free daily read units per project") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota metric")
  );
}

const FIRESTORE_DATABASE_ID = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-thewisdomlounges-09c3c7a7-cb51-4db8-8c7f-e9bf914e0d10";
const FIRESTORE_PROJECT_ID = firebaseConfig.projectId || "gen-lang-client-0709348781";

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${FIRESTORE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

function getCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`sym_user_cached_profile_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCachedProfile(profile: UserProfile) {
  if (typeof window === "undefined" || !profile?.uid) return;
  try {
    localStorage.setItem(`sym_user_cached_profile_${profile.uid}`, JSON.stringify(profile));
  } catch {}
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isOwner: boolean;
  loading: boolean;
  isQuotaExceeded: boolean;
  quotaUpgradeUrl: string;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  formatAuthError: (error: any) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const quotaExceededRef = useRef<boolean>(false);

  const isOwner = Boolean(
    (user?.email && isOwnerEmail(user.email)) ||
    (userProfile?.role === "admin") ||
    (userProfile?.email && isOwnerEmail(userProfile.email))
  );

  // Sync user profile document with robust local fallback during quota exhaustion
  const syncUserProfile = async (firebaseUser: User, additionalData?: Partial<UserProfile>) => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      const userRole = isOwnerEmail(firebaseUser.email) ? "admin" : "customer";

      if (!userDoc.exists()) {
        const generatedCode = generateUserReferralCode({
          uid: firebaseUser.uid,
          displayName: additionalData?.displayName || firebaseUser.displayName,
          email: firebaseUser.email
        });

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: additionalData?.displayName || firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          phone: additionalData?.phone || firebaseUser.phoneNumber || "",
          role: userRole,
          referralCode: generatedCode,
          referralsCount: 0,
          referralVisitsCount: 0,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          ...additionalData
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        saveCachedProfile(newProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("sym_user_referral_code", generatedCode);
        }
      } else {
        const existingData = userDoc.data() as UserProfile;
        const userReferralCode = existingData.referralCode || generateUserReferralCode({
          uid: firebaseUser.uid,
          displayName: existingData.displayName || firebaseUser.displayName,
          email: firebaseUser.email
        });

        const updatedData: UserProfile = {
          ...existingData,
          role: userRole,
          referralCode: userReferralCode,
          referralsCount: typeof existingData.referralsCount === "number" ? existingData.referralsCount : 0,
          referralVisitsCount: typeof existingData.referralVisitsCount === "number" ? existingData.referralVisitsCount : 0,
          lastLoginAt: Date.now(),
          ...(additionalData || {})
        };
        await updateDoc(userDocRef, {
          role: userRole,
          referralCode: userReferralCode,
          lastLoginAt: Date.now(),
          ...(additionalData || {})
        });
        setUserProfile(updatedData);
        saveCachedProfile(updatedData);
        if (typeof window !== "undefined" && userReferralCode) {
          localStorage.setItem("sym_user_referral_code", userReferralCode);
        }
      }
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        setIsQuotaExceeded(true);
        quotaExceededRef.current = true;
        console.warn("Firestore daily free read quota reached. Operating seamlessly in offline profile mode.");
      } else {
        console.warn("User profile sync fallback:", err);
      }

      // Check for previously cached profile
      const cached = getCachedProfile(firebaseUser.uid);
      if (cached) {
        const combinedProfile: UserProfile = {
          ...cached,
          email: firebaseUser.email || cached.email,
          displayName: cached.displayName || firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || cached.photoURL,
          role: isOwnerEmail(firebaseUser.email) ? "admin" : (cached.role || "customer"),
        };
        setUserProfile(combinedProfile);
        saveCachedProfile(combinedProfile);
        return;
      }

      // Fallback profile from auth object
      const fallbackCode = generateUserReferralCode({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email
      });
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "",
        photoURL: firebaseUser.photoURL || "",
        role: isOwnerEmail(firebaseUser.email) ? "admin" : "customer",
        referralCode: fallbackCode,
        referralsCount: 0,
        referralVisitsCount: 0
      };
      setUserProfile(fallbackProfile);
      saveCachedProfile(fallbackProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem("sym_user_referral_code", fallbackCode);
      }
    }
  };

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (currentUser) {
        await syncUserProfile(currentUser);

        // Only attach live real-time listener if quota is not exceeded
        if (!quotaExceededRef.current) {
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            profileUnsub = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const data = snap.data() as UserProfile;
                setUserProfile((prev) => {
                  const updated: UserProfile = {
                    ...(prev || {}),
                    ...data,
                    uid: currentUser.uid,
                    referralsCount: typeof data.referralsCount === "number" ? data.referralsCount : 0,
                    referralVisitsCount: typeof data.referralVisitsCount === "number" ? data.referralVisitsCount : 0
                  };
                  saveCachedProfile(updated);
                  return updated;
                });
                if (data.referralCode && typeof window !== "undefined") {
                  localStorage.setItem("sym_user_referral_code", data.referralCode);
                }
              }
            }, (err) => {
              if (isFirestoreQuotaExceededError(err)) {
                setIsQuotaExceeded(true);
                quotaExceededRef.current = true;
                console.warn("User profile snapshot: Firestore free quota reached. Operating in offline cache mode.");
              } else {
                console.warn("User profile snapshot warning:", err);
              }
            });
          } catch (snapshotErr) {
            console.warn("Could not initiate profile snapshot listener:", snapshotErr);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncUserProfile(credential.user);
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name?.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    await syncUserProfile(credential.user, { displayName: name?.trim() });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    await syncUserProfile(result.user);
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("No authenticated user found");
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, data);
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        setIsQuotaExceeded(true);
        quotaExceededRef.current = true;
        console.warn("Firestore write quota exceeded; updating local profile state.");
      } else {
        throw err;
      }
    }
    setUserProfile(prev => {
      const updated = prev ? { ...prev, ...data } : null;
      if (updated) saveCachedProfile(updated);
      return updated;
    });
  };

  const formatAuthError = (error: any): string => {
    if (!error) return "An unexpected error occurred.";
    const code = error.code || error.message || "";
    
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try signing in.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed before completing.";
      case "auth/popup-blocked":
        return "Sign-in popup was blocked by your browser. Please allow popups.";
      case "auth/unauthorized-domain":
        return `Domain not authorized (${window.location.hostname}). Add this domain in Firebase Console > Authentication > Settings > Authorized domains.`;
      case "auth/network-request-failed":
        return "Network connection issue. Please check your internet connection.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later or reset password.";
      default:
        return error.message || "Authentication failed. Please try again.";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isOwner,
        loading,
        isQuotaExceeded,
        quotaUpgradeUrl: FIRESTORE_UPGRADE_URL,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
        sendPasswordReset,
        updateUserProfileData,
        formatAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
