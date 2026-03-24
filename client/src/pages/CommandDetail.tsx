import { useTranslation } from "@/_core/hooks/useTranslation";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Copy, Check, Terminal, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

type ParsedOption = {
  flag: string;
  description: string;
};

type OptionExample = {
  flag: string;
  description: string;
  command: string;
};

function parseCommandOptions(rawOptions?: string | null): ParsedOption[] {
  if (!rawOptions) {
    return [];
  }

  const parts = rawOptions
    .split(/\n|,\s*(?=-)/g)
    .map(part => part.trim())
    .filter(Boolean);

  return parts.map(part => {
    const parenMatch = part.match(/^([^()]+?)\s*\((.+)\)$/);
    if (parenMatch) {
      return {
        flag: parenMatch[1].trim(),
        description: parenMatch[2].trim(),
      };
    }

    const colonIndex = part.indexOf(":");
    if (colonIndex > 0) {
      return {
        flag: part.slice(0, colonIndex).trim(),
        description: part.slice(colonIndex + 1).trim(),
      };
    }

    return {
      flag: part,
      description: "",
    };
  });
}

function shouldOptionTakeValue(description: string) {
  return /(set|specify|change|defin|uid|gid|group|shell|directory|date|name|password|profile|command|type|path|size|port|user|mount|mode|owner|time|file|format|number|count|interval|id)/i.test(
    description
  );
}

function getTargetPlaceholder(syntax: string, commandName: string) {
  const tokens = syntax
    .trim()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => token !== commandName)
    .filter(token => !token.startsWith("["));

  const target = tokens[tokens.length - 1];
  return target ? `<${target.replace(/[<>]/g, "")}>` : "";
}

function buildOptionExamples(
  commandName: string,
  syntax: string,
  options: ParsedOption[]
): OptionExample[] {
  const targetPlaceholder = getTargetPlaceholder(syntax, commandName);

  return options.map(option => {
    const baseFlag = option.flag.split(",")[0].trim();
    const needsValue = shouldOptionTakeValue(option.description);
    const valuePart = needsValue ? " <value>" : "";
    const targetPart = targetPlaceholder ? ` ${targetPlaceholder}` : "";

    return {
      flag: baseFlag,
      description: option.description,
      command: `${commandName} ${baseFlag}${valuePart}${targetPart}`.trim(),
    };
  });
}

export default function CommandDetail() {
  const { t, language } = useTranslation();
  const [location, navigate] = useLocation();
  const [commandId, setCommandId] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [chapterMarkedDone, setChapterMarkedDone] = useState(false);

  useEffect(() => {
    const match = location.match(/\/commands\/(\d+)/);
    if (match) {
      setCommandId(parseInt(match[1]));
    }
  }, [location]);

  const { data: command, isLoading } = trpc.commands.getById.useQuery(
    { id: commandId! },
    { enabled: !!commandId }
  );

  const completeChapter = trpc.progress.completeChapter.useMutation();

  const { data: chapterCommands = [] } = trpc.commands.list.useQuery(
    { chapterId: command?.chapterId },
    { enabled: !!command?.chapterId }
  );

  useEffect(() => {
    if (
      chapterMarkedDone ||
      !command?.chapterId ||
      !command?.id ||
      chapterCommands.length === 0
    ) {
      return;
    }

    const storageKey = "octopus-chapter-command-progress-v1";
    const chapterKey = String(command.chapterId);

    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const visitedInChapter = new Set<number>(
        Array.isArray(parsed[chapterKey]) ? parsed[chapterKey] : []
      );

      visitedInChapter.add(command.id);
      parsed[chapterKey] = Array.from(visitedInChapter);
      localStorage.setItem(storageKey, JSON.stringify(parsed));

      const allDone = chapterCommands.every(c => visitedInChapter.has(c.id));
      if (allDone) {
        completeChapter.mutate({ chapterId: command.chapterId });
        setChapterMarkedDone(true);
      }
    } catch {
      // Ignore localStorage access failures.
    }
  }, [chapterMarkedDone, command?.chapterId, command?.id, chapterCommands]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!commandId || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!command) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted-foreground">
          {language === "fr" ? "Commande introuvable" : "Command not found"}
        </p>
      </Card>
    );
  }

  const commandName =
    language === "fr"
      ? command.nameFr || command.nameEn
      : command.nameEn || command.nameFr;
  const commandDescription =
    language === "fr"
      ? command.descriptionFr || command.descriptionEn
      : command.descriptionEn || command.descriptionFr;
  const commandOptions =
    language === "fr"
      ? command.optionsFr || command.optionsEn
      : command.optionsEn || command.optionsFr;
  const commandExamples =
    language === "fr"
      ? command.examplesFr || command.examplesEn
      : command.examplesEn || command.examplesFr;
  const parsedOptions = parseCommandOptions(commandOptions);
  const optionExamples = buildOptionExamples(
    commandName,
    command.syntax,
    parsedOptions
  );

  const currentIndex = chapterCommands.findIndex(c => c.id === command.id);
  const previousCommand = currentIndex > 0 ? chapterCommands[currentIndex - 1] : null;
  const nextCommand =
    currentIndex >= 0 && currentIndex < chapterCommands.length - 1
      ? chapterCommands[currentIndex + 1]
      : null;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/commands")}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          {language === "fr" ? "Retour aux Commandes" : "Back to Commands"}
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
              {commandName}
            </span>
            <Badge
              className={`capitalize border ${getDifficultyColor(command.difficulty)}`}
            >
              {command.difficulty}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground">{commandDescription}</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="syntax" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="syntax">
            {language === "fr" ? "Syntaxe" : "Syntax"}
          </TabsTrigger>
          <TabsTrigger value="options">
            {language === "fr" ? "Options" : "Options"}
          </TabsTrigger>
          <TabsTrigger value="examples">
            {language === "fr" ? "Exemples" : "Examples"}
          </TabsTrigger>
          <TabsTrigger value="tips">
            {language === "fr" ? "Astuces" : "Tips"}
          </TabsTrigger>
        </TabsList>

        {/* Syntax Tab */}
        <TabsContent value="syntax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr"
                  ? "Syntaxe de la commande"
                  : "Command Syntax"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {language === "fr" ? "Syntaxe de base" : "Basic Syntax"}
                </label>
                <div className="relative">
                  <div className="bg-black text-green-400 font-mono p-4 rounded-lg overflow-x-auto">
                    $ {command.syntax}
                  </div>
                  <button
                    onClick={() => handleCopy(command.syntax, "syntax")}
                    className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copiedSection === "syntax" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {language === "fr" ? "Description" : "Description"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {commandDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr" ? "Options courantes" : "Common Options"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commandOptions ? (
                <div className="space-y-3">
                  {parsedOptions.map((option, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border border-border rounded-lg"
                      >
                        <p className="font-mono text-sm text-blue-600 dark:text-blue-400">
                          {option.flag}
                        </p>
                        {option.description ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {option.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {language === "fr"
                    ? "Aucune option disponible pour cette commande"
                    : "No options available for this command"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr"
                  ? "Exemples d'utilisation"
                  : "Usage Examples"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    {language === "fr"
                      ? "Exemple d'utilisation"
                      : "Example Usage"}
                  </label>
                  <div className="relative">
                    <div className="bg-black text-green-400 font-mono p-4 rounded-lg overflow-x-auto text-sm">
                      {commandExamples || "$ " + commandName + " [options]"}
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(commandExamples || commandName, "examples")
                      }
                      className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                      {copiedSection === "examples" ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {(command as any).outputExample && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      {language === "fr"
                        ? "Sortie attendue"
                        : "Expected Output"}
                    </label>
                    <div className="bg-black text-green-400 font-mono p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap break-words">
                      {(command as any).outputExample}
                    </div>
                  </div>
                )}

                {optionExamples.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      {language === "fr"
                        ? "Exemples par option"
                        : "Examples by Option"}
                    </label>
                    <div className="space-y-2">
                      {optionExamples.map((item, idx) => (
                        <div
                          key={`${item.flag}-${idx}`}
                          className="p-3 border border-border rounded-lg"
                        >
                          <p className="font-mono text-sm text-blue-600 dark:text-blue-400">
                            $ {item.command}
                          </p>
                          {item.description ? (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.flag}: {item.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tips Tab */}
        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr"
                  ? "Astuces et bonnes pratiques"
                  : "Tips & Best Practices"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-yellow-500/5 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                  <p className="font-semibold text-foreground text-sm">
                    {language === "fr" ? "Astuce" : "Pro Tip"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr" ? "Utilisez" : "Use"}{" "}
                    <span className="font-mono bg-muted px-1 rounded">
                      {commandName} --help
                    </span>{" "}
                    {language === "fr"
                      ? "pour voir toutes les options disponibles"
                      : "to see all available options"}
                  </p>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <p className="font-semibold text-foreground text-sm">
                    {language === "fr"
                      ? "Cas d'usage frequents"
                      : "Common Use Cases"}
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>
                      {language === "fr"
                        ? "Utilisez cette commande pour des taches d'administration systeme"
                        : "Use this command for system administration tasks"}
                    </li>
                    <li>
                      {language === "fr"
                        ? "Combinez-la avec d'autres commandes via des pipes"
                        : "Combine with other commands using pipes"}
                    </li>
                    <li>
                      {language === "fr"
                        ? "Consultez le manuel pour les options avancees"
                        : "Check the manual page for advanced options"}
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-red-500/5 border border-red-200 dark:border-red-900 rounded-lg">
                  <p className="font-semibold text-foreground text-sm">
                    {language === "fr" ? "Attention" : "Warning"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Soyez prudent avec les options destructives comme"
                      : "Be careful with destructive options like"}{" "}
                    <span className="font-mono bg-muted px-1 rounded">-r</span>{" "}
                    {language === "fr" ? "ou" : "or"}{" "}
                    <span className="font-mono bg-muted px-1 rounded">-f</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* In-Chapter Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "fr"
              ? "Navigation du chapitre"
              : "Chapter Navigation"}
          </CardTitle>
          <CardDescription>
            {language === "fr"
              ? "Passez a la commande precedente ou suivante dans ce chapitre"
              : "Move to the previous or next command in this chapter"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="outline"
            disabled={!previousCommand}
            onClick={() => previousCommand && navigate(`/commands/${previousCommand.id}`)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {language === "fr" ? "Precedent" : "Previous"}
          </Button>

          <Button
            disabled={!nextCommand}
            onClick={() => nextCommand && navigate(`/commands/${nextCommand.id}`)}
          >
            {language === "fr" ? "Suivant" : "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Related Commands */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "fr" ? "Commandes liees" : "Related Commands"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["man", "help", "info", "whatis"].map(cmd => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                className="font-mono"
                onClick={() => navigate("/commands")}
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Try It */}
      <Card className="bg-blue-500/5 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle>
            {language === "fr" ? "Essayez-la" : "Try It Out"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "fr"
              ? "Allez dans la page Terminal pour pratiquer cette commande dans un environnement simule et securise."
              : "Go to the Terminal page to practice this command in a safe, simulated environment."}
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/terminal")}
          >
            {language === "fr" ? "Ouvrir le Terminal" : "Open Terminal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
