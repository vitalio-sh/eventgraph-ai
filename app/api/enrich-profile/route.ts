import { NextResponse } from "next/server";
import {
  processProfileViaRocketRide,
  isRocketRideAvailable,
} from "@/lib/rocketride";

export async function POST(request: Request) {
  const { profile_text } = await request.json();

  if (!profile_text) {
    return NextResponse.json(
      { error: "profile_text is required" },
      { status: 400 }
    );
  }

  const available = await isRocketRideAvailable();
  if (!available) {
    return NextResponse.json(
      { error: "RocketRide engine not available", available: false },
      { status: 503 }
    );
  }

  const result = await processProfileViaRocketRide(profile_text);

  if (result.success) {
    return NextResponse.json({
      text: result.text,
      source: "rocketride",
    });
  }

  return NextResponse.json(
    { error: result.error, source: "rocketride" },
    { status: 500 }
  );
}

export async function GET() {
  const available = await isRocketRideAvailable();
  return NextResponse.json({
    available,
    engine: process.env.ROCKETRIDE_URI,
  });
}
