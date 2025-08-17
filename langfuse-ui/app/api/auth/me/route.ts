import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const store = await cookies();
  const username = store.get("auth_user")?.value || "";
  let profile: any = { language: "", languages: [] as string[], areas: [] as string[], primaryLegalAreas: [] as string[], secondaryLegalAreas: [] as string[], experienceLevel: "junior", firm: "", specializations: [] as string[], promptLanguage: "", targetLanguage: "" };
  try {
    const raw = store.get("user_profile")?.value;
    if (raw) {
      const parsed = JSON.parse(raw);
      // Back-compat: support legacy { area: string }
      if (parsed) {
        const language = parsed.language ?? "";
        const languages = Array.isArray(parsed.languages) ? parsed.languages : (language ? [language] : []);
        const areas = Array.isArray(parsed.areas)
          ? parsed.areas
          : (parsed.area ? [parsed.area] : []);
        const personalLLMContext = parsed.personalLLMContext ?? "";
        const primaryLegalAreas = Array.isArray(parsed.primaryLegalAreas) ? parsed.primaryLegalAreas : [];
        const secondaryLegalAreas = Array.isArray(parsed.secondaryLegalAreas) ? parsed.secondaryLegalAreas : [];
        const experienceLevel = parsed.experienceLevel ?? "junior";
        const firm = parsed.firm ?? "";
        const specializations = Array.isArray(parsed.specializations) ? parsed.specializations : [];
        const promptLanguage = parsed.promptLanguage ?? "";
        const targetLanguage = parsed.targetLanguage ?? "";
        profile = { language, languages, areas, personalLLMContext, primaryLegalAreas, secondaryLegalAreas, experienceLevel, firm, specializations, promptLanguage, targetLanguage };
      }
    }
  } catch {}
  return NextResponse.json({ username, profile });
}


