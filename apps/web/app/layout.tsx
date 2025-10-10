import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/globals.css";
import { AppProviders } from "../components/AppProviders";

export const metadata: Metadata = {
  title: "Farm Geospatial Console",
  description: "Manage farm, field, and greenhouse geospatial data"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
