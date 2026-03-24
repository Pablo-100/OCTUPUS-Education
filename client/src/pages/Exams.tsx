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
import { Clock, BarChart3, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Exams() {
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();
  const { data: examsList, isLoading } = trpc.exams.list.useQuery();
  const { data: examStatuses } = trpc.progress.getExamStatuses.useQuery();

  const pickReadableDescription = (
    descA?: string | null,
    descB?: string | null
  ) => {
    const a = (descA || "").trim();
    const b = (descB || "").trim();
    const looksJson = (v: string) => v.startsWith("{") || v.startsWith("[");

    if (a && !looksJson(a)) return a;
    if (b && !looksJson(b)) return b;
    return language === "fr"
      ? "Simulation complete RHCSA"
      : "Full RHCSA simulation";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">{t("exams.title")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("exams.description")}
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const exams = examsList || [];
  const statusByExamId = new Map((examStatuses || []).map(s => [s.examId, s]));

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">{t("exams.title")}</h1>
        <p className="text-lg text-muted-foreground">
          {t("exams.description")}
        </p>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.length === 0 ? (
          <Card className="col-span-full text-center py-12">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {language === "fr"
                  ? "Aucun examen disponible pour le moment."
                  : "No exams are available right now."}
              </p>
              <Button variant="outline" onClick={() => navigate("/chapters")}>
                {language === "fr"
                  ? "Continuer les chapitres"
                  : "Continue with chapters"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          exams.map((exam, index) =>
            (() => {
              const examTitle =
                language === "fr"
                  ? exam.titleFr || exam.titleEn
                  : exam.titleEn || exam.titleFr;
              const examDescription =
                language === "fr"
                  ? pickReadableDescription(
                      exam.descriptionFr,
                      exam.descriptionEn
                    )
                  : pickReadableDescription(
                      exam.descriptionEn,
                      exam.descriptionFr
                    );
              const status = statusByExamId.get(exam.id);
              const hasAttempt = Boolean(status);
              const isCompleted = Boolean(status?.passed);

              return (
                <Card key={exam.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {language === "fr"
                            ? `Examen ${index + 1}`
                            : `Exam ${index + 1}`}
                        </span>
                        {!hasAttempt ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                          >
                            {language === "fr"
                              ? "Pas encore passe"
                              : "Not Attempted"}
                          </Badge>
                        ) : isCompleted ? (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
                          >
                            {language === "fr"
                              ? `Complete (${status?.score}%)`
                              : `Completed (${status?.score}%)`}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
                          >
                            {language === "fr"
                              ? `Refuse (${status?.score}%)`
                              : `Refused (${status?.score}%)`}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl">{examTitle}</CardTitle>
                      <CardDescription>{examDescription}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Exam Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold">
                          {exam.totalQuestions}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("exams.questions")}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <p className="text-2xl font-bold">{exam.timeLimit}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr" ? "minutes" : "minutes"}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-2xl font-bold">
                          {exam.passingScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === "fr"
                            ? "Score de reussite"
                            : "Pass Score"}
                        </p>
                      </div>
                    </div>

                    {/* Exam Description */}
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {language === "fr"
                          ? `Cet examen couvre les principaux sujets RHCSA. Vous avez ${exam.timeLimit} minutes pour repondre a ${exam.totalQuestions} questions. Un score de ${exam.passingScore}% ou plus est requis pour reussir.`
                          : `This comprehensive exam covers all topics from the RHCSA certification curriculum. You will have ${exam.timeLimit} minutes to answer ${exam.totalQuestions} questions. A score of ${exam.passingScore}% or higher is required to pass.`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => navigate(`/exams/${exam.id}`)}
                      >
                        {hasAttempt && !isCompleted
                          ? language === "fr"
                            ? "Repasser"
                            : "Retry Exam"
                          : language === "fr"
                            ? "Commencer"
                            : "Start Exam"}
                      </Button>
                      <Button variant="outline" className="flex-1">
                        {language === "fr" ? "Reviser" : "Review"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()
          )
        )}
      </div>

      {/* Tips Section */}
      <Card className="bg-blue-500/5 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === "fr" ? "Conseils d'examen" : "Exam Tips"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {language === "fr"
              ? "Lisez chaque question attentivement avant de repondre"
              : "Read each question carefully before answering"}
          </p>
          <p>
            {language === "fr"
              ? "Gerez votre temps et evitez de bloquer trop longtemps"
              : "Manage your time - don't spend too long on difficult questions"}
          </p>
          <p>
            {language === "fr"
              ? "Revisez vos reponses avant de soumettre"
              : "Review your answers before submitting the exam"}
          </p>
          <p>
            {language === "fr"
              ? "Entrainez-vous avec les 5 simulations"
              : "Practice with all 5 exam simulations to prepare thoroughly"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
