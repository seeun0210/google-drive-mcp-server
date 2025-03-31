import { OAuth2Client } from "google-auth-library";
import { authenticate } from "@google-cloud/local-auth";
import * as path from "path";
import * as fs from "fs";

export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

let oAuth2Client: OAuth2Client | null = null;

export async function authorize(): Promise<OAuth2Client> {
  if (oAuth2Client) {
    return oAuth2Client;
  }

  try {
    // 1. 먼저 환경변수에서 토큰을 찾습니다
    const token = process.env.GOOGLE_OAUTH_TOKEN;
    if (token) {
      oAuth2Client = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: "http://localhost",
      });
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    }

    // 2. credentials.json이 있다면 로컬 인증을 시도합니다
    const credPath = path.join(process.cwd(), "credentials.json");
    if (fs.existsSync(credPath)) {
      oAuth2Client = await authenticate({
        scopes: SCOPES,
        keyfilePath: credPath,
      });
      return oAuth2Client;
    }

    // 3. 위 방법들이 모두 실패하면 새로운 OAuth 클라이언트를 생성하고 인증 URL을 생성합니다
    console.error(`
Google OAuth 설정이 필요합니다. 다음 중 한 가지 방법을 선택하세요:

1. 환경변수 설정:
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_OAUTH_TOKEN=your_oauth_token

2. credentials.json 파일 추가:
   Google Cloud Console에서 다운로드한 credentials.json 파일을
   ${process.cwd()} 경로에 저장하세요.

자세한 설정 방법: https://developers.google.com/sheets/api/quickstart/nodejs
`);

    // 일단 임시 클라이언트를 반환하고, 실제 인증은 첫 API 호출 시 처리
    oAuth2Client = new OAuth2Client();
    return oAuth2Client;
  } catch (error) {
    console.error("인증 중 오류 발생:", error);
    throw error;
  }
}

export function clearAuth() {
  oAuth2Client = null;
}
