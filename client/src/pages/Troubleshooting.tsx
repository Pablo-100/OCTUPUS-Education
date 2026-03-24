import { useTranslation } from "@/_core/hooks/useTranslation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertCircle, HelpCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, Message } from "@/components/AIChatBox";

export default function Troubleshooting() {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("common");

  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        language === "fr"
          ? "Bonjour ! Je suis OCTUPUS, votre assistant IA de dépannage RHCSA. Décrivez-moi votre problème (ex: souci de permission, configuration réseau, gestion LVM) et je vous aiderai étape par étape."
          : "Hello! I am OCTUPUS, your RHCSA AI troubleshooting assistant. Describe your issue (e.g. permission problem, network config, LVM management) and I'll help you step by step.",
    },
  ]);

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
          content: `**Error**: ${error.message}. Please try again later.`,
        },
      ]);
    },
  });

  const handleSendMessage = (content: string) => {
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    aiChatMutation.mutate({ messages: newMessages });
  };

  const commonIssues = [
    {
      id: 1,
      title:
        language === "fr"
          ? "L'utilisateur ne peut pas se connecter"
          : "User cannot login",
      symptoms:
        language === "fr"
          ? "Échec d'authentification, permission refusée"
          : "Authentication failed, permission denied",
      solution:
        language === "fr"
          ? "Vérifiez l'état du compte, le mot de passe, le fichier sudoers"
          : "Check user account status, verify password, check sudoers file",
    },
    {
      id: 2,
      title:
        language === "fr"
          ? "Permission au fichier refusée"
          : "File permission denied",
      symptoms:
        language === "fr"
          ? "Impossible de lire/écrire le fichier malgré la propriété"
          : "Cannot read/write file despite being owner",
      solution:
        language === "fr"
          ? "Utilisez chmod pour corriger les permissions, vérifiez le contexte SELinux"
          : "Use chmod to fix permissions, check SELinux context",
    },
    {
      id: 3,
      title:
        language === "fr"
          ? "Problèmes de connectivité réseau"
          : "Network connectivity issues",
      symptoms:
        language === "fr"
          ? "Impossible de pinger les hôtes, DNS non résolu"
          : "Cannot ping hosts, DNS not resolving",
      solution:
        language === "fr"
          ? "Vérifiez l'interface réseau, les paramètres DNS, le pare-feu"
          : "Check network interface, verify DNS settings, check firewall",
    },
    {
      id: 4,
      title:
        language === "fr" ? "Le service ne démarre pas" : "Service won't start",
      symptoms:
        language === "fr"
          ? "systemctl start échoue, le service est inactif"
          : "systemctl start fails, service is inactive",
      solution:
        language === "fr"
          ? "Vérifiez les journaux du service, les dépendances, la configuration"
          : "Check service logs, verify dependencies, check configuration",
    },
    {
      id: 5,
      title:
        language === "fr" ? "Problèmes d'espace disque" : "Disk space issues",
      symptoms:
        language === "fr"
          ? "Erreur de disque plein, impossible d'écrire des fichiers"
          : "Disk full error, cannot write files",
      solution:
        language === "fr"
          ? "Utilisez df pour vérifier l'utilisation, trouvez les gros fichiers, nettoyez"
          : "Use df to check usage, find large files, clean temporary files",
    },
    {
      id: 6,
      title: language === "fr" ? "Refus SELinux" : "SELinux denials",
      symptoms:
        language === "fr"
          ? "Erreurs de permission refusée dans les journaux"
          : "Permission denied errors in logs",
      solution:
        language === "fr"
          ? "Vérifiez les journaux d'audit, ajustez la politique SELinux, utilisez semanage"
          : "Check audit logs, adjust SELinux policy, use semanage",
    },
  ];

  const advancedIssues = [
    {
      id: 7,
      title:
        language === "fr"
          ? "Récupération après Kernel Panic"
          : "Kernel panic recovery",
      symptoms:
        language === "fr"
          ? "Plantage du système avec un message de Kernel Panic"
          : "System crashes with kernel panic message",
      solution:
        language === "fr"
          ? "Démarrez en mode rescue, vérifiez les journaux du noyau, mettez à jour le noyau"
          : "Boot into rescue mode, check kernel logs, update kernel",
    },
    {
      id: 8,
      title:
        language === "fr"
          ? "Système de fichiers corrompu"
          : "Corrupted file system",
      symptoms:
        language === "fr"
          ? "Erreurs du système de fichiers, impossible de monter la partition"
          : "File system errors, cannot mount partition",
      solution:
        language === "fr"
          ? "Exécutez fsck en mode lecture seule, réparez le système, restaurez"
          : "Run fsck in read-only mode, repair file system, restore from backup",
    },
    {
      id: 9,
      title: language === "fr" ? "Corruption de GRUB" : "GRUB corruption",
      symptoms:
        language === "fr"
          ? "Le système ne démarre pas, erreur GRUB"
          : "System won't boot, GRUB error",
      solution:
        language === "fr"
          ? "Démarrez depuis un live CD, réinstallez GRUB, vérifiez la configuration"
          : "Boot from live media, reinstall GRUB, verify boot configuration",
    },
    {
      id: 10,
      title:
        language === "fr"
          ? "Dégradation des performances"
          : "Performance degradation",
      symptoms:
        language === "fr"
          ? "Système lent, forte utilisation CPU/mémoire"
          : "System slow, high CPU/memory usage",
      solution:
        language === "fr"
          ? "Utilisez top/htop pour identifier les processus, vérifiez les E/S, optimisez"
          : "Use top/htop to identify processes, check I/O, optimize services",
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "hard":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const IssueCard = ({ issue, difficulty }: any) => (
    <Card className="hover:shadow-md transition-all cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Badge className={`capitalize ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </Badge>
            </div>
            <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {issue.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {t("troubleshooting.symptoms")}
          </p>
          <p className="text-sm text-muted-foreground">{issue.symptoms}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {t("troubleshooting.solution")}
          </p>
          <p className="text-sm text-muted-foreground">{issue.solution}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => (window.location.href = "/commands")}
        >
          {language === "fr"
            ? "Voir la solution complète →"
            : "View Full Solution →"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          {t("troubleshooting.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("troubleshooting.description")}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search troubleshooting scenarios..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="common">
            {language === "fr" ? "Problèmes courants" : "Common Issues"}
          </TabsTrigger>
          <TabsTrigger value="advanced">
            {language === "fr" ? "Avancé" : "Advanced"}
          </TabsTrigger>
          <TabsTrigger value="ai">
            OCTUPUS IA
          </TabsTrigger>
        </TabsList>

        {/* Common Issues */}
        <TabsContent value="common" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {commonIssues.map(issue => (
              <IssueCard key={issue.id} issue={issue} difficulty="easy" />
            ))}
          </div>
        </TabsContent>

        {/* Advanced Issues */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advancedIssues.map(issue => (
              <IssueCard key={issue.id} issue={issue} difficulty="hard" />
            ))}
          </div>
        </TabsContent>

        {/* AI Assistant */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="border-[#3C1E55] bg-[#000000] shadow-[0_0_15px_rgba(75,0,130,0.3)] overflow-hidden">
            <CardHeader className="border-b border-[#7B24A6]/30 bg-gradient-to-r from-[#000000] to-[#4B0082]">
              <div className="flex items-center gap-2">
                <img src="/logo2.png" alt="OCTUPUS" className="w-6 h-6 rounded-full border border-[#BF9B30]" />
                <CardTitle className="text-[#FDF4E3] font-bold">OCTUPUS IA</CardTitle>
              </div>
            </CardHeader>
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={aiChatMutation.isPending}
              assistantAvatarSrc="/logo2.png"
              assistantAvatarAlt="OCTUPUS"
              className="h-[600px] border-0 rounded-none bg-transparent"
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tips Section */}
      <Card className="bg-yellow-500/5 border-yellow-200 dark:border-yellow-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <CardTitle className="text-lg">Troubleshooting Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Always check system logs first: /var/log/messages or journalctl
          </p>
          <p>
            • Use diagnostic commands: dmesg, systemctl status, journalctl -xe
          </p>
          <p>• Check file permissions and SELinux contexts for access issues</p>
          <p>
            • Verify network connectivity with ping, traceroute, and netstat
          </p>
          <p>• Document the issue and steps taken for better troubleshooting</p>
        </CardContent>
      </Card>
    </div>
  );
}
