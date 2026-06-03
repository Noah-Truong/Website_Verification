import { getSupabase } from "./supabase";
import type {
  AiAnalysis,
  ChecklistItem,
  Project,
  VerificationRun,
} from "./types";

interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  client_name: string | null;
  website_url: string;
  repo_url: string | null;
  document: Project["document"];
  checklist: ChecklistItem[] | null;
  ai_analysis: AiAnalysis | null;
  runs: VerificationRun[] | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    clientName: row.client_name ?? "",
    websiteUrl: row.website_url,
    repoUrl: row.repo_url ?? "",
    document: row.document ?? null,
    checklist: row.checklist ?? [],
    aiAnalysis: row.ai_analysis ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    runs: row.runs ?? [],
  };
}

export async function getProjectsForUser(userId: string): Promise<Project[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]).map(rowToProject);
}

export async function getProject(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToProject(data as ProjectRow) : undefined;
}

export async function createProject(project: Project): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("projects").insert({
    id: project.id,
    owner_id: project.ownerId,
    name: project.name,
    client_name: project.clientName,
    website_url: project.websiteUrl,
    repo_url: project.repoUrl,
    document: project.document,
    checklist: project.checklist,
    ai_analysis: project.aiAnalysis,
    runs: project.runs,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (error) throw new Error(error.message);
}

export async function deleteProject(
  id: string,
  userId: string,
): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function updateChecklistItem(
  id: string,
  userId: string,
  itemId: string,
  patch: { checked?: boolean; note?: string },
): Promise<ChecklistItem | null> {
  const project = await getProject(id, userId);
  if (!project) return null;
  const item = project.checklist.find((c) => c.id === itemId);
  if (!item) return null;
  if (patch.checked !== undefined) item.checked = patch.checked;
  if (patch.note !== undefined) item.note = patch.note;

  const sb = getSupabase();
  const { error } = await sb
    .from("projects")
    .update({
      checklist: project.checklist,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
  return item;
}

export async function addRun(
  id: string,
  userId: string,
  run: VerificationRun,
  maxRuns: number,
): Promise<void> {
  const project = await getProject(id, userId);
  if (!project) return;
  const runs = [run, ...project.runs].slice(0, maxRuns);

  const sb = getSupabase();
  const { error } = await sb
    .from("projects")
    .update({ runs, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
}

export async function setAnalysis(
  id: string,
  userId: string,
  analysis: AiAnalysis,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("projects")
    .update({ ai_analysis: analysis, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
}
