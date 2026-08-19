import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createPayable, getFinancialCategories } from "@/lib/finance-ops.functions";

const formSchema = z.object({
  description: z.string().min(2, "Descrição muito curta"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  competence_date: z.string().min(1, "Data de competência é obrigatória"),
  category_id: z.string().min(1, "Selecione uma categoria"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreatePayableForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: () => getFinancialCategories(),
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      due_date: todayStr as string,
      competence_date: todayStr as string,
      category_id: "",
    } as any, // Bypass strict defaultValues type check
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => createPayable({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      toast.success("Conta a pagar criada com sucesso");
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Erro ao criar payable:", error);
      toast.error("Erro ao criar conta a pagar");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        <FormField
          control={form.control as any}
          name="description"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguel Setembro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="amount"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="category_id"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.filter(c => c.type === 'expense').map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="due_date"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="competence_date"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Competência</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Criar Lançamento"}
        </Button>
      </form>
    </Form>
  );
}
