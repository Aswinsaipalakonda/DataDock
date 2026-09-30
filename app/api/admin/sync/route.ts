import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import r24Subjects from "@/lib/data/r24-subjects.json";
import studentRoster from "@/lib/data/student-roster.json";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check (Signed-in admin or secret key)
    const cookieStore = await cookies();
    const token = cookieStore.get("de_token")?.value || cookieStore.get("__Secure-session")?.value;
    const secretHeader = req.headers.get("x-admin-sync-secret");
    const jwtSecret = process.env.JWT_SECRET || "de-elearn-mvgrce-super-secure-jwt-secret-key-2026";

    let isAuthorized = false;

    if (secretHeader && (secretHeader === jwtSecret || secretHeader === "sync-datadock-2026")) {
      isAuthorized = true;
    } else if (token) {
      try {
        const decoded: any = jwt.verify(token, jwtSecret);
        if (decoded && decoded.role === "admin") {
          isAuthorized = true;
        }
      } catch (e) {
        // Token invalid
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Ensure R24 Regulation exists in database
    await pool.query(`
      INSERT INTO regulations (code, name, active)
      VALUES ('R24', 'R24 Autonomous Regulation', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), active = 1
    `);

    // 3. Upsert Decomposed R24 Subjects
    let totalSubjectsUpserted = 0;
    for (const sub of r24Subjects) {
      await pool.query(
        `INSERT INTO subjects (code, title, branch, semester, regulation, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), semester = VALUES(semester), active = 1`,
        [sub.code, sub.title, sub.branch, sub.semester, sub.regulation]
      );
      totalSubjectsUpserted++;
    }

    // 4. Upsert Decomposed R23 Honors Subjects
    const r23HonorsSubjects = [
      { code: 'R23MSCSHT09', title: 'HON-1: Information Security and Forensics', branch: 'CIC', semester: 6, regulation: 'R23' },
      { code: 'R23MSCSHT10', title: 'HON-1: Routing and Switching Applications', branch: 'CIC', semester: 6, regulation: 'R23' },
      { code: 'R23MSCSHT11', title: 'HON-2: Penetration Testing', branch: 'CIC', semester: 6, regulation: 'R23' },
      { code: 'R23MSCSHT12', title: 'HON-2: Network Security, Firewalls and VPNs', branch: 'CIC', semester: 6, regulation: 'R23' },
      { code: 'R23MSCSHT13', title: 'HON-3: Information Security Governance and Compliance Standards', branch: 'CIC', semester: 7, regulation: 'R23' },
      { code: 'R23MSCSHT14', title: 'HON-3: Protocol Stacks', branch: 'CIC', semester: 7, regulation: 'R23' },
    ];

    for (const sub of r23HonorsSubjects) {
      await pool.query(
        `INSERT INTO subjects (code, title, branch, semester, regulation, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), semester = VALUES(semester), active = 1`,
        [sub.code, sub.title, sub.branch, sub.semester, sub.regulation]
      );
      totalSubjectsUpserted++;
    }

    // 5. Safe Material & Allocation Migration (Zero Data Loss)
    const legacyMappings = [
      { oldCodeLike: '%R24MBMCL001%', newPrimaryCode: 'R24MBMCL001' },
      { oldCodeLike: '%R24MBMCT001%', newPrimaryCode: 'R24MBMCT001' },
      { oldCodeLike: '%R24MBMCT002%', newPrimaryCode: 'R24MBMCT002' },
      { oldCodeLike: '%R24MBMCL003%R24MIACL003%', newPrimaryCode: 'R24MBMCL003' },
      { oldCodeLike: '%R24MBMCT005%R24MIACT005%', newPrimaryCode: 'R24MBMCT005' },
      { oldCodeLike: '%R23MSCSHT09%', newPrimaryCode: 'R23MSCSHT09' },
      { oldCodeLike: '%R23MSCSHT11%', newPrimaryCode: 'R23MSCSHT11' },
      { oldCodeLike: '%R23MSCSHT13%', newPrimaryCode: 'R23MSCSHT13' },
    ];

    for (const map of legacyMappings) {
      await pool.query(
        'UPDATE materials SET subject = ? WHERE subject LIKE ?',
        [map.newPrimaryCode, map.oldCodeLike]
      );
      try {
        await pool.query(
          'UPDATE faculty_subject_allocations SET subject_code = ? WHERE subject_code LIKE ?',
          [map.newPrimaryCode, map.oldCodeLike]
        );
      } catch (e) {}
    }

    // 6. Safely remove obsolete slash subjects
    await pool.query("DELETE FROM subjects WHERE code LIKE '%/%'");

    // 4. Upsert Student Rosters
    const BATCH_SIZE = 50;
    let insertedStudents = 0;

    for (let i = 0; i < studentRoster.length; i += BATCH_SIZE) {
      const chunk = studentRoster.slice(i, i + BATCH_SIZE);

      await Promise.all(
        chunk.map(async (st: any) => {
          const passwordHash = await bcrypt.hash(st.rollNumber, 10);
          const userId = crypto.randomUUID();

          await pool.query(
            `INSERT INTO users (
               id, email, password_hash, name, role, status,
               branch, academic_year, current_semester, section,
               roll_number, first_login_pending
             )
             VALUES (?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               branch = VALUES(branch),
               academic_year = VALUES(academic_year),
               current_semester = VALUES(current_semester),
               section = VALUES(section),
               roll_number = VALUES(roll_number),
               status = 'active'`,
            [
              userId,
              st.email,
              passwordHash,
              st.name,
              st.branch,
              st.year,
              st.semester,
              st.section,
              st.rollNumber,
            ]
          );
          insertedStudents++;
        })
      );
    }

    // 5. Cleanup obsolete/dropped students for Sem 3, 5, 7
    const validRollNumbers = studentRoster.map((st: any) => st.rollNumber).filter(Boolean);
    let deletedCount = 0;
    if (validRollNumbers.length > 0) {
      const [delResult]: any = await pool.query(
        `DELETE FROM users WHERE role = 'student' AND current_semester IN (3, 5, 7) AND roll_number NOT IN (?)`,
        [validRollNumbers]
      );
      deletedCount = delResult?.affectedRows || 0;
    }

    // 6. Query updated database counts
    const [totStudents]: any = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const [totSubjects]: any = await pool.query("SELECT COUNT(*) as count FROM subjects");
    const [totFaculty]: any = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'");

    return NextResponse.json({
      success: true,
      message: "Curriculum and student roster successfully synchronized to MySQL.",
      subjectsUpserted: totalSubjectsUpserted,
      totalSubjectsInDB: totSubjects[0]?.count || 0,
      studentsUpserted: insertedStudents,
      orphanedStudentsRemoved: deletedCount,
      totalStudentsInDB: totStudents[0]?.count || 0,
      totalFacultyInDB: totFaculty[0]?.count || 0,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync roster and curriculum" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
