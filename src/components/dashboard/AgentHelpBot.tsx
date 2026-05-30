import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Sparkles, ArrowRight, MessageCircleQuestion } from "lucide-react";
import { matchTopics } from "@/lib/helpBot";
import { AGENT_HELP_TOPICS, AGENT_SUGGESTED_QUESTIONS, type AgentHelpTopic } from "@/config/agentHelpContent";

interface ChatMessage {
  role: "user" | "bot";
  text?: string;
  topics?: AgentHelpTopic[];
  noMatch?: boolean;
}

export default function AgentHelpBot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hi! I can help you find your way around the portal. Ask me things like \"how do I watch a course\" or \"where do I book a room\".",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const submit = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const answer = matchTopics(q, AGENT_HELP_TOPICS);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      answer.topics.length > 0 ? { role: "bot", topics: answer.topics } : { role: "bot", noMatch: true },
    ]);
    setInput("");
  };

  const goTo = (anchor: string) => {
    setOpen(false);
    if (anchor.startsWith("/")) {
      navigate(anchor);
    } else {
      // Scroll to a dashboard section anchor
      const id = anchor.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // If not on dashboard, navigate there with the hash
        navigate(`/dashboard${anchor}`);
      }
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-[#e2231a] to-[#1a4d8f] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105"
          aria-label="Open help assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">Need help?</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[min(calc(100vw-3rem),380px)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-[#e2231a] to-[#1a4d8f] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Portal Assistant</p>
                <p className="text-[10px] text-white/80">Ask me how to find things</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#1a4d8f] px-3 py-2 text-sm text-white">{m.text}</div>
                  ) : (
                    <div className="max-w-[90%] space-y-2">
                      {m.text && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e2231a]/10">
                            <Bot className="h-3.5 w-3.5 text-[#e2231a]" />
                          </div>
                          <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">{m.text}</div>
                        </div>
                      )}
                      {m.noMatch && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e2231a]/10">
                            <MessageCircleQuestion className="h-3.5 w-3.5 text-[#e2231a]" />
                          </div>
                          <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                            Hmm, I'm not sure. Try keywords like "course", "listing", "room", "vendor", "calculator", or "support".
                          </div>
                        </div>
                      )}
                      {m.topics?.map((t) => (
                        <div key={t.id} className="ml-8 rounded-xl border border-border bg-background p-3 shadow-sm">
                          <Badge variant="outline" className="mb-1 text-[10px]">{t.category}</Badge>
                          <p className="text-sm font-semibold">{t.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.summary}</p>
                          <p className="mt-1.5 text-[11px] font-medium text-[#1a4d8f]">📍 {t.routeLabel}</p>
                          <ol className="mt-1.5 ml-3 list-decimal space-y-0.5 text-[11px] text-muted-foreground">
                            {t.steps.slice(0, 3).map((s, idx) => <li key={idx}>{s}</li>)}
                          </ol>
                          <Button size="sm" className="mt-2 h-7 gap-1 bg-[#e2231a] text-xs hover:bg-[#c41e16]" onClick={() => goTo(t.anchor)}>
                            Take me there <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {messages.length === 1 && (
                <div className="ml-8 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Try asking</p>
                  {AGENT_SUGGESTED_QUESTIONS.map((qn) => (
                    <button
                      key={qn}
                      onClick={() => submit(qn)}
                      className="block w-full rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs hover:border-[#1a4d8f]/40 hover:bg-muted"
                    >
                      {qn}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit(input)}
                placeholder="Ask how to find something..."
                className="text-sm"
              />
              <Button size="icon" onClick={() => submit(input)} className="bg-[#1a4d8f] hover:bg-[#123a6b] shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
