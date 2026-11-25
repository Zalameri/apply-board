import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apply Board",
    short_name: "Apply Board",
    description: "Track internship applications, deadlines and notes in one place.",
    start_url: "/board",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#1f5fd1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
