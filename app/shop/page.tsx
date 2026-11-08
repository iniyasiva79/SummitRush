import type { Metadata } from "next";
import { PlaceholderPage } from "../components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Shop · SummitRush",
  description: "The SummitRush shop is not open yet.",
};

export default function ShopPage() {
  return (
    <PlaceholderPage
      title="Shop"
      note="The customization shop is not built yet. This page is only here so the shop icon has a destination."
    />
  );
}
