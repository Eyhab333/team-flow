import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Team Flow",
    short_name: "Team Flow",
    description: "إدارة المهام والرؤية لفريق العمل",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icons/team-flow-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/team-flow-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
