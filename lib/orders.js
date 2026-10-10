
const orders = {
  "ORD-101": {
    orderId: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: 699,
    status: "Out for Delivery",
    courier: "BlueDart",
    trackingNumber: "BD-982103",
    deliveryEstimate: "Expected by 6 PM today",
  },

  "ORD-102": {
    orderId: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: 499,
    status: "Delivered",
    courier: "Delhivery",
    trackingNumber: "DL-441029",
    deliveryEstimate: "Delivered 14 days ago",
  },

  "ORD-103": {
    orderId: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: 850,
    status: "Processing",
    courier: null,
    trackingNumber: null,
    deliveryEstimate: "Ordered 3 hours ago",
  },
};

export function get_order_details(order_id) {
  if (typeof order_id !== "string" || !order_id.trim()) {
    return {
      success: false,
      error: "Please provide a valid order ID.",
    };
  }

  const normalizedId = order_id.trim().toUpperCase();
  const order = orders[normalizedId];

  if (!order) {
    return {
      success: false,
      error: `No order was found for ${normalizedId}. Please check the order ID.`,
    };
  }

  return {
    success: true,
    order,
  };
}
