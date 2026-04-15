/**
 * Shared Clerk `appearance` for sign-in / sign-up and global `ClerkProvider`.
 * Tailwind classes rely on `cssLayerName: "clerk"` on `ClerkProvider`.
 * Use RGB variables — Clerk’s runtime applies some of these where oklch did not read well.
 */
export const clerkMoviefyAuthAppearance = {
  variables: {
    colorPrimary: "rgb(139 92 246)",
    colorDanger: "rgb(248 113 113)",
    colorSuccess: "rgb(52 211 153)",
    colorWarning: "rgb(250 204 21)",
    colorBackground: "rgb(39 39 42)",
    colorInputBackground: "rgb(250 250 250)",
    colorText: "rgb(250 250 250)",
    colorTextSecondary: "rgb(212 212 216)",
    colorTextOnPrimaryBackground: "rgb(255 255 255)",
    colorNeutral: "rgb(161 161 170)",
    borderRadius: "0.875rem",
    fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
    spacingUnit: "1rem",
  },
  elements: {
    rootBox: "w-full mx-auto text-zinc-50",
    cardBox: "w-full",
    card: [
      "rounded-2xl border border-zinc-500/35",
      "bg-zinc-800/95 text-zinc-50",
      "shadow-[0_0_0_1px_rgb(255_255_255/0.06)_inset,0_24px_70px_-20px_rgb(0_0_0/0.65)]",
      "backdrop-blur-xl",
    ].join(" "),
    scrollBox: "text-zinc-50",
    header: "gap-1.5 pb-0.5",
    headerTitle:
      "font-heading !text-white text-xl !opacity-100 tracking-tight sm:text-2xl",
    headerSubtitle: "!text-zinc-300 text-sm !opacity-100",
    main: "gap-5 text-zinc-50",
    socialButtonsRoot: "gap-2.5",
    socialButtonsBlockButton:
      "min-h-11 rounded-xl border border-zinc-500/50 bg-zinc-700/90 !text-white shadow-none transition hover:border-violet-400/50 hover:bg-zinc-600/95",
    socialButtonsBlockButtonText:
      "!text-white font-medium text-[0.9375rem] !opacity-100",
    dividerLine: "bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent",
    dividerText: "text-xs uppercase tracking-[0.18em] !text-zinc-400",
    formFieldLabel: "!text-zinc-200 text-sm font-medium",
    formFieldInput:
      "rounded-xl border-zinc-400/40 bg-white text-zinc-900 placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30",
    formFieldInputShowPasswordButton: "text-zinc-600 hover:text-zinc-900",
    formButtonPrimary:
      "min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold !text-white shadow-[0_0_24px_-8px_rgb(139_92_246/0.55)] transition hover:from-violet-500 hover:to-fuchsia-500",
    formButtonReset: "!text-zinc-300 hover:!text-white",
    footer: "!text-zinc-400 text-sm",
    footerAction: "!text-zinc-400",
    footerActionLink:
      "!text-violet-300 font-medium hover:!text-violet-200 underline-offset-4 hover:underline",
    identityPreviewText: "!text-zinc-100",
    identityPreviewEditButton: "!text-violet-300 hover:!text-violet-200",
    formResendCodeLink: "!text-violet-300 hover:!text-violet-200",
    alternativeMethodsBlockButton:
      "rounded-xl border border-zinc-500/45 bg-zinc-700/80 !text-zinc-50 hover:bg-zinc-600/90",
    otpCodeFieldInput:
      "rounded-lg border-zinc-500/40 bg-zinc-900 !text-white",
    formFieldSuccessText: "text-emerald-400",
    formFieldErrorText: "text-rose-300",
    alertText: "text-rose-200",
    formFieldHintText: "!text-zinc-400",
    userButtonBox: "gap-0",
    userButtonTrigger:
      "rounded-full p-0.5 text-foreground ring-offset-background transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35",
    userButtonAvatarBox:
      "size-8 rounded-full ring-1 ring-white/15 shadow-sm sm:size-9",
    /* User menu renders in a portal — use explicit zinc (not semantic popover tokens). */
    userButtonPopoverCard:
      "rounded-xl border border-zinc-600/55 !bg-zinc-900/98 !text-zinc-50 shadow-2xl backdrop-blur-xl",
    userButtonPopoverRootBox: "!text-zinc-50",
    userButtonPopoverMain: "gap-1 !text-zinc-50",
    userButtonPopoverActions: "gap-0.5",
    userButtonPopoverUserPreview: "border-b border-zinc-700/60 pb-3",
    userButtonPopoverUserPreviewAvatarContainer: "ring-1 ring-white/15",
    userButtonPopoverUserPreviewTextContainer: "!text-zinc-50",
    userButtonPopoverUserPreviewMainIdentifier:
      "!text-white text-sm font-semibold",
    userButtonPopoverUserPreviewSecondaryIdentifier:
      "!text-zinc-400 text-xs",
    userButtonPopoverActionButton:
      "rounded-lg !text-zinc-100 hover:!bg-zinc-800/95 focus-visible:ring-2 focus-visible:ring-violet-400/40",
    userButtonPopoverActionButtonText:
      "!text-zinc-100 text-sm font-medium",
    userButtonPopoverActionButtonIcon: "!text-zinc-300",
    userButtonPopoverFooter:
      "border-t border-zinc-700/70 !bg-zinc-950/90 !text-zinc-400",
    userButtonPopoverFooterPages: "!text-zinc-400",
    userButtonPopoverBadge: "border-amber-500/40 !text-amber-200",
    userButtonPopoverSignOutButton:
      "rounded-lg !text-rose-200 hover:!bg-rose-950/40 hover:!text-rose-100",
  },
} as const;
