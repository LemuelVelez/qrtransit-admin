/* eslint-disable @typescript-eslint/no-explicit-any */
import { ID, Query } from "appwrite";
import { databases, config } from "@/lib/appwrite";

export type FareConfig = {
  id: string;
  fare: string;
  kilometer: string;
  active: boolean;
  description?: string;
  createdAt: string;
  busType?: string;
};

export type DiscountConfig = {
  id: string;
  passengerType: string;
  discountPercentage: string;
  description?: string;
  active: boolean;
  createdAt: string;
};

/** Helpers to check env presence (surface helpful UI messages) */
export const envHasFareCollection = () =>
  !!process.env.NEXT_PUBLIC_APPWRITE_FARE_COLLECTION_ID;
export const envHasDiscountsCollection = () =>
  !!process.env.NEXT_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID;

const getDb = () => {
  if (!config.databaseId)
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  return config.databaseId as string;
};
const getFareCol = () => {
  const id = process.env.NEXT_PUBLIC_APPWRITE_FARE_COLLECTION_ID;
  if (!id) throw new Error("Missing NEXT_PUBLIC_APPWRITE_FARE_COLLECTION_ID");
  return id;
};
const getDiscountsCol = () => {
  const id = process.env.NEXT_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID;
  if (!id)
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID");
  return id;
};

/* -------------------------- FARES -------------------------- */

export async function listFares(): Promise<FareConfig[]> {
  const db = getDb();
  const col = getFareCol();

  // Fetch up to 1000 (paged)
  const out: FareConfig[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const queries: any[] = [Query.limit(100), Query.orderAsc("kilometer")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(db, col, queries);
    const docs = res.documents || [];
    for (const d of docs as any[]) {
      out.push({
        id: d.$id,
        fare: String(d.fare ?? "0"),
        kilometer: String(d.kilometer ?? "0"),
        active: !!d.active,
        description: d.description || "",
        createdAt: d.$createdAt,
        busType:
          typeof d.busType === "string" && d.busType.trim()
            ? String(d.busType).trim()
            : undefined,
      });
    }
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  return out;
}

export async function createFare(data: {
  fare: string;
  kilometer: string;
  active: boolean;
  description?: string;
  busType?: string;
}): Promise<string> {
  const db = getDb();
  const col = getFareCol();

  const payload: any = {
    fare: String(data.fare ?? "0"),
    kilometer: String(data.kilometer ?? "0"),
    active: !!data.active,
    description: data.description || "",
  };
  if (data.busType && data.busType.trim())
    payload.busType = data.busType.trim();

  const res = await databases.createDocument(db, col, ID.unique(), payload);
  return res.$id;
}

export async function updateFare(
  id: string,
  data: Partial<{
    fare: string;
    kilometer: string;
    active: boolean;
    description?: string;
    busType?: string | undefined;
  }>
): Promise<void> {
  const db = getDb();
  const col = getFareCol();

  const payload: any = {};
  if (data.fare !== undefined) payload.fare = String(data.fare);
  if (data.kilometer !== undefined) payload.kilometer = String(data.kilometer);
  if (data.active !== undefined) payload.active = !!data.active;
  if (data.description !== undefined)
    payload.description = data.description ?? "";
  if (data.busType !== undefined) {
    const cleaned = String(data.busType || "").trim();
    payload.busType = cleaned.length ? cleaned : null; // clear when empty
  }

  await databases.updateDocument(db, col, id, payload);
}

export async function deleteFare(id: string): Promise<void> {
  const db = getDb();
  const col = getFareCol();
  await databases.deleteDocument(db, col, id);
}

/* ------------------------ DISCOUNTS ------------------------ */

export async function listDiscounts(): Promise<DiscountConfig[]> {
  const db = getDb();
  const col = getDiscountsCol();

  const out: DiscountConfig[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const queries: any[] = [Query.limit(100), Query.orderAsc("passengerType")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(db, col, queries);
    const docs = res.documents || [];
    for (const d of docs as any[]) {
      out.push({
        id: d.$id,
        passengerType: String(d.passengerType ?? ""),
        discountPercentage: String(
          d.discountPercentage !== undefined && d.discountPercentage !== null
            ? d.discountPercentage
            : "0"
        ),
        description: d.description || "",
        active: !!d.active,
        createdAt: d.$createdAt,
      });
    }
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  return out;
}

export async function createDiscount(data: {
  passengerType: string;
  discountPercentage: string;
  description?: string;
  active: boolean;
}): Promise<string> {
  const db = getDb();
  const col = getDiscountsCol();

  const payload = {
    passengerType: data.passengerType,
    discountPercentage: String(data.discountPercentage ?? "0"),
    description: data.description || "",
    active: !!data.active,
  };
  const res = await databases.createDocument(db, col, ID.unique(), payload);
  return res.$id;
}

export async function updateDiscount(
  id: string,
  data: Partial<{
    passengerType: string;
    discountPercentage: string;
    description?: string;
    active: boolean;
  }>
): Promise<void> {
  const db = getDb();
  const col = getDiscountsCol();

  const payload: any = {};
  if (data.passengerType !== undefined)
    payload.passengerType = data.passengerType;
  if (data.discountPercentage !== undefined)
    payload.discountPercentage = String(data.discountPercentage);
  if (data.description !== undefined)
    payload.description = data.description ?? "";
  if (data.active !== undefined) payload.active = !!data.active;

  await databases.updateDocument(db, col, id, payload);
}

export async function deleteDiscount(id: string): Promise<void> {
  const db = getDb();
  const col = getDiscountsCol();
  await databases.deleteDocument(db, col, id);
}
