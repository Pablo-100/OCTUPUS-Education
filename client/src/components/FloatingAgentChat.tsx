import { useTranslation } from "@/_core/hooks/useTranslation";
import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const getWelcomeMessage = (language: string) =>
  language === "fr"
    ? "Bonjour ! Je suis OCTUPUS, votre assistant IA. Décrivez votre problème RHCSA (permissions, réseau, services, LVM) et je vous guide étape par étape."
    : "Hello! I am OCTUPUS, your AI assistant. Describe your RHCSA issue (permissions, networking, services, LVM) and I will guide you step by step.";

export default function FloatingAgentChat() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const userScope = useMemo(() => {
    if (!isAuthenticated || !user) return "guest";

    const value =
      (user as { id?: string | number }).id ??
      (user as { email?: string | null }).email ??
      (user as { name?: string | null }).name ??
      "user";

    return String(value);
  }, [isAuthenticated, user]);
  const storageKey = `octopus-floating-chat-history-v2:${userScope}`;

  const initialAssistantMessage = useMemo<Message>(
    () => ({ role: "assistant", content: getWelcomeMessage(language) }),
    [language]
  );

  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Clear all chat histories when user is logged out to avoid leaking messages across sessions.
    if (!isAuthenticated) {
      Object.keys(localStorage)
        .filter(key => key.startsWith("octopus-floating-chat-history-v"))
        .forEach(key => localStorage.removeItem(key));
      setMessages([initialAssistantMessage]);
      return;
    }

    setMessages([initialAssistantMessage]);

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const isValid =
        Array.isArray(parsed) &&
        parsed.every(
          m =>
            m &&
            typeof m === "object" &&
            ["system", "user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        );

      if (isValid && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch {
      // Ignore localStorage parsing errors.
    }
  }, [initialAssistantMessage, isAuthenticated, storageKey]);

  useEffect(() => {
    setMessages((prev) => {
      if (
        prev.length === 1 &&
        prev[0]?.role === "assistant" &&
        (prev[0].content.includes("OCTUPUS") ||
          prev[0].content.includes("RHCSA AI troubleshooting assistant"))
      ) {
        return [initialAssistantMessage];
      }
      return prev;
    });
  }, [initialAssistantMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated) return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [isAuthenticated, messages, storageKey]);

  const aiChatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "fr"
              ? `Je suis OCTUPUS, mais je n'arrive pas a repondre maintenant: ${error.message}`
              : `I am OCTUPUS, but I cannot answer right now: ${error.message}`,
        },
      ]);
    },
  });

  const handleSendMessage = (content: string) => {
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    aiChatMutation.mutate({ messages: nextMessages });
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {isOpen && (
        <div className="mb-3 w-[min(92vw,430px)] h-[min(75vh,680px)] rounded-2xl border-2 border-[#3C1E55] bg-[#000000] shadow-[0_10px_40px_rgba(75,0,130,0.4)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#7B24A6]/30 bg-gradient-to-r from-[#000000] to-[#4B0082]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <img
                  src="/logo2.png"
                  alt="OCTUPUS"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#BF9B30] shadow-[0_0_10px_rgba(0,191,255,0.3)]"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00BFFF] rounded-full border-2 border-[#000000]"></div>
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-sm font-bold truncate text-[#FDF4E3]">OCTUPUS IA</p>
                <p className="text-xs text-[#BF9B30] truncate">
                  {language === "fr"
                    ? "Assistant intelligent RHCSA"
                    : "Smart RHCSA assistant"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close OCTUPUS chat"
              className="text-[#FDF4E3] hover:bg-[#7B24A6]/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="h-[calc(100%-65px)] bg-[#000000]">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={aiChatMutation.isPending}
              placeholder={
                language === "fr"
                  ? "Ecris ton message ici..."
                  : "Write your message here..."
              }
              assistantAvatarSrc="/logo2.png"
              assistantAvatarAlt="OCTUPUS"
              className="h-full border-0 rounded-none bg-[#000000] text-[#FDF4E3]"
              height="100%"
            />
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open OCTUPUS agent"
          className="group relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#BF9B30] bg-gradient-to-br from-[#4B0082] to-[#7B24A6] shadow-[0_4px_25px_rgba(123,36,166,0.6)] transition-all hover:scale-110 hover:shadow-[0_8px_30px_rgba(191,155,48,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
        >
          <span className="absolute -inset-1 rounded-full bg-[#7B24A6]/40 blur-md transition-all group-hover:bg-[#BF9B30]/30" />
          <img
            src="/logo2.png"
            alt="OCTUPUS Agent"
            className="relative z-10 w-11 h-11 rounded-full object-cover"
          />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#3C1E55] border-2 border-[#BF9B30] text-[#00BFFF] shadow-md">
            <MessageCircle className="w-3.5 h-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}
