/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { logoutUser } from "@/lib/appwrite"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { getInitials } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  Bus,
  CreditCard,
  Settings,
  BarChart3,
  QrCode,
  LogOut,
  User,
  DollarSign,
  Image as ImageIcon,
  Calculator, // ← added
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children, user }: { children: React.ReactNode; user: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Custom sidebar menu button with active background
  const CustomSidebarMenuButton = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<"a"> & {
      isActive?: boolean
      href: string
      icon: React.ElementType
      label: string
    }
  >(({ isActive, href, icon: Icon, label, className, ...props }, ref) => {
    return (
      <SidebarMenuItem>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
            className,
          )}
          ref={ref}
          {...props}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuItem>
    )
  })

  CustomSidebarMenuButton.displayName = "CustomSidebarMenuButton"

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex w-full min-h-screen">
        <Sidebar>
          <SidebarHeader className="bg-[hsl(var(--background))]">
            <div className="flex items-center gap-2 px-4 py-2">
              <QrCode className="h-6 w-6 text-[hsl(var(--primary))]" />
              <span className="font-bold text-lg text-[hsl(var(--foreground))]">QR Transit Admin</span>
            </div>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent className="bg-[hsl(var(--background))]">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[hsl(var(--muted-foreground))]">Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CustomSidebarMenuButton
                    href="/dashboard"
                    icon={LayoutDashboard}
                    label="Overview"
                    isActive={pathname === "/dashboard"}
                  />
                  <CustomSidebarMenuButton
                    href="/dashboard/analytics"
                    icon={BarChart3}
                    label="Analytics"
                    isActive={pathname === "/dashboard/analytics"}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[hsl(var(--muted-foreground))]">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CustomSidebarMenuButton
                    href="/dashboard/users"
                    icon={Users}
                    label="Users"
                    isActive={pathname === "/dashboard/users"}
                  />
                  <CustomSidebarMenuButton
                    href="/dashboard/routes"
                    icon={Bus}
                    label="Routes"
                    isActive={pathname === "/dashboard/routes"}
                  />
                  <CustomSidebarMenuButton
                    href="/dashboard/transactions"
                    icon={CreditCard}
                    label="Transactions"
                    isActive={pathname === "/dashboard/transactions"}
                  />
                  <CustomSidebarMenuButton
                    href="/dashboard/transaction-status"
                    icon={CreditCard}
                    label="Transaction Status"
                    isActive={pathname === "/dashboard/transaction-status"}
                  />
                  {/* NEW: Fare Management */}
                  <CustomSidebarMenuButton
                    href="/dashboard/fare-management"
                    icon={Calculator}
                    label="Fare Management"
                    isActive={pathname === "/dashboard/fare-management"}
                  />
                  <CustomSidebarMenuButton
                    href="/dashboard/bus-management"
                    icon={DollarSign}
                    label="Bus Management"
                    isActive={pathname === "/dashboard/bus-management"}
                  />
                  {/* Media manager */}
                  <CustomSidebarMenuButton
                    href="/dashboard/media"
                    icon={ImageIcon}
                    label="Media"
                    isActive={pathname === "/dashboard/media"}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[hsl(var(--muted-foreground))]">Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CustomSidebarMenuButton
                    href="/dashboard/settings"
                    icon={Settings}
                    label="Settings"
                    isActive={pathname === "/dashboard/settings"}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="bg-[hsl(var(--background))]">
            <div className="px-3 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                      <AvatarFallback className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                        {getInitials(`${user?.firstname || ""} ${user?.lastname || ""}`)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[hsl(var(--foreground))]">
                      {user?.firstname && user?.lastname
                        ? `${user.firstname} ${user.lastname}`
                        : user?.username || "Admin User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="border-b bg-background">
            <div className="flex h-16 items-center px-4 md:px-6">
              <SidebarTrigger className="mr-2" />
              <div className="ml-auto flex items-center space-x-4">
                <ModeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                        <AvatarFallback className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                          {getInitials(`${user?.firstname || ""} ${user?.lastname || ""}`)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {user?.firstname && user?.lastname
                        ? `${user.firstname} ${user.lastname}`
                        : user?.username || "Admin User"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
