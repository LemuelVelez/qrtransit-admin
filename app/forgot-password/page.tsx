/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { resetPassword } from "@/lib/appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#223366] to-[#1c2431] p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-[#fffaf5]">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 relative mb-2">
            <Image src="/QRTransit.png" alt="QR Transit Logo" fill className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-[#223366]">Forgot Password</CardTitle>
          <CardDescription className="text-center text-[#828db0]">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 bg-[#223366]/10 text-[#223366] border-[#223366]/20">
              <AlertDescription>
                Password reset email sent! Please check your inbox and follow the instructions.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#322416]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isLoading || success}
                className="bg-white/90 border-[#d1ccc1] text-[#322416]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#223366] hover:bg-[#1c2431] text-white"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-[#9c6a40] hover:text-[#223366]">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

