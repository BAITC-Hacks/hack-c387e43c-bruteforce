import type { Metadata } from "next";
import Link from "next/link";
import { businesses, teams } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { IdentitySelector } from "@/components/identity-selector";
import { NavigationGuard } from "@/components/navigation-guard";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Sidequest",
  title: {
    default: "Sidequest",
    template: "%s | Sidequest",
  },
  description:
    "Turn business problems into clear project briefs and connect with student teams.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await currentIdentity();
  return (
    <html lang="en">
      <body>
        <NavigationGuard>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <div className="header-inner">
              <Link className="brand" href="/" aria-label="Sidequest home">
                <span className="brand-mark" aria-hidden="true">
                  s<span>↗</span>
                </span>
                sidequest<span className="brand-dot">.</span>
              </Link>
              <nav aria-label="Main navigation">
                <Link href="/">Catalog</Link>
                {identity?.role === "business" ? (
                  <Link href="/business">My tasks</Link>
                ) : (
                  <Link href="/proposals">My proposals</Link>
                )}
              </nav>
              <IdentitySelector
                current={identity}
                identities={[
                  ...businesses().map((b) => ({
                    role: "business" as const,
                    id: b.id,
                    name: b.name,
                  })),
                  ...teams().map((t) => ({
                    role: "team" as const,
                    id: t.id,
                    name: t.name,
                  })),
                ]}
              />
              {identity?.role === "business" && (
                <Link className="button compact" href="/tasks/new">
                  + Create task
                </Link>
              )}
            </div>
          </header>
          <main id="main" className="container">
            {children}
          </main>
          <footer className="site-footer">
            <span>Small projects. Real possibilities.</span>
            <span>Sidequest · Local demo · English</span>
          </footer>
        </NavigationGuard>
      </body>
    </html>
  );
}
