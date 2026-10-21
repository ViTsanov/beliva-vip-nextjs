import type { Metadata } from "next";
import { shareMetadata } from "@/lib/shareMeta";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "Често задавани въпроси",
  alternates: { canonical: "https://belivavip.bg/faq" },
  description: "Отговори на важни въпроси за резервации, плащания и пътувания с Beliva VIP Tour.",
  ...shareMetadata({
    path: "/faq",
    title: "Често задавани въпроси | Beliva VIP Tour",
    description: "Отговори на важни въпроси за резервации, плащания и пътувания с Beliva VIP Tour.",
  }),
};

export default function FAQPage() {
  return <FAQClient />;
}