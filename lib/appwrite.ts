/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Account, Databases, Avatars, Query, Storage } from "appwrite";

export const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  avatarBucketId: process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID,
  // NEW: expose passenger photo bucket id for media manager
  passengerPhotoBucketId:
    process.env.NEXT_PUBLIC_APPWRITE_PASSENGER_PHOTO_BUCKET_ID,
  discountsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID,
};

// Initialize the Appwrite client
let client: Client;
let account: Account;
let databases: Databases;
let avatars: Avatars;
let storage: Storage;

// Initialize Appwrite on the client side only
if (typeof window !== "undefined") {
  client = new Client();
  client.setEndpoint(config.endpoint!).setProject(config.projectId!);
  account = new Account(client);
  databases = new Databases(client);
  avatars = new Avatars(client);
  storage = new Storage(client);
} else {
  // Server-side initialization
  client = new Client();
  client.setEndpoint(config.endpoint!).setProject(config.projectId!);
  account = new Account(client);
  databases = new Databases(client);
  avatars = new Avatars(client);
  storage = new Storage(client);
}

export { client, account, databases, avatars, storage };

export async function loginUser(username: string, password: string) {
  try {
    // Find the user with the provided username
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("username", username)]
    );

    // Check if user exists
    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const user = users.documents[0];

    // Create a session with the user's email and password
    const session = await account.createEmailPasswordSession(
      user.email,
      password
    );

    if (session) {
      // Get user account details
      const accountDetails = await account.get();

      // Set cookies for role-based access control
      // These will be accessible in middleware
      document.cookie = `user_role=${user.role ||
        "passenger"}; path=/; max-age=86400; secure; samesite=strict`;
      document.cookie = `user_id=${user.userId}; path=/; max-age=86400; secure; samesite=strict`;

      // Return user data
      return {
        ...accountDetails,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        phonenumber: user.phonenumber,
        role: user.role,
        avatar: avatars
          .getInitials(`${user.firstname} ${user.lastname}`)
          .toString(),
      };
    }

    return null;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    // Get the current session
    const currentSession = await account.getSession("current");

    // Delete the current session
    await account.deleteSession(currentSession.$id);

    // Clear role cookies
    document.cookie =
      "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    // This will throw an error if there's no active session
    const session = await account.getSession("current");
    return session;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // If there's an error, it means there's no active session
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      // Get additional user data from the database
      const users = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", result.$id)]
      );

      const userData = users.documents.length > 0 ? users.documents[0] : null;

      // Use stored avatar URL if available, otherwise use generated avatar
      const userAvatar = userData?.avatar
        ? userData.avatar
        : avatars
            .getInitials(
              `${userData?.firstname || ""} ${userData?.lastname || ""}`
            )
            .toString();

      return {
        ...result,
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        username: userData?.username,
        email: userData?.email,
        phonenumber: userData?.phonenumber,
        role: userData?.role,
        avatar: userAvatar,
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function checkIsAdmin() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) return false;

    // Find the user document
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      return false;
    }

    const userDocument = users.documents[0];

    // Check if user has admin role
    return userDocument.role === "admin";
  } catch (error) {
    console.error("Admin check error:", error);
    return false;
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    // Find the user document
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", userId)]
    );

    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const userDoc = users.documents[0];

    // Update the user's role
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDoc.$id,
      {
        role: role,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Update role error:", error);
    throw error;
  }
}

/**
 * Fetches ALL user documents in controlled batches to avoid overloading the API.
 * - Uses cursor-based pagination with a configurable batch size (default 100).
 * - Falls back to offset-based pagination if cursor is unsupported in the SDK version.
 * - Returns each user with `$createdAt` (ISO string) exposed as `createdAt` for display.
 */
export async function getAllUsers(batchSize = 100, maxPages = 100) {
  const mapUser = (user: any) => ({
    id: user.$id,
    userId: user.userId,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    email: user.email,
    phonenumber: user.phonenumber,
    role: user.role || "passenger",
    createdAt: user.$createdAt, // ISO 8601 string from Appwrite
  });

  // Try cursor-based pagination first
  try {
    const all: any[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const queries = [Query.limit(batchSize)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        queries
      );
      if (res.documents.length === 0) break;

      all.push(...res.documents);

      if (res.documents.length < batchSize) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }

    return all.map(mapUser);
  } catch (err) {
    console.warn(
      "[getAllUsers] Cursor pagination failed, falling back to offset pagination:",
      err
    );
    // Fallback: offset-based pagination
    const all: any[] = [];
    for (let page = 0; page < maxPages; page++) {
      const offset = page * batchSize;
      const res = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.limit(batchSize), Query.offset(offset)]
      );
      if (res.documents.length === 0) break;
      all.push(...res.documents);
      if (res.documents.length < batchSize) break;
    }
    return all.map(mapUser);
  }
}

export async function resetPassword(email: string) {
  try {
    // Use Appwrite's password recovery
    await account.createRecovery(
      email,
      `${window.location.origin}/reset-password`
    );
    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    throw error;
  }
}

export const confirmPasswordReset = async (
  userId: string,
  secret: string,
  password: string,
  confirmPassword: string
) => {
  // Validate that passwords match before calling the API
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  // The updateRecovery method only accepts 3 parameters
  await account.updateRecovery(userId, secret, password);
};

/**
 * Change password for the currently authenticated user.
 * Requires the user's current password for verification.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  if (!currentPassword || !newPassword) {
    throw new Error("Both current and new password are required.");
  }
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  try {
    // Appwrite JS SDK: updatePassword(newPassword, oldPassword)
    await account.updatePassword(newPassword, currentPassword);
    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
}
