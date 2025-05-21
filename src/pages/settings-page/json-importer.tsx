import React, { useState } from "react";
import { z } from "zod";

// --- Zod Schema ---
const PersonalInfoSchema = z.object({
  name: z.string(),
  jobTitle: z.string(),
});

const ContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedInId: z.string().optional(),
  gitHubId: z.string().optional(),
});

const ProfessionalSummarySchema = z.object({
  summary: z.string(),
});

const ExperienceSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(), // ISO date
  endDate: z.string().optional(),
  bulletPoints: z.array(z.string()),
});

const EducationSchema = z.object({
  degree: z.string(),
  institute: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  dissertationTitle: z.string().optional(),
});

const SkillItemSchema = z.object({
  name: z.string(),
  rating: z.number().min(1).max(10),
});

const SkillCategorySchema = z.object({
  category: z.string(),
  items: z.array(SkillItemSchema),
});

const CVSchema = z.object({
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema,
  professionalSummary: ProfessionalSummarySchema,
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillCategorySchema),
});

const CVFileSchema = z.object({
  version: z.string(),
  data: CVSchema,
});

// --- Types from Zod ---
type CVFile = z.infer<typeof CVFileSchema>;
type CVData = z.infer<typeof CVSchema>;

// --- React Component ---
export function CVStorageWithZod(): JSX.Element {
  const [cvData, setCVData] = useState<CVData>({
    personalInfo: {
      name: "John Doe",
      jobTitle: "john@example.com",
    },

    contactInfo: {
      email: "",
      phone: "123-456-7890",
      location: "New York, USA",
      linkedInId: "john-doe",
      gitHubId: "johndoe",
    },
    professionalSummary: {
      summary: "A motivated developer...",
    },

    experience: [
      {
        jobTitle: "Frontend Developer",
        company: "Tech Inc.",
        startDate: "2022-01-01",
        endDate: "2022-01-01",
        bulletPoints: ["Worked on React apps."],
      },
    ],
    education: [
      {
        degree: "BSc Computer Science",
        institute: "University of Example",
        location: "Example City",
        startDate: "2018-01-01",
        endDate: "2022-01-01",
        dissertationTitle: "Example Dissertation",
      },
    ],
    skills: [
      {
        category: "Technical Skills",
        items: [
          { name: "React", rating: 5 },
          { name: "TypeScript", rating: 4 },
        ],
      },
    ],
  });

  const handleExport = () => {
    const fileData: CVFile = {
      version: "1.0",
      data: cvData,
    };
    const blob = new Blob([JSON.stringify(fileData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "cv-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const parsed = CVFileSchema.parse(raw); // ✅ Validated!
        setCVData(parsed.data);
        alert("CV imported successfully!");
      } catch (err) {
        console.error(err);
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>CV Storage with Zod</h2>
      <button onClick={handleExport}>Export CV to JSON</button>
      <input type="file" accept=".json" onChange={handleImport} />
      <pre>{JSON.stringify(cvData, null, 2)}</pre>
    </div>
  );
}
