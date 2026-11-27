import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DEFAULT_NEWS_IMAGE, JobItem, NewsItem } from './data/careerData';

export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'nhungcam1902@gmail.com',
  'hr@careertoday.com.vn',
] as const;

export const ADMIN_EMAIL_REGEX =
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export interface AdminEntry {
  email: string;
  role: string;
  addedByEmail: string;
  isRoot?: boolean;
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return (BOOTSTRAPPED_ADMIN_EMAILS as readonly string[]).includes(lower);
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified || !user.email) {
    return false;
  }
  const emailLower = user.email.trim().toLowerCase();
  if (isBootstrappedAdminEmail(emailLower)) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', emailLower));
    return snap.exists();
  } catch {
    return false;
  }
}

export function subscribeToAdmins(
  onData: (admins: AdminEntry[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'admins'),
    (snapshot) => {
      const dynamicAdmins: AdminEntry[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            email: String(data.email ?? d.id).toLowerCase(),
            role: String(data.role ?? 'admin'),
            addedByEmail: String(data.addedByEmail ?? ''),
            isRoot: false,
          };
        })
        .filter((item) => !isBootstrappedAdminEmail(item.email));

      const rootAdmins: AdminEntry[] = BOOTSTRAPPED_ADMIN_EMAILS.map(
        (email) => ({
          email,
          role: 'admin',
          addedByEmail: 'system',
          isRoot: true,
        })
      );

      onData([...rootAdmins, ...dynamicAdmins]);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'admins');
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function addCoAdminInFirestore(
  targetEmail: string,
  callerUid: string,
  callerEmail: string
): Promise<void> {
  const normalized = targetEmail.trim().toLowerCase();
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !ADMIN_EMAIL_REGEX.test(normalized)
  ) {
    throw new Error('INVALID_EMAIL');
  }
  if (isBootstrappedAdminEmail(normalized)) {
    throw new Error('ALREADY_ROOT_ADMIN');
  }
  const path = `admins/${normalized}`;
  try {
    await setDoc(doc(db, 'admins', normalized), {
      email: normalized,
      role: 'admin',
      addedBy: callerUid,
      addedByEmail: callerEmail.trim().toLowerCase(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeCoAdminFromFirestore(
  targetEmail: string
): Promise<void> {
  const normalized = targetEmail.trim().toLowerCase();
  if (isBootstrappedAdminEmail(normalized)) {
    throw new Error('CANNOT_REMOVE_ROOT_ADMIN');
  }
  const path = `admins/${normalized}`;
  try {
    await deleteDoc(doc(db, 'admins', normalized));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function signInAdminWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

const clampStr = (val: string, max: number): string => val.trim().slice(0, max);

export function subscribeToJobs(
  onData: (jobs: JobItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'jobs'), orderBy('id', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: JobItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: typeof data.id === 'number' ? data.id : Number(d.id) || Date.now(),
          title: String(data.title ?? ''),
          ...(data.titleEn ? { titleEn: String(data.titleEn) } : {}),
          industry: String(data.industry ?? ''),
          level: String(data.level ?? ''),
          location: String(data.location ?? ''),
          salary: String(data.salary ?? ''),
          ...(data.salaryEn ? { salaryEn: String(data.salaryEn) } : {}),
          hot: Boolean(data.hot),
          posted: String(data.posted ?? ''),
          ...(data.postedEn ? { postedEn: String(data.postedEn) } : {}),
          desc: String(data.desc ?? ''),
          ...(data.descEn ? { descEn: String(data.descEn) } : {}),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'jobs');
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToNews(
  onData: (news: NewsItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'news'), orderBy('id', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: NewsItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: typeof data.id === 'number' ? data.id : Number(d.id) || Date.now(),
          category: String(data.category ?? ''),
          date: String(data.date ?? ''),
          title: String(data.title ?? ''),
          ...(data.titleEn ? { titleEn: String(data.titleEn) } : {}),
          ...(data.metaTitle ? { metaTitle: String(data.metaTitle) } : {}),
          ...(data.metaDescription
            ? { metaDescription: String(data.metaDescription) }
            : {}),
          ...(data.metaKeywords
            ? { metaKeywords: String(data.metaKeywords) }
            : {}),
          img: String(data.img || DEFAULT_NEWS_IMAGE),
          summary: String(data.summary ?? ''),
          ...(data.summaryEn ? { summaryEn: String(data.summaryEn) } : {}),
          content: String(data.content ?? ''),
          ...(data.contentEn ? { contentEn: String(data.contentEn) } : {}),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'news');
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function createJobInFirestore(
  job: JobItem,
  authorId: string
): Promise<void> {
  const docId = String(job.id);
  const path = `jobs/${docId}`;
  const payload: Record<string, unknown> = {
    id: job.id,
    title: clampStr(job.title, 200),
    industry: clampStr(job.industry, 100),
    level: clampStr(job.level, 100),
    location: clampStr(job.location, 100),
    salary: clampStr(job.salary, 150),
    hot: Boolean(job.hot),
    posted: clampStr(job.posted, 60),
    desc: clampStr(job.desc, 5000),
    authorId,
    createdAt: serverTimestamp(),
  };

  if (job.titleEn) payload.titleEn = clampStr(job.titleEn, 200);
  if (job.salaryEn) payload.salaryEn = clampStr(job.salaryEn, 150);
  if (job.postedEn) payload.postedEn = clampStr(job.postedEn, 60);
  if (job.descEn) payload.descEn = clampStr(job.descEn, 5000);

  try {
    await setDoc(doc(db, 'jobs', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteJobFromFirestore(jobId: number): Promise<void> {
  const docId = String(jobId);
  const path = `jobs/${docId}`;
  try {
    await deleteDoc(doc(db, 'jobs', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createNewsInFirestore(
  article: NewsItem,
  authorId: string
): Promise<void> {
  const docId = String(article.id);
  const path = `news/${docId}`;
  const safeCategory = clampStr(article.category || 'Thị trường lao động', 100);
  const safeDate = clampStr(article.date, 40);
  const safeTitle = clampStr(article.title, 200);
  const safeImg = clampStr(article.img || DEFAULT_NEWS_IMAGE, 250000);
  const safeSummary = clampStr(article.summary || safeTitle, 1000);
  const safeContent = clampStr(article.content || safeTitle, 400000);

  const payload: Record<string, unknown> = {
    id: article.id,
    category: safeCategory,
    date: safeDate,
    title: safeTitle,
    img: safeImg,
    summary: safeSummary,
    content: safeContent,
    authorId,
    createdAt: serverTimestamp(),
  };

  if (article.titleEn?.trim()) payload.titleEn = clampStr(article.titleEn, 200);
  if (article.metaTitle?.trim())
    payload.metaTitle = clampStr(article.metaTitle, 200);
  if (article.metaDescription?.trim())
    payload.metaDescription = clampStr(article.metaDescription, 500);
  if (article.metaKeywords?.trim())
    payload.metaKeywords = clampStr(article.metaKeywords, 500);
  if (article.summaryEn?.trim())
    payload.summaryEn = clampStr(article.summaryEn, 1000);
  if (article.contentEn?.trim())
    payload.contentEn = clampStr(article.contentEn, 400000);

  try {
    await setDoc(doc(db, 'news', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteNewsFromFirestore(newsId: number): Promise<void> {
  const docId = String(newsId);
  const path = `news/${docId}`;
  try {
    await deleteDoc(doc(db, 'news', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
