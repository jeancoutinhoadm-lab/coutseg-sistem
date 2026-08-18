import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Send, User, Loader2, X } from "lucide-react";
import { askCoutSegIA } from "@/lib/chat.functions";

export function CoutSegIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const result = await askCoutSegIA({ data: { message: userMsg } });
      setMessages(prev => [...prev, { role: 'ai', text: result.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Desculpe, tive um problema ao processar sua pergunta." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl animate-bounce"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 h-[450px] shadow-2xl flex flex-col border-primary/20">
      <CardHeader className="bg-primary text-primary-foreground py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4" />
          CoutSeg IA
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-10">
            Olá! Como posso ajudar você hoje com a gestão da CoutSeg?
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'ai' && <Bot className="h-6 w-6 mt-1 text-primary" />}
            <div className={`p-2 rounded-lg text-xs max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.text}
            </div>
            {m.role === 'user' && <User className="h-6 w-6 mt-1 text-muted-foreground" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <Bot className="h-6 w-6 mt-1 text-primary" />
            <div className="bg-muted p-3 rounded-lg"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}
      </CardContent>
      <div className="p-3 border-t flex gap-2">
        <Input 
          placeholder="Pergunte algo..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="text-xs"
        />
        <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
