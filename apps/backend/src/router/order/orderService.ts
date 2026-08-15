import { prisma } from "@repo/db";

export interface OrderResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export const orderService = {
  // async createOrder(
  //   userId: string,
  //   pair: string,
  //   side: string,
  //   quantity: number,
  //   price: number
  // ): Promise<OrderResponse> {
  //   try {
  //     // Validate input
  //     if (!["BUY", "SELL"].includes(side.toUpperCase())) {
  //       return {
  //         success: false,
  //         message: "Invalid side. Must be BUY or SELL",
  //         error: "INVALID_SIDE"
  //       };
  //     }

  //     if (quantity <= 0 || price <= 0) {
  //       return {
  //         success: false,
  //         message: "Quantity and price must be greater than 0",
  //         error: "INVALID_AMOUNT"
  //       };
  //     }

  //     const order = await prisma.order.create({
  //       data: {
  //         userId,
  //         pair: pair.toUpperCase(),
  //         side: side.toUpperCase(),
  //         quantity,
  //         price,
  //         status: "PENDING"
  //       }
  //     });

  //     return {
  //       success: true,
  //       message: "Order created successfully",
  //       data: order
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: "Error creating order",
  //       error: String(error)
  //     };
  //   }
  // },

  // async getOrders(userId: string): Promise<OrderResponse> {
  //   try {
  //     const orders = await prisma.order.findMany({
  //       where: { userId },
  //       orderBy: { createdAt: "desc" }
  //     });

  //     return {
  //       success: true,
  //       message: "Orders retrieved successfully",
  //       data: orders
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: "Error retrieving orders",
  //       error: String(error)
  //     };
  //   }
  // },

  // async getOrderById(orderId: string, userId: string): Promise<OrderResponse> {
  //   try {
  //     const order = await prisma.order.findUnique({
  //       where: { id: orderId }
  //     });

  //     if (!order) {
  //       return {
  //         success: false,
  //         message: "Order not found",
  //         error: "NOT_FOUND"
  //       };
  //     }

  //     if (order.userId !== userId) {
  //       return {
  //         success: false,
  //         message: "Unauthorized",
  //         error: "UNAUTHORIZED"
  //       };
  //     }

  //     return {
  //       success: true,
  //       message: "Order retrieved successfully",
  //       data: order
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: "Error retrieving order",
  //       error: String(error)
  //     };
  //   }
  // },

  // async cancelOrder(orderId: string, userId: string): Promise<OrderResponse> {
  //   try {
  //     const order = await prisma.order.findUnique({
  //       where: { id: orderId }
  //     });

  //     if (!order) {
  //       return {
  //         success: false,
  //         message: "Order not found",
  //         error: "NOT_FOUND"
  //       };
  //     }

  //     if (order.userId !== userId) {
  //       return {
  //         success: false,
  //         message: "Unauthorized",
  //         error: "UNAUTHORIZED"
  //       };
  //     }

  //     if (order.status !== "PENDING") {
  //       return {
  //         success: false,
  //         message: `Cannot cancel order with status ${order.status}`,
  //         error: "INVALID_STATUS"
  //       };
  //     }

  //     const updatedOrder = await prisma.order.update({
  //       where: { id: orderId },
  //       data: { status: "CANCELLED" }
  //     });

  //     return {
  //       success: true,
  //       message: "Order cancelled successfully",
  //       data: updatedOrder
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: "Error cancelling order",
  //       error: String(error)
  //     };
  //   }
  // },

  // async updateOrderStatus(
  //   orderId: string,
  //   status: string,
  //   userId: string
  // ): Promise<OrderResponse> {
  //   try {
  //     const validStatuses = ["PENDING", "FILLED", "CANCELLED"];

  //     if (!validStatuses.includes(status.toUpperCase())) {
  //       return {
  //         success: false,
  //         message: "Invalid status",
  //         error: "INVALID_STATUS"
  //       };
  //     }

  //     const order = await prisma.order.findUnique({
  //       where: { id: orderId }
  //     });

  //     if (!order) {
  //       return {
  //         success: false,
  //         message: "Order not found",
  //         error: "NOT_FOUND"
  //       };
  //     }

  //     if (order.userId !== userId) {
  //       return {
  //         success: false,
  //         message: "Unauthorized",
  //         error: "UNAUTHORIZED"
  //       };
  //     }

  //     const updatedOrder = await prisma.order.update({
  //       where: { id: orderId },
  //       data: { status: status.toUpperCase() }
  //     });

  //     return {
  //       success: true,
  //       message: "Order updated successfully",
  //       data: updatedOrder
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: "Error updating order",
  //       error: String(error)
  //     };
  //   }
  // }
};
