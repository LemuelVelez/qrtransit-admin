import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function Home() {
  // Fix: Add await to cookies() since it returns a Promise
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("appwrite-session")

  if (authCookie) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }

  return null
}

