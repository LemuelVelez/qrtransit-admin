/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { checkIsAdmin, getCurrentUser } from "@/lib/appwrite"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        const isAdmin = await checkIsAdmin()

        if (!currentUser || !isAdmin) {
          router.push("/login")
          return
        }

        setUser(currentUser)
      } catch (error) {
        console.error("Authentication error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: "var(--color-body)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
          <p className="text-sm tagline-fade" style={{ color: "var(--color-content)" }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>
}

