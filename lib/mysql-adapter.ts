import pool from './db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'de-elearn-mvgrce-super-secure-jwt-secret-key-2026';
const uploadBaseDir = path.join(process.cwd(), 'server', 'uploads', 'materials');

try {
  if (!fs.existsSync(uploadBaseDir)) {
    fs.mkdirSync(uploadBaseDir, { recursive: true });
  }
} catch (e) {
  // Directory might already exist or running in restricted environment
}

interface QueryFilter {
  type: 'eq' | 'neq' | 'in' | 'lte' | 'gte' | 'lt' | 'gt' | 'like' | 'or';
  column?: string;
  value?: any;
  rawOr?: string;
}

class MySQLQueryBuilder {
  private tableName: string;
  private selectedCols: string = '*';
  private countMode: string | null = null;
  private isHead: boolean = false;
  private filters: QueryFilter[] = [];
  private orderClauses: string[] = [];
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private mutationType: 'insert' | 'update' | 'upsert' | 'delete' | null = null;
  private mutationData: any = null;
  private upsertOptions: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    this.selectedCols = columns;
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.isHead = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  or(filterString: string) {
    this.filters.push({ type: 'or', rawOr: filterString });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderClauses.push(`\`${column}\` ${dir}`);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  insert(data: any) {
    this.mutationType = 'insert';
    this.mutationData = data;
    return this;
  }

  update(data: any) {
    this.mutationType = 'update';
    this.mutationData = data;
    return this;
  }

  upsert(data: any, options?: any) {
    this.mutationType = 'upsert';
    this.mutationData = data;
    this.upsertOptions = options;
    return this;
  }

  delete() {
    this.mutationType = 'delete';
    return this;
  }

  private stripNestedRelations(rawCols: string): string[] {
    let depth = 0;
    let result = '';
    const s = rawCols.replace(/[\r\n]+/g, ' ');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(') {
        depth++;
        let j = result.length - 1;
        while (j >= 0 && result[j] === ' ') j--;
        while (j >= 0 && result[j] !== ',') j--;
        result = result.slice(0, j + 1);
      } else if (ch === ')') {
        depth = Math.max(0, depth - 1);
      } else if (depth === 0) {
        result += ch;
      }
    }
    return result
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
  }

  async execute(): Promise<{ data: any; count: number | null; error: any }> {
    try {
      // 1. Handle INSERT
      if (this.mutationType === 'insert') {
        const rows = Array.isArray(this.mutationData) ? this.mutationData : [this.mutationData];
        if (!rows.length) return { data: [], count: 0, error: null };

        const insertedRows: any[] = [];
        for (const row of rows) {
          const rowData = { ...row };
          if (!rowData.id && (this.tableName === 'users' || this.tableName === 'materials' || this.tableName === 'material_files' || this.tableName === 'activity_events' || this.tableName === 'audit_logs' || this.tableName === 'bookmarks' || this.tableName === 'announcements' || this.tableName === 'notifications' || this.tableName === 'support_inquiries' || this.tableName === 'exam_schedules')) {
            rowData.id = crypto.randomUUID();
          }

          if (this.tableName === 'materials' && 'owner' in rowData) {
            rowData.owner_id = rowData.owner;
            delete rowData.owner;
          }

          if (this.tableName === 'material_files') {
            if (!rowData.storage_path && rowData.storage_ref) {
              rowData.storage_path = rowData.storage_ref;
            }
            if (!rowData.storage_ref && rowData.storage_path) {
              rowData.storage_ref = rowData.storage_path;
            }
          }

          for (const key of Object.keys(rowData)) {
            if (typeof rowData[key] === 'object' && rowData[key] !== null && !(rowData[key] instanceof Date)) {
              rowData[key] = JSON.stringify(rowData[key]);
            }
          }

          const cols = Object.keys(rowData).map(k => `\`${k}\``).join(', ');
          const placeholders = Object.keys(rowData).map(() => '?').join(', ');
          const values = Object.values(rowData);

          const sql = `INSERT INTO \`${this.tableName}\` (${cols}) VALUES (${placeholders})`;
          await pool.query(sql, values);
          insertedRows.push(rowData);
        }

        let returnData: any = Array.isArray(this.mutationData) ? insertedRows : insertedRows[0];
        if (this.isSingle) {
          returnData = insertedRows[0] || null;
        }
        return { data: returnData, count: rows.length, error: null };
      }

      // 2. Handle UPSERT
      if (this.mutationType === 'upsert') {
        const rows = Array.isArray(this.mutationData) ? this.mutationData : [this.mutationData];
        if (!rows.length) return { data: [], count: 0, error: null };

        const insertedRows: any[] = [];
        for (const row of rows) {
          const rowData = { ...row };
          if (!rowData.id && (this.tableName === 'users' || this.tableName === 'materials' || this.tableName === 'material_files' || this.tableName === 'activity_events' || this.tableName === 'audit_logs' || this.tableName === 'bookmarks' || this.tableName === 'announcements' || this.tableName === 'notifications' || this.tableName === 'support_inquiries' || this.tableName === 'exam_schedules')) {
            rowData.id = crypto.randomUUID();
          }

          if (this.tableName === 'materials' && 'owner' in rowData) {
            rowData.owner_id = rowData.owner;
            delete rowData.owner;
          }

          if (this.tableName === 'material_files') {
            if (!rowData.storage_path && rowData.storage_ref) {
              rowData.storage_path = rowData.storage_ref;
            }
            if (!rowData.storage_ref && rowData.storage_path) {
              rowData.storage_ref = rowData.storage_path;
            }
          }

          for (const key of Object.keys(rowData)) {
            if (typeof rowData[key] === 'object' && rowData[key] !== null && !(rowData[key] instanceof Date)) {
              rowData[key] = JSON.stringify(rowData[key]);
            }
          }

          const cols = Object.keys(rowData).map(k => `\`${k}\``).join(', ');
          const placeholders = Object.keys(rowData).map(() => '?').join(', ');
          const updatePart = Object.keys(rowData)
            .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
            .join(', ');

          const values = Object.values(rowData);
          const sql = `INSERT INTO \`${this.tableName}\` (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updatePart}`;
          await pool.query(sql, values);
          insertedRows.push(rowData);
        }

        let returnData: any = Array.isArray(this.mutationData) ? insertedRows : insertedRows[0];
        if (this.isSingle) {
          returnData = insertedRows[0] || null;
        }
        return { data: returnData, count: rows.length, error: null };
      }

      // 3. Handle UPDATE
      if (this.mutationType === 'update') {
        const updateData = { ...this.mutationData };
        if (this.tableName === 'materials' && 'owner' in updateData) {
          updateData.owner_id = updateData.owner;
          delete updateData.owner;
        }

        for (const key of Object.keys(updateData)) {
          if (typeof updateData[key] === 'object' && updateData[key] !== null && !(updateData[key] instanceof Date)) {
            updateData[key] = JSON.stringify(updateData[key]);
          }
        }

        const setClauses: string[] = [];
        const params: any[] = [];

        for (const [k, v] of Object.entries(updateData)) {
          setClauses.push(`\`${k}\` = ?`);
          params.push(v);
        }

        const whereParts: string[] = [];
        this.buildWhere(whereParts, params);
        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

        const sql = `UPDATE \`${this.tableName}\` SET ${setClauses.join(', ')} ${whereSql}`;
        await pool.query(sql, params);
        return { data: this.mutationData, count: null, error: null };
      }

      // 4. Handle DELETE
      if (this.mutationType === 'delete') {
        const whereParts: string[] = [];
        const params: any[] = [];
        this.buildWhere(whereParts, params);
        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

        const sql = `DELETE FROM \`${this.tableName}\` ${whereSql}`;
        await pool.query(sql, params);
        return { data: null, count: null, error: null };
      }

      // 5. Handle SELECT
      const whereParts: string[] = [];
      const params: any[] = [];
      this.buildWhere(whereParts, params);
      const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

      // Count only check (head request or explicit count request)
      if (this.isHead || (this.countMode && this.selectedCols.includes('count'))) {
        const countSql = `SELECT COUNT(*) as total FROM \`${this.tableName}\` ${whereSql}`;
        const [countResult]: any = await pool.query(countSql, params);
        return { data: null, count: Number(countResult[0]?.total || 0), error: null };
      }

      // Base select
      let selectClause = '*';
      if (this.selectedCols && this.selectedCols !== '*') {
        // Strip nested relation selectors like subjects(...) or users(...) for basic query
        const cleanCols = this.stripNestedRelations(this.selectedCols)
          .map(c => `\`${c}\``)
          .join(', ');
        if (cleanCols) selectClause = cleanCols;
      }

      let orderSql = '';
      if (this.orderClauses.length) {
        orderSql = `ORDER BY ${this.orderClauses.join(', ')}`;
      }

      let limitSql = '';
      if (this.limitCount) {
        limitSql = `LIMIT ${this.limitCount}`;
      }

      let totalCount: number | null = null;
      if (this.countMode) {
        const countSql = `SELECT COUNT(*) as total FROM \`${this.tableName}\` ${whereSql}`;
        const [countResult]: any = await pool.query(countSql, params);
        totalCount = Number(countResult[0]?.total || 0);
      }

      const sql = `SELECT ${selectClause} FROM \`${this.tableName}\` ${whereSql} ${orderSql} ${limitSql}`.trim();
      const [rows]: any = await pool.query(sql, params);

      // Expand JSON fields automatically
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          if (typeof row[key] === 'string' && (row[key].startsWith('{') || row[key].startsWith('['))) {
            try {
              row[key] = JSON.parse(row[key]);
            } catch {}
          }
        }
      }

      // Handle joined subjects if requested in materials table
      if (this.tableName === 'materials' && this.selectedCols.includes('subjects(')) {
        const subjectCodes = [...new Set(rows.map((r: any) => r.subject).filter(Boolean))];
        if (subjectCodes.length) {
          const [subjects]: any = await pool.query(
            'SELECT code, title, branch, semester, regulation FROM subjects WHERE code IN (?)',
            [subjectCodes]
          );
          const subjMap = new Map();
          subjects.forEach((s: any) => subjMap.set(s.code, s));
          rows.forEach((r: any) => {
            r.subjects = subjMap.get(r.subject) || null;
          });
        }
      }

      // Handle joined material_files if requested in materials table
      if (this.tableName === 'materials' && this.selectedCols.includes('material_files')) {
        const matIds = [...new Set(rows.map((r: any) => r.id).filter(Boolean))];
        if (matIds.length) {
          const [files]: any = await pool.query(
            'SELECT id, material_id, file_name, mime_type, size, version, storage_path, storage_ref FROM material_files WHERE material_id IN (?)',
            [matIds]
          );
          const filesMap = new Map<string, any[]>();
          files.forEach((f: any) => {
            f.storage_ref = f.storage_ref || f.storage_path;
            if (!filesMap.has(f.material_id)) filesMap.set(f.material_id, []);
            filesMap.get(f.material_id)!.push(f);
          });
          rows.forEach((r: any) => {
            r.material_files = filesMap.get(r.id) || [];
          });
        }
      }

      // Handle joined users/owner
      if (this.tableName === 'materials' && this.selectedCols.includes('users(')) {
        const ownerIds = [...new Set(rows.map((r: any) => r.owner_id).filter(Boolean))];
        if (ownerIds.length) {
          const [users]: any = await pool.query('SELECT id, name, email FROM users WHERE id IN (?)', [ownerIds]);
          const userMap = new Map();
          users.forEach((u: any) => userMap.set(u.id, u));
          rows.forEach((r: any) => {
            r.users = userMap.get(r.owner_id) || null;
          });
        }
      }

      // Handle joined materials in bookmarks table
      if (this.tableName === 'bookmarks' && this.selectedCols.includes('materials')) {
        const matIds = [...new Set(rows.map((r: any) => r.material_id).filter(Boolean))];
        if (matIds.length) {
          const [materials]: any = await pool.query(
            "SELECT id, title, description, type, subject, branch, semester, regulation, owner_id FROM materials WHERE id IN (?) AND (state != 'deleted' OR state IS NULL)",
            [matIds]
          );

          if (this.selectedCols.includes('subjects') || this.selectedCols.includes('users')) {
            const subjCodes = [...new Set(materials.map((m: any) => m.subject).filter(Boolean))];
            const ownerIds = [...new Set(materials.map((m: any) => m.owner_id).filter(Boolean))];

            let subjMap = new Map();
            if (subjCodes.length) {
              const [subjs]: any = await pool.query('SELECT code, title FROM subjects WHERE code IN (?)', [subjCodes]);
              subjs.forEach((s: any) => subjMap.set(s.code, s));
            }

            let userMap = new Map();
            if (ownerIds.length) {
              const [users]: any = await pool.query('SELECT id, name FROM users WHERE id IN (?)', [ownerIds]);
              users.forEach((u: any) => userMap.set(u.id, u));
            }

            materials.forEach((m: any) => {
              m.subjects = subjMap.get(m.subject) || null;
              m.users = userMap.get(m.owner_id) || null;
            });
          }

          const matMap = new Map();
          materials.forEach((m: any) => matMap.set(m.id, m));
          rows.forEach((r: any) => {
            r.materials = matMap.get(r.material_id) || null;
          });
        }
      }

      // Handle joined users in audit_logs or activity_events table
      if ((this.tableName === 'audit_logs' || this.tableName === 'activity_events') && (this.selectedCols.includes('users') || this.selectedCols.includes('actor_id'))) {
        const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
        if (actorIds.length) {
          const [users]: any = await pool.query(
            'SELECT id, name, email, role, branch, current_semester, section, roll_number FROM users WHERE id IN (?)',
            [actorIds]
          );
          const userMap = new Map();
          users.forEach((u: any) => userMap.set(u.id, u));
          rows.forEach((r: any) => {
            r.users = userMap.get(r.actor_id) || null;
          });
        }
      }

      if (this.tableName === 'materials') {
        rows.forEach((r: any) => {
          if (r.owner_id && !r.owner) {
            r.owner = r.owner_id;
          }
        });
      }

      if (this.isSingle) {
        if (!rows.length) {
          return { data: null, count: 0, error: { message: 'Row not found' } };
        }
        return { data: rows[0], count: 1, error: null };
      }

      if (this.isMaybeSingle) {
        return { data: rows.length ? rows[0] : null, count: totalCount ?? rows.length, error: null };
      }

      return { data: rows, count: totalCount ?? rows.length, error: null };
    } catch (err: any) {
      console.error(`MySQLQueryBuilder error on [${this.tableName}]:`, err.message);
      return { data: null, count: null, error: { message: err.message, code: err.code } };
    }
  }

  // Make query builder thenable (awaitable)
  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.execute().then(resolve, reject);
  }

  private buildWhere(whereParts: string[], params: any[]) {
    for (const f of this.filters) {
      let colName = f.column;
      if (this.tableName === 'materials' && colName === 'owner') {
        colName = 'owner_id';
      }

      if (f.type === 'eq') {
        whereParts.push(`\`${colName}\` = ?`);
        params.push(f.value);
      } else if (f.type === 'neq') {
        if (colName === 'state' && f.value === 'deleted') {
          whereParts.push(`(\`${colName}\` != ? OR \`${colName}\` IS NULL)`);
          params.push(f.value);
        } else {
          whereParts.push(`\`${colName}\` != ?`);
          params.push(f.value);
        }
      } else if (f.type === 'in') {
        if (Array.isArray(f.value) && f.value.length) {
          whereParts.push(`\`${colName}\` IN (?)`);
          params.push(f.value);
        } else {
          whereParts.push('1 = 0');
        }
      } else if (f.type === 'lte') {
        whereParts.push(`\`${colName}\` <= ?`);
        params.push(f.value);
      } else if (f.type === 'gte') {
        whereParts.push(`\`${colName}\` >= ?`);
        params.push(f.value);
      } else if (f.type === 'lt') {
        whereParts.push(`\`${colName}\` < ?`);
        params.push(f.value);
      } else if (f.type === 'gt') {
        whereParts.push(`\`${colName}\` > ?`);
        params.push(f.value);
      } else if (f.type === 'like') {
        whereParts.push(`\`${colName}\` LIKE ?`);
        params.push(f.value);
      } else if (f.type === 'or' && f.rawOr) {
        // Parse Supabase or strings e.g. "scope_branch.is.null,scope_branch.eq.CIC" or "owner.eq.1,email.eq.foo@bar"
        const conditions = f.rawOr.split(',').map(cond => cond.trim());
        const subParts: string[] = [];

        for (const cond of conditions) {
          if (cond.includes('.is.null')) {
            let col = cond.split('.is.null')[0].trim();
            if (this.tableName === 'materials' && col === 'owner') col = 'owner_id';
            subParts.push(`\`${col}\` IS NULL`);
          } else if (cond.includes('.eq.')) {
            let [col, val] = cond.split('.eq.');
            col = col.trim();
            if (this.tableName === 'materials' && col === 'owner') col = 'owner_id';
            subParts.push(`\`${col}\` = ?`);
            params.push(val.trim());
          }
        }

        if (subParts.length) {
          whereParts.push(`(${subParts.join(' OR ')})`);
        }
      }
    }
  }
}

// Storage Adapter (Local Disk Storage replacing Supabase Storage)
class MySQLStorageBucket {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(storageRef: string, fileData: Buffer | ArrayBuffer | Blob, options?: any) {
    try {
      const fullPath = path.join(uploadBaseDir, storageRef);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let buffer: Buffer;
      if (fileData instanceof Buffer) {
        buffer = fileData;
      } else if (fileData instanceof ArrayBuffer) {
        buffer = Buffer.from(fileData);
      } else {
        buffer = Buffer.from(await (fileData as any).arrayBuffer());
      }

      fs.writeFileSync(fullPath, buffer);
      return { data: { path: storageRef }, error: null };
    } catch (err: any) {
      console.error('Storage upload error:', err);
      return { data: null, error: { message: err.message } };
    }
  }

  async createSignedUrl(storageRef: string, expiresIn: number = 3600) {
    // In local / Hostinger setup, return streaming URL
    return {
      data: {
        signedUrl: `/api/materials/file/${storageRef}`,
      },
      error: null as { message: string } | null,
    };
  }

  getPublicUrl(storageRef: string) {
    return {
      data: {
        publicUrl: `/uploads/materials/${storageRef}`,
      },
    };
  }

  async remove(paths: string[]) {
    try {
      const removed: string[] = [];
      for (const p of paths) {
        const fullPath = path.join(uploadBaseDir, p);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          removed.push(p);
        }
      }
      return { data: removed, error: null };
    } catch (err: any) {
      console.error('Storage remove error:', err);
      return { data: null, error: { message: err.message } };
    }
  }
}

// Main MySQL Client matching Supabase signature
export class MySQLClient {
  private cookieStore?: any;

  constructor(cookieStore?: any) {
    this.cookieStore = cookieStore;
  }

  from(tableName: string) {
    return new MySQLQueryBuilder(tableName);
  }

  rpc(funcName: string, params: any) {
    return (async () => {
      try {
        if (funcName === "admin_reset_user_password" && params?.target_user_id) {
          const hash = await bcrypt.hash(params.new_password || "Password@789", 10);
          await pool.query("UPDATE users SET password_hash = ?, first_login_pending = 1 WHERE id = ?", [hash, params.target_user_id]);
          return { data: true, error: null as { message: string } | null };
        }
        return { data: null, error: null as { message: string } | null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    })();
  }

  get storage() {
    return {
      from: (bucketName: string) => new MySQLStorageBucket(bucketName),
    };
  }

  get auth() {
    return {
      getUser: async () => {
        try {
          const token = this.cookieStore?.get?.('de_token')?.value;
          if (!token) return { data: { user: null }, error: null as { message: string } | null };

          const payload: any = jwt.verify(token, JWT_SECRET);
          if (!payload || !payload.id) return { data: { user: null }, error: null as { message: string } | null };

          const [users]: any = await pool.query(
            'SELECT id, email, name, role, status, branch, current_semester, academic_year, section, designation, phone, roll_number FROM users WHERE id = ? LIMIT 1',
            [payload.id]
          );

          if (!users.length || users[0].status === 'deactivated') {
            return { data: { user: null }, error: null as { message: string } | null };
          }

          const u = users[0];
          return {
            data: {
              user: {
                id: u.id,
                email: u.email,
                user_metadata: {
                  name: u.name,
                  role: u.role,
                  branch: u.branch,
                  current_semester: u.current_semester,
                  section: u.section,
                },
                app_metadata: { role: u.role },
                role: u.role,
                created_at: u.created_at,
              },
            },
            error: null as { message: string } | null,
          };
        } catch (err) {
          return { data: { user: null }, error: null as { message: string } | null };
        }
      },

      updateUser: async (attributes: any) => {
        try {
          const token = this.cookieStore?.get?.('de_token')?.value;
          if (token) {
            const payload: any = jwt.verify(token, JWT_SECRET);
            if (payload?.id && attributes?.password) {
              const hash = await bcrypt.hash(attributes.password, 10);
              await pool.query('UPDATE users SET password_hash = ?, first_login_pending = 0, updated_at = NOW() WHERE id = ?', [hash, payload.id]);
            }
          }
          return { data: { user: {} }, error: null as { message: string } | null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const cleanEmail = email.trim().toLowerCase();
          const cleanPassword = password.trim();
          const [users]: any = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);

          if (!users.length) {
            return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } };
          }

          const user = users[0];
          if (user.status === 'deactivated') {
            return { data: { user: null, session: null }, error: { message: 'This account has been deactivated.' } };
          }

          // 1. Direct and case-normalized comparison
          let isValid = await bcrypt.compare(cleanPassword, user.password_hash);
          if (!isValid && cleanPassword !== cleanPassword.toUpperCase()) {
            isValid = await bcrypt.compare(cleanPassword.toUpperCase(), user.password_hash);
          }
          if (!isValid && cleanPassword !== cleanPassword.toLowerCase()) {
            isValid = await bcrypt.compare(cleanPassword.toLowerCase(), user.password_hash);
          }

          // 2. Fallback check for default roll numbers or faculty keys
          // STRICT SECURITY RULE: ONLY allowed when first_login_pending is true/1.
          // Once a user has set their own password (first_login_pending = 0), previous defaults are permanently revoked.
          const isFirstLoginPending = user.first_login_pending === 1 || user.first_login_pending === true || user.first_login_pending === '1';
          if (!isValid && isFirstLoginPending) {
            const regNo = cleanEmail.split('@')[0].toUpperCase();
            const phoneDigits = user.phone ? user.phone.replace(/\D/g, '') : '';
            const phoneSuffix = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : null;
            const validDefaults: string[] = [];

            if (user.role === 'student') {
              if (regNo) validDefaults.push(regNo);
              if (user.roll_number) validDefaults.push(user.roll_number.toUpperCase());
            }

            if (user.role === 'faculty' && phoneSuffix) {
              validDefaults.push(`MVGRDE@${phoneSuffix}`);
              validDefaults.push(`mvgrde@${phoneSuffix}`);
            }

            const cleanUpper = cleanPassword.toUpperCase();
            const cleanLower = cleanPassword.toLowerCase();

            if (
              validDefaults.some(
                d => d.toUpperCase() === cleanUpper || d.toLowerCase() === cleanLower
              )
            ) {
              isValid = true;
              const newHash = await bcrypt.hash(cleanPassword, 10);
              await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
            }
          }

          if (!isValid) {
            return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } };
          }

          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              branch: user.branch,
              current_semester: user.current_semester,
              section: user.section,
              designation: user.designation,
              roll_number: user.roll_number,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          if (this.cookieStore?.set) {
            this.cookieStore.set('de_token', token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60,
              path: '/',
            });
          }

          // Record login audit event
          try {
            await pool.query(
              'INSERT INTO audit_logs (id, action, actor_id, object_id, after_summary) VALUES (?, ?, ?, ?, ?)',
              [
                crypto.randomUUID(),
                'USER_LOGIN',
                user.id,
                user.email,
                JSON.stringify({ role: user.role, name: user.name })
              ]
            );
          } catch {}

          const authUser = {
            id: user.id,
            email: user.email,
            user_metadata: { name: user.name, role: user.role },
          };

          return { data: { user: authUser, session: { access_token: token } }, error: null as { message: string } | null };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: { message: err.message } };
        }
      },

      signOut: async () => {
        if (this.cookieStore?.delete) {
          this.cookieStore.delete('de_token');
        }
        return { error: null as { message: string } | null };
      },

      admin: {
        createUser: async (params: any) => {
          const userId = crypto.randomUUID();
          const hash = await bcrypt.hash(params.password || 'Password@789', 10);
          await pool.query(
            'INSERT INTO users (id, email, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, params.email, hash, params.user_metadata?.name || 'User', params.user_metadata?.role || 'student', 'active']
          );
          return { data: { user: { id: userId, email: params.email } }, error: null as { message: string } | null };
        },
        updateUserById: async (id: string, attributes: any) => {
          try {
            if (attributes?.password) {
              const hash = await bcrypt.hash(attributes.password, 10);
              await pool.query('UPDATE users SET password_hash = ?, first_login_pending = 1, updated_at = NOW() WHERE id = ? OR email = ?', [hash, id, id]);
            }
            return { data: { user: { id } }, error: null as { message: string } | null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
        listUsers: async () => {
          try {
            const [users]: any = await pool.query('SELECT id, email FROM users');
            return { data: { users }, error: null as { message: string } | null };
          } catch (err: any) {
            return { data: { users: [] }, error: { message: err.message } };
          }
        },
        deleteUser: async (id: string) => {
          await pool.query('DELETE FROM users WHERE id = ?', [id]);
          return { data: null, error: null as { message: string } | null };
        },
      },
    };
  }
}
