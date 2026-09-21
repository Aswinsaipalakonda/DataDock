import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export interface BookmarkMaterialItem {
  id: string;
  title: string;
  type: string;
  subjectTitle: string;
  subjectCode: string;
  facultyName: string;
}

const SAMPLE_MATERIALS_MAP: Record<string, BookmarkMaterialItem> = {
  "mock-mat-1": {
    id: "mock-mat-1",
    title: "Database Management Systems (DBMS) - Unit 1 Relational Models",
    type: "Lecture Notes",
    subjectTitle: "Database Management Systems",
    subjectCode: "23CIC301",
    facultyName: "Dr. P. Satyanarayana",
  },
  "mock-mat-2": {
    id: "mock-mat-2",
    title: "Cloud Infrastructure & Distributed Computing - Lab Manual",
    type: "Lab Manual",
    subjectTitle: "Cloud Computing & DevOps",
    subjectCode: "23CIC302",
    facultyName: "Dr. K. Srinivas Rao",
  },
  "mock-mat-5": {
    id: "mock-mat-5",
    title: "Big Data Processing with Apache Spark - Mid-Term Question Bank",
    type: "Question Bank",
    subjectTitle: "Big Data Analytics",
    subjectCode: "23CIC303",
    facultyName: "Prof. M. V. Ramana",
  },
};

export async function getStudentBookmarks(
  supabase: any,
  userId: string,
  cookieStore: ReadonlyRequestCookies
): Promise<{ bookmarks: BookmarkMaterialItem[]; count: number }> {
  // 1. Check cookie
  const cookieVal = cookieStore.get("de_saved_bookmarks")?.value;
  let savedBookmarkIds: string[] | null = null;
  if (cookieVal) {
    try {
      savedBookmarkIds = JSON.parse(cookieVal);
    } catch {}
  }

  // 2. Fetch from DB
  const { data: dbData } = await supabase
    .from("bookmarks")
    .select(`
      id,
      material_id,
      materials (
        id,
        title,
        type,
        subject,
        subjects (title, code),
        users (name)
      )
    `)
    .eq("user_id", userId);

  const bookmarkMap = new Map<string, BookmarkMaterialItem>();

  (dbData || []).forEach((b: any) => {
    const mat = b.materials;
    const matId = mat?.id || b.material_id;
    if (mat) {
      bookmarkMap.set(mat.id, {
        id: mat.id,
        title: mat.title || "Course Material",
        type: mat.type || "Notes",
        subjectTitle: mat.subjects?.title || mat.subject || "Course Subject",
        subjectCode: mat.subjects?.code || mat.subject || "23CIC301",
        facultyName: mat.users?.name || "Faculty Member",
      });
    } else if (SAMPLE_MATERIALS_MAP[matId]) {
      bookmarkMap.set(matId, SAMPLE_MATERIALS_MAP[matId]);
    }
  });

  // 3. If cookie is present, apply cookie inclusion/order
  if (savedBookmarkIds !== null) {
    const cookieBookmarks: BookmarkMaterialItem[] = [];
    
    savedBookmarkIds.forEach((id) => {
      if (bookmarkMap.has(id)) {
        cookieBookmarks.push(bookmarkMap.get(id)!);
      } else if (SAMPLE_MATERIALS_MAP[id]) {
        cookieBookmarks.push(SAMPLE_MATERIALS_MAP[id]);
      }
    });

    // Also fetch any real DB materials for IDs in cookie if missing from join
    const missingIds = savedBookmarkIds.filter(id => !cookieBookmarks.some(b => b.id === id) && !id.startsWith("mock-"));
    if (missingIds.length > 0) {
      const { data: moreMats } = await supabase
        .from("materials")
        .select("id, title, type, subject, subjects(title, code), users(name)")
        .in("id", missingIds)
        .neq("state", "deleted");

      (moreMats || []).forEach((m: any) => {
        cookieBookmarks.push({
          id: m.id,
          title: m.title,
          type: m.type,
          subjectTitle: m.subjects?.title || m.subject || "Course Subject",
          subjectCode: m.subjects?.code || m.subject || "23CIC301",
          facultyName: m.users?.name || "Faculty Member",
        });
      });
    }

    return {
      bookmarks: cookieBookmarks,
      count: cookieBookmarks.length,
    };
  }

  const result = Array.from(bookmarkMap.values());
  return {
    bookmarks: result,
    count: result.length,
  };
}
