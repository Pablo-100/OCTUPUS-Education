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
import { ChevronLeft, CheckCircle, AlertCircle, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

type LabStep = {
  title: string;
  description: string;
  command?: string;
  hint?: string;
};

type LabMcqQuestion = {
  type: "mcq";
  title?: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

function localizeDisplayText(text: string, language: string) {
  if (language !== "fr") return text;

  const replacements: Array<[RegExp, string]> = [
    [/\bWhich command\b/gi, "Quelle commande"],
    [/\bWhat does\b/gi, "Que fait"],
    [/\bHow do you\b/gi, "Comment"],
    [/\bCreate\b/gi, "Creer"],
    [/\bOpen\b/gi, "Ouvrir"],
    [/\bCheck\b/gi, "Verifier"],
    [/\bView\b/gi, "Afficher"],
    [/\bList\b/gi, "Lister"],
    [/\bFind\b/gi, "Trouver"],
    [/\bSet\b/gi, "Definir"],
    [/\bEnable\b/gi, "Activer"],
    [/\bDisable\b/gi, "Desactiver"],
    [/\buser\b/gi, "utilisateur"],
    [/\bgroup\b/gi, "groupe"],
    [/\bpassword\b/gi, "mot de passe"],
    [/\bfile\b/gi, "fichier"],
    [/\bdirectory\b/gi, "repertoire"],
    [/\bservice\b/gi, "service"],
    [/\bnetwork\b/gi, "reseau"],
    [/\bhostname\b/gi, "nom d'hote"],
    [/\bport\b/gi, "port"],
    [/\bpermanently\b/gi, "de maniere persistante"],
    [/\bCorrect answer\b/gi, "Bonne reponse"],
  ];

  return replacements.reduce(
    (acc, [pattern, value]) => acc.replace(pattern, value),
    text
  );
}

export default function LabDetail() {
  const { t, language } = useTranslation();
  const [, navigate] = useLocation();
  const [labId, setLabId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [submittedQcm, setSubmittedQcm] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/\/labs\/(\d+)/);
    if (match) {
      setLabId(parseInt(match[1]));
      setCurrentStep(0);
      setCompleted(false);
      setSelectedAnswers({});
      setSubmittedQcm(false);
    }
  }, []);

  const { data: lab, isLoading } = trpc.labs.getById.useQuery(
    { id: labId! },
    { enabled: !!labId }
  );

  const completeLab = trpc.progress.completeLab.useMutation();

  useEffect(() => {
    if (completed && labId) {
      completeLab.mutate({ labId });
    }
  }, [completed, labId, completeLab]);

  if (!labId || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!lab) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted-foreground">
          {language === "fr" ? "Lab introuvable" : "Lab not found"}
        </p>
      </Card>
    );
  }

  const labTitle =
    language === "fr" ? lab.titleFr || lab.titleEn : lab.titleEn || lab.titleFr;
  const labDescription =
    language === "fr"
      ? lab.descriptionFr || lab.descriptionEn
      : lab.descriptionEn || lab.descriptionFr;

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

  const getInstructionItems = (): Array<LabStep | LabMcqQuestion> => {
    let rawInstr =
      language === "fr"
        ? lab.instructionsFr || lab.instructionsEn
        : lab.instructionsEn || lab.instructionsFr;

    if (rawInstr) {
      try {
        const parsed = JSON.parse(rawInstr);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Not a JSON, ignore
      }
    }

    const objectivesStr =
      (language === "fr"
        ? lab.objectivesFr || lab.objectivesEn
        : lab.objectivesEn || lab.objectivesFr) || "";
    const objectiveList = objectivesStr
      .split(",")
      .filter((o: string) => o.trim().length > 0);

    if (objectiveList.length > 0) {
      return [
        {
          title: language === "fr" ? "Préparation" : "Setup",
          description:
            language === "fr"
              ? "Préparez votre environnement"
              : "Prepare the lab environment",
          command: "$ sudo -i",
          hint:
            language === "fr"
              ? "Connectez-vous en tant que root."
              : "Switch to the root user.",
        },
        ...objectiveList.map((obj: string, i: number) => ({
          title: `${language === "fr" ? "Tâche" : "Task"} ${i + 1}`,
          description: obj.trim(),
          command: "$ # " + obj.trim(),
          hint:
            language === "fr"
              ? "Exécutez la commande pour accomplir cette tâche."
              : "Execute the command to achieve this task.",
        })),
        {
          title: "Validation",
          description:
            language === "fr" ? "Vérifiez votre travail" : "Verify your work",
          command: "$ history",
          hint:
            language === "fr"
              ? "Passez en revue les commandes saisies."
              : "Review the commands you entered.",
        },
        {
          title: language === "fr" ? "Terminé" : "Completion",
          description:
            language === "fr"
              ? "Laboratoire terminé avec succès"
              : "Lab completed successfully",
          command: "$ exit",
          hint:
            language === "fr"
              ? "Fermez la session root."
              : "Close the root session.",
        },
      ];
    }

    return [
      { title: "Setup", description: "Prepare the lab environment" },
      { title: "Task 1", description: "Complete the first task" },
      { title: "Task 2", description: "Complete the second task" },
      { title: "Validation", description: "Verify your work" },
      { title: "Completion", description: "Lab completed successfully" },
    ];
  };

  const instructionItems = getInstructionItems();
  const mcqQuestions: LabMcqQuestion[] = instructionItems.filter(
    (item): item is LabMcqQuestion => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<LabMcqQuestion>;
      return (
        candidate.type === "mcq" &&
        typeof candidate.question === "string" &&
        Array.isArray(candidate.options)
      );
    }
  );
  const isQcmLab = mcqQuestions.length > 0;
  const steps: LabStep[] = isQcmLab
    ? []
    : instructionItems.filter((item): item is LabStep => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<LabStep>;
        return (
          typeof candidate.title === "string" &&
          typeof candidate.description === "string"
        );
      });

  const answeredCount = mcqQuestions.filter(
    (_, idx) => selectedAnswers[idx] !== undefined
  ).length;
  const correctCount = mcqQuestions.filter(
    (question, idx) => selectedAnswers[idx] === question.answerIndex
  ).length;
  const scorePercent =
    mcqQuestions.length > 0
      ? Math.round((correctCount / mcqQuestions.length) * 100)
      : 0;

  const onSubmitQcm = () => {
    setSubmittedQcm(true);
    if (mcqQuestions.length > 0 && scorePercent >= 100) {
      setCompleted(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/labs")}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          {language === "fr" ? "Retour aux Labs" : "Back to Labs"}
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              Lab {lab.id}
            </span>
            <Badge
              className={`capitalize border ${getDifficultyColor(lab.difficulty)}`}
            >
              {lab.difficulty}
            </Badge>
            {completed && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900">
                <CheckCircle className="w-3 h-3 mr-1" />
                {language === "fr" ? "Complete" : "Completed"}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold">{labTitle}</h1>
          <p className="text-lg text-muted-foreground">{labDescription}</p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "fr" ? "Progression du Lab" : "Lab Progress"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isQcmLab ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Questions" : "Questions"}
                </p>
                <p className="text-xl font-semibold">{mcqQuestions.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Repondues" : "Answered"}
                </p>
                <p className="text-xl font-semibold">
                  {answeredCount}/{mcqQuestions.length}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Score" : "Score"}
                </p>
                <p className="text-xl font-semibold">
                  {submittedQcm ? `${scorePercent}%` : "-"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                      idx < currentStep
                        ? "bg-green-500 text-white"
                        : idx === currentStep
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {idx < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <p className="text-xs font-medium text-center text-foreground">
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      <Tabs defaultValue="instructions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instructions">
            {language === "fr" ? "Instructions" : "Instructions"}
          </TabsTrigger>
          <TabsTrigger value="steps">
            {language === "fr" ? "Etapes" : "Steps"}
          </TabsTrigger>
          <TabsTrigger value="resources">
            {language === "fr" ? "Ressources" : "Resources"}
          </TabsTrigger>
        </TabsList>

        {/* Instructions Tab */}
        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr" ? "Vue d'ensemble du Lab" : "Lab Overview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {labDescription}
                </p>
              </div>

              <div className="bg-blue-500/5 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {language === "fr"
                    ? "Objectifs d'apprentissage"
                    : "Learning Objectives"}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    {language === "fr"
                      ? "Comprendre les concepts couverts dans ce lab"
                      : "Understand the concepts covered in this lab"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Pratiquer des competences avec des scenarios realistes"
                      : "Practice hands-on skills with real-world scenarios"}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Valider vos connaissances et votre progression"
                      : "Validate your knowledge and progress"}
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {language === "fr" ? "Prerequis" : "Requirements"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === "fr"
                        ? "Assurez-vous d'avoir termine les chapitres prerequis avant de commencer ce lab"
                        : "Ensure you have completed the prerequisite chapters before starting this lab"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          {isQcmLab ? (
            <div className="space-y-4">
              {mcqQuestions.map((question, idx) => {
                const selected = selectedAnswers[idx];
                const isCorrect =
                  submittedQcm && selected === question.answerIndex;
                const isWrong =
                  submittedQcm &&
                  selected !== undefined &&
                  selected !== question.answerIndex;
                const localizedQuestion = localizeDisplayText(
                  question.question,
                  language
                );
                const localizedOptions = question.options.map(option =>
                  localizeDisplayText(option, language)
                );
                const localizedExplanation = question.explanation
                  ? localizeDisplayText(question.explanation, language)
                  : undefined;

                return (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {question.title || `Question ${idx + 1}`}
                      </CardTitle>
                      <CardDescription>{localizedQuestion}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">
                        {localizedOptions.map((option, optionIdx) => (
                          <Button
                            key={optionIdx}
                            variant={
                              selected === optionIdx ? "default" : "outline"
                            }
                            className="justify-start h-auto py-3 whitespace-normal text-left"
                            onClick={() => {
                              if (!submittedQcm) {
                                setSelectedAnswers(prev => ({
                                  ...prev,
                                  [idx]: optionIdx,
                                }));
                              }
                            }}
                            disabled={submittedQcm}
                          >
                            {String.fromCharCode(65 + optionIdx)}. {option}
                          </Button>
                        ))}
                      </div>

                      {submittedQcm && (
                        <div
                          className={`rounded-md border p-3 text-sm ${isCorrect ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}`}
                        >
                          <p className="font-semibold">
                            {isCorrect
                              ? language === "fr"
                                ? "Correct"
                                : "Correct"
                              : language === "fr"
                                ? "Incorrect"
                                : "Incorrect"}
                          </p>
                          <p className="mt-1">
                            {language === "fr"
                              ? "Bonne reponse"
                              : "Correct answer"}
                            : {String.fromCharCode(65 + question.answerIndex)}.{" "}
                            {localizedOptions[question.answerIndex]}
                          </p>
                          {localizedExplanation && (
                            <p className="mt-1 text-muted-foreground">
                              {localizedExplanation}
                            </p>
                          )}
                        </div>
                      )}
                      {submittedQcm && selected === undefined && (
                        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                          {language === "fr"
                            ? "Choisissez une reponse pour l'inclure dans votre score."
                            : "Select an answer to include this question in your score."}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {language === "fr" ? "Score de reussite" : "Passing score"}:
                  100%
                </div>
                {!submittedQcm ? (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={onSubmitQcm}
                  >
                    {language === "fr" ? "Corriger le QCM" : "Submit QCM"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmittedQcm(false);
                      setSelectedAnswers({});
                    }}
                  >
                    {language === "fr" ? "Refaire le QCM" : "Retry QCM"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer transition-all ${
                    idx === currentStep ? "border-blue-500 bg-blue-500/5" : ""
                  }`}
                  onClick={() => setCurrentStep(idx)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                            idx < currentStep
                              ? "bg-green-500 text-white"
                              : idx === currentStep
                                ? "bg-blue-500 text-white"
                                : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          {idx < currentStep ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {step.title}
                          </CardTitle>
                          <CardDescription>{step.description}</CardDescription>
                        </div>
                      </div>
                      {idx === currentStep && (
                        <Play className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </CardHeader>
                  {idx === currentStep && (
                    <CardContent className="space-y-4 border-t border-border pt-4">
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <p className="font-mono text-sm">
                          {step.command ||
                            "$ # Configure the system according to the requirements"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {step.hint ||
                            "Follow the instructions and execute the necessary commands to complete this step"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            setCurrentStep(Math.max(0, currentStep - 1));
                          }}
                          disabled={currentStep === 0}
                        >
                          {language === "fr" ? "Precedent" : "Previous"}
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={e => {
                            e.stopPropagation();
                            if (currentStep < steps.length - 1) {
                              setCurrentStep(currentStep + 1);
                            } else {
                              setCompleted(true);
                            }
                          }}
                        >
                          {currentStep === steps.length - 1
                            ? language === "fr"
                              ? "Terminer le Lab"
                              : "Complete Lab"
                            : language === "fr"
                              ? "Etape suivante"
                              : "Next Step"}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "fr" ? "Ressources du Lab" : "Lab Resources"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <p className="font-medium text-foreground">
                    {language === "fr"
                      ? "Documentation du Lab"
                      : "Lab Documentation"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Documentation detaillee et materiel de reference"
                      : "Detailed documentation and reference materials"}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <p className="font-medium text-foreground">
                    {language === "fr" ? "Commandes liees" : "Related Commands"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Voir les commandes utilisees dans ce lab"
                      : "View commands used in this lab"}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <p className="font-medium text-foreground">
                    {language === "fr" ? "Guide de solution" : "Solution Guide"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "fr"
                      ? "Solution pas a pas (disponible apres completion)"
                      : "Step-by-step solution (available after completion)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        <Button variant="outline" onClick={() => navigate("/labs")}>
          {language === "fr" ? "← Retour aux Labs" : "← Back to Labs"}
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate("/terminal")}
        >
          {language === "fr" ? "Ouvrir le Terminal" : "Open Terminal"}
        </Button>
      </div>
    </div>
  );
}
