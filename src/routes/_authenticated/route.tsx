import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2 } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
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
  Wallet,
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
  { title: "CRM Comercial", to: "/opportunities", icon: TrendingUp, roles: ["admin", "corretor", "gerente", "administrativo"] },
  { title: "Documentos", to: "/documents", icon: Files, roles: ["admin", "corretor", "administrativo", "gerente"] },
  { title: "Comissões", to: "/commissions", icon: DollarSign, roles: ["admin", "financeiro", "gerente"] },
  { title: "Financeiro", to: "/financial", icon: Wallet, roles: ["admin", "financeiro", "gerente"] },
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
                            className="flex items-center justify-between w-full"
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </div>
                            {item.to === "/tasks" && (
                              <TaskCounter userId={user?.id} />
                            )}
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
          <div className="flex h-14 items-center justify-between border-b px-4 lg:px-8 bg-background sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="lg:hidden" />
              <span className="font-semibold hidden lg:block">Operações CoutSeg</span>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={user?.id} />
            </div>
          </div>
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function TaskCounter({ userId }: { userId?: string | undefined }) {
  const { data: count } = useQuery({
    queryKey: ["tasks-pending-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "PENDING");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000, // Atualiza a cada 30s
    enabled: !!userId
  });

  if (!count) return null;

  return (
    <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground p-0">
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

function NotificationBell({ userId }: { userId?: string | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data;
    },
    refetchInterval: 30000,
    enabled: !!userId
  });

  const unreadCount = notifications?.filter(n => !n.read_at).length || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() } as any).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] text-white p-0 animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="text-sm font-semibold">Notificações</h4>
          <span className="text-[10px] text-muted-foreground">{unreadCount} não lidas</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications?.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          ) : (
            notifications?.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "p-3 border-b text-xs transition-colors hover:bg-muted/50",
                  !n.read_at && "bg-blue-50/20"
                )}
                onClick={() => !n.read_at && markReadMutation.mutate(n.id)}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-bold">{n.title}</span>
                  {!n.read_at && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                </div>
                <p className="text-muted-foreground mt-1">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(n.created_at!).toLocaleString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" className="text-[10px] h-6 w-full" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
