import { NextResponse } from "next/server";
import { isoToCountryName } from "@/lib/geo";

/**
 * GET /api/geo
 * Returns the request's country (from Vercel geo headers) as our country name for tax.
 * Headers: x-vercel-ip-country (ISO 2-letter). On other hosts you may need to set this or use an IP lookup.
 */
export async function GET(request: Request) {
  const geoHeader = request.headers.get("x-vercel-ip-country");
  const country = isoToCountryName(geoHeader);
  return NextResponse.json({ country });
}
