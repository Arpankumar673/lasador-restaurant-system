import { notFound } from "next/navigation";
import { fetchCustomerOrderStatus } from "@/features/orders/actions";
import { CustomerOrderTrackingView } from "@/features/orders/components/customer-order-tracking-view";

interface OrderTrackingPageProps {
  params: {
    token: string;
    orderId: string;
  };
}

export default async function CustomerOrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { token, orderId } = params;

  const order = await fetchCustomerOrderStatus(orderId);
  if (!order) {
    notFound();
  }

  return <CustomerOrderTrackingView token={token} initialOrder={order} />;
}
