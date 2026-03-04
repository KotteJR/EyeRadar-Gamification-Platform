"use client";

// Parent-scoped pricing page — same content as /pricing but inside the parent portal layout.
import { redirect } from "next/navigation";
export default function ParentPricingPage() {
  // Just redirect to the canonical pricing page so we don't duplicate content.
  redirect("/pricing");
}
