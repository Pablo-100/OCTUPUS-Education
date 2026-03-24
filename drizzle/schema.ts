import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
  "easy",
  "medium",
  "hard",
]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  language: varchar("language", { length: 5 }).default("en").notNull(),
  theme: varchar("theme", { length: 10 }).default("light").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const chapters = pgTable("chapters", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  chapterNumber: integer("chapterNumber").notNull().unique(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionFr: text("descriptionFr"),
  contentEn: text("contentEn"),
  contentFr: text("contentFr"),
  order: integer("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;

export const commands = pgTable("commands", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  nameEn: varchar("nameEn", { length: 100 }).notNull(),
  nameFr: varchar("nameFr", { length: 100 }).notNull(),
  descriptionEn: text("descriptionEn").notNull(),
  descriptionFr: text("descriptionFr").notNull(),
  syntax: varchar("syntax", { length: 500 }).notNull(),
  optionsEn: text("optionsEn"),
  optionsFr: text("optionsFr"),
  examplesEn: text("examplesEn"),
  examplesFr: text("examplesFr"),
  outputExample: text("outputExample"),
  relatedCommands: json("relatedCommands"),
  chapterId: integer("chapterId").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Command = typeof commands.$inferSelect;
export type InsertCommand = typeof commands.$inferInsert;

export const labs = pgTable("labs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionFr: text("descriptionFr"),
  difficulty: difficultyEnum("difficulty").notNull(),
  estimatedDuration: integer("estimatedDuration"),
  objectivesEn: text("objectivesEn"),
  objectivesFr: text("objectivesFr"),
  prerequisitesEn: text("prerequisitesEn"),
  prerequisitesFr: text("prerequisitesFr"),
  instructionsEn: text("instructionsEn"),
  instructionsFr: text("instructionsFr"),
  validationEn: text("validationEn"),
  validationFr: text("validationFr"),
  solutionEn: text("solutionEn"),
  solutionFr: text("solutionFr"),
  chapterId: integer("chapterId"),
  order: integer("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Lab = typeof labs.$inferSelect;
export type InsertLab = typeof labs.$inferInsert;

export const exams = pgTable("exams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  titleFr: varchar("titleFr", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionFr: text("descriptionFr"),
  timeLimit: integer("timeLimit").notNull(),
  totalQuestions: integer("totalQuestions").notNull(),
  passingScore: decimal("passingScore", { precision: 5, scale: 2 }).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

export const examQuestions = pgTable("examQuestions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  examId: integer("examId").notNull(),
  questionEn: text("questionEn").notNull(),
  questionFr: text("questionFr").notNull(),
  optionsEn: json("optionsEn").notNull(),
  optionsFr: json("optionsFr").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 10 }).notNull(),
  explanationEn: text("explanationEn"),
  explanationFr: text("explanationFr"),
  difficulty: difficultyEnum("difficulty").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type InsertExamQuestion = typeof examQuestions.$inferInsert;

export const userProgress = pgTable("userProgress", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  chapterId: integer("chapterId").notNull(),
  completedAt: timestamp("completedAt"),
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

export const labProgress = pgTable("labProgress", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  labId: integer("labId").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LabProgress = typeof labProgress.$inferSelect;
export type InsertLabProgress = typeof labProgress.$inferInsert;

export const examResults = pgTable("examResults", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  examId: integer("examId").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  passed: boolean("passed").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = typeof examResults.$inferInsert;
