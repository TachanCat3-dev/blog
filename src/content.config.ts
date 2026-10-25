import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const notes = defineCollection({
  loader: glob({
    base: "./content/posts",
    pattern: "**/*.md",
    generateId: ({ entry }) =>
      entry.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
    tags: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .transform((value) =>
        Array.isArray(value)
          ? value
          : (value ?? "")
              .split(/[,，]/)
              .map((tag) => tag.trim())
              .filter(Boolean),
      ),
    draft: z.boolean().default(false),
  }),
});
export const collections = { notes };
