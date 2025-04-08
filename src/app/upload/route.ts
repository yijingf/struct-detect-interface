import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

// This is an api route
export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    // Only allow POST requests
    return NextResponse.rewrite("/404");
  }

  try {
    const body = await req.json();
    await uploadJsonToGoogleSheets(body);
    return new NextResponse("JSON uploaded to Google Sheets successfully!", {
      status: 200,
    });
  } catch (error) {
    console.error("Error uploading to Google Sheets:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
async function uploadJsonToGoogleSheets(json: any) {
  const jwtFromEnv = new JWT({
    email: process.env.client_email,
    key: process.env.private_key,
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(
    "1yciiCTIUoJdoQRs1mD4_CvHsC96Iq4iny3N_IijsEAw",
    jwtFromEnv
  );

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  // await sheet.setHeaderRow(["phrase", "values"]); // set the header row

  // create a unique id for this row
  const id = randomUUID();

  const rows = Object.keys(json).map((key) => ({
    id: id,
    phrase: key.replace("phrases/", ""),
    values: `[${json[key].join(", ")}]`,
  })); // transform the JSON into an array of objects

  await sheet.addRows(rows); // add the objects as rows in the sheet

  console.log("JSON uploaded to Google Sheets successfully!");
}
