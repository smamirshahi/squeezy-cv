/** Default skills offered while typing a skill name; any other text can still be typed. */
const TECHNICAL_SKILLS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "C#",
  "Go",
  "SQL",
  "React",
  "Redux Toolkit",
  "Node.js",
  "Next.js",
  "Git",
  "Docker",
  "CI/CD",
  "Webpack/Vite",
  "Jest",
  "React Testing Library",
  "Cypress",
  "Playwright",
  "REST",
  "GraphQL",
  "PostgreSQL",
  "MongoDB",
  "AWS",
  "Azure",
  "Agile",
  "Scrum",
  "TDD",
  "Code review",
];

const GENERAL_SKILLS = [
  "Excel",
  "Figma",
  "Jira",
  "Project management",
  "Budgeting",
  "Mentoring",
  "Hiring",
  "Public speaking",
  "Stakeholder communication",
  "Cross-team collaboration",
  "Problem solving",
  "Negotiation",
  "Data analysis",
  "Customer service",
  "Time management",
];

const LANGUAGES = [
  "English",
  "Arabic",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Dutch",
  "Russian",
  "Turkish",
  "Persian",
  "Hindi",
  "Urdu",
  "Chinese (Mandarin)",
  "Japanese",
  "Korean",
  "Polish",
];

const AI_SKILLS = [
  "Claude Code",
  "GitHub Copilot",
  "Cursor",
  "ChatGPT",
  "AI code review",
  "Prompt design",
  "AI-assisted prototyping",
  "LLM APIs",
  "Claude API",
  "OpenAI API",
  "RAG",
  "AI-assisted testing",
  "AI-assisted refactoring",
  "AI-assisted, human-reviewed",
];

/** Whether a skills group is about AI tooling (decided by its category name) */
function isAiGroup(category: string | undefined): boolean {
  return /\bAI\b|\bLLM/i.test(category ?? "");
}

/** Whether a skills group lists languages (decided by its category name) */
export function isLanguageGroup(category: string | undefined): boolean {
  return (
    /\blanguages?\b/i.test(category ?? "") &&
    !/programming|coding/i.test(category ?? "")
  );
}

/** Suggestions for a skills group: languages for a language group, else technical + general skills */
export function skillSuggestions(category: string | undefined): string[] {
  if (isAiGroup(category)) {
    return AI_SKILLS;
  }
  return isLanguageGroup(category)
    ? LANGUAGES
    : [...TECHNICAL_SKILLS, ...GENERAL_SKILLS];
}

/** Language levels, 1 to 5 */
const LANGUAGE_LEVELS = [
  "No level",
  "Basic",
  "Conversational",
  "Professional",
  "Fluent",
  "Native",
];

/** The level name for a language skill (5 = native or mother tongue) */
export function languageLevelLabel(rating: number | undefined): string {
  return LANGUAGE_LEVELS[Math.floor(rating ?? 0)] ?? LANGUAGE_LEVELS[5];
}

/** Default names for a skills group */
export const SKILL_CATEGORIES = [
  "Programming languages",
  "Frameworks and libraries",
  "Tools and DevOps",
  "Testing",
  "Databases and APIs",
  "Cloud and infrastructure",
  "Methodologies",
  "AI-assisted development",
  "Languages",
  "Software and tools",
  "Domain knowledge",
  "Management and leadership",
  "Professional skills",
];
