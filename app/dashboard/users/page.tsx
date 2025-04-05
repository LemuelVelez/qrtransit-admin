"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, UserCog, UserX, UserCheck, Loader2 } from "lucide-react"
import { getAllUsers, updateUserRole } from "@/lib/appwrite"
import { formatDate } from "@/lib/utils"
import { UserRoleDialog } from "@/components/user-role-dialog"

interface User {
  id: string
  userId: string
  firstname: string
  lastname: string
  username: string
  email: string
  phonenumber: string
  role: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setFilteredUsers(allUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.firstname.toLowerCase().includes(query) ||
          user.lastname.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phonenumber.includes(query),
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsUpdating(true)
    try {
      await updateUserRole(userId, newRole)

      // Update local state
      setUsers(users.map((user) => (user.userId === userId ? { ...user, role: newRole } : user)))
      setFilteredUsers(filteredUsers.map((user) => (user.userId === userId ? { ...user, role: newRole } : user)))
      setShowRoleDialog(false)
    } catch (error) {
      console.error("Error updating user role:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "conductor":
        return "secondary"
      case "inspector":
        return "accent"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts and roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Username</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstname} {user.lastname}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.username}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.phonenumber}</TableCell>
                        <TableCell>
                          <Badge className="text-white" variant={getRoleBadgeVariant(user.role)}>{user.role || "passenger"}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-primary text-white">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowRoleDialog(true)
                                }}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              {user.role !== "conductor" ? (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.userId, "conductor")}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Make Conductor
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.userId, "passenger")}>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Remove Conductor Role
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <UserRoleDialog
          user={selectedUser}
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          onRoleChange={handleRoleChange}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}

