import "server-only";
import { env } from "@/lib/env";

// Custom LinkedIn OAuth 2.0 flow. Deliberately NOT using Supabase's built-in
// LinkedIn provider: it can't request the `w_member_social` scope needed to
// publish posts on the member's behalf.

export const LINKEDIN_SCOPES = "openid profile w_member_social";

const AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization";
const ACCESS_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const LINKEDIN_API_VERSION = "202405"; // LinkedIn REST API version header (YYYYMM)

export function buildLinkedInAuthorizationUrl(state: string): string {
  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.linkedinClientId);
  url.searchParams.set("redirect_uri", env.linkedinRedirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_SCOPES);
  return url.toString();
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export async function exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.linkedinRedirectUri,
    client_id: env.linkedinClientId,
    client_secret: env.linkedinClientSecret,
  });

  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  email?: string;
}

export async function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn userinfo request failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Publishes a text post to LinkedIn on behalf of the member, via the
 * versioned Posts API (POST /rest/posts). Requires the `w_member_social`
 * scope. Returns the created post's URN.
 */
export async function publishLinkedInPost(params: {
  accessToken: string;
  authorSub: string;
  text: string;
}): Promise<string> {
  const { accessToken, authorSub, text } = params;

  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_API_VERSION,
    },
    body: JSON.stringify({
      author: `urn:li:person:${authorSub}`,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`LinkedIn publish failed (${res.status}): ${text2}`);
  }

  // LinkedIn returns the new post's URN in the `x-restli-id` response header
  // (the body is empty on success).
  const urn = res.headers.get("x-restli-id");
  if (!urn) {
    throw new Error("LinkedIn publish succeeded but returned no post URN");
  }
  return urn;
}
