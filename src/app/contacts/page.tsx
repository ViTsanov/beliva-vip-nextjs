import type { Metadata } from "next";
import ContactClient from "@/components/ContactClient";

export const metadata: Metadata = {
  title: "Контакти",
  alternates: { canonical: "https://belivavip.bg/contacts" },
  description: "Свържете се с нас за индивидуална консултация. Ние сме на линия онлайн и по телефона, за да организираме вашето мечтано пътуване.",
};

export default function ContactPage() {
  return <ContactClient />;
}