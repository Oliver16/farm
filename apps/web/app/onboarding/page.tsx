import { redirect } from "next/navigation";
import { getUserOrgCount, requireSession } from "@/lib/auth";
import { JoinOrganizationCard } from "@/components/onboarding/JoinOrganizationCard";
import { CreateOrganizationFlow } from "@/components/onboarding/CreateOrganizationFlow";

export default async function OnboardingPage() {
  await requireSession();
  const accessibleOrgCount = await getUserOrgCount();

  if (accessibleOrgCount > 0) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "3rem 1.5rem",
        gap: "2rem"
      }}
    >
      <header style={{ textAlign: "center", maxWidth: "36rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Finish setting up your workspace</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Join an existing organization or create a new one to start mapping farms.
          You&apos;ll be redirected to the console once your team has a farm name and
          boundary in place.
        </p>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
        <div style={{ width: "100%" }}>
          <JoinOrganizationCard />
        </div>
        <CreateOrganizationFlow />
      </div>
    </main>
  );
}
