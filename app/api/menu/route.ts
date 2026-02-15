import { getDatabase } from "@/lib/db";
import { MenuItem } from "@/lib/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDatabase();

    // Fetch all menu items sorted by category and name
    const menuItems = await db
      .collection<MenuItem>("menu_items")
      .find({})
      .sort({ category: 1, name: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: menuItems });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu items" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, price, isAvailable } = body;

    // Validation
    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    const newMenuItem: MenuItem = {
      name,
      category,
      price: Number(price),
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("menu_items").insertOne(newMenuItem);

    return NextResponse.json({
      success: true,
      data: { ...newMenuItem, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create menu item" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { _id, name, category, price, isAvailable } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Missing menu ID" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = Number(price);
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const result = await db
      .collection("menu_items")
      .updateOne({ _id: new ObjectId(_id as string) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Menu item updated" });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update menu item" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing menu ID" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    const result = await db
      .collection("menu_items")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Menu item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Menu item deleted" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete menu item" },
      { status: 500 },
    );
  }
}
