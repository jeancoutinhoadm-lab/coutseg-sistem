import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, client:clients(full_name)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa concluída!");
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie seus compromissos e follow-ups.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tasks?.map((task) => (
          <Card key={task.id} className={task.status === 'completed' ? 'opacity-60' : ''}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${task.status === 'completed' ? 'bg-green-100' : 'bg-muted'}`}>
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through' : ''}`}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex gap-2 mt-2">
                    {task.client && (
                      <Badge variant="outline">{task.client.full_name}</Badge>
                    )}
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'urgent' ? 'Urgente' : 
                       task.priority === 'high' ? 'Alta' : 'Normal'}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.due_date && format(new Date(task.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {task.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => completeMutation.mutate(task.id)}
                  disabled={completeMutation.isPending}
                >
                  Concluir
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && tasks?.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma tarefa pendente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
