import React from "react";
import { notFound } from "next/navigation";
import supabase from "@/lib/db.lib";
import IncidentDetailView from "@/components/citizen-portal/IncidentDetailView";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { data: incident } = await supabase
    .from("incidents")
    .select("title, description")
    .eq("id", id)
    .single();

  if (!incident) {
    return {
      title: "Incident Not Found | Daily Bugle",
    };
  }

  return {
    title: `${incident.title} — Live Citizen Incident Report | Daily Bugle`,
    description: incident.description || "Live civic incident and safety report.",
  };
}

export default async function IncidentPage({ params }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !incident) {
    notFound();
  }

  // Lookup reporter's name from users table by email
  let reporterName = null;
  if (incident.reporter_email) {
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("display_name")
        .eq("email", incident.reporter_email.toLowerCase().trim())
        .single();

      if (userRow?.display_name) {
        reporterName = userRow.display_name;
      }
    } catch {
      // Fallback
    }

    if (!reporterName) {
      // Formatted fallback from email username (e.g. john.doe -> John Doe)
      const namePart = incident.reporter_email.split("@")[0].replace(/[._-]/g, " ");
      reporterName = namePart.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const enhancedIncident = {
    ...incident,
    reporter_name: reporterName || "Verified Citizen",
  };

  return <IncidentDetailView initialIncident={enhancedIncident} />;
}
