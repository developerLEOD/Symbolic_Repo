import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, ProductVariant } from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned as T;
}

export async function fetchCategories(): Promise<Category[]> {
  const path = "categories";
  try {
    const q = query(collection(db, path), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const path = "products";
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const path = `products/${productId}/variants`;
  try {
    const snapshot = await getDocs(collection(db, "products", productId, "variants"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductVariant));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveProductWithVariants(
  product: Product,
  variants: ProductVariant[] = []
): Promise<void> {
  const productPath = `products/${product.id}`;
  try {
    const cleanedProduct = cleanUndefined(product);
    // 1. Save main product document
    const productRef = doc(db, "products", product.id);
    await setDoc(productRef, cleanedProduct, { merge: true });

    // 2. Save variants if any
    if (variants.length > 0) {
      const batch = writeBatch(db);
      for (const variant of variants) {
        const cleanedVariant = cleanUndefined(variant);
        const variantRef = doc(db, "products", product.id, "variants", variant.id);
        batch.set(variantRef, cleanedVariant, { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, productPath);
  }
}

export async function deleteProductAndVariants(productId: string): Promise<void> {
  const productPath = `products/${productId}`;
  try {
    // Delete existing variants
    const variantsSnapshot = await getDocs(collection(db, "products", productId, "variants"));
    const batch = writeBatch(db);
    variantsSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, "products", productId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, productPath);
  }
}

export async function toggleProductAvailability(productId: string, availability: boolean): Promise<void> {
  const productPath = `products/${productId}`;
  try {
    const productRef = doc(db, "products", productId);
    await setDoc(productRef, { availability }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, productPath);
  }
}
