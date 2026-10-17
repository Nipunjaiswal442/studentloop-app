import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronRight, FileText, LifeBuoy, LogOut, Moon, ReceiptText, Sun } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Avatar } from "@/components/AppShell";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useMe } from "@/lib/me";
import { useSubmit } from "@/lib/submit";
import { useTheme } from "@/lib/theme";

export default function Profile() {
  const me = useMe();
  const update = useMutation(api.users.updateProfile);
  const activity = useQuery(api.users.recentActivity);
  const { signOut } = useAuthActions();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pending, run } = useSubmit();

  const [form, setForm] = useState({
    firstName: me.firstName,
    lastName: me.lastName,
    mobile: me.mobile,
    hostelBlock: me.hostelBlock,
    roomNumber: me.roomNumber,
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const stats = [
    { label: "Deliveries", value: String(me.deliveries) },
    { label: "Rating", value: me.ratingCount ? me.rating.toFixed(1) : "–" },
    { label: "Trust score", value: `${me.trustScore}%` },
    { label: "Points", value: me.points.toLocaleString("en-IN") },
  ];

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar me={me} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{[me.firstName, me.lastName].filter(Boolean).join(" ") || "Your name"}</p>
                <p className="truncate text-sm text-muted-foreground">{me.email}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg bg-subtle p-3">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="tabular mt-0.5 text-lg font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold">Personal details</h2>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await update(form);
                  toast.success("Profile saved.");
                });
              }}
            >
              <Field label="First name">{(id) => <Input id={id} required value={form.firstName} onChange={set("firstName")} maxLength={40} autoComplete="given-name" />}</Field>
              <Field label="Last name">{(id) => <Input id={id} value={form.lastName} onChange={set("lastName")} maxLength={40} autoComplete="family-name" />}</Field>
              <Field label="Mobile" hint="Shared only with the person you're matched with." className="sm:col-span-2">
                {(id) => <Input id={id} type="tel" value={form.mobile} onChange={set("mobile")} autoComplete="tel" placeholder="98765 43210" />}
              </Field>
              <Field label="Hostel or block">{(id) => <Input id={id} value={form.hostelBlock} onChange={set("hostelBlock")} maxLength={40} />}</Field>
              <Field label="Room">{(id) => <Input id={id} value={form.roomNumber} onChange={set("roomNumber")} maxLength={20} />}</Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={pending}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <section aria-labelledby="activity">
            <h2 id="activity" className="mb-3 font-semibold">
              Recent activity
            </h2>
            {activity === undefined ? null : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{a.details}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(a.at)}</p>
                    </div>
                    {a.points > 0 && <span className="tabular shrink-0 text-sm font-medium text-primary-soft-foreground">+{a.points} pts</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="p-0 sm:p-0">
            <ul className="divide-y divide-border">
              {[
                { to: "/orders", label: "Your orders", icon: ReceiptText },
                { to: "/help", label: "Help", icon: LifeBuoy },
                { to: "/terms", label: "Terms and conditions", icon: FileText },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-subtle">
                    <l.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{l.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-semibold">Appearance</h2>
            <Button variant="secondary" className="mt-3 w-full" onClick={toggle}>
              {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              Switch to {theme === "dark" ? "light" : "dark"} mode
            </Button>
          </Card>

          <Button
            variant="danger"
            className="w-full"
            onClick={() =>
              void signOut().then(() => navigate("/", { replace: true }))
            }
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </aside>
      </div>
    </div>
  );
}
