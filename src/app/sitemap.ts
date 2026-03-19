import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const supabase = createServerSupabaseClient();

  // 公開中のドラマ一覧を取得
  const { data: dramas } = await supabase
    .from("dramas")
    .select("id, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  // クリエイターページ
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, updated_at")
    .eq("is_creator", true);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/tokushoho`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const dramaPages: MetadataRoute.Sitemap = (dramas || []).map((drama) => ({
    url: `${baseUrl}/drama/${drama.id}`,
    lastModified: new Date(drama.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const creatorPages: MetadataRoute.Sitemap = (creators || []).map((creator) => ({
    url: `${baseUrl}/creator/${creator.id}`,
    lastModified: new Date(creator.updated_at || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...dramaPages, ...creatorPages];
}
