import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button, Card, Choice, Field, Input, PageHeader } from "@/components/ui";
import { CATEGORIES, CATEGORY_ICON, type Category } from "@/lib/domain";
import { useSubmit } from "@/lib/submit";

type Draft = { name: string; price: string; description: string };
const blank = (): Draft => ({ name: "", price: "", description: "" });

export default function AddShop() {
  const create = useMutation(api.shops.create);
  const navigate = useNavigate();
  const { pending, run } = useSubmit();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [items, setItems] = useState<Draft[]>([blank()]);

  const update = (i: number, patch: Partial<Draft>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = await run(() =>
      create({
        name,
        category,
        menu: items.map((i) => ({ name: i.name, price: Number(i.price), description: i.description })),
      }),
    );
    if (id) {
      toast.success(`${name} is now listed.`);
      navigate(`/shops/${id}`, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add a shop or stall"
        subtitle="List what you sell so other students can order it."
        back={{ to: "/shops", label: "All shops" }}
      />
      <form onSubmit={(e) => void submit(e)} className="space-y-6">
        <Card className="space-y-5">
          <Field label="Name">
            {(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Chai Point" />}
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Category</p>
            <Choice
              label="Category"
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c];
                return {
                  value: c,
                  label: (
                    <>
                      <Icon className="size-4" aria-hidden />
                      {c}
                    </>
                  ),
                };
              })}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Menu</h2>
          <ul className="mt-4 space-y-5">
            {items.map((it, i) => (
              <li key={i} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <Input
                  required
                  value={it.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Item name"
                  aria-label={`Item ${i + 1} name`}
                  maxLength={60}
                />
                <Input
                  required
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  inputMode="numeric"
                  value={it.price}
                  onChange={(e) => update(i, { price: e.target.value })}
                  placeholder="Price ₹"
                  aria-label={`Item ${i + 1} price`}
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Input
                    value={it.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Short description (optional)"
                    aria-label={`Item ${i + 1} description`}
                    maxLength={120}
                  />
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      aria-label={`Remove item ${i + 1}`}
                      onClick={() => setItems((list) => list.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            className="mt-5"
            disabled={items.length >= 40}
            onClick={() => setItems((list) => [...list, blank()])}
          >
            <Plus className="size-4" aria-hidden />
            Add another item
          </Button>
        </Card>

        <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending}>
          Publish shop
        </Button>
      </form>
    </div>
  );
}
