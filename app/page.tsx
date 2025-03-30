import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default function Home() {
  // Check if user is logged in via cookie
  const authCookie = cookies().get("appwrite-session")

  if (authCookie) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }

  return null
}

