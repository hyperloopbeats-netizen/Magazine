import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveFileMeta, DriveLibraryMatrix } from '../types/matrix';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

export const LIBRARY_MATRIX_FILENAME = 'matrix_slide_os_library_events.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Access token kept strictly in memory (never localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (!user) cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Drive access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => cachedAccessToken;

export const logoutGoogleDrive = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export async function listDriveTextAndMatrixFiles(accessToken: string): Promise<DriveFileMeta[]> {
  const q = encodeURIComponent(
    "trashed = false and (mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/json' or mimeType = 'application/vnd.google-apps.document')"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=30&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,size)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive list failed (${res.status}): ${errText.slice(0, 140)}`);
  }
  const data = (await res.json()) as { files?: DriveFileMeta[] };
  return data.files || [];
}

export async function readDriveFileContent(
  accessToken: string,
  file: DriveFileMeta
): Promise<string> {
  const endpoint =
    file.mimeType === 'application/vnd.google-apps.document'
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/plain`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed reading "${file.name}" from Drive (${res.status})`);
  }
  return await res.text();
}

export async function findOrLoadLibraryMatrix(
  accessToken: string
): Promise<{ fileId: string | null; matrix: DriveLibraryMatrix | null }> {
  const q = encodeURIComponent(`trashed = false and name = '${LIBRARY_MATRIX_FILENAME}'`);
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    throw new Error(`Drive search failed (${listRes.status})`);
  }
  const listJson = (await listRes.json()) as { files?: DriveFileMeta[] };
  const target = listJson.files?.[0];
  if (!target) {
    return { fileId: null, matrix: null };
  }

  const raw = await readDriveFileContent(accessToken, target);
  const parsed = JSON.parse(raw) as DriveLibraryMatrix;
  return { fileId: target.id, matrix: parsed };
}

export async function saveLibraryMatrixToDrive(
  accessToken: string,
  matrix: DriveLibraryMatrix,
  existingFileId?: string | null
): Promise<DriveFileMeta> {
  const metadata = {
    name: LIBRARY_MATRIX_FILENAME,
    mimeType: 'application/json',
    description: 'Matrix Slide OS — Gemini-encoded Event Library Matrix for Live Analysis',
  };

  const boundary = `matrix_os_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(matrix, null, 2)}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive save failed (${res.status}): ${errText.slice(0, 140)}`);
  }

  return (await res.json()) as DriveFileMeta;
}
