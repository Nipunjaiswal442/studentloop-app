/** The one way an email address is normalised, so sign-up, sign-in, admin tools and linking all agree. */
export const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
