import { createContext, useContext } from "react";

/** The active section id, provided by App so shared components can stay layout-neutral. */
export const RouteContext = createContext<string>("overview");
export const useRoute = (): string => useContext(RouteContext);
