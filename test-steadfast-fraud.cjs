try {
  process.loadEnvFile(".env.local");
} catch {
  console.error(".env.local file load করা যায়নি।");
  process.exit(1);
}

const baseUrl = (
  process.env.STEADFAST_BASE_URL ||
  "https://portal.packzy.com/api/v1"
).replace(/\/+$/, "");

const apiKey = process.env.STEADFAST_API_KEY;
const secretKey = process.env.STEADFAST_SECRET_KEY;

const rawPhone = process.argv[2];

if (!apiKey || !secretKey) {
  console.error("Steadfast API credentials পাওয়া যায়নি।");
  process.exit(1);
}

if (!rawPhone) {
  console.error(
    "Command-এর শেষে নিজের test phone number দিতে হবে।",
  );
  process.exit(1);
}

let phone = rawPhone.replace(/\D/g, "");

if (phone.startsWith("880") && phone.length === 13) {
  phone = `0${phone.slice(3)}`;
} else if (phone.length === 10 && phone.startsWith("1")) {
  phone = `0${phone}`;
}

if (!/^01[3-9]\d{8}$/.test(phone)) {
  console.error("বাংলাদেশি মোবাইল নম্বর সঠিক নয়।");
  process.exit(1);
}

async function main() {
  console.log("Read-only Steadfast fraud-check test...");
  console.log("কোনো order book করা হবে না।");

  const response = await fetch(
   `${baseUrl}/fraud_check/score/${encodeURIComponent(phone)}`,
    {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );

  console.log("HTTP status:", response.status);

  const text = await response.text();

  try {
    const result = JSON.parse(text);
    const data =
      result.data &&
      typeof result.data === "object" &&
      !Array.isArray(result.data)
        ? result.data
        : result;

console.log("Response fields:", Object.keys(data).join(", "));

for (const [key, value] of Object.entries(data)) {
  if (/phone/i.test(key)) continue;

  const output =
    Array.isArray(value)
      ? `list with ${value.length} entries`
      : value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value;

  console.log(`${key}:`, output);
}
    {
      if (data[key] !== undefined) {
        console.log(
          `${key}:`,
          Array.isArray(data[key])
            ? `list with ${data[key].length} entries`
            : data[key],
        );
      }
    }
  } catch {
    console.log(
      "JSON response পাওয়া যায়নি:",
      text.slice(0, 250),
    );
  }
}

main().catch((error) => {
  console.error(
    "Fraud-check request failed:",
    error?.message ?? error,
  );

  console.error(
    "Underlying cause:",
    error?.cause?.code ??
      error?.cause?.message ??
      "No underlying cause reported",
  );

  process.exitCode = 1;
});