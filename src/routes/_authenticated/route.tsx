import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  UserCog,
  AlertTriangle,
  CalendarClock,
  LogOut,
  Shield,
  Package,
  Files,
  Inbox,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Calendar,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard, roles: ["admin", "corretor", "administrativo", "financeiro", "gerente"] },
  { title: "Central de Entrada", to: "/central-entrada", icon: Inbox, roles: ["admin", "administrativo", "corretor"] },
  { title: "Clientes", to: "/clients", icon: Users, roles: ["admin", "corretor", "administrativo", "gerente", "financeiro"] },
  { title: "Produtos", to: "/products", icon: Package, roles: ["admin", "corretor", "administrativo", "gerente"] },
  { title: "Apólices", to: "/policies", icon: FileText, roles: ["admin", "corretor", "administrativo", "gerente", "financeiro"] },
  { title: "Seguradoras", to: "/insurers", icon: Building2, roles: ["admin", "administrativo", "gerente", "corretor"] },
  { title: "Corretores", to: "/brokers", icon: UserCog, roles: ["admin", "gerente"] },
  { title: "Sinistros", to: "/claims", icon: AlertTriangle, roles: ["admin", "corretor", "administrativo", "gerente"] },
  { title: "Renovações", to: "/renewals", icon: CalendarClock, roles: ["admin", "corretor", "administrativo", "gerente"] },
  { title: "Oportunidades", to: "/opportunities", icon: TrendingUp, roles: ["admin", "corretor", "gerente"] },
  { title: "Documentos", to: "/documents", icon: Files, roles: ["admin", "corretor", "administrativo", "gerente"] },
  { title: "Comissões", to: "/commissions", icon: DollarSign, roles: ["admin", "financeiro", "gerente"] },
  { title: "Financeiro", to: "/financial", icon: TrendingUp, roles: ["admin", "financeiro", "gerente"] },
  { title: "Tarefas", to: "/tasks", icon: CheckSquare, roles: ["admin", "corretor", "administrativo", "gerente"] },
];

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth/login" });
    }
  },
});

function AuthenticatedLayout() {
  const { user, role, loading, signOut, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.navigate({ to: "/auth/login" });
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "CS";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold leading-tight">Coutseg</p>
                <p className="text-xs text-muted-foreground">Gestão de Seguros</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems
                    .filter((item) => !item.roles || (!role || item.roles.includes(role as any)))
                    .map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.to}
                            activeOptions={{ exact: item.to === "/" }}
                            activeProps={{
                              className: "bg-sidebar-accent text-sidebar-accent-foreground",
                            }}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="flex h-14 items-center gap-2 border-b px-4 lg:hidden">
            <SidebarTrigger />
            <span className="font-semibold">Coutseg</span>
          </div>
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
