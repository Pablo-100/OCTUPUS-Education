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
import { Clock, CheckCircle2, Lock } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Labs() {
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");

  const { data: labsList, isLoading } = trpc.labs.list.useQuery({
    difficulty: selectedDifficulty || undefined,
  });
  const { data: completedLabIds } = trpc.progress.getCompletedLabs.useQuery();

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900";
      case "hard":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">{t("labs.title")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("labs.description")}
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const labs = labsList || [];
  const completedSet = new Set(completedLabIds || []);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">{t("labs.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("labs.description")}</p>
      </div>

      {/* Difficulty Filter */}
      <div className="flex gap-2 justify-center flex-wrap">
        {["easy", "medium", "hard"].map(diff => (
          <Button
            key={diff}
            variant={selectedDifficulty === diff ? "default" : "outline"}
            onClick={() =>
              setSelectedDifficulty(selectedDifficulty === diff ? "" : diff)
            }
            className="capitalize"
          >
            {diff === "easy" ? "Easy" : diff === "medium" ? "Medium" : "Hard"}
          </Button>
        ))}
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {labs.length === 0 ? (
          <Card className="col-span-full text-center py-12">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {language === "fr"
                  ? "Aucun lab ne correspond a ce niveau de difficulte."
                  : "No labs match this difficulty level."}
              </p>
              <Button variant="outline" onClick={() => setSelectedDifficulty("")}>
                {language === "fr" ? "Voir tous les labs" : "Show all labs"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          labs.map((lab, index) =>
            (() => {
              const labTitle =
                language === "fr"
                  ? lab.titleFr || lab.titleEn
                  : lab.titleEn || lab.titleFr;
              const labDescription =
                language === "fr"
                  ? lab.descriptionFr || lab.descriptionEn
                  : lab.descriptionEn || lab.descriptionFr;
              const labObjectives =
                language === "fr"
                  ? lab.objectivesFr || lab.objectivesEn
                  : lab.objectivesEn || lab.objectivesFr;
              const isCompleted = completedSet.has(lab.id);

              return (
                <Card
                  key={lab.id}
                  className="hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/labs/${lab.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Lab {index + 1}
                          </span>
                          <Badge
                            className={`capitalize border ${getDifficultyColor(lab.difficulty)}`}
                          >
                            {lab.difficulty}
                          </Badge>
                          {isCompleted && (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900">
                              {language === "fr" ? "Complete" : "Completed"}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {labTitle}
                        </CardTitle>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 transition-colors" />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground transition-colors" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {labDescription}
                    </p>

                    {/* Lab Info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {lab.estimatedDuration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {lab.estimatedDuration} {t("common.minutes")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Objectives Preview */}
                    {labObjectives && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-xs font-semibold text-foreground mb-2">
                          {t("labs.objectives")}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {labObjectives}
                        </p>
                      </div>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Start Lab →
                    </Button>
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
