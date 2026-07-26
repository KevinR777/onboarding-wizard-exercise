export type MockProviderOutcome =
  | { status: "VALID"; payload: { items: { id: string; name: string }[] } }
  | { status: "PARTIAL"; payload: { items: { id: string; name: string }[]; warnings: string[] } }
  | { status: "INVALID"; payload: { reason: string } }
  | { status: "UNAVAILABLE"; payload: { reason: string; httpStatus: number } };

const FAKE_ITEMS = [
  { id: "item_1", name: "Item One" },
  { id: "item_2", name: "Item Two" },
];

export const runMockProvider = (apiKey: string | null): MockProviderOutcome => {
  switch (apiKey) {
    case "key_valid":
      return { status: "VALID", payload: { items: FAKE_ITEMS } };
    case "key_partial":
      return {
        status: "PARTIAL",
        payload: { items: [FAKE_ITEMS[0]], warnings: ["Item Two could not be verified"] },
      };
    case "key_invalid":
      return { status: "INVALID", payload: { reason: "The provided API key was rejected." } };
    case "key_unavailable":
      return {
        status: "UNAVAILABLE",
        payload: { reason: "The provider is temporarily unavailable.", httpStatus: 503 },
      };
    default:
      return { status: "VALID", payload: { items: FAKE_ITEMS } }; // convenience default, per spec
  }
};
