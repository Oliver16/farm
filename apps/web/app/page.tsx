import { requireSession } from "../lib/auth";
import { OrgSwitcher } from "../components/OrgSwitcher";
import { LayerPanel } from "../components/LayerPanel";
import { EditToolbar } from "../components/EditToolbar";
import { AttributePanel } from "../components/AttributePanel";
import { MapCanvas } from "../components/MapCanvas";
import { Toasts } from "../components/Toasts";

export default async function HomePage() {
  await requireSession();

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 320px",
        gridTemplateRows: "auto 1fr",
        minHeight: "100vh"
      }}
    >
      <header
        style={{
          gridColumn: "1 / span 3",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem"
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Farm Geospatial Console</h1>
        <OrgSwitcher />
      </header>
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.1)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}
      >
        <LayerPanel />
        <EditToolbar />
      </aside>
      <section style={{ position: "relative" }}>
        <MapCanvas />
      </section>
      <aside
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}
      >
        <AttributePanel />
      </aside>
      <Toasts />
    </main>
  );
}
