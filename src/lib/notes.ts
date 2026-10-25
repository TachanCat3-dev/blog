import { getCollection } from "astro:content";
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const url = (path = "") => `${base}/${path.replace(/^\//, "")}`;
export const dateText = (date: Date) =>
  date.toISOString().slice(0, 10).replaceAll("-", ".");
export const getNotes = async () =>
  (await getCollection("notes", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
