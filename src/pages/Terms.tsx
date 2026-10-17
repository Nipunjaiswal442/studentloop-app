import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Prose } from "@/components/Prose";
import { TERMS } from "@/lib/legal";

export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo />
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
        <Prose text={TERMS} />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
