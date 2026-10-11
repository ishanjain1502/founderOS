import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import {
  epistemicSnapshotSchema,
  intakeDraftPartialSchema,
  isIntakeComplete,
  projectIntakeToEpistemic,
  validateEpistemicSnapshot,
  type EpistemicSnapshot,
  type IntakeDraftPartial,
} from "@ceo-sandbox/domain";
import { RunMode } from "@ceo-sandbox/domain";
import { EpistemicProjectionError } from "./epistemic-projection-error";
import { FrozenSessionError } from "./frozen-error";

export { EpistemicProjectionError } from "./epistemic-projection-error";
export { FrozenSessionError } from "./frozen-error";

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  contract_version INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL CHECK (mode IN ('demo', 'full')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'frozen')),
  question_revision INTEGER NOT NULL DEFAULT 1,
  intake_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  frozen_at TEXT,
  epistemic_json TEXT
);
`;

type SessionStatus = "draft" | "approved" | "frozen";

export type SessionRecord = {
  id: string;
  contractVersion: 1;
  mode: RunMode;
  status: SessionStatus;
  questionRevision: number;
  intake: IntakeDraftPartial;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  frozenAt: string | null;
  epistemic: EpistemicSnapshot | null;
};

type SessionRow = {
  id: string;
  contract_version: number;
  mode: string;
  status: string;
  question_revision: number;
  intake_json: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  frozen_at: string | null;
  epistemic_json: string | null;
};

export type SessionStore = {
  createSession(input: {
    mode: RunMode;
    intake: IntakeDraftPartial;
  }): SessionRecord;
  getSession(id: string): SessionRecord | null;
  updateIntake(id: string, intake: IntakeDraftPartial): SessionRecord;
  approveSession(id: string): SessionRecord;
  startSession(id: string): SessionRecord;
};

const SELECT_COLUMNS = `id, contract_version, mode, status, question_revision, intake_json,
  created_at, updated_at, approved_at, frozen_at, epistemic_json`;

function withDb<T>(filePath: string, fn: (db: Database.Database) => T): T {
  const db = new Database(filePath);
  db.exec(CREATE_TABLE);
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN epistemic_json TEXT`);
  } catch {
    // column already exists
  }
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function rowToRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    contractVersion: 1,
    mode: row.mode as RunMode,
    status: row.status as SessionStatus,
    questionRevision: row.question_revision,
    intake: intakeDraftPartialSchema.parse(JSON.parse(row.intake_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    frozenAt: row.frozen_at,
    epistemic: row.epistemic_json
      ? epistemicSnapshotSchema.parse(JSON.parse(row.epistemic_json))
      : null,
  };
}

function requireRow(db: Database.Database, id: string): SessionRow {
  const row = db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM sessions WHERE id = ?`)
    .get(id) as SessionRow | undefined;
  if (!row) {
    throw new Error(`Session not found: ${id}`);
  }
  return row;
}

export function openSessionStore(filePath: string): SessionStore {
  return {
    createSession(input) {
      return withDb(filePath, (db) => {
        const intake = intakeDraftPartialSchema.parse(input.intake);
        const id = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO sessions (
          id, contract_version, mode, status, question_revision, intake_json,
          created_at, updated_at, approved_at, frozen_at
        ) VALUES (?, 1, ?, 'draft', 1, ?, ?, ?, NULL, NULL)`,
        ).run(id, input.mode, JSON.stringify(intake), now, now);
        return rowToRecord(requireRow(db, id));
      });
    },

    getSession(id) {
      return withDb(filePath, (db) => {
        const row = db
          .prepare(`SELECT ${SELECT_COLUMNS} FROM sessions WHERE id = ?`)
          .get(id) as SessionRow | undefined;
        return row ? rowToRecord(row) : null;
      });
    },

    updateIntake(id, intake) {
      return withDb(filePath, (db) => {
        const row = requireRow(db, id);
        if (row.status === "frozen") {
          throw new FrozenSessionError();
        }
        const parsed = intakeDraftPartialSchema.parse(intake);
        const now = new Date().toISOString();
        if (row.status === "approved") {
          db.prepare(
            `UPDATE sessions
           SET intake_json = ?, updated_at = ?, status = 'draft', approved_at = NULL
           WHERE id = ?`,
          ).run(JSON.stringify(parsed), now, id);
        } else {
          db.prepare(
            `UPDATE sessions SET intake_json = ?, updated_at = ? WHERE id = ?`,
          ).run(JSON.stringify(parsed), now, id);
        }
        return rowToRecord(requireRow(db, id));
      });
    },

    approveSession(id) {
      return withDb(filePath, (db) => {
        const row = requireRow(db, id);
        const intake = intakeDraftPartialSchema.parse(
          JSON.parse(row.intake_json),
        );
        const complete = isIntakeComplete(intake);
        if (!complete.ok) {
          throw new Error("incomplete_intake");
        }
        const now = new Date().toISOString();
        db.prepare(
          `UPDATE sessions
         SET status = 'approved', approved_at = ?, updated_at = ?
         WHERE id = ?`,
        ).run(now, now, id);
        return rowToRecord(requireRow(db, id));
      });
    },

    startSession(id) {
      return withDb(filePath, (db) => {
        const row = requireRow(db, id);
        if (row.status !== "approved") {
          throw new Error("not_approved");
        }
        const intake = intakeDraftPartialSchema.parse(
          JSON.parse(row.intake_json),
        );
        const now = new Date().toISOString();
        const snapshot = projectIntakeToEpistemic(intake, {
          mode: row.mode as RunMode,
          sessionId: id,
          now,
        });
        const validation = validateEpistemicSnapshot(snapshot);
        if (!validation.ok) {
          throw new EpistemicProjectionError();
        }
        db.prepare(
          `UPDATE sessions
         SET status = 'frozen', frozen_at = ?, updated_at = ?, epistemic_json = ?
         WHERE id = ?`,
        ).run(now, now, JSON.stringify(snapshot), id);
        return rowToRecord(requireRow(db, id));
      });
    },
  };
}
