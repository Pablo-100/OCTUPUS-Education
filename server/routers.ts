import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import {
  users,
  chapters,
  commands,
  labs,
  exams,
  examQuestions,
  userProgress,
  labProgress,
  examResults,
} from "../drizzle/schema";
import { eq, like, and } from "drizzle-orm";
import {
  FALLBACK_CHAPTERS,
  FALLBACK_COMMANDS,
  FALLBACK_LABS,
  FALLBACK_EXAMS,
  FALLBACK_EXAM_QUESTIONS,
} from "./data";

const execFileAsync = promisify(execFile);

const LAB_IMAGE = "registry.access.redhat.com/ubi9/ubi";
const LAB_CONTAINER = "rhcsa-learning-lab";

let cachedRuntime: "podman" | "docker" | null | undefined;

async function detectContainerRuntime(): Promise<"podman" | "docker" | null> {
  if (cachedRuntime !== undefined) return cachedRuntime;

  for (const candidate of ["podman", "docker"] as const) {
    try {
      await execFileAsync(candidate, ["--version"], {
        timeout: 4000,
        maxBuffer: 1024 * 1024,
      });
      cachedRuntime = candidate;
      return cachedRuntime;
    } catch {
      // Try next candidate.
    }
  }

  cachedRuntime = null;
  return null;
}

async function runCommand(command: string, args: string[], timeout = 60000) {
  try {
    const result = await execFileAsync(command, args, {
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout: (result.stdout || "").toString(),
      stderr: (result.stderr || "").toString(),
      exitCode: 0,
    } as const;
  } catch (error: any) {
    return {
      ok: false,
      stdout: (error?.stdout || "").toString(),
      stderr: (error?.stderr || error?.message || "").toString(),
      exitCode: typeof error?.code === "number" ? error.code : null,
    } as const;
  }
}

async function ensureLabContainer(runtime: "podman" | "docker") {
  const inspectRunning = await runCommand(
    runtime,
    ["inspect", "-f", "{{.State.Running}}", LAB_CONTAINER],
    15000
  );

  if (inspectRunning.ok && inspectRunning.stdout.trim() === "true") {
    return;
  }

  if (inspectRunning.ok && inspectRunning.stdout.trim() !== "true") {
    const started = await runCommand(runtime, ["start", LAB_CONTAINER], 20000);
    if (started.ok) return;
  }

  await runCommand(runtime, ["rm", "-f", LAB_CONTAINER], 10000);

  const created = await runCommand(
    runtime,
    [
      "run",
      "-d",
      "--name",
      LAB_CONTAINER,
      "--hostname",
      "rhcsa-lab",
      LAB_IMAGE,
      "sleep",
      "infinity",
    ],
    120000
  );

  if (!created.ok) {
    throw new Error(created.stderr || "Failed to create lab container.");
  }
}

async function executeInLabContainer(userCommand: string) {
  const runtime = await detectContainerRuntime();

  if (!runtime) {
    return {
      ok: false,
      runtime: null,
      container: LAB_CONTAINER,
      output:
        "No container runtime found. Install Podman or Docker, then restart the app.",
      exitCode: null,
    } as const;
  }

  await ensureLabContainer(runtime);

  const execResult = await runCommand(
    runtime,
    ["exec", LAB_CONTAINER, "bash", "-lc", userCommand],
    120000
  );
  const output = [execResult.stdout, execResult.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    ok: execResult.ok,
    runtime,
    container: LAB_CONTAINER,
    output: output || "(no output)",
    exitCode: execResult.exitCode,
  } as const;
}

const LEGACY_EXAM_TITLES = new Set([
  "Basic System Administration",
  "Networking and Services",
  "Security and SELinux",
  "Storage and LVM Config",
  "Full RHCSA Simulation",
]);

const LEGACY_LAB_TITLES = new Set([
  "User Creation and Basic Permissions",
  "File System Navigation and Manipulation",
  "LVM Configuration and Management",
  "Advanced LVM: Snapshots and Thin Provisioning",
  "Managing Systemd Services",
  "Network Configuration with nmcli",
  "Firewalld Rules and Zones",
  "SELinux Contexts and Policies",
  "Podman Container Management",
  "Advanced Container Storage and Networking",
  "Storage: Stratis Management",
  "Storage: VDO Configuration",
  "Automated Job Scheduling",
  "Package Management with DNF",
  "Monitoring System Performance",
  "Managing System Logs",
  "SSH Key-based Authentication",
  "Boot Process and GRUB2",
  "User ACLs and Special Permissions",
  "Configuring Time Sync (Chrony)",
  "RHCSA Comprehensive Mock Exam Lab",
]);

const fallbackCommandByName = new Map(
  FALLBACK_COMMANDS.map(command => [command.nameEn.toLowerCase(), command])
);

const commandOptionsFrOverrides = new Map<string, string>([
  [
    "useradd",
    "-m (creer le repertoire personnel), -M (ne pas creer le repertoire personnel), -s (definir le shell de connexion), -u (definir l'UID), -g (definir le groupe principal), -G (definir les groupes secondaires), -c (definir le commentaire/GECOS), -d (definir le repertoire personnel), -e (definir la date d'expiration du compte), -r (creer un compte systeme), -N (ne pas creer un groupe prive utilisateur)"
  ],
  [
    "userdel",
    "-r (supprimer le repertoire personnel et la boite mail), -f (forcer la suppression), -Z (supprimer le mapping utilisateur SELinux)"
  ],
  [
    "usermod",
    "-l (changer le nom de connexion), -u (changer l'UID), -g (changer le groupe principal), -G (definir les groupes secondaires), -aG (ajouter des groupes secondaires), -d (changer le repertoire personnel), -m (deplacer le repertoire personnel), -s (changer le shell), -c (changer le commentaire), -e (definir l'expiration du compte), -f (definir les jours d'inactivite), -L (verrouiller le compte), -U (deverrouiller le compte), -p (definir un mot de passe chiffre)"
  ],
  [
    "passwd",
    "-l (verrouiller le mot de passe), -u (deverrouiller le mot de passe), -e (expirer le mot de passe immediatement), -d (supprimer le mot de passe), -x (definir l'age max du mot de passe), -n (definir l'age min du mot de passe), -w (definir les jours d'avertissement), -i (definir les jours d'inactivite), -S (afficher le statut du mot de passe)"
  ],
  [
    "groupadd",
    "-g (definir le GID), -r (creer un groupe systeme), -f (reussir meme si le groupe existe), -K (surcharger les valeurs login.defs), -p (definir un mot de passe de groupe chiffre)"
  ],
  [
    "groupmod",
    "-n (definir un nouveau nom de groupe), -g (definir un nouveau GID), -o (autoriser un GID non unique), -p (definir un mot de passe de groupe chiffre)"
  ],
  [
    "gpasswd",
    "-a (ajouter un utilisateur au groupe), -d (retirer un utilisateur du groupe), -A (definir les administrateurs du groupe), -M (definir la liste complete des membres), -r (supprimer le mot de passe du groupe), -R (restreindre l'acces du groupe aux membres), -Q (afficher les membres du groupe)"
  ],
  [
    "id",
    "-u (afficher l'UID), -g (afficher le GID principal), -G (afficher tous les IDs de groupes), -n (afficher les noms au lieu des IDs), -r (afficher l'ID reel au lieu de l'ID effectif), -Z (afficher le contexte SELinux)"
  ],
  [
    "who",
    "-a (afficher tous les details), -b (afficher le dernier demarrage systeme), -q (rapide: noms et compteur), -H (afficher l'en-tete), -u (afficher le temps d'inactivite et le PID), -r (afficher le niveau d'execution courant)"
  ],
  [
    "w",
    "-h (sans en-tete), -s (format court), -f (activer/desactiver le champ from), -i (mode adresse IP), -o (ancien format de sortie), -u (ignorer le nom utilisateur pour les temps de processus et CPU)"
  ],
]);

function preferLongerText(primary?: string | null, fallback?: string | null) {
  const primaryText = (primary || "").trim();
  const fallbackText = (fallback || "").trim();

  if (!primaryText) return fallbackText;
  if (!fallbackText) return primaryText;
  return fallbackText.length > primaryText.length ? fallbackText : primaryText;
}

function mergeWithFallbackCommand<T extends { nameEn: string; optionsEn?: string | null; optionsFr?: string | null; syntax?: string | null; examplesEn?: string | null; examplesFr?: string | null }>(
  command: T
) {
  const fallback = fallbackCommandByName.get(command.nameEn.toLowerCase());
  if (!fallback) {
    return command;
  }

  const mergedOptionsEn = preferLongerText(command.optionsEn, fallback.optionsEn);

  const currentOptionsFr = (command.optionsFr || "").trim();
  const currentOptionsEn = (command.optionsEn || "").trim();
  const fallbackOptionsFr = (fallback.optionsFr || "").trim();
  const fallbackOptionsEn = (fallback.optionsEn || "").trim();
  const hasRealFallbackFr = fallbackOptionsFr !== "" && fallbackOptionsFr !== fallbackOptionsEn;
  const frNeedsUpgrade = !currentOptionsFr || currentOptionsFr === currentOptionsEn;
  const frOverride = commandOptionsFrOverrides.get(command.nameEn.toLowerCase());

  let mergedOptionsFr = currentOptionsFr;
  if (frNeedsUpgrade && frOverride) {
    mergedOptionsFr = frOverride;
  } else if (frNeedsUpgrade && hasRealFallbackFr) {
    mergedOptionsFr = preferLongerText(currentOptionsFr, fallbackOptionsFr);
  }

  if (!mergedOptionsFr) {
    mergedOptionsFr = mergedOptionsEn;
  }

  return {
    ...command,
    syntax: preferLongerText(command.syntax, fallback.syntax),
    optionsEn: mergedOptionsEn,
    optionsFr: mergedOptionsFr,
    examplesEn: preferLongerText(command.examplesEn, fallback.examplesEn),
    examplesFr: preferLongerText(command.examplesFr, fallback.examplesFr),
  };
}

export const appRouter = router({
  system: systemRouter,

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "Your name is OCTUPUS. You are an expert Red Hat Certified System Administrator (RHCSA) AI assistant. Always introduce yourself as OCTUPUS when the user asks who you are. Help the user troubleshoot Linux network, permission, and basic system administration issues concisely. Respond in Markdown formatting.",
              },
              ...input.messages,
            ],
          });
          const responseText = result.choices[0]?.message.content;
          return {
            content: typeof responseText === "string" ? responseText : JSON.stringify(responseText),
          };
        } catch (error: any) {
          throw new Error(`AI request failed: ${error.message}`);
        }
      }),
  }),

  terminal: router({
    status: publicProcedure.query(async () => {
      const runtime = await detectContainerRuntime();
      if (!runtime) {
        return {
          ready: false,
          runtime: null,
          container: LAB_CONTAINER,
          message: "Podman/Docker not detected.",
        } as const;
      }

      const running = await runCommand(
        runtime,
        ["inspect", "-f", "{{.State.Running}}", LAB_CONTAINER],
        10000
      );

      return {
        ready: true,
        runtime,
        container: LAB_CONTAINER,
        running: running.ok && running.stdout.trim() === "true",
        message: "Container runtime available.",
      } as const;
    }),

    execute: publicProcedure
      .input(z.object({ command: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const command = input.command.trim();
        if (!command) {
          return {
            ok: false,
            output: "Empty command.",
            exitCode: null,
            runtime: null,
            container: LAB_CONTAINER,
          } as const;
        }

        try {
          return await executeInLabContainer(command);
        } catch (error: any) {
          return {
            ok: false,
            output: error?.message || "Terminal execution failed.",
            exitCode: null,
            runtime: null,
            container: LAB_CONTAINER,
          } as const;
        }
      }),

    reset: publicProcedure.mutation(async () => {
      const runtime = await detectContainerRuntime();
      if (!runtime) {
        return {
          ok: false,
          message: "Podman/Docker not detected.",
        } as const;
      }

      await runCommand(runtime, ["rm", "-f", LAB_CONTAINER], 30000);
      return {
        ok: true,
        message: "Lab container reset.",
      } as const;
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(100),
          email: z.string().trim().email().max(320).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new Error("Database unavailable.");
        }

        const normalizedEmail = input.email && input.email.length > 0 ? input.email : null;

        await db
          .update(users)
          .set({
            name: input.name,
            email: normalizedEmail,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        const rows = await db.select().from(users).where(eq(users.id, ctx.user.id));
        return rows[0] || null;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Chapters router
  chapters: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return FALLBACK_CHAPTERS;
      return await db.select().from(chapters).orderBy(chapters.order);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return FALLBACK_CHAPTERS.find(c => c.id === input.id) || null;
        const result = await db
          .select()
          .from(chapters)
          .where(eq(chapters.id, input.id));
        return result[0] || null;
      }),

    getByNumber: publicProcedure
      .input(z.object({ chapterNumber: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          return (
            FALLBACK_CHAPTERS.find(
              c => c.chapterNumber === input.chapterNumber
            ) || null
          );
        const result = await db
          .select()
          .from(chapters)
          .where(eq(chapters.chapterNumber, input.chapterNumber));
        return result[0] || null;
      }),
  }),

  // Commands router
  commands: router({
    list: publicProcedure
      .input(
        z.object({
          chapterId: z.number().optional(),
          search: z.string().optional(),
          difficulty: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let cmds = FALLBACK_COMMANDS;
          if (input.chapterId)
            cmds = cmds.filter(c => c.chapterId === input.chapterId);
          if (input.search)
            cmds = cmds.filter(c =>
              c.nameEn.toLowerCase().includes(input.search!.toLowerCase())
            );
          if (input.difficulty)
            cmds = cmds.filter(c => c.difficulty === input.difficulty);
          return cmds;
        }

        const conditions = [];

        if (input.chapterId) {
          conditions.push(eq(commands.chapterId, input.chapterId));
        }

        if (input.search) {
          conditions.push(like(commands.nameEn, `%${input.search}%`));
        }

        if (input.difficulty) {
          conditions.push(eq(commands.difficulty, input.difficulty as any));
        }

        const query =
          conditions.length > 0
            ? db
                .select()
                .from(commands)
                .where(and(...conditions))
            : db.select().from(commands);

        const rows = await query.orderBy(commands.order);
        return rows.map(mergeWithFallbackCommand);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return FALLBACK_COMMANDS.find(c => c.id === input.id) || null;
        const result = await db
          .select()
          .from(commands)
          .where(eq(commands.id, input.id));
        return result[0] ? mergeWithFallbackCommand(result[0]) : null;
      }),
  }),

  // Labs router
  labs: router({
    list: publicProcedure
      .input(
        z.object({
          difficulty: z.string().optional(),
          chapterId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let ls = FALLBACK_LABS;
          if (input.difficulty)
            ls = ls.filter(l => l.difficulty === input.difficulty);
          if (input.chapterId)
            ls = ls.filter(l => l.chapterId === input.chapterId);
          return ls;
        }

        const conditions = [];

        if (input.difficulty) {
          conditions.push(eq(labs.difficulty, input.difficulty as any));
        }

        if (input.chapterId) {
          conditions.push(eq(labs.chapterId, input.chapterId));
        }

        const query =
          conditions.length > 0
            ? db
                .select()
                .from(labs)
                .where(and(...conditions))
            : db.select().from(labs);

        const dbLabs = await query.orderBy(labs.order);
        const looksImported =
          dbLabs.length > 0 &&
          dbLabs.every(
            l =>
              (l.titleEn || "").includes("[Imported]") ||
              (l.descriptionEn || "").toLowerCase().includes("imported")
          );
        const looksLegacySeeded =
          dbLabs.length > 0 &&
          dbLabs.every(l => LEGACY_LAB_TITLES.has(l.titleEn || ""));

        const lacksStructuredInstructions =
          dbLabs.length > 0 &&
          dbLabs.every(l => {
            const instr = (l.instructionsEn || "").trim();
            return instr.length === 0 || !instr.startsWith("[");
          });

        if (
          dbLabs.length === 0 ||
          looksImported ||
          looksLegacySeeded ||
          lacksStructuredInstructions
        ) {
          let ls = FALLBACK_LABS;
          if (input.difficulty)
            ls = ls.filter(l => l.difficulty === input.difficulty);
          if (input.chapterId)
            ls = ls.filter(l => l.chapterId === input.chapterId);
          return ls;
        }

        return dbLabs;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return FALLBACK_LABS.find(l => l.id === input.id) || null;
        const result = await db
          .select()
          .from(labs)
          .where(eq(labs.id, input.id));
        const row = result[0] || null;
        const isImported =
          !!row &&
          ((row.titleEn || "").includes("[Imported]") ||
            (row.descriptionEn || "").toLowerCase().includes("imported"));
        const isLegacySeeded =
          !!row && LEGACY_LAB_TITLES.has(row.titleEn || "");
        const lacksStructuredInstructions =
          !!row && !(row.instructionsEn || "").trim().startsWith("[");

        if (
          !row ||
          isImported ||
          isLegacySeeded ||
          lacksStructuredInstructions
        ) {
          return FALLBACK_LABS.find(l => l.id === input.id) || row || null;
        }
        return row;
      }),
  }),

  // Exams router
  exams: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return FALLBACK_EXAMS;
      const dbExams = await db.select().from(exams).orderBy(exams.order);
      const hasMinimumExamSet = dbExams.length >= FALLBACK_EXAMS.length;
      const looksImported =
        dbExams.length > 0 &&
        dbExams.every(
          e =>
            (e.titleEn || "").includes("[Imported]") ||
            (e.titleEn || "").includes("[Imported JSON]")
        );
      const looksLegacySeeded =
        dbExams.length > 0 &&
        dbExams.every(e => LEGACY_EXAM_TITLES.has(e.titleEn || ""));

      const lacksScenarioPayload =
        dbExams.length > 0 &&
        dbExams.every(e => {
          const payload = (e.descriptionFr || "").trim();
          return payload.length === 0 || !payload.startsWith("{");
        });

      return dbExams.length === 0 ||
        !hasMinimumExamSet ||
        looksImported ||
        looksLegacySeeded ||
        lacksScenarioPayload
        ? FALLBACK_EXAMS
        : dbExams;
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return FALLBACK_EXAMS.find(e => e.id === input.id) || null;
        const result = await db
          .select()
          .from(exams)
          .where(eq(exams.id, input.id));
        const row = result[0] || null;
        const isImported =
          !!row &&
          ((row.titleEn || "").includes("[Imported]") ||
            (row.titleEn || "").includes("[Imported JSON]"));
        const isLegacySeeded =
          !!row && LEGACY_EXAM_TITLES.has(row.titleEn || "");
        const lacksScenarioPayload =
          !!row && !(row.descriptionFr || "").trim().startsWith("{");

        if (!row || isImported || isLegacySeeded || lacksScenarioPayload) {
          return FALLBACK_EXAMS.find(e => e.id === input.id) || row || null;
        }
        return row;
      }),

    getQuestions: publicProcedure
      .input(z.object({ examId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          return FALLBACK_EXAM_QUESTIONS.filter(q => q.examId === input.examId);

        const examRow = await db
          .select()
          .from(exams)
          .where(eq(exams.id, input.examId));
        const currentExam = examRow[0];
        const shouldUseScenarioOnly =
          !!currentExam &&
          (LEGACY_EXAM_TITLES.has(currentExam.titleEn || "") ||
            (currentExam.titleEn || "").includes("[Imported]") ||
            (currentExam.titleEn || "").includes("[Imported JSON]") ||
            (currentExam.descriptionFr || "").trim().startsWith("{"));

        if (shouldUseScenarioOnly) {
          return [];
        }

        const qs = await db
          .select()
          .from(examQuestions)
          .where(eq(examQuestions.examId, input.examId))
          .orderBy(examQuestions.order);

        return qs;
      }),
  }),

  // Progress router for tracking
  progress: router({
    getChapterProgress: protectedProcedure
      .input(z.object({ chapterId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, ctx.user.id),
              eq(userProgress.chapterId, input.chapterId)
            )
          );
        return result[0] || null;
      }),

    getAllProgress: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, ctx.user.id));
    }),

    getCompletedLabs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [] as number[];

      const rows = await db
        .select()
        .from(labProgress)
        .where(eq(labProgress.userId, ctx.user.id));
      return Array.from(new Set(rows.map(r => r.labId)));
    }),

    completeChapter: protectedProcedure
      .input(z.object({ chapterId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const existing = await db
          .select()
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, ctx.user.id),
              eq(userProgress.chapterId, input.chapterId)
            )
          );
        if (existing.length === 0) {
          await db.insert(userProgress).values({
            userId: ctx.user.id,
            chapterId: input.chapterId,
            progress: "100",
            completedAt: new Date(),
          });
        }
        return { success: true };
      }),

    completeLab: protectedProcedure
      .input(z.object({ labId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const existing = await db
          .select()
          .from(labProgress)
          .where(
            and(
              eq(labProgress.userId, ctx.user.id),
              eq(labProgress.labId, input.labId)
            )
          );
        if (existing.length === 0) {
          await db.insert(labProgress).values({
            userId: ctx.user.id,
            labId: input.labId,
            completedAt: new Date(),
          });
        }
        return { success: true };
      }),

    submitExamResult: protectedProcedure
      .input(
        z.object({ examId: z.number(), score: z.number(), passed: z.boolean() })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.insert(examResults).values({
          userId: ctx.user.id,
          examId: input.examId,
          score: input.score.toString(),
          passed: input.passed,
          completedAt: new Date(),
        });
        return { success: true };
      }),

    getExamStatuses: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [] as Array<{ examId: number; score: number; passed: boolean; completedAt: Date | null }>;

      const rows = await db
        .select()
        .from(examResults)
        .where(eq(examResults.userId, ctx.user.id));

      const latestByExamId = new Map<number, (typeof rows)[number]>();
      for (const row of rows) {
        const prev = latestByExamId.get(row.examId);
        const prevDate = prev?.completedAt ? new Date(prev.completedAt).getTime() : 0;
        const currentDate = row.completedAt ? new Date(row.completedAt).getTime() : 0;
        if (!prev || currentDate >= prevDate) {
          latestByExamId.set(row.examId, row);
        }
      }

      return Array.from(latestByExamId.values()).map(r => ({
        examId: r.examId,
        score: Math.round(parseFloat(String(r.score))),
        passed: r.passed,
        completedAt: r.completedAt,
      }));
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const chaptersCompleted = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, ctx.user.id));
      const labsCompleted = await db
        .select()
        .from(labProgress)
        .where(eq(labProgress.userId, ctx.user.id));
      const examsCompleted = await db
        .select()
        .from(examResults)
        .where(eq(examResults.userId, ctx.user.id));

      const allChapters = await db.select().from(chapters);
      const allLabs = await db.select().from(labs);
      const allExams = await db.select().from(exams);

      const looksImportedLabs =
        allLabs.length > 0 &&
        allLabs.every(
          l =>
            (l.titleEn || "").includes("[Imported]") ||
            (l.descriptionEn || "").toLowerCase().includes("imported")
        );
      const looksLegacyLabs =
        allLabs.length > 0 &&
        allLabs.every(l => LEGACY_LAB_TITLES.has(l.titleEn || ""));
      const lacksStructuredLabInstructions =
        allLabs.length > 0 &&
        allLabs.every(l => {
          const instr = (l.instructionsEn || "").trim();
          return instr.length === 0 || !instr.startsWith("[");
        });

      const effectiveLabs =
        allLabs.length === 0 ||
        looksImportedLabs ||
        looksLegacyLabs ||
        lacksStructuredLabInstructions
          ? FALLBACK_LABS
          : allLabs;

      const canonicalLabs = [...effectiveLabs]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, FALLBACK_LABS.length);
      const canonicalLabIds = new Set(canonicalLabs.map(l => l.id));
      const completedCanonicalLabs = new Set(
        labsCompleted
          .filter(lp => canonicalLabIds.has(lp.labId))
          .map(lp => lp.labId)
      );

      const passedExams = examsCompleted.filter(e => e.passed);
      const completedPassedExamIds = new Set(passedExams.map(e => e.examId));

      let averageScore = 0;
      if (passedExams.length > 0) {
        averageScore =
          passedExams.reduce((acc, curr) => acc + parseFloat(curr.score), 0) /
          passedExams.length;
      }

      const sourceExams =
        (allExams.length >= FALLBACK_EXAMS.length ? allExams : FALLBACK_EXAMS)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const requiredFinalExamCount = 5;
      const requiredFinalExams = sourceExams.slice(0, requiredFinalExamCount);

      const latestResultByExamId = new Map<number, (typeof examsCompleted)[number]>();
      for (const result of examsCompleted) {
        const prev = latestResultByExamId.get(result.examId);
        const prevDate = prev?.completedAt ? new Date(prev.completedAt).getTime() : 0;
        const currentDate = result.completedAt ? new Date(result.completedAt).getTime() : 0;
        if (!prev || currentDate >= prevDate) {
          latestResultByExamId.set(result.examId, result);
        }
      }

      const latestRequiredExamResults = requiredFinalExams
        .map(ex => latestResultByExamId.get(ex.id))
        .filter(Boolean) as (typeof examsCompleted)[number][];
      const hasCompletedAllRequiredExams =
        requiredFinalExams.length === requiredFinalExamCount &&
        latestRequiredExamResults.length === requiredFinalExamCount;
      const finalExamAverage = hasCompletedAllRequiredExams
        ? latestRequiredExamResults.reduce(
            (acc, curr) => acc + parseFloat(String(curr.score)),
            0
          ) / requiredFinalExamCount
        : 0;
      const allRequiredExamsPassed =
        hasCompletedAllRequiredExams &&
        latestRequiredExamResults.every(result => result.passed);
      const qualifiesForFinalCertificate =
        allRequiredExamsPassed && finalExamAverage >= 70;

      const completedChapterCertificates = chaptersCompleted
        .filter(c => Boolean(c.completedAt))
        .map(c => ({
          id: `chapter-${c.chapterId}`,
          kind: "chapter" as const,
          name:
            allChapters.find(ch => ch.id === c.chapterId)?.titleEn ||
            `Chapter ${c.chapterId}`,
          date: c.completedAt,
        }));

      const finalCertificate = qualifiesForFinalCertificate
        ? [
            {
              id: "final-rhcsa",
              kind: "final" as const,
              name: "Final RHCSA Certification",
              date: latestRequiredExamResults
                .map(r => r.completedAt)
                .filter(Boolean)
                .sort((a, b) => new Date(b as Date).getTime() - new Date(a as Date).getTime())[0] ||
                new Date(),
              score: Math.round(finalExamAverage),
            },
          ]
        : [];

      const progressByChapterId = new Map(
        chaptersCompleted.map(p => [p.chapterId, p])
      );
      const chapterProgress = [...allChapters]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(ch => {
          const p = progressByChapterId.get(ch.id);
          const rawProgress = p?.progress ? parseFloat(String(p.progress)) : 0;
          const normalizedProgress = Number.isFinite(rawProgress)
            ? Math.max(0, Math.min(100, Math.round(rawProgress)))
            : 0;

          return {
            chapterId: ch.id,
            chapterNumber: ch.chapterNumber,
            titleEn: ch.titleEn,
            titleFr: ch.titleFr,
            progress: p?.completedAt ? 100 : normalizedProgress,
            completed: Boolean(p?.completedAt),
          };
        });

      const examTrend = requiredFinalExams.map(exam => {
        const latest = latestResultByExamId.get(exam.id);
        const parsedScore = latest ? parseFloat(String(latest.score)) : 0;

        return {
          examId: exam.id,
          title: exam.titleEn || `Exam ${exam.id}`,
          score: Number.isFinite(parsedScore) ? Math.round(parsedScore) : 0,
          passed: latest ? latest.passed : false,
          date: latest?.completedAt ?? null,
          attempted: Boolean(latest),
        };
      });

      return {
        chaptersCompleted: chaptersCompleted.length,
        totalChapters: allChapters.length || 12,
        labsCompleted: completedCanonicalLabs.size,
        totalLabs: canonicalLabs.length || FALLBACK_LABS.length,
        examsCompleted: completedPassedExamIds.size,
        totalExams: sourceExams.length,
        averageScore: Math.round(averageScore),
        streak: 1, // Placeholder
        certificates: [...completedChapterCertificates, ...finalCertificate],
        recentExams: examsCompleted.map(e => ({
          title:
            sourceExams.find(ex => ex.id === e.examId)?.titleEn ||
            `Exam ${e.examId}`,
          score: e.score,
          passed: e.passed,
          date: e.completedAt,
        })),
        examTrend,
        chapterProgress,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
