import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Pricing & Plans | Ilmvers Academy",
  description: "Transparent and flexible pricing for premium online Qur'an and Islamic learning. Use our interactive tuition calculator to find the best plan for you and your family.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
