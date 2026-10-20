import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { BadgeCheck, Copy, Download, Share, Smartphone, SquarePlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";

/** Chrome's offer to install the site as an app (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Saved by index.html, which hears the offer before this page has loaded. */
    __installPrompt?: BeforeInstallPromptEvent;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Navigator {
    /** iOS: true when opened from the Home Screen. */
    standalone?: boolean;
  }
}

const STANDALONE = "(display-mode: standalone)";

function subscribeDisplayMode(onChange: () => void) {
  const media = matchMedia(STANDALONE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isStandalone() {
  return matchMedia(STANDALONE).matches || navigator.standalone === true;
}

type Platform = "ios-safari" | "ios-other" | "mac-safari" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS asks for desktop sites and says it's a Mac; touch gives it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Only Safari itself says "Version/x … Safari/"; in-app browsers (Instagram,
  // Snapchat's "like Safari/") leave out Version/, and other browsers add their own name.
  const safari =
    /Version\/[\d.]+.*Safari\//.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Chrome|Chromium|Edg\/|OPR\//.test(ua);
  if (ios) return safari ? "ios-safari" : "ios-other";
  return safari && /Macintosh/.test(ua) ? "mac-safari" : "other";
}

/** "Add to Home Screen" help, or an Install button where the browser offers one. Hidden inside the app. */
export function InstallApp() {
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone);
  const [platform] = useState(detectPlatform);
  const [offer, setOffer] = useState(() => window.__installPrompt);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onOffer = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      window.__installPrompt = e;
      setOffer(e);
    };
    const onInstalled = () => {
      window.__installPrompt = undefined;
      setOffer(undefined);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  async function install() {
    if (!offer) return;
    // Each offer can be shown only once.
    window.__installPrompt = undefined;
    setOffer(undefined);
    try {
      await offer.prompt();
      if ((await offer.userChoice).outcome === "accepted") setInstalled(true);
    } catch {
      // The browser withdrew the offer; the instructions below still apply.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("Link copied. Paste it into Safari's address bar.");
    } catch {
      toast.error(`Couldn't copy the link. Type ${window.location.host} into Safari instead.`);
    }
  }

  let body: ReactNode;
  if (installed) {
    body = (
      <p role="status" className="mt-2 flex items-start gap-2 text-sm text-success">
        <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Installed. Open StudentLoop from your home screen or app list.
      </p>
    );
  } else if (offer) {
    body = (
      <>
        <Intro>Install StudentLoop to open it in one tap, in its own window, like any other app.</Intro>
        <Button className="mt-4 w-full" onClick={() => void install()}>
          <Download className="size-4" aria-hidden />
          Install app
        </Button>
      </>
    );
  } else if (platform === "ios-safari") {
    body = (
      <>
        <Intro>Add StudentLoop to your Home Screen and it opens full screen, like any other app.</Intro>
        <ol className="mt-4 space-y-3">
          <Step icon={Share}>
            Tap <strong className="font-semibold">Share</strong> in Safari's toolbar. Don't see it? Tap{" "}
            <strong className="font-semibold">More</strong> <span aria-hidden>(•••)</span> first.
          </Step>
          <Step icon={SquarePlus}>
            Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong>.
          </Step>
          <Step icon={Smartphone}>
            Tap <strong className="font-semibold">Add</strong>. StudentLoop now opens from your Home Screen.
          </Step>
        </ol>
      </>
    );
  } else if (platform === "ios-other") {
    body = (
      <>
        <Intro>
          To add StudentLoop to your Home Screen, open this page in Safari, tap Share, then Add to Home Screen. In
          Chrome, the Share button in the address bar works too.
        </Intro>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => void copyLink()}>
          <Copy className="size-4" aria-hidden />
          Copy link for Safari
        </Button>
      </>
    );
  } else if (platform === "mac-safari") {
    body = <Intro>In Safari, choose File, then Add to Dock. StudentLoop then opens in its own window.</Intro>;
  } else {
    body = (
      <Intro>
        Look for Install app or Add to Home Screen in your browser's menu. StudentLoop then opens in its own window,
        like any other app.
      </Intro>
    );
  }

  return (
    <Card>
      <h2 className="font-semibold">Get the app</h2>
      {body}
    </Card>
  );
}

function Intro({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>;
}

function Step({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="pt-1.5">{children}</span>
    </li>
  );
}
