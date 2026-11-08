import type { Metadata } from "next";
import { ShopScreen } from "../components/ShopScreen";

export const metadata: Metadata = {
  title: "Shop · SummitRush",
  description: "Spend Summit Coins on climbing gear and trail effects.",
};

export default function ShopPage() {
  return <ShopScreen />;
}
