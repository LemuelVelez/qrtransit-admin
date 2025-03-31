/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserRoleDialogProps {
  user: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleChange: (userId: string, role: string) => Promise<void>
  isUpdating: boolean
}

export function UserRoleDialog({ user, open, onOpenChange, onRoleChange, isUpdating }: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "passenger")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // If changing to admin role, show confirmation dialog
    if (selectedRole === "admin" && user?.role !== "admin") {
      setShowConfirmDialog(true)
      return
    }

    // Otherwise proceed with the role change
    await onRoleChange(user.userId, selectedRole)
  }

  const confirmRoleChange = async () => {
    setShowConfirmDialog(false)
    await onRoleChange(user.userId, selectedRole)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {user?.firstname} {user?.lastname}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isUpdating}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passenger">Passenger</SelectItem>
                  <SelectItem value="conductor">Conductor</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Admin Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to give {user?.firstname} {user?.lastname} admin privileges? This will grant them
              full access to the admin dashboard and all system functions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

