import clientPromise from "@/lib/db";
import { MenuItem, Rental } from "@/lib/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rentalId, items } = body as {
      rentalId: string;
      items: { menuItemId: string; quantity: number }[];
    };
    // items: { menuItemId: string, quantity: number }[]
    console.log("Body:", body);

    if (!rentalId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid data" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("playstation");

    // 1. Get current rental items details from DB to get fresh prices
    const menuItemIds = items.map((i) => new ObjectId(i.menuItemId));
    const menuItems = await db
      .collection<MenuItem>("menu_items")
      .find({ _id: { $in: menuItemIds } })
      .toArray();

    const menuMap = new Map(
      menuItems.map((item) => [item._id?.toString(), item]),
    );

    // 2. Prepare new add-ons array
    type RentalAddOn = NonNullable<Rental["addOns"]>[number];
    const newAddOns: RentalAddOn[] = [];
    let additionalCost = 0;

    for (const item of items) {
      const menu = menuMap.get(item.menuItemId);
      if (!menu) continue;

      const total = menu.price * item.quantity;
      additionalCost += total;

      newAddOns.push({
        menuItemId: new ObjectId(item.menuItemId),
        name: menu.name,
        price: menu.price,
        quantity: item.quantity,
        total: total,
        addedAt: new Date(),
      });
    }

    // 3. Update Rental Document
    // We increment addOnsCost and grandTotal atomically
    console.log(`Processing Add-on for Rental ID: ${rentalId}`);

    if (!rentalId || typeof rentalId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid Rental ID" },
        { status: 400 },
      );
    }

    let rentalObjectId: ObjectId;
    try {
      rentalObjectId = new ObjectId(rentalId);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Invalid Rental ID format" },
        { status: 400 },
      );
    }

    // First check if rental exists to be safe
    const rental = await db
      .collection<Rental>("rentals")
      .findOne({ _id: rentalObjectId });

    if (!rental) {
      console.error(`Rental not found payload ID: ${rentalId}`);
      return NextResponse.json(
        { success: false, error: "Rental not found" },
        { status: 404 },
      );
    }

    // Determine current costs (handle undefined for backward compatibility)
    const currentAddOnsCost = rental.addOnsCost || 0;
    const currentRentalCost = rental.rentalCost || rental.totalPrice || 0;

    // Logic:
    // rentalCost remains unchanged here.
    // addOnsCost increases.
    // grandTotal = rentalCost + new addOnsCost.
    // totalPrice = grandTotal (alias).

    const result = await db.collection<Rental>("rentals").updateOne(
      { _id: rentalObjectId },
      {
        $push: { addOns: { $each: newAddOns } } as any,
        $inc: {
          addOnsCost: additionalCost,
          grandTotal: additionalCost,
          totalPrice: additionalCost, // Keep synced
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: "Add-ons added successfully",
      addedCost: additionalCost,
    });
  } catch (error) {
    console.error("Error adding add-ons:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add items" },
      { status: 500 },
    );
  }
}
