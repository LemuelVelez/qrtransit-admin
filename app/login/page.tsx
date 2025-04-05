/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { loginUser, getCurrentUser } from "@/lib/appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Check for active session on component mount
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const user = await getCurrentUser()

        // Only proceed if the component is still mounted
        if (!isMounted) return

        if (user) {
          // If user is admin, redirect to dashboard
          if (user.role === "admin") {
            router.push("/dashboard")
          } else {
            // For non-admin users, redirect to home
            router.push("/")
          }
        }
      } catch (err) {
        // If there's an error checking the session, we'll just continue with the login page
        console.error("Session check error:", err)
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    checkSession()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const user = await loginUser(username, password)

      if (user && user.role === "admin") {
        router.push("/dashboard")
      } else if (user) {
        // For non-admin users, redirect to home
        router.push("/")
      } else {
        setError("Login failed. Please check your credentials.")
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#223366] p-4">
        <div className="text-white flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#223366] p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-[#fffaf5]">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 relative mb-2">
            <Image src="/QRTransit.png" alt="QR Transit Logo" fill className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#223366]">Admin Login</CardTitle>
          <CardDescription className="text-center text-[#828db0]">
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-primary">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={isLoading}
                className=" text-black border-[#d1ccc1] focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-primary">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/30">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="pr-10 text-black border-[#d1ccc1] focus:border-primary focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-[#828db0] hover:text-[#223366]"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/70 text-white" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-center text-[#828db0]">QR-Coded Bus Ticketing System Admin Portal</p>
        </CardFooter>
      </Card>
    </div>
  )
}

