import type { Metadata } from "next";
import ContactClient from "@/components/ContactClient";

export const metadata: Metadata = {
  title: "Контакти | Beliva VIP Tour",
  description: "Свържете се с нас за индивидуална консултация. Ние сме на линия онлайн и по телефона, за да организираме вашето мечтано пътуване.",
};

export default function ContactPage() {
  return <ContactClient />;
}