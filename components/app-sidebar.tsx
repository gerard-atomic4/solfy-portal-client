"use client";

import * as React from "react";
import {
  LayoutDashboard,
  LogOut,
  Ticket,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const supabase = createClient();

  const menuItems = [
    {
      title: "Mis Proyectos",
      url: "/protected/projects",
      icon: LayoutDashboard,
    },
    {
      title: "Todos los Tickets",
      url: "/protected/tickets",
      icon: Ticket,
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/protected" className="flex items-center gap-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#60c6ea] to-[#8cd1c6] text-white shadow-lg shadow-primary/20">
                  <span className="font-black text-xl tracking-tighter">S</span>
                </div>
                <div className="grid flex-1 text-left leading-tight transition-all group-data-[collapsible=icon]:opacity-0">
                  <span className="truncate font-black text-xl tracking-tight">Solfy<span className="text-primary">.</span></span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-0.5">Portal Clientes</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-black tracking-widest opacity-50 px-4 mb-2">Principal</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                  className="font-bold py-5 h-12"
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    <item.icon className="size-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ver Perfil" className="font-bold mb-2">
              <Link href="/protected/profile">
                <User className="size-4" />
                <span>Mi Perfil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Cerrar sesión" className="font-bold text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="size-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
