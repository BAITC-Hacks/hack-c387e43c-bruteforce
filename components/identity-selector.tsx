"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Identity } from "@/lib/schemas";
import { message, request } from "@/lib/client";
import { useNavigationGuard } from "./navigation-guard";
export function IdentitySelector({
  current,
  identities,
}: {
  current: Identity | null;
  identities: Identity[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { navigate } = useNavigationGuard();
  return (
    <div className="identity">
      <label htmlFor="demo-identity">Demo identity</label>
      <select
        id="demo-identity"
        aria-label="Demo identity"
        value={current ? `${current.role}:${current.id}` : ""}
        disabled={busy || !identities.length}
        onChange={(event) => {
          const value = event.target.value;
          navigate(() => {
            setBusy(true);
            setError("");
            request("/api/identity", { identity: value })
              .then(() => {
                router.push("/");
                router.refresh();
                setBusy(false);
              })
              .catch((error) => {
                setError(message(error));
                setBusy(false);
              });
          });
        }}
      >
        {!current && <option value="">Choose a profile</option>}
        {identities.map((identity) => (
          <option
            key={`${identity.role}:${identity.id}`}
            value={`${identity.role}:${identity.id}`}
          >
            {identity.role === "business" ? "Business" : "Student"} ·{" "}
            {identity.name}
          </option>
        ))}
      </select>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
