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
import { ChevronLeft, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

type Task = { id: string; text: string; answer?: string };
type Check = {
  ok: boolean;
  score: number;
  message: string;
  expectedAnswer?: string;
};
type TaskGroup = { key: string; title: string; tasks: Task[] };

const RULES: Array<{ test: RegExp; tokens: string[]; label: string }> = [
  {
    test: /network|ip|dns|gateway|hostname|nmcli/i,
    tokens: ["nmcli", "ip", "hostnamectl"],
    label: "network",
  },
  {
    test: /selinux/i,
    tokens: ["setenforce", "getenforce", "semanage"],
    label: "selinux",
  },
  {
    test: /user|group|uid|groupe|utilisateur/i,
    tokens: ["useradd", "groupadd", "usermod", "passwd"],
    label: "users/groups",
  },
  {
    test: /lvm|vg|lv|volume/i,
    tokens: ["pvcreate", "vgcreate", "lvcreate"],
    label: "lvm",
  },
  {
    test: /mount|nfs|autofs|fstab/i,
    tokens: ["mount", "fstab", "exportfs", "autofs"],
    label: "mount/nfs",
  },
  {
    test: /firewall|pare-feu|port/i,
    tokens: ["firewall-cmd"],
    label: "firewall",
  },
  {
    test: /httpd|apache|web server/i,
    tokens: ["dnf", "httpd", "systemctl"],
    label: "httpd",
  },
  { test: /cron|at\b|planif/i, tokens: ["crontab", "at"], label: "scheduling" },
];

function parseScenario(raw?: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectTasks(scenario: any): Task[] {
  const out: Task[] = [];

  const isQAPair = (v: unknown): v is { question: string; answer?: string } => {
    return (
      !!v && typeof v === "object" && typeof (v as any).question === "string"
    );
  };

  const pushAny = (prefix: string, val: unknown) => {
    if (Array.isArray(val)) {
      val.forEach((x, i) => {
        if (typeof x === "string") {
          out.push({ id: `${prefix}-${i}`, text: x });
        } else if (isQAPair(x)) {
          out.push({
            id: `${prefix}-${i}`,
            text: x.question,
            answer: x.answer,
          });
        }
      });
      return;
    }

    if (typeof val === "string") {
      out.push({ id: `${prefix}-0`, text: val });
      return;
    }

    if (isQAPair(val)) {
      out.push({ id: `${prefix}-0`, text: val.question, answer: val.answer });
      return;
    }

    if (val && typeof val === "object") {
      Object.entries(val as Record<string, unknown>).forEach(([k, v]) =>
        pushAny(`${prefix}-${k}`, v)
      );
    }
  };

  if (!scenario || typeof scenario !== "object") return out;

  pushAny("questions", scenario.questions);
  pushAny("taches", scenario.taches);
  pushAny("sections", scenario.sections);
  return out;
}

function collectTaskGroups(scenario: any): TaskGroup[] {
  const groups: TaskGroup[] = [];

  const isQAPair = (v: unknown): v is { question: string; answer?: string } => {
    return (
      !!v && typeof v === "object" && typeof (v as any).question === "string"
    );
  };

  const fromValue = (groupKey: string, title: string, value: unknown) => {
    if (Array.isArray(value)) {
      const tasks = value
        .map((item, idx) => {
          if (typeof item === "string")
            return { id: `${groupKey}-${idx}`, text: item };
          if (isQAPair(item))
            return {
              id: `${groupKey}-${idx}`,
              text: item.question,
              answer: item.answer,
            };
          return null;
        })
        .filter(Boolean) as Task[];
      if (tasks.length > 0) {
        groups.push({ key: groupKey, title, tasks });
      }
      return;
    }

    if (typeof value === "string") {
      groups.push({
        key: groupKey,
        title,
        tasks: [{ id: `${groupKey}-0`, text: value }],
      });
      return;
    }

    if (isQAPair(value)) {
      groups.push({
        key: groupKey,
        title,
        tasks: [
          { id: `${groupKey}-0`, text: value.question, answer: value.answer },
        ],
      });
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        fromValue(`${groupKey}-${k}`, k, v);
      });
    }
  };

  if (!scenario || typeof scenario !== "object") return groups;

  if (
    scenario.questions &&
    typeof scenario.questions === "object" &&
    !Array.isArray(scenario.questions)
  ) {
    Object.entries(scenario.questions as Record<string, unknown>).forEach(
      ([k, v]) => {
        fromValue(`questions-${k}`, k, v);
      }
    );
  } else {
    fromValue("questions", languageSafeTitle("Questions"), scenario.questions);
  }

  fromValue("taches", languageSafeTitle("Tasks"), scenario.taches);
  fromValue("sections", languageSafeTitle("Sections"), scenario.sections);
  return groups;
}

function languageSafeTitle(title: string) {
  return title;
}

function localizeExamDisplayText(text: string, language: string) {
  if (language !== "fr") return text;

  const replacements: Array<[RegExp, string]> = [
    [/\bReset\b/gi, "Reinitialiser"],
    [/\bCreate\b/gi, "Creer"],
    [/\bEnsure\b/gi, "Assurer"],
    [/\bConfigure\b/gi, "Configurer"],
    [/\bFind\b/gi, "Trouver"],
    [/\bWrite\b/gi, "Ecrire"],
    [/\bCopy\b/gi, "Copier"],
    [/\bEnable\b/gi, "Activer"],
    [/\bAllow\b/gi, "Autoriser"],
    [/\bsystem\b/gi, "systeme"],
    [/\bserver\b/gi, "serveur"],
    [/\buser\b/gi, "utilisateur"],
    [/\bgroup\b/gi, "groupe"],
    [/\bpassword\b/gi, "mot de passe"],
    [/\bfiles\b/gi, "fichiers"],
    [/\bfile\b/gi, "fichier"],
    [/\bservice\b/gi, "service"],
    [/\bfirewall\b/gi, "pare-feu"],
  ];

  return replacements.reduce(
    (acc, [pattern, value]) => acc.replace(pattern, value),
    text
  );
}

function verifyTask(task: string, command: string, language: string): Check {
  const cmd = command.trim().toLowerCase();
  if (!cmd) {
    return {
      ok: false,
      score: 0,
      message: language === "fr" ? "Commande vide." : "Command is empty.",
    };
  }

  const rule = RULES.find(r => r.test.test(task));
  if (!rule) {
    return {
      ok: true,
      score: 60,
      message:
        language === "fr" ? "Verification basique." : "Basic verification.",
    };
  }

  const hits = rule.tokens.filter(t => cmd.includes(t));
  const score = Math.round((hits.length / rule.tokens.length) * 100);
  return {
    ok: hits.length > 0,
    score,
    message:
      hits.length > 0
        ? language === "fr"
          ? `Probablement correcte (${rule.label}).`
          : `Likely correct (${rule.label}).`
        : language === "fr"
          ? `A corriger (${rule.label}).`
          : `Needs correction (${rule.label}).`,
  };
}

function verifyTaskWithAnswer(
  task: Task,
  command: string,
  language: string
): Check {
  const base = verifyTask(task.text, command, language);

  if (!task.answer) {
    return base;
  }

  const cmd = command.trim().toLowerCase();
  if (!cmd) {
    return { ...base, expectedAnswer: task.answer };
  }

  const expectedLines = task.answer
    .toLowerCase()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("#"));

  const expectedHeads = Array.from(
    new Set(
      expectedLines
        .map(
          line => line.match(/^[a-z][a-z0-9_.-]*/i)?.[0]?.toLowerCase() || ""
        )
        .filter(h => h.length > 1)
    )
  );

  if (expectedHeads.length === 0) {
    return base;
  }

  const matched = expectedHeads.filter(head => cmd.includes(head));
  const ratio = matched.length / expectedHeads.length;
  const score = Math.round(ratio * 100);
  const ok = score >= 45;

  return {
    ok,
    score,
    message: ok
      ? language === "fr"
        ? "Bonne direction selon la reponse attendue."
        : "Good direction based on expected answer."
      : language === "fr"
        ? "Commande insuffisante par rapport a la reponse attendue."
        : "Command is insufficient compared to expected answer.",
    expectedAnswer: ok ? undefined : task.answer,
  };
}

export default function ExamDetail() {
  const { language } = useTranslation();
  const [, navigate] = useLocation();

  const [examId, setExamId] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [autoSubmitRequested, setAutoSubmitRequested] = useState(false);
  const [score, setScore] = useState(0);
  const [commands, setCommands] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const m = window.location.pathname.match(/\/exams\/(\d+)/);
    if (m) setExamId(parseInt(m[1], 10));
  }, []);

  const { data: exam, isLoading } = trpc.exams.getById.useQuery(
    { id: examId as number },
    { enabled: !!examId }
  );
  const { data: questions } = trpc.exams.getQuestions.useQuery(
    { examId: examId as number },
    { enabled: !!examId }
  );
  const { data: examStatuses } = trpc.progress.getExamStatuses.useQuery(undefined, {
    enabled: !!examId,
  });
  const submitMutation = trpc.progress.submitExamResult.useMutation();

  useEffect(() => {
    if (exam?.timeLimit) setTimeLeft(exam.timeLimit * 60);
  }, [exam?.timeLimit]);

  useEffect(() => {
    if (!started || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setAutoSubmitRequested(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  if (isLoading) return <div>Loading exam...</div>;
  if (!exam)
    return (
      <div>{language === "fr" ? "Examen introuvable." : "Exam not found."}</div>
    );

  const primaryScenarioRaw =
    language === "fr" ? exam.descriptionFr : exam.descriptionEn;
  const secondaryScenarioRaw =
    language === "fr" ? exam.descriptionEn : exam.descriptionFr;
  const scenario =
    parseScenario(primaryScenarioRaw) || parseScenario(secondaryScenarioRaw);
  const tasks = collectTasks(scenario);
  const taskGroups = collectTaskGroups(scenario);
  const initialisation =
    scenario && typeof scenario === "object" ? scenario.initialisation : null;
  const title = language === "fr" ? exam.titleFr : exam.titleEn;

  const fmt = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const submit = () => {
    if (submitted) return;
    let final = 0;
    if (questions && questions.length > 0) {
      let ok = 0;
      questions.forEach((q: any) => {
        if (answers[q.id] === q.correctAnswer) ok += 1;
      });
      final = Math.round((ok / questions.length) * 100);
    } else if (tasks.length > 0) {
      const resultList = tasks.map(t =>
        verifyTaskWithAnswer(t, commands[t.id] || "", language)
      );
      const nextChecks: Record<string, Check> = {};
      tasks.forEach((t, i) => {
        nextChecks[t.id] = resultList[i];
      });
      setChecks(prev => ({ ...prev, ...nextChecks }));
      final = Math.round(
        resultList.reduce((acc, x) => acc + x.score, 0) / resultList.length
      );
    }

    setScore(final);
    setSubmitted(true);

    const passMark = exam.passingScore
      ? parseFloat(String(exam.passingScore))
      : 70;
    const passed = final >= passMark;
    if (examId) {
      submitMutation.mutate({
        examId,
        score: final,
        passed,
      });
    }
  };

  useEffect(() => {
    if (!started || submitted || !autoSubmitRequested) return;
    submit();
    setAutoSubmitRequested(false);
  }, [autoSubmitRequested, started, submitted]);

  const previousAttempt = (examStatuses || []).find(s => s.examId === examId);

  if (!started) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/exams")}
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />{" "}
          {language === "fr" ? "Retour aux examens" : "Back to Exams"}
        </button>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {language === "fr"
                ? "Examen pratique RHCSA"
                : "RHCSA practical exam"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousAttempt && (
              <div className="mb-4 rounded-md border bg-muted/50 p-3 text-sm">
                {language === "fr" ? "Derniere tentative" : "Latest attempt"}: {previousAttempt.score}%
              </div>
            )}
            <Button onClick={() => setStarted(true)} className="w-full">
              {language === "fr" ? "Commencer" : "Start"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-3 border-b">
        <h2 className="text-xl font-bold truncate max-w-[55%]">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono">
            <Clock className="w-4 h-4" /> {fmt(timeLeft)}
          </div>
          <Button onClick={submit}>
            {language === "fr" ? "Terminer" : "Finish"}
          </Button>
        </div>
      </div>

      {submitted && (
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "fr" ? "Resultat" : "Result"}: {score}%
            </CardTitle>
            <CardDescription>
              {score >= (exam.passingScore ? parseFloat(String(exam.passingScore)) : 70)
                ? language === "fr"
                  ? "Examen complete avec succes."
                  : "Exam completed successfully."
                : language === "fr"
                  ? "Refuse. Vous devez repasser cet examen."
                  : "Refused. You must retake this exam."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q: any, i: number) => {
            const rawOptions =
              language === "fr"
                ? q.optionsFr || q.optionsEn
                : q.optionsEn || q.optionsFr;
            let opts: string[] = [];
            try {
              opts = Array.isArray(rawOptions)
                ? rawOptions
                : JSON.parse(rawOptions || "[]");
            } catch {
              opts = [];
            }
            const questionText =
              language === "fr"
                ? q.questionFr || q.questionEn
                : q.questionEn || q.questionFr;
            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle>
                    {language === "fr"
                      ? `Question ${i + 1}`
                      : `Question ${i + 1}`}
                  </CardTitle>
                  <CardDescription>{questionText}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {opts.map((opt: string, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <Button
                        key={letter}
                        variant={
                          answers[q.id] === letter ? "default" : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() =>
                          setAnswers(prev => ({ ...prev, [q.id]: letter }))
                        }
                      >
                        {letter}. {opt}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {!!initialisation && typeof initialisation === "object" && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle>
                  {language === "fr"
                    ? "Description de l'environnement"
                    : "Environment Description"}
                </CardTitle>
                <CardDescription>
                  {language === "fr"
                    ? "Lis les informations de chaque systeme avant de commencer les taches."
                    : "Read each system information before starting the tasks."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {Object.entries(initialisation as Record<string, any>).map(
                  ([systemName, values]) => (
                    <div
                      key={systemName}
                      className="rounded-lg border bg-background p-3 space-y-2"
                    >
                      <h3 className="font-semibold text-base">{systemName}</h3>
                      <div className="space-y-1 text-sm">
                        {values && typeof values === "object" ? (
                          Object.entries(values as Record<string, string>).map(
                            ([k, v]) => (
                              <p key={`${systemName}-${k}`}>
                                <span className="font-medium">{k}</span> - {v}
                              </p>
                            )
                          )
                        ) : (
                          <p>{String(values)}</p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}

          {(taskGroups.length > 0
            ? taskGroups
            : [
                {
                  key: "all",
                  title: language === "fr" ? "Taches" : "Tasks",
                  tasks,
                },
              ]
          ).map(group => (
            <Card key={group.key}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>
                  {language === "fr"
                    ? "Execute les taches de cette section."
                    : "Complete the tasks in this section."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.tasks.map((task, i) => {
                  const c = checks[task.id];
                  const localizedTaskText = localizeExamDisplayText(
                    task.text,
                    language
                  );
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border p-3 space-y-3"
                    >
                      <p className="text-sm font-medium">
                        {language === "fr" ? "Tache" : "Task"} {i + 1}:{" "}
                        {localizedTaskText}
                      </p>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={3}
                        value={commands[task.id] || ""}
                        onChange={e =>
                          setCommands(prev => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          language === "fr"
                            ? "Tapez votre commande..."
                            : "Type your command..."
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setChecks(prev => ({
                              ...prev,
                              [task.id]: verifyTaskWithAnswer(
                                task,
                                commands[task.id] || "",
                                language
                              ),
                            }))
                          }
                        >
                          {language === "fr" ? "Verifier" : "Verify"}
                        </Button>
                        {c && (
                          <Badge
                            className={
                              c.ok
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white"
                            }
                          >
                            {c.score}%
                          </Badge>
                        )}
                      </div>
                      {c && (
                        <p className="text-xs text-muted-foreground">
                          {c.message}
                        </p>
                      )}
                      {c && !c.ok && c.expectedAnswer && (
                        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs whitespace-pre-wrap">
                          <p className="font-semibold mb-1">
                            {language === "fr"
                              ? "Reponse attendue"
                              : "Expected answer"}
                          </p>
                          <p>{c.expectedAnswer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
