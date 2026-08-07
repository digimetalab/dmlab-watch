import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Verify a Google Identity Services id_token (from the GIS popup flow).
// Returns { googleId, email, name, picture } or throws on invalid token.
export async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID belum diatur di environment");
  }
  const ticket = await client.verifyIdToken({
    idToken: String(credential),
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("token Google tidak valid");
  return {
    googleId: payload.sub,
    email: (payload.email || "").toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || null,
    emailVerified: !!payload.email_verified,
  };
}
