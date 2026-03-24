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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function Commands() {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: commandsList, isLoading } = trpc.commands.list.useQuery({
    search: search || undefined,
    difficulty: difficulty || undefined,
  });

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">
            {t("commands.title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("commands.description")}
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const commands = commandsList || [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          {t("commands.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("commands.description")}
        </p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4 bg-card border border-border rounded-lg p-6">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("commands.search_placeholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["beginner", "intermediate", "advanced"].map(diff => (
              <Button
                key={diff}
                variant={difficulty === diff ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(difficulty === diff ? "" : diff)}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {language === "fr"
            ? `${commands.length} commande${commands.length !== 1 ? "s" : ""} trouvee${commands.length !== 1 ? "s" : ""}`
            : `Found ${commands.length} command${commands.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Commands List */}
      <div className="space-y-4">
        {commands.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {language === "fr"
                  ? "Aucune commande ne correspond a vos filtres."
                  : "No commands match your current filters."}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDifficulty("");
                }}
              >
                {language === "fr" ? "Reinitialiser" : "Reset filters"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          commands.map(command =>
            (() => {
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

              return (
                <Card
                  key={command.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg font-mono">
                            {commandName}
                          </CardTitle>
                          <Badge
                            className={getDifficultyColor(command.difficulty)}
                          >
                            {command.difficulty}
                          </Badge>
                        </div>
                        <CardDescription>{commandDescription}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(command.syntax, command.id)}
                      >
                        {copiedId === command.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">
                        {t("commands.syntax")}
                      </p>
                      <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto">
                        {command.syntax}
                      </div>
                    </div>
                    {commandOptions && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">
                          {t("commands.options")}
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {commandOptions}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()
          )
        )}
      </div>
    </div>
  );
}
