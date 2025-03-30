import { Client, Account, Databases, Avatars, Query, Storage } from "appwrite";

export const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  avatarBucketId: process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID,
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

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
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

export async function getAllUsers() {
  try {
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!
    );

    return users.documents.map((user) => ({
      id: user.$id,
      userId: user.userId,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      phonenumber: user.phonenumber,
      role: user.role || "passenger",
      createdAt: user.$createdAt,
    }));
  } catch (error) {
    console.error("Get all users error:", error);
    throw error;
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

export async function confirmPasswordReset(
  userId: string,
  secret: string,
  password: string
) {
  try {
    // The issue is that the account.updateRecovery method expects only 3 parameters
    // but we're passing 4. Let's fix that by using the correct method signature.
    await account.updateRecovery(userId, secret, password);
    return { success: true };
  } catch (error) {
    console.error("Password reset confirmation error:", error);
    throw error;
  }
}
