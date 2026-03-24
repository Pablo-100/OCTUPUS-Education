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
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Chapters() {
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();
  const { data: chaptersList, isLoading } = trpc.chapters.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">
            {t("chapters.title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("chapters.description")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const chapters = chaptersList || [];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          {t("chapters.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("chapters.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chapters.map((chapter, index) => {
          const chapterTitle =
            language === "fr"
              ? chapter.titleFr || chapter.titleEn
              : chapter.titleEn || chapter.titleFr;
          const chapterDescription =
            language === "fr"
              ? chapter.descriptionFr || chapter.descriptionEn
              : chapter.descriptionEn || chapter.descriptionFr;

          return (
            <Card
              key={chapter.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(`/chapters/${chapter.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {language === "fr"
                          ? `Chapitre ${index + 1}`
                          : `Chapter ${index + 1}`}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {chapterTitle}
                    </CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {chapterDescription}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 w-full justify-start text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                  {language === "fr"
                    ? "Commencer l'apprentissage"
                    : "Start Learning"}{" "}
                  →
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
