import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  User as UserIcon, 
  Plus, 
  ArrowRight,
  MoreHorizontal,
  Calendar,
  UserPlus
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { updateTaskStatus, transferTask } from "@/lib/tasks.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "Tarefas Operacionais - Coutseg" },
      { name: "description", content: "Gestão de tarefas, prazos e produtividade da equipe." },
    ],
  }),
});

function TasksPage() {
  const { user, role, hasRole } = useAuth();
  const [view, setView] = useState<"my" | "team">(hasRole(['admin', 'gerente']) ? "team" : "my");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  
  const updateStatusFn = useServerFn(updateTaskStatus);
  const transferFn = useServerFn(transferTask);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", view, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          client:clients(full_name),
          opportunity:opportunities(notes),
          lead:leads(full_name),
          responsible:profiles!tasks_user_id_profiles_fkey(full_name),
          creator:profiles!tasks_creator_id_profiles_fkey(full_name)
        `);

      if (view === "my") {
        query = query.eq("user_id", user?.id as string);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query.order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data;
    },
    enabled: hasRole(['admin', 'gerente'])
  });

  const statusMutation = useMutation({
    mutationFn: (args: { id: string, status: TaskStatus }) => updateStatusFn({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Status atualizado!");
    },
  });

  const transferMutation = useMutation({
    mutationFn: (args: { id: string, newUserId: string }) => transferFn({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa transferida!");
    },
  });

  const getPriorityBadge = (priority: string | null) => {
    const config: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
      LOW: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const p = (priority?.toUpperCase() || 'MEDIUM') as TaskPriority;
    return <Badge className={`${config[p as keyof typeof config] || config['MEDIUM']} border`}>{p}</Badge>;
  };

  const isOverdue = (task: any) => {
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || !task.due_date) return false;
    const dueDate = startOfDay(new Date(task.due_date));
    const today = startOfDay(new Date());
    return isBefore(dueDate, today);
  };

  const sortedTasks = [...(tasks || [])].sort((a, b) => {
    // 1. Atrasadas primeiro
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // 2. Urgentes em seguida
    const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const aWeight = priorityWeight[a.priority?.toUpperCase() || 'MEDIUM'] || 0;
    const bWeight = priorityWeight[b.priority?.toUpperCase() || 'MEDIUM'] || 0;
    if (aWeight !== bWeight) return bWeight - aWeight;

    // 3. Prazo mais próximo
    return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtividade Operacional</h1>
          <p className="text-muted-foreground">Quem, O que e Quando precisa ser feito.</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v: any) => setView(v)}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/40 p-1 rounded-lg">
          <TabsList>
            <TabsTrigger value="my">Minhas Tarefas</TabsTrigger>
            {hasRole(['admin', 'gerente']) && <TabsTrigger value="team">Visão da Equipe</TabsTrigger>}
          </TabsList>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
        </div>

        <TabsContent value="my" className="mt-6">
          <TaskList 
            tasks={sortedTasks} 
            isLoading={isLoading} 
            onStatusChange={(id: string, status: TaskStatus) => statusMutation.mutate({ id, status })}
            isOverdue={isOverdue}
            getPriorityBadge={getPriorityBadge}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TaskList 
            tasks={sortedTasks} 
            isLoading={isLoading} 
            onStatusChange={(id: string, status: TaskStatus) => statusMutation.mutate({ id, status })}
            onTransfer={(id: string, userId: string) => transferMutation.mutate({ id, newUserId: userId })}
            teamMembers={teamMembers}
            isOverdue={isOverdue}
            getPriorityBadge={getPriorityBadge}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskList({ 
  tasks, 
  isLoading, 
  onStatusChange, 
  onTransfer,
  teamMembers,
  isOverdue,
  getPriorityBadge
}: any) {
  if (isLoading) return <div className="text-center py-10">Carregando tarefas...</div>;
  if (!tasks?.length) return (
    <div className="text-center py-20 border-2 border-dashed rounded-lg">
      <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {tasks.map((task: any) => {
        const overdue = isOverdue(task);
        return (
          <Card key={task.id} className={cn(
            "transition-all",
            task.status === 'COMPLETED' ? 'opacity-60 bg-muted/20' : '',
            overdue ? 'border-l-4 border-l-red-500' : ''
          )}>
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-full mt-1",
                  task.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 
                  overdue ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-muted'
                )}>
                  {task.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn("font-semibold", task.status === 'COMPLETED' && "line-through")}>
                      {task.title}
                    </h3>
                    {getPriorityBadge(task.priority)}
                    {overdue && <Badge variant="destructive" className="animate-bounce">ATRASADA</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-3">
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(`${task.due_date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <UserIcon className="h-3 w-3" />
                      Resp: {task.responsible?.full_name || 'Não atribuída'}
                    </div>
                    {task.client && (
                      <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 rounded">
                        Cliente: {task.client.full_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                {task.status !== 'COMPLETED' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onStatusChange(task.id, 'COMPLETED')}
                  >
                    Concluir
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}>
                        Iniciar Trabalho
                      </DropdownMenuItem>
                    )}
                    {task.status === 'COMPLETED' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'PENDING')}>
                        Reabrir Tarefa
                      </DropdownMenuItem>
                    )}
                    {onTransfer && teamMembers && (
                      <div className="border-t mt-1 pt-1">
                        <p className="text-[10px] px-2 font-bold text-muted-foreground flex items-center gap-1">
                          <UserPlus className="h-3 w-3" /> Transferir
                        </p>
                        {teamMembers.map((member: any) => (
                          <DropdownMenuItem 
                            key={member.id} 
                            onClick={() => onTransfer(task.id, member.id)}
                            disabled={member.id === task.user_id}
                          >
                            {member.full_name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                    <DropdownMenuItem className="text-red-600" onClick={() => onStatusChange(task.id, 'CANCELLED')}>
                      Cancelar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
