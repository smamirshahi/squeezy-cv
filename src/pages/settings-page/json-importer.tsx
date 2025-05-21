import React, { useState } from "react";
import { Object, String, Number, Array, Optional, Static } from "runtypes";

const PersonalInfoSchema = Object({
  name: String,
  jobTitle: String,
});

const ContactInfoSchema = Object({
  email: String,
}).and(
  Object({
    phone: Optional(String),
    location: Optional(String),
    linkedInId: Optional(String),
    gitHubId: Optional(String),
  })
);

const ProfessionalSummarySchema = Object({
  summary: String,
});

const ExperienceSchema = Object({
  jobTitle: String,
  company: String,
  location: String.optional(),
  startDate: String, // ISO date
  endDate: String.optional(),
  bulletPoints: Array(String),
});

const EducationSchema = Object({
  degree: String,
  institute: String,
  location: String.optional(),
  startDate: String,
  endDate: String.optional(),
  dissertationTitle: String.optional(),
});

const SkillItemSchema = Object({
  name: String,
  rating: Number.withConstraint((n) => n >= 1 && n <= 10),
});

const SkillCategorySchema = Object({
  category: String,
  items: Array(SkillItemSchema),
});

const CVSchema = Object({
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema,
  professionalSummary: ProfessionalSummarySchema,
  experience: Array(ExperienceSchema),
  education: Array(EducationSchema),
  skills: Array(SkillCategorySchema),
});

const CVFileSchema = Object({
  version: String,
  data: CVSchema,
});

type CVFile = Static<typeof CVFileSchema>;
type CVData = Static<typeof CVSchema>;

// --- React Component ---
export function CVStorageWithRunType(): JSX.Element {
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
        const parsed = CVFileSchema.check(raw); // ✅ Validated!
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
      <h2>CV Storage with Runtype</h2>
      <button onClick={handleExport}>Export CV to JSON</button>
      <input type="file" accept=".json" onChange={handleImport} />
      <pre>{JSON.stringify(cvData, null, 2)}</pre>
    </div>
  );
}
