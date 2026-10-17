import { createContext, useContext } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type Me = NonNullable<FunctionReturnType<typeof api.users.me>>;

export const MeContext = createContext<Me | null>(null);

/** The signed-in user. Only usable below <RequireAuth>, which guarantees it exists. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside <RequireAuth>");
  return me;
}
