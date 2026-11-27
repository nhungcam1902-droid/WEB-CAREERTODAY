import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileUp,
  Globe,
  HeartHandshake,
  Lightbulb,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  PenSquare,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CareerLogo } from './components/CareerLogo';
import {
  AdminLoginModal,
  JobDetailModal,
  ManageAdminsModal,
  NewsDetailModal,
  PostJobModal,
  PostNewsModal,
  QuickUploadModal,
  SearchModal,
} from './components/Modals';
import {
  ABOUT_TEAM_IMAGE,
  getIndustryLabel,
  getJobLocalized,
  getLocationLabel,
  getNewsCategoryLabel,
  getNewsLocalized,
  HERO_IMAGE,
  i18nDict,
  initialJobsData,
  initialNewsData,
  JobItem,
  Lang,
  MISSION_IMAGE,
  NewsItem,
  serviceMenuItems,
  VISION_IMAGE,
} from './data/careerData';
import {
  addCoAdminInFirestore,
  AdminEntry,
  auth,
  checkIsAdmin,
  createJobInFirestore,
  createNewsInFirestore,
  deleteJobFromFirestore,
  deleteNewsFromFirestore,
  removeCoAdminFromFirestore,
  signInAdminWithGoogle,
  signOutAdmin,
  subscribeToAdmins,
  subscribeToJobs,
  subscribeToNews,
} from './firebase';

interface ToastItem {
  id: number;
  message: string;
}

type PageKey = 'home' | 'about' | 'jobs' | 'services' | 'news' | 'contact';
const VALID_PAGES: PageKey[] = ['home', 'about', 'jobs', 'services', 'news', 'contact'];

const getInitialPage = (): PageKey => {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace(/^#/, '') as PageKey;
  return VALID_PAGES.includes(hash) ? hash : 'home';
};

export default function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [activePage, setActivePage] = useState<PageKey>(getInitialPage);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [newsCategory, setNewsCategory] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // HR1-style Header Dropdowns
  const [openDropdown, setOpenDropdown] = useState<'services' | null>(null);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Admin Auth State (Customers are public read-only; only verified Admins can post/delete/manage admins)
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSigningIn, setAdminSigningIn] = useState(false);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  // Dynamic Portal States synced from Firestore
  const [jobs, setJobs] = useState<JobItem[]>(initialJobsData);
  const [news, setNews] = useState<NewsItem[]>(initialNewsData);

  // HR1-style Job Tabs ('all' | 'hot'), Sort ('relevant' | 'latest') + Filters
  const [jobTab, setJobTab] = useState<'all' | 'hot'>('all');
  const [jobSort, setJobSort] = useState<'relevant' | 'latest'>('relevant');
  const [jobKeyword, setJobKeyword] = useState('');
  const [jobIndustry, setJobIndustry] = useState('all');
  const [jobLevel, setJobLevel] = useState('all');
  const [jobLocation, setJobLocation] = useState('all');

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<JobItem | null>(null);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  const [postNewsOpen, setPostNewsOpen] = useState(false);
  const [manageAdminsOpen, setManageAdminsOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(() =>
    typeof window !== 'undefined' && window.location.hash === '#admin'
  );

  // Image Fallbacks
  const [heroImgError, setHeroImgError] = useState(false);
  const [aboutImgError, setAboutImgError] = useState(false);
  const [visionImgError, setVisionImgError] = useState(false);
  const [missionImgError, setMissionImgError] = useState(false);
  const [brokenServiceImgs, setBrokenServiceImgs] = useState<Record<string, boolean>>({});
  const [brokenNewsImgs, setBrokenNewsImgs] = useState<Record<number, boolean>>({});

  // B2B Job Order Form State
  const [joCompany, setJoCompany] = useState('');
  const [joPerson, setJoPerson] = useState('');
  const [joEmail, setJoEmail] = useState('');
  const [joPhone, setJoPhone] = useState('');
  const [joService, setJoService] = useState('ess');
  const [joPos, setJoPos] = useState('');
  const [joNotes, setJoNotes] = useState('');
  const [joError, setJoError] = useState<string | null>(null);
  const [joMailtoUrl, setJoMailtoUrl] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const t = (key: string) => i18nDict[lang][key] ?? key;

  const showToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setQuickUploadOpen(false);
        setActiveJob(null);
        setPostJobOpen(false);
        setActiveArticle(null);
        setPostNewsOpen(false);
        setManageAdminsOpen(false);
        setAdminLoginOpen(false);
        setMobileMenuOpen(false);
        setOpenDropdown(null);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const onHashChange = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      if (rawHash === 'admin') {
        setAdminLoginOpen(true);
        return;
      }
      const hash = rawHash as PageKey;
      if (VALID_PAGES.includes(hash)) {
        setActivePage(hash);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const ok = await checkIsAdmin(user);
      if (ok && user) {
        setAdminUser(user);
        setIsAdmin(true);
      } else {
        setAdminUser(null);
        setIsAdmin(false);
        setPostJobOpen(false);
        setPostNewsOpen(false);
        setManageAdminsOpen(false);
      }
    });

    const unsubscribeJobs = subscribeToJobs(
      (items) => setJobs(items),
      (err) =>
        setFatalError(
          err instanceof Error ? err : new Error('Failed to load jobs')
        )
    );

    const unsubscribeNews = subscribeToNews(
      (items) => {
        setNews(items);
        setNewsCategory((curr) =>
          curr !== 'all' && !items.some((item) => item.category === curr)
            ? 'all'
            : curr
        );
      },
      (err) =>
        setFatalError(
          err instanceof Error ? err : new Error('Failed to load blog posts')
        )
    );

    return () => {
      unsubscribeAuth();
      unsubscribeJobs();
      unsubscribeNews();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAdmins([]);
      return;
    }
    const unsubscribeAdmins = subscribeToAdmins(
      (items) => setAdmins(items),
      (err) =>
        setFatalError(
          err instanceof Error ? err : new Error('Failed to load admins')
        )
    );
    return () => unsubscribeAdmins();
  }, [isAdmin]);

  if (fatalError) {
    throw fatalError;
  }

  const handleAdminLogin = async () => {
    if (adminSigningIn) return;
    setAdminSigningIn(true);
    try {
      const user = await signInAdminWithGoogle();
      const ok = await checkIsAdmin(user);
      if (ok) {
        setAdminUser(user);
        setIsAdmin(true);
        setAdminLoginOpen(false);
        showToast(
          lang === 'vi'
            ? 'Đã đăng nhập chế độ Quản trị viên!'
            : 'Signed in as Administrator!'
        );
      } else {
        await signOutAdmin();
        setAdminUser(null);
        setIsAdmin(false);
        showToast(
          lang === 'vi'
            ? 'Tài khoản này không có quyền Quản trị viên.'
            : 'This account does not have Administrator access.'
        );
      }
    } catch {
      showToast(
        lang === 'vi'
          ? 'Đăng nhập Quản trị bị hủy hoặc không thành công.'
          : 'Admin sign-in was cancelled or failed.'
      );
    } finally {
      setAdminSigningIn(false);
    }
  };

  const handleAdminLogout = async () => {
    await signOutAdmin();
    setAdminUser(null);
    setIsAdmin(false);
    setPostJobOpen(false);
    setPostNewsOpen(false);
    setManageAdminsOpen(false);
    showToast(
      lang === 'vi' ? 'Đã đăng xuất khỏi chế độ Quản trị.' : 'Signed out of Admin mode.'
    );
  };

  const handleAddCoAdmin = async (email: string) => {
    if (!isAdmin || !adminUser || !adminUser.email) return;
    await addCoAdminInFirestore(email, adminUser.uid, adminUser.email);
    showToast(
      lang === 'vi'
        ? `Đã thêm ${email} làm đồng quản trị viên!`
        : `Added ${email} as Co-Administrator!`
    );
  };

  const handleRemoveCoAdmin = async (email: string) => {
    if (!isAdmin) return;
    try {
      await removeCoAdminFromFirestore(email);
      showToast(
        lang === 'vi'
          ? `Đã gỡ quyền quản trị của ${email}.`
          : `Removed administrator access for ${email}.`
      );
    } catch {
      showToast(
        lang === 'vi'
          ? 'Không thể gỡ quản trị viên này.'
          : 'Unable to remove this administrator.'
      );
    }
  };

  const handleAddJob = async (newJob: JobItem) => {
    if (!isAdmin || !adminUser) return;
    try {
      await createJobInFirestore(newJob, adminUser.uid);
      showToast(
        lang === 'vi'
          ? 'Đã đăng tin tuyển dụng mới lên Cổng việc làm!'
          : 'New job opening published!'
      );
    } catch {
      showToast(
        lang === 'vi'
          ? 'Không thể đăng tin tuyển dụng. Vui lòng kiểm tra quyền Quản trị.'
          : 'Unable to publish job posting. Please check Admin permissions.'
      );
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!isAdmin) return;
    try {
      await deleteJobFromFirestore(id);
      if (activeJob?.id === id) {
        setActiveJob(null);
      }
      showToast(lang === 'vi' ? 'Đã xóa tin tuyển dụng.' : 'Job posting deleted.');
    } catch {
      showToast(
        lang === 'vi'
          ? 'Không thể xóa tin tuyển dụng.'
          : 'Unable to delete job posting.'
      );
    }
  };

  const handleAddArticle = async (newArticle: NewsItem) => {
    if (!isAdmin || !adminUser) return;
    try {
      await createNewsInFirestore(newArticle, adminUser.uid);
      showToast(
        lang === 'vi'
          ? 'Đã xuất bản bài viết mới thành công!'
          : 'New article published!'
      );
    } catch {
      showToast(
        lang === 'vi'
          ? 'Không thể đăng bài viết. Vui lòng kiểm tra quyền Quản trị.'
          : 'Unable to publish article. Please check Admin permissions.'
      );
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!isAdmin) return;
    try {
      await deleteNewsFromFirestore(id);
      if (activeArticle?.id === id) {
        setActiveArticle(null);
      }
      showToast(lang === 'vi' ? 'Đã xóa bài viết.' : 'Blog post deleted.');
    } catch {
      showToast(
        lang === 'vi' ? 'Không thể xóa bài viết.' : 'Unable to delete blog post.'
      );
    }
  };

  const handleLangSwitch = (nextLang: Lang) => {
    if (nextLang === lang) return;
    setLang(nextLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLang;
    }
    showToast(
      nextLang === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English'
    );
  };

  const navigateTo = (
    page: PageKey,
    options?: {
      scrollToId?: string;
      serviceOrder?: string;
      serviceId?: string;
      jobTab?: 'all' | 'hot';
    }
  ) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setActivePage(page);

    if (options?.serviceOrder) {
      setJoService(options.serviceOrder);
    }
    if (options?.serviceId) {
      setSelectedServiceId(options.serviceId);
    } else if (page !== 'services') {
      setSelectedServiceId(null);
    }
    if (options?.jobTab) {
      setJobTab(options.jobTab);
    }

    if (window.location.hash !== `#${page}`) {
      window.history.pushState(null, '', `#${page}`);
    }

    if (options?.scrollToId) {
      setTimeout(() => {
        const el = document.getElementById(options.scrollToId!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectServiceFromMenu = (srv: { id: string }) => {
    navigateTo('services', {
      serviceOrder: srv.id,
      serviceId: srv.id,
      scrollToId: `service-${srv.id}`,
    });
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo('jobs', { jobTab: 'all' });
  };

  const filteredJobs = useMemo(() => {
    const kw = jobKeyword.trim().toLowerCase();
    const list = jobs.filter((j) => {
      const matchTab = jobTab === 'all' || j.hot;
      const indLabel = getIndustryLabel(j.industry, lang).toLowerCase();
      const locLabel = getLocationLabel(j.location, lang).toLowerCase();
      const matchKw =
        !kw ||
        j.title.toLowerCase().includes(kw) ||
        (j.titleEn && j.titleEn.toLowerCase().includes(kw)) ||
        j.desc.toLowerCase().includes(kw) ||
        (j.descEn && j.descEn.toLowerCase().includes(kw)) ||
        j.industry.toLowerCase().includes(kw) ||
        indLabel.includes(kw) ||
        locLabel.includes(kw);
      const matchInd = jobIndustry === 'all' || j.industry === jobIndustry;
      const matchLvl = jobLevel === 'all' || j.level === jobLevel;
      const matchLoc = jobLocation === 'all' || j.location === jobLocation;
      return matchTab && matchKw && matchInd && matchLvl && matchLoc;
    });

    return [...list].sort((a, b) => {
      if (jobSort === 'latest') {
        return b.id - a.id;
      }
      if (a.hot !== b.hot) return a.hot ? -1 : 1;
      return a.id - b.id;
    });
  }, [jobs, lang, jobTab, jobSort, jobKeyword, jobIndustry, jobLevel, jobLocation]);

  const newsCategories = useMemo(
    () => Array.from(new Set(news.map((n) => n.category))),
    [news]
  );

  const filteredNews = useMemo(
    () =>
      newsCategory === 'all'
        ? news
        : news.filter((n) => n.category === newsCategory),
    [news, newsCategory]
  );

  const hasActiveJobFilters =
    jobTab !== 'all' ||
    jobKeyword.trim() !== '' ||
    jobIndustry !== 'all' ||
    jobLevel !== 'all' ||
    jobLocation !== 'all';

  const resetJobFilters = () => {
    setJobTab('all');
    setJobKeyword('');
    setJobIndustry('all');
    setJobLevel('all');
    setJobLocation('all');
  };

  const handleJobOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoError(null);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(joEmail.trim());
    const phoneDigits = joPhone.replace(/\D/g, '');
    if (!emailOk) {
      setJoError(
        lang === 'vi'
          ? 'Vui lòng nhập email doanh nghiệp hợp lệ.'
          : 'Please enter a valid corporate email address.'
      );
      return;
    }
    if (phoneDigits.length < 8) {
      setJoError(
        lang === 'vi'
          ? 'Vui lòng nhập số điện thoại liên hệ hợp lệ.'
          : 'Please enter a valid contact phone number.'
      );
      return;
    }

    const selectedSrv = serviceMenuItems.find((s) => s.id === joService);
    const serviceName = selectedSrv
      ? lang === 'vi'
        ? selectedSrv.orderValue
        : selectedSrv.orderValueEn
      : joService;

    const subject = encodeURIComponent(
      lang === 'vi'
        ? `[Yêu cầu tuyển dụng] ${joCompany.trim()} - ${joPos.trim()}`
        : `[Job Order - B2B] ${joCompany.trim()} - ${joPos.trim()}`
    );
    const body = encodeURIComponent(
      lang === 'vi'
        ? `Kính gửi Công ty TNHH CareerToday,\n\n` +
            `YÊU CẦU TƯ VẤN / ĐẶT HÀNG TUYỂN DỤNG:\n` +
            `- Doanh nghiệp: ${joCompany.trim()}\n` +
            `- Người liên hệ: ${joPerson.trim()}\n` +
            `- Email: ${joEmail.trim()}\n` +
            `- Số điện thoại: ${joPhone.trim()}\n` +
            `- Gói dịch vụ: ${serviceName}\n` +
            `- Vị trí & Số lượng: ${joPos.trim()}\n` +
            `- Ghi chú thêm: ${joNotes.trim() || 'Không có ghi chú'}\n\n` +
            `Trân trọng!`
        : `Dear CareerToday Group,\n\n` +
            `RECRUITMENT CONSULTATION / JOB ORDER REQUEST:\n` +
            `- Company: ${joCompany.trim()}\n` +
            `- Contact Person: ${joPerson.trim()}\n` +
            `- Email: ${joEmail.trim()}\n` +
            `- Phone: ${joPhone.trim()}\n` +
            `- Service Package: ${serviceName}\n` +
            `- Position & Headcount: ${joPos.trim()}\n` +
            `- Additional Notes: ${joNotes.trim() || 'None'}\n\n` +
            `Best regards!`
    );

    const mailtoUrl = `mailto:hr@careertoday.com.vn?subject=${subject}&body=${body}`;
    setJoMailtoUrl(mailtoUrl);
    showToast(
      lang === 'vi'
        ? 'Đã ghi nhận yêu cầu! Đang kết nối tới hr@careertoday.com.vn...'
        : 'Job Order created! Connecting to hr@careertoday.com.vn...'
    );
    window.location.href = mailtoUrl;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {/* ==================== HR1-STYLE HEADER & NAVIGATION ==================== */}
      <header
        ref={navRef}
        className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-20">
            {/* Brand Logo */}
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('home');
              }}
              className="flex items-center focus-visible:outline-2 focus-visible:outline-brandBlue rounded-lg py-1 shrink-0"
              aria-label="CareerToday Group"
            >
              <CareerLogo variant="header" />
            </a>

            {/* Main Desktop Menu — Exact HR1 Vietnam Navigation Structure (Dedicated Pages) */}
            <nav
              className="hidden xl:flex items-center gap-5 text-[14px] font-bold text-slate-700"
              aria-label="Main navigation"
            >
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('home');
                }}
                aria-current={activePage === 'home' ? 'page' : undefined}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'home'
                    ? 'text-brandBlue'
                    : 'hover:text-brandBlue'
                }`}
              >
                <span>{t('nav_home')}</span>
                {activePage === 'home' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                )}
              </a>

              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('about');
                }}
                aria-current={activePage === 'about' ? 'page' : undefined}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'about'
                    ? 'text-brandBlue'
                    : 'hover:text-brandBlue'
                }`}
              >
                <span>{t('nav_about')}</span>
                {activePage === 'about' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                )}
              </a>

              <a
                href="#jobs"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('jobs');
                }}
                aria-current={activePage === 'jobs' ? 'page' : undefined}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'jobs'
                    ? 'text-brandBlue'
                    : 'hover:text-brandBlue'
                }`}
              >
                <span>{t('nav_jobs')}</span>
                {activePage === 'jobs' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                )}
              </a>

              {/* Dropdown: Dịch vụ / Our service (Opens Services Page or Specific Service) */}
              <div
                className="relative"
                onMouseEnter={() => setOpenDropdown('services')}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  onClick={() => navigateTo('services')}
                  aria-expanded={openDropdown === 'services'}
                  aria-current={activePage === 'services' ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePage === 'services' || openDropdown === 'services'
                      ? 'text-brandBlue'
                      : 'hover:text-brandBlue'
                  }`}
                >
                  <span>{t('nav_services')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openDropdown === 'services' ? 'rotate-180' : ''
                    }`}
                  />
                  {activePage === 'services' && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                  )}
                </button>

                {openDropdown === 'services' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[480px] z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-2">
                      {serviceMenuItems.map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => handleSelectServiceFromMenu(srv)}
                          className="w-full text-left p-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer group flex items-start gap-3.5"
                        >
                          <img
                            src={srv.img}
                            alt={lang === 'vi' ? srv.titleVi : srv.titleEn}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                          />
                          <div>
                            <div className="font-heading font-bold text-sm text-brandBlue group-hover:text-brandRed transition-colors">
                              {lang === 'vi' ? srv.titleVi : srv.titleEn}
                            </div>
                            <p className="text-xs font-normal text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {lang === 'vi' ? srv.descVi : srv.descEn}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a
                href="#news"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('news');
                }}
                aria-current={activePage === 'news' ? 'page' : undefined}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'news'
                    ? 'text-brandBlue'
                    : 'hover:text-brandBlue'
                }`}
              >
                <span>{t('nav_news')}</span>
                {activePage === 'news' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                )}
              </a>

              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('contact');
                }}
                aria-current={activePage === 'contact' ? 'page' : undefined}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'contact'
                    ? 'text-brandBlue'
                    : 'hover:text-brandBlue'
                }`}
              >
                <span>{t('nav_contact')}</span>
                {activePage === 'contact' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brandRed rounded-full" />
                )}
              </a>
            </nav>

            {/* Right Utility Zone — Exact HR1: Submit CV CTA + VI | EN Switcher */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="p-2.5 rounded-lg bg-brandGrey hover:bg-blue-50 text-slate-700 hover:text-brandBlue transition-colors cursor-pointer"
                aria-label={lang === 'vi' ? 'Tìm kiếm' : 'Search'}
                title={lang === 'vi' ? 'Tìm kiếm' : 'Search'}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* HR1 Primary CTA Button: Gửi hồ sơ / Submit CV */}
              <button
                type="button"
                onClick={() => setQuickUploadOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 bg-brandRed hover:bg-brandRedDark text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 shrink-0" />
                <span>{t('nav_submit_cv')}</span>
              </button>

              {/* HR1 Language Switcher VI | EN */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs font-extrabold">
                <button
                  type="button"
                  onClick={() => handleLangSwitch('vi')}
                  className={`px-2.5 py-2 transition-colors cursor-pointer whitespace-nowrap ${
                    lang === 'vi'
                      ? 'bg-brandBlue text-white'
                      : 'bg-white text-slate-600 hover:text-brandBlue'
                  }`}
                >
                  VI
                </button>
                <button
                  type="button"
                  onClick={() => handleLangSwitch('en')}
                  className={`px-2.5 py-2 transition-colors cursor-pointer whitespace-nowrap ${
                    lang === 'en'
                      ? 'bg-brandBlue text-white'
                      : 'bg-white text-slate-600 hover:text-brandBlue'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Header Admin Entry Point */}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setManageAdminsOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title={lang === 'vi' ? 'Quản lý Admin' : 'Manage Admins'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdminLoginOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-brandBlue hover:border-brandBlue/50 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title={
                    lang === 'vi'
                      ? 'Đăng nhập Quản trị viên'
                      : 'Admin Sign In'
                  }
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}

              {/* Mobile Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="xl:hidden p-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* HR1-style Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-t border-slate-100 px-4 pt-3 pb-5 space-y-1 shadow-xl max-h-[80vh] overflow-y-auto">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('home');
              }}
              className={`block px-4 py-2.5 rounded-xl font-bold ${
                activePage === 'home'
                  ? 'bg-blue-50 text-brandBlue'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
              }`}
            >
              {t('nav_home')}
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('about');
              }}
              className={`block px-4 py-2.5 rounded-xl font-bold ${
                activePage === 'about'
                  ? 'bg-blue-50 text-brandBlue'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
              }`}
            >
              {t('nav_about')}
            </a>
            <a
              href="#jobs"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('jobs');
              }}
              className={`block px-4 py-2.5 rounded-xl font-bold ${
                activePage === 'jobs'
                  ? 'bg-blue-50 text-brandBlue'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
              }`}
            >
              {t('nav_jobs')}
            </a>

            {/* Mobile Services Accordion */}
            <div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigateTo('services')}
                  className={`flex-1 text-left px-4 py-2.5 rounded-xl font-bold cursor-pointer ${
                    activePage === 'services'
                      ? 'bg-blue-50 text-brandBlue'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
                  }`}
                >
                  {t('nav_services')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileServicesOpen((prev) => !prev)}
                  className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                  aria-label="Toggle services submenu"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      mobileServicesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
              {mobileServicesOpen && (
                <div className="pl-6 pr-2 py-1 space-y-1">
                  {serviceMenuItems.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleSelectServiceFromMenu(srv)}
                      className="block w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-brandBlue hover:bg-slate-50 cursor-pointer"
                    >
                      {lang === 'vi' ? srv.titleVi : srv.titleEn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="#news"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('news');
              }}
              className={`block px-4 py-2.5 rounded-xl font-bold ${
                activePage === 'news'
                  ? 'bg-blue-50 text-brandBlue'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
              }`}
            >
              {t('nav_news')}
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('contact');
              }}
              className={`block px-4 py-2.5 rounded-xl font-bold ${
                activePage === 'contact'
                  ? 'bg-blue-50 text-brandBlue'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-brandBlue'
              }`}
            >
              {t('nav_contact')}
            </a>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setQuickUploadOpen(true);
                }}
                className="text-center bg-brandRed text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                {t('nav_submit_cv')}
              </button>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('contact', { scrollToId: 'job-order-form' });
                }}
                className="text-center bg-brandBlue text-white font-bold py-2.5 rounded-xl text-xs"
              >
                {t('hero_cta_order')}
              </a>
            </div>

            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminLoginOpen(true);
                }}
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-slate-50 text-slate-700 hover:text-brandBlue font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {lang === 'vi'
                    ? 'Đăng nhập Quản trị viên'
                    : 'Administrator Sign In'}
                </span>
              </button>
            )}
          </div>
        )}
      </header>

      {isAdmin && (
        <div className="bg-slate-900 text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">
                {lang === 'vi' ? 'Chế độ Quản trị viên' : 'Admin Mode'}
              </span>
              {adminUser?.email && (
                <span className="text-slate-300 hidden sm:inline">
                  ({adminUser.email})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPostJobOpen(true)}
                className="inline-flex items-center gap-1 bg-brandBlue hover:bg-brandBlueDark text-white font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_post_job')}</span>
              </button>
              <button
                type="button"
                onClick={() => setPostNewsOpen(true)}
                className="inline-flex items-center gap-1 bg-brandRed hover:bg-brandRedDark text-white font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>{t('btn_post_news')}</span>
              </button>
              <button
                type="button"
                onClick={() => setManageAdminsOpen(true)}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {lang === 'vi' ? 'Quản lý Admin' : 'Manage Admins'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">

        {/* ==================== 1 & 2. HOME HERO BANNER + QUICK SEARCH BAR ==================== */}
        {activePage === 'home' && (
          <>
            <section
              id="home"
              className="relative bg-slate-900 text-white overflow-hidden"
            >
              {/* Full-bleed background editorial image with measured scrim */}
              <div className="absolute inset-0">
                {!heroImgError ? (
                  <img
                    src={HERO_IMAGE}
                    alt="CareerToday Executive Search Team"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover object-center opacity-80 brightness-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-brandBlueDark" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/50 to-slate-900/15" />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24 lg:pt-20 lg:pb-28">
                <div className="max-w-3xl space-y-5">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-red-400">
                    {t('hero_badge')}
                  </p>

                  <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold leading-[1.15] text-white text-balance">
                    {t('hero_title')}
                  </h1>

                  <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
                    {t('hero_sub')}
                  </p>

                  <div className="flex flex-wrap gap-3.5 pt-2">
                    <a
                      href="#jobs"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('jobs');
                      }}
                      className="inline-flex items-center gap-2 bg-brandRed hover:bg-brandRedDark text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap shrink-0"
                    >
                      <Search className="w-4 h-4 shrink-0" />
                      <span>{t('hero_cta_jobs')}</span>
                    </a>
                    <a
                      href="#contact"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('contact', { scrollToId: 'job-order-form' });
                      }}
                      className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold px-6 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap shrink-0"
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-brandBlue" />
                      <span>{t('hero_cta_order')}</span>
                    </a>
                  </div>

                  {/* Quiet Inline Stats Strip */}
                  <div className="pt-6 grid grid-cols-2 gap-6 max-w-md border-t border-white/15">
                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading tabular-nums">
                        70.000+
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{t('stat_1')}</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading tabular-nums">
                        30+
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{t('stat_2')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Search Home Bar */}
            <section className="relative z-20 -mt-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <form
                  onSubmit={handleQuickSearchSubmit}
                  className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {t('quick_search_title')}
                    </h2>
                    <span className="text-xs font-semibold text-slate-500">
                      {lang === 'vi'
                        ? 'Lọc nhanh theo vị trí, địa điểm và ngành nghề'
                        : 'Filter instantly by keyword, location, and industry'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={jobKeyword}
                        onChange={(e) => setJobKeyword(e.target.value)}
                        placeholder={
                          lang === 'vi'
                            ? 'Nhập chức danh, kỹ năng (VD: Golang, Sales, HRBP...)'
                            : 'Enter job title or skill (e.g. Golang, Sales, HRBP...)'
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <select
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                      >
                        <option value="all">
                          {lang === 'vi' ? 'Tất cả địa điểm' : 'All Locations'}
                        </option>
                        <option value="TP.HCM">
                          {getLocationLabel('TP.HCM', lang)}
                        </option>
                        <option value="Hà Nội">
                          {getLocationLabel('Hà Nội', lang)}
                        </option>
                        <option value="Bình Dương">
                          {getLocationLabel('Bình Dương', lang)}
                        </option>
                        <option value="Dubai/UAE">
                          {getLocationLabel('Dubai/UAE', lang)}
                        </option>
                        <option value="Remote">
                          {getLocationLabel('Remote', lang)}
                        </option>
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <select
                        value={jobIndustry}
                        onChange={(e) => setJobIndustry(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                      >
                        <option value="all">
                          {lang === 'vi' ? 'Tất cả ngành nghề' : 'All Industries'}
                        </option>
                        <option value="IT/Tech">
                          {getIndustryLabel('IT/Tech', lang)}
                        </option>
                        <option value="Finance/Banking">
                          {getIndustryLabel('Finance/Banking', lang)}
                        </option>
                        <option value="Logistics">
                          {getIndustryLabel('Logistics', lang)}
                        </option>
                        <option value="FMCG/Manufacturing">
                          {getIndustryLabel('FMCG/Manufacturing', lang)}
                        </option>
                        <option value="Retail/F&B">
                          {getIndustryLabel('Retail/F&B', lang)}
                        </option>
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <button
                        type="submit"
                        className="w-full h-full min-h-[46px] bg-brandRed hover:bg-brandRedDark text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        <span>{t('quick_search_btn')}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}

        {/* ==================== 3. OUR SERVICES (HOME OVERVIEW & DEDICATED SERVICES PAGE) ==================== */}
        {(activePage === 'home' || activePage === 'services') && (
          <section id="services" className="py-16 lg:py-24 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <p className="text-xs font-extrabold uppercase tracking-widest text-brandRed">
                  {lang === 'vi'
                    ? 'Giải pháp từ CareerToday'
                    : 'CareerToday Solutions'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 text-balance">
                  {t('srv_title')}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-2.5">
                  {t('srv_sub')}
                </p>
              </div>

              <div className="space-y-12 sm:space-y-14">
                {serviceMenuItems.map((srv) => (
                  <div
                    key={srv.id}
                    id={`service-${srv.id}`}
                    className={`flex flex-col md:flex-row items-center gap-7 md:gap-12 rounded-3xl transition-colors ${
                      activePage === 'services' && selectedServiceId === srv.id
                        ? 'bg-brandLight p-6 sm:p-8 border border-brandBlue/30'
                        : ''
                    }`}
                  >
                    {/* HR1 Circular Framed Image */}
                    <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-slate-200 p-1.5 bg-white shadow-sm shrink-0 overflow-hidden">
                      {!brokenServiceImgs[srv.id] ? (
                        <img
                          src={srv.img}
                          alt={lang === 'vi' ? srv.titleVi : srv.titleEn}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenServiceImgs((prev) => ({
                              ...prev,
                              [srv.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-brandBlue to-brandBlueDark flex items-center justify-center p-4 text-center text-white font-heading font-bold text-xs">
                          {lang === 'vi' ? srv.titleVi : srv.titleEn}
                        </div>
                      )}
                    </div>

                    {/* HR1 Right Service Title & Description */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 text-balance">
                        {lang === 'vi' ? srv.titleVi : srv.titleEn}
                      </h3>
                      <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                        {lang === 'vi' ? srv.descVi : srv.descEn}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <a
                          href="#contact"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateTo('contact', {
                              serviceOrder: srv.id,
                              scrollToId: 'job-order-form',
                            });
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-brandRed hover:text-brandRedDark transition-colors"
                        >
                          <span>{t('srv_cta')}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activePage === 'home' && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => navigateTo('services')}
                    className="inline-flex items-center gap-2 bg-brandBlue hover:bg-brandBlueDark text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    <span>
                      {lang === 'vi'
                        ? 'Xem trang Dịch vụ chi tiết'
                        : 'Explore Full Services Page'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {activePage === 'services' && (
                <div className="mt-16 bg-gradient-to-r from-slate-900 to-brandBlueDark rounded-3xl p-7 sm:p-10 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-balance">
                      {lang === 'vi'
                        ? 'Sẵn sàng tìm kiếm nhân sự phù hợp cho doanh nghiệp?'
                        : 'Ready to find the right talent for your organization?'}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {lang === 'vi'
                        ? 'Gửi yêu cầu tuyển dụng (Job Order) để đội ngũ tư vấn CareerToday liên hệ tư vấn giải pháp trong 24 giờ.'
                        : 'Submit a Job Order and our CareerToday consultants will reach out with a tailored recruitment plan within 24 hours.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo('contact', { scrollToId: 'job-order-form' })
                    }
                    className="bg-brandRed hover:bg-brandRedDark text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>{t('hero_cta_order')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================== 4. LOOKING JOB / FEATURED JOBS (HR1 STYLE - HOME & DEDICATED JOBS PAGE) ==================== */}
        {(activePage === 'home' || activePage === 'jobs') && (
          <section
            id="jobs"
            className={
              activePage === 'jobs'
                ? 'py-10 sm:py-14 bg-white border-t border-slate-100'
                : 'py-16 lg:py-20 bg-brandLight border-t border-slate-100'
            }
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Top HR1 Floating Search Bar on Jobs Page */}
              {activePage === 'jobs' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const el = document.getElementById('jobs-list');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] border border-slate-100 p-5 sm:p-7 mb-10"
                >
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-4">
                    {t('quick_search_title')}
                  </h1>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={jobKeyword}
                        onChange={(e) => setJobKeyword(e.target.value)}
                        placeholder={
                          lang === 'vi'
                            ? 'Nhập từ khóa chức danh, kỹ năng...'
                            : 'Input keyword'
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-100/80 border border-slate-200/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                      />
                    </div>

                    <div className="lg:col-span-3 relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        aria-label={lang === 'vi' ? 'Địa điểm' : 'Location'}
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-100/80 border border-slate-200/80 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white cursor-pointer"
                      >
                        <option value="all">
                          {lang === 'vi' ? 'Địa điểm..' : 'Location..'}
                        </option>
                        <option value="TP.HCM">
                          {getLocationLabel('TP.HCM', lang)}
                        </option>
                        <option value="Hà Nội">
                          {getLocationLabel('Hà Nội', lang)}
                        </option>
                        <option value="Bình Dương">
                          {getLocationLabel('Bình Dương', lang)}
                        </option>
                        <option value="Dubai/UAE">
                          {getLocationLabel('Dubai/UAE', lang)}
                        </option>
                        <option value="Remote">
                          {getLocationLabel('Remote', lang)}
                        </option>
                      </select>
                    </div>

                    <div className="lg:col-span-2 relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                      <select
                        value={jobIndustry}
                        onChange={(e) => setJobIndustry(e.target.value)}
                        aria-label={lang === 'vi' ? 'Ngành nghề' : 'Industry'}
                        className="w-full pl-10 pr-3 py-3 rounded-lg bg-slate-100/80 border border-slate-200/80 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white cursor-pointer"
                      >
                        <option value="all">
                          {lang === 'vi' ? 'Ngành nghề..' : 'Industry..'}
                        </option>
                        <option value="FMCG/Manufacturing">
                          {getIndustryLabel('FMCG/Manufacturing', lang)}
                        </option>
                        <option value="IT/Tech">
                          {getIndustryLabel('IT/Tech', lang)}
                        </option>
                        <option value="Finance/Banking">
                          {getIndustryLabel('Finance/Banking', lang)}
                        </option>
                        <option value="Logistics">
                          {getIndustryLabel('Logistics', lang)}
                        </option>
                        <option value="Retail/F&B">
                          {getIndustryLabel('Retail/F&B', lang)}
                        </option>
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <button
                        type="submit"
                        className="w-full h-full min-h-[46px] bg-brandRed hover:bg-brandRedDark text-white font-bold px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-center whitespace-nowrap cursor-pointer"
                      >
                        {lang === 'vi' ? 'Tìm kiếm ngay' : 'Search now'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Home Section Heading */}
              {activePage === 'home' && (
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-brandRed">
                      {lang === 'vi'
                        ? 'Cổng thông tin việc làm'
                        : 'Headhunt Job Portal'}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 text-balance">
                      {t('jobs_title')}
                    </h2>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPostJobOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('btn_post_job')}</span>
                    </button>
                  )}
                </div>
              )}

              {/* List Jobs + Sort */}
              <div>
                <div>
                  <div
                    id="jobs-list"
                    className="flex flex-wrap items-center justify-between gap-3 mb-5"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                        {lang === 'vi'
                          ? `Danh sách việc làm (${filteredJobs.length})`
                          : `List jobs (${filteredJobs.length})`}
                      </h2>
                      {hasActiveJobFilters && (
                        <button
                          type="button"
                          onClick={resetJobFilters}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brandRed hover:text-brandRedDark cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{lang === 'vi' ? 'Đặt lại' : 'Reset'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-700">
                        {lang === 'vi' ? 'Sắp xếp' : 'Sort by'}
                      </span>
                      <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setJobSort('relevant')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            jobSort === 'relevant'
                              ? 'bg-white text-slate-900 font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {lang === 'vi'
                            ? 'Phù hợp nhất'
                            : 'Most relevant jobs'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setJobSort('latest')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            jobSort === 'latest'
                              ? 'bg-white text-slate-900 font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {lang === 'vi'
                            ? 'Cập nhật mới nhất'
                            : 'Last updated jobs'}
                        </button>
                      </div>

                      {isAdmin && activePage === 'jobs' && (
                        <button
                          type="button"
                          onClick={() => setPostJobOpen(true)}
                          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('btn_post_job')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredJobs.length === 0 ? (
                    <div className="text-center py-12 px-6 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                      {jobs.length === 0 ? (
                        <div className="max-w-md mx-auto space-y-4">
                          <p className="text-slate-700 font-semibold">
                            {isAdmin
                              ? lang === 'vi'
                                ? 'Chưa có tin tuyển dụng nào. Hãy đăng vị trí đầu tiên của bạn.'
                                : 'No job openings yet. Post your first job opening.'
                              : lang === 'vi'
                              ? 'Hiện chưa có vị trí tuyển dụng đang mở. Vui lòng quay lại sau hoặc gửi hồ sơ trực tiếp cho đội ngũ tư vấn.'
                              : 'No open positions at the moment. Please check back later or submit your CV directly.'}
                          </p>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setPostJobOpen(true)}
                              className="inline-flex items-center gap-2 bg-brandRed hover:bg-brandRedDark text-white font-bold px-5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>{t('btn_post_job')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setQuickUploadOpen(true)}
                              className="inline-flex items-center gap-2 bg-brandBlue hover:bg-brandBlueDark text-white font-bold px-5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <FileUp className="w-4 h-4" />
                              <span>{t('nav_submit_cv')}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <p>
                            {lang === 'vi'
                              ? 'Không tìm thấy vị trí tuyển dụng phù hợp với bộ lọc hiện tại.'
                              : 'No open positions match your current filter.'}
                          </p>
                          {hasActiveJobFilters && (
                            <button
                              type="button"
                              onClick={resetJobFilters}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brandRed hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>
                                {lang === 'vi'
                                  ? 'Hiển thị tất cả vị trí'
                                  : 'Show all positions'}
                              </span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(activePage === 'home'
                        ? filteredJobs.slice(0, 4)
                        : filteredJobs
                      ).map((job) => {
                        const locJob = getJobLocalized(job, lang);
                        return (
                          <article
                            key={job.id}
                            onClick={() => setActiveJob(job)}
                            className="group bg-white rounded-xl border border-slate-200 hover:border-brandBlue/60 hover:shadow-xs transition-all p-5 sm:p-6 cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-base sm:text-[17px] font-extrabold text-slate-900 group-hover:text-brandBlue transition-colors leading-snug">
                                <span>{locJob.title}</span>
                                {job.hot && (
                                  <span className="ml-2 text-xs font-bold text-brandRed">
                                    ({lang === 'vi' ? 'Tuyển gấp' : 'New'})
                                  </span>
                                )}
                              </h3>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteJob(job.id);
                                  }}
                                  title={
                                    lang === 'vi'
                                      ? 'Xóa tin tuyển dụng'
                                      : 'Delete job posting'
                                  }
                                  aria-label={
                                    lang === 'vi'
                                      ? 'Xóa tin tuyển dụng'
                                      : 'Delete job posting'
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-brandRed hover:bg-brandRed hover:text-white transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{lang === 'vi' ? 'Xóa' : 'Delete'}</span>
                                </button>
                              )}
                            </div>

                            <div className="mt-3 space-y-2 text-[13px] text-slate-600">
                              <div className="flex items-start gap-2.5">
                                <Banknote className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slate-700 mr-1.5">
                                    {lang === 'vi' ? 'Mức lương:' : 'Salary:'}
                                  </span>
                                  <span className="tabular-nums text-slate-600">
                                    {locJob.salary}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slate-700 mr-1.5">
                                    {lang === 'vi' ? 'Địa điểm:' : 'Location:'}
                                  </span>
                                  <span>{locJob.location}</span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <Briefcase className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slate-700 mr-1.5">
                                    {lang === 'vi' ? 'Ngành nghề:' : 'Industry:'}
                                  </span>
                                  <span>
                                    {locJob.industry}, {locJob.level}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-slate-700 mr-1.5">
                                    {lang === 'vi' ? 'Cập nhật:' : 'Update:'}
                                  </span>
                                  <span>{locJob.posted}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {activePage === 'home' && (
                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => navigateTo('jobs')}
                        className="inline-flex items-center gap-2 bg-brandBlue hover:bg-brandBlueDark text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer"
                      >
                        <span>
                          {lang === 'vi'
                            ? `Xem tất cả ${jobs.length} cơ hội nghề nghiệp`
                            : `View all ${jobs.length} job opportunities`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {activePage === 'jobs' && (
                <div className="mt-12 bg-brandLight rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {lang === 'vi'
                        ? 'Chưa tìm thấy vị trí phù hợp ngay lúc này?'
                        : 'Haven’t found the exact fit yet?'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {lang === 'vi'
                        ? 'Gửi CV vào kho nhân tài hơn 70.000 ứng viên để chuyên viên CareerToday chủ động kết nối cơ hội phù hợp.'
                        : 'Submit your CV to our 70,000+ talent network so CareerToday consultants can match you with exclusive roles.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickUploadOpen(true)}
                    className="bg-brandRed hover:bg-brandRedDark text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-2"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>{t('nav_submit_cv')}</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================== 5. ABOUT US (HOME OVERVIEW & DEDICATED ABOUT PAGE) ==================== */}
        {(activePage === 'home' || activePage === 'about') && (
          <section id="about" className="border-t border-slate-100">
            {/* Band A: Who we are? (Left Copy from Matchupfast adapted to CareerToday | Right Team Photo) */}
            <div className="py-16 lg:py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  <div className="lg:col-span-6 space-y-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
                      {t('who_title')}
                    </h2>
                    <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                      {t('who_p1')}
                    </p>
                    <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                      {t('who_p2')}
                    </p>
                    <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                      {t('who_p3')}
                    </p>
                    {activePage === 'home' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => navigateTo('about')}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-brandBlue hover:text-brandRed transition-colors cursor-pointer"
                        >
                          <span>
                            {lang === 'vi'
                              ? 'Tìm hiểu Tầm nhìn, Sứ mệnh & Giá trị cốt lõi'
                              : 'Explore Vision, Mission & Core Values'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-6 rounded-2xl overflow-hidden bg-slate-100 aspect-[16/10] shadow-sm">
                    {!aboutImgError ? (
                      <img
                        src={ABOUT_TEAM_IMAGE}
                        alt="CareerToday Team"
                        referrerPolicy="no-referrer"
                        onError={() => setAboutImgError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brandBlue to-brandBlueDark flex items-center justify-center p-8 text-white font-heading font-bold text-xl text-center">
                        CareerToday Group
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Band B: CareerToday in Numbers (HR1 Blush Tint + 4 White Cards with Bold Crimson Metrics) */}
            <div className="py-14 lg:py-18 bg-[#FFF6F6]">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-10 text-balance">
                  {t('numbers_title')}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                  {[
                    { value: '70 K+', label: t('num_1_lbl') },
                    { value: '30+', label: t('num_2_lbl') },
                    { value: '100%', label: t('num_3_lbl') },
                    { value: '20 +', label: t('num_4_lbl') },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white rounded-2xl py-8 px-5 text-center shadow-[0_6px_24px_rgba(15,23,42,0.06)]"
                    >
                      <div className="text-3xl sm:text-4xl font-extrabold text-[#B81D24] font-heading tabular-nums">
                        {stat.value}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 mt-2.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Band C, D, E: Vision, Mission & Core Values (Dedicated About Page + Home Vision/Mission) */}
            {activePage === 'about' && (
              <>
                {/* Band C: Our vision (HR1 Split: Left Visual | Right Text) */}
                <div className="py-16 lg:py-20 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                      <div className="lg:col-span-6 rounded-2xl overflow-hidden bg-slate-900 aspect-[16/10] shadow-sm">
                        {!visionImgError ? (
                          <img
                            src={VISION_IMAGE}
                            alt={t('vision_label')}
                            referrerPolicy="no-referrer"
                            onError={() => setVisionImgError(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-brandBlueDark flex items-center justify-center p-8 text-white font-heading font-bold text-xl text-center">
                            {t('vision_label')}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-6 space-y-3.5">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
                          {t('vision_label')}
                        </h2>
                        <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                          <strong className="text-slate-900">
                            {t('vision_brand_lead')}
                          </strong>{' '}
                          {t('vision_text')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Band D: Our mission (HR1 Blush Tint Split: Left Text | Right Puzzle Visual) */}
                <div className="py-16 lg:py-20 bg-[#FFF6F6]">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                      <div className="lg:col-span-6 space-y-3.5 order-2 lg:order-1">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
                          {t('mission_label')}
                        </h2>
                        <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                          {t('mission_text')}
                        </p>
                      </div>

                      <div className="lg:col-span-6 rounded-2xl overflow-hidden bg-white aspect-[16/10] shadow-sm order-1 lg:order-2">
                        {!missionImgError ? (
                          <img
                            src={MISSION_IMAGE}
                            alt={t('mission_label')}
                            referrerPolicy="no-referrer"
                            onError={() => setMissionImgError(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brandRed to-brandRedDark flex items-center justify-center p-8 text-white font-heading font-bold text-xl text-center">
                            {t('mission_label')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Band E: CareerToday Core Values */}
                <div className="py-14 lg:py-16 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 rounded-2xl bg-brandLight border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-brandBlue">
                            {lang === 'vi'
                              ? '01 · Giá trị cốt lõi'
                              : '01 · Core Value'}
                          </span>
                          <HeartHandshake className="w-5 h-5 text-brandBlue" />
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                          {lang === 'vi'
                            ? 'Trải nghiệm khách hàng khác biệt'
                            : 'Unique Customer Experience'}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{t('cv_1')}</p>
                      </div>

                      <div className="p-6 rounded-2xl bg-brandLight border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-brandRed">
                            {lang === 'vi'
                              ? '02 · Giá trị cốt lõi'
                              : '02 · Core Value'}
                          </span>
                          <ShieldCheck className="w-5 h-5 text-brandRed" />
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                          {lang === 'vi' ? 'Trung thực & Cam kết' : 'Honest'}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{t('cv_2')}</p>
                      </div>

                      <div className="p-6 rounded-2xl bg-brandLight border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-brandBlue">
                            {lang === 'vi'
                              ? '03 · Giá trị cốt lõi'
                              : '03 · Core Value'}
                          </span>
                          <Lightbulb className="w-5 h-5 text-brandBlue" />
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                          {lang === 'vi'
                            ? 'Học hỏi & Đổi mới không ngừng'
                            : 'Learn and Constantly Innovate'}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{t('cv_3')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ==================== 6. NEWS & HR INSIGHTS (BLOG PAGE & HOME PREVIEW) ==================== */}
        {(activePage === 'home' || activePage === 'news') && (
          <section id="news" className="py-16 lg:py-24 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-brandBlue">
                    {lang === 'vi' ? 'Góc nhìn & Chia sẻ' : 'Blog'}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 text-balance">
                    {t('news_title')}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {activePage === 'home' && (
                    <button
                      type="button"
                      onClick={() => navigateTo('news')}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-brandBlue hover:text-brandRed transition-colors cursor-pointer"
                    >
                      <span>
                        {lang === 'vi' ? 'Xem tất cả bài viết' : 'View all posts'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPostNewsOpen(true)}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <PenSquare className="w-4 h-4" />
                      <span>{t('btn_post_news')}</span>
                    </button>
                  )}
                </div>
              </div>

              {activePage === 'news' && (
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <button
                    type="button"
                    onClick={() => setNewsCategory('all')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      newsCategory === 'all'
                        ? 'bg-brandBlue text-white'
                        : 'bg-brandLight text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'vi' ? 'Tất cả chuyên mục' : 'All Categories'}
                  </button>
                  {newsCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewsCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        newsCategory === cat
                          ? 'bg-brandBlue text-white'
                          : 'bg-brandLight text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {getNewsCategoryLabel(cat, lang)}
                    </button>
                  ))}
                </div>
              )}

              {(() => {
                const visibleNews =
                  activePage === 'home' ? news.slice(0, 3) : filteredNews;
                if (visibleNews.length === 0) {
                  return (
                    <div className="text-center py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-sm">
                      <div className="max-w-md mx-auto space-y-4">
                        <p className="font-semibold text-slate-700">
                          {isAdmin
                            ? lang === 'vi'
                              ? 'Chưa có bài viết nào trên Blog. Hãy đăng bài viết đầu tiên của bạn.'
                              : 'No blog articles yet. Publish your first post.'
                            : lang === 'vi'
                            ? 'Hiện chưa có bài viết mới trên Blog. Vui lòng quay lại sau.'
                            : 'No blog articles published yet. Please check back later.'}
                        </p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setPostNewsOpen(true)}
                            className="inline-flex items-center gap-2 bg-brandRed hover:bg-brandRedDark text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <PenSquare className="w-4 h-4" />
                            <span>{t('btn_post_news')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {visibleNews.map((art) => {
                      const locArt = getNewsLocalized(art, lang);
                      return (
                        <article
                          key={art.id}
                          className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-brandBlue transition-colors flex flex-col justify-between"
                        >
                          <div>
                            <div
                              onClick={() => setActiveArticle(art)}
                              className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer"
                            >
                              {!brokenNewsImgs[art.id] ? (
                                <img
                                  src={art.img}
                                  alt={locArt.title}
                                  referrerPolicy="no-referrer"
                                  onError={() =>
                                    setBrokenNewsImgs((prev) => ({
                                      ...prev,
                                      [art.id]: true,
                                    }))
                                  }
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4 text-center text-xs font-bold text-brandBlue">
                                  {locArt.title}
                                </div>
                              )}
                            </div>

                            <div className="p-6">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                                <span className="text-brandBlue font-bold">
                                  {locArt.category}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{art.date}</span>
                              </div>

                              <h3
                                onClick={() => setActiveArticle(art)}
                                className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug mb-2.5 hover:text-brandBlue cursor-pointer transition-colors"
                              >
                                {locArt.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                                {locArt.summary}
                              </p>
                            </div>
                          </div>

                          <div className="px-6 pb-6 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveArticle(art)}
                              className="text-xs font-extrabold text-brandRed hover:text-brandRedDark inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>
                                {lang === 'vi'
                                  ? 'Đọc chi tiết bài viết'
                                  : 'Read full article'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteArticle(art.id);
                                }}
                                title={
                                  lang === 'vi'
                                    ? 'Xóa bài viết'
                                    : 'Delete article'
                                }
                                aria-label={
                                  lang === 'vi'
                                    ? 'Xóa bài viết'
                                    : 'Delete article'
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-brandRed hover:bg-brandRed hover:text-white transition-colors shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === 'vi' ? 'Xóa' : 'Delete'}</span>
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* ==================== 7. HOME CTA BANNER TO CONTACT PAGE ==================== */}
        {activePage === 'home' && (
          <section className="py-16 bg-brandLight border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-brandBlueDark rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2.5 max-w-2xl">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-red-400">
                    {lang === 'vi'
                      ? 'Cổng kết nối Doanh nghiệp & Liên hệ'
                      : 'B2B Client Portal & Contact'}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-balance">
                    {t('jo_title')}
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t('jo_desc')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo('contact', { scrollToId: 'job-order-form' })
                    }
                    className="bg-brandRed hover:bg-brandRedDark text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('jo_submit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('contact')}
                    className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-6 py-3.5 rounded-xl text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {t('nav_contact')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== 8. DEDICATED CONTACT & JOB ORDER PAGE ==================== */}
        {activePage === 'contact' && (
          <section
            id="contact"
            className="py-16 lg:py-24 bg-brandLight border-t border-slate-100"
          >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* B2B Job Order Portal */}
            <div
              id="job-order-form"
              className="bg-gradient-to-br from-slate-900 via-slate-900 to-brandBlueDark rounded-3xl p-6 sm:p-10 text-white shadow-xl"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-red-400">
                    {lang === 'vi'
                      ? 'Cổng kết nối Doanh nghiệp'
                      : 'B2B Client Portal'}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-balance">
                    {t('jo_title')}
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t('jo_desc')}
                  </p>
                  <ul className="space-y-2.5 pt-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-brandRed shrink-0" />
                      <span>
                        {lang === 'vi'
                          ? 'Bảo mật tuyệt đối thông tin tuyển dụng của doanh nghiệp'
                          : 'Strict confidentiality for executive & strategic searches'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-brandRed shrink-0" />
                      <span>
                        {lang === 'vi'
                          ? 'Gửi danh sách ứng viên tiềm năng đã qua phỏng vấn đánh giá chuyên sâu'
                          : 'Curated shortlist vetted via structured competency interviews'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-brandRed shrink-0" />
                      <span>
                        {lang === 'vi'
                          ? 'Chính sách bảo hành nhân sự minh bạch'
                          : 'Transparent Guarantee Placement replacement policy'}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-lg">
                  {joError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-brandRed">
                      {joError}
                    </div>
                  )}

                  <form onSubmit={handleJobOrderSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('jo_company')}
                        </label>
                        <input
                          type="text"
                          required
                          value={joCompany}
                          onChange={(e) => setJoCompany(e.target.value)}
                          placeholder={
                            lang === 'vi'
                              ? 'Công ty TNHH / Tập đoàn...'
                              : 'Company / Corporation name...'
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('jo_person')}
                        </label>
                        <input
                          type="text"
                          required
                          value={joPerson}
                          onChange={(e) => setJoPerson(e.target.value)}
                          placeholder={
                            lang === 'vi'
                              ? 'VD: Trần Minh Anh - Trưởng phòng Nhân sự'
                              : 'e.g. Anna Tran - HR Manager'
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'vi'
                            ? 'Email doanh nghiệp *'
                            : 'Corporate Email *'}
                        </label>
                        <input
                          type="email"
                          required
                          value={joEmail}
                          onChange={(e) => setJoEmail(e.target.value)}
                          placeholder={
                            lang === 'vi'
                              ? 'nhansu@congty.com'
                              : 'hr@company.com'
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('jo_phone')}
                        </label>
                        <input
                          type="tel"
                          required
                          value={joPhone}
                          onChange={(e) => setJoPhone(e.target.value)}
                          placeholder={
                            lang === 'vi' ? '0909 xxx xxx' : '+84 909 xxx xxx'
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('jo_service')}
                        </label>
                        <select
                          value={joService}
                          onChange={(e) => setJoService(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        >
                          {serviceMenuItems.map((s) => (
                            <option key={s.id} value={s.id}>
                              {lang === 'vi' ? s.titleVi : s.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('jo_pos')}
                        </label>
                        <input
                          type="text"
                          required
                          value={joPos}
                          onChange={(e) => setJoPos(e.target.value)}
                          placeholder={
                            lang === 'vi'
                              ? 'VD: 01 Giám đốc Kinh doanh, 02 Trưởng nhóm Kỹ thuật'
                              : 'e.g. 01 Head of Sales, 02 Tech Leads'
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('jo_notes')}
                      </label>
                      <textarea
                        rows={3}
                        value={joNotes}
                        onChange={(e) => setJoNotes(e.target.value)}
                        placeholder={
                          lang === 'vi'
                            ? 'Mô tả thêm yêu cầu của doanh nghiệp...'
                            : 'Share role details, salary range, or timeline...'
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-brandRed hover:bg-brandRedDark text-white font-extrabold py-3.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{t('jo_submit')}</span>
                    </button>
                  </form>

                  {joMailtoUrl && (
                    <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {lang === 'vi'
                          ? 'Đã tạo yêu cầu tuyển dụng! Nhấn nút bên cạnh để gửi qua Email nếu cần:'
                          : 'Job Order prepared! Click to open in your email client if needed:'}
                      </span>
                    </span>
                    <a
                      href={joMailtoUrl}
                      className="shrink-0 bg-brandBlue text-white font-bold px-3 py-1.5 rounded-lg hover:bg-brandBlueDark transition-colors whitespace-nowrap"
                    >
                      {lang === 'vi' ? 'Gửi Email ngay' : 'Open Email'}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Office Info & Google Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {t('contact_title')}
                  </h3>
                  <p className="text-xs font-bold text-brandRed uppercase tracking-wider mt-0.5">
                    {lang === 'vi'
                      ? 'CÔNG TY TNHH CAREERTODAY'
                      : 'CAREERTODAY COMPANY LIMITED'}
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-brandRed flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {t('lbl_addr')}
                      </div>
                      <p className="text-slate-600">
                        {lang === 'vi'
                          ? 'Tầng 17, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, P. Sài Gòn, TP.HCM'
                          : 'Level 17, Vincom Center, 72 Le Thanh Ton St., Saigon Ward, Ho Chi Minh City'}
                      </p>
                      <a
                        href="https://www.google.com/maps?q=10.77828,106.701912"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brandBlue hover:underline mt-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'vi'
                            ? 'Mở Google Maps (10.77828, 106.701912)'
                            : 'Open Google Maps (10.77828, 106.701912)'}
                        </span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-brandBlue flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 mr-2">
                        {lang === 'vi' ? 'Đường dây nóng:' : 'Hotline:'}
                      </span>
                      <a
                        href="tel:+84877699759"
                        className="text-brandBlue font-extrabold hover:underline tabular-nums"
                      >
                        +84 877 699 759
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-brandRed flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 mr-2">
                        Email:
                      </span>
                      <a
                        href="mailto:hr@careertoday.com.vn"
                        className="text-slate-700 font-semibold hover:text-brandRed transition-colors"
                      >
                        hr@careertoday.com.vn
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-brandBlue flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 mr-2">
                        {lang === 'vi' ? 'Trang web:' : 'Website:'}
                      </span>
                      <a
                        href="https://careertoday.com.vn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brandBlue font-semibold hover:underline"
                      >
                        https://careertoday.com.vn
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  {t('lbl_platforms')}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="https://www.facebook.com/CareerTodayVn?locale=vi_VN"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <span>{lang === 'vi' ? 'Trang Facebook' : 'Facebook Page'}</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/career-today/home/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A66C2] text-white text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href="https://www.tiktok.com/@careertodayy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <span>TikTok</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 min-h-[360px] bg-white">
              <iframe
                title="Google Maps CareerToday Vincom Center 72 Le Thanh Ton"
                src={`https://maps.google.com/maps?q=10.77828,106.701912&hl=${lang}&z=17&output=embed`}
                className="w-full h-full min-h-[360px] border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
      )}
    </main>

    {/* ==================== HR1-STYLE MULTI-COLUMN CORPORATE FOOTER ==================== */}
    <footer className="bg-slate-950 text-slate-400 py-14 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          <div className="md:col-span-4 space-y-4">
            <CareerLogo variant="footer" />
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'vi'
                ? 'Công ty TNHH CareerToday. Tư vấn tuyển dụng nhân sự cấp cao & Giải pháp nhân lực chuyên sâu.'
                : 'CAREERTODAY COMPANY LIMITED. Executive Search & Comprehensive Human Capital Solutions.'}
            </p>
            <div className="text-xs space-y-1.5">
              <p className="flex items-center gap-2 tabular-nums text-slate-300">
                <Phone className="w-3.5 h-3.5 text-brandRed shrink-0" />
                <span>+84 877 699 759</span>
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-brandBlue shrink-0" />
                <span>hr@careertoday.com.vn</span>
              </p>
            </div>
          </div>

          <div className="md:col-span-2 text-xs space-y-2.5">
            <div className="text-white font-bold uppercase tracking-wider">
              {lang === 'vi' ? 'Về chúng tôi' : 'About Us'}
            </div>
            <ul className="space-y-2">
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('about');
                  }}
                  className="hover:text-white transition-colors"
                >
                  {lang === 'vi' ? 'Tổng quan & Tầm nhìn' : 'Overview & Vision'}
                </a>
              </li>
              <li>
                <a
                  href="#news"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('news');
                  }}
                  className="hover:text-white transition-colors"
                >
                  {t('nav_news')}
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('contact');
                  }}
                  className="hover:text-white transition-colors"
                >
                  {t('nav_contact')}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 text-xs space-y-2.5">
            <div className="text-white font-bold uppercase tracking-wider">
              {lang === 'vi' ? 'Nhà Tuyển Dụng' : 'For Employers'}
            </div>
            <ul className="space-y-2">
              {serviceMenuItems.map((srv) => (
                <li key={srv.id}>
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('contact', {
                        serviceOrder: srv.id,
                        scrollToId: 'job-order-form',
                      });
                    }}
                    className="hover:text-white transition-colors"
                  >
                    {lang === 'vi' ? srv.titleVi : srv.titleEn}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 text-xs space-y-2.5">
            <div className="text-white font-bold uppercase tracking-wider">
              {lang === 'vi' ? 'Người Tìm Việc' : 'For Job Seekers'}
            </div>
            <ul className="space-y-2">
              <li>
                <a
                  href="#jobs"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('jobs', { jobTab: 'all' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  {t('nav_jobs')}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setQuickUploadOpen(true)}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  {t('nav_submit_cv')}
                </button>
              </li>
              <li>
                <a
                  href="#jobs"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('jobs', { jobTab: 'hot' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  {t('jobs_tab_hot')}
                </a>
              </li>
              <li>
                <a
                  href="#news"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('news');
                  }}
                  className="hover:text-white transition-colors"
                >
                  {lang === 'vi' ? 'Bí quyết phỏng vấn' : 'Interview Tips'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs gap-3">
          <p>
            {lang === 'vi'
              ? '© 2026 Công ty TNHH CareerToday. Bảo lưu mọi quyền.'
              : '© 2026 CAREERTODAY COMPANY LIMITED. All rights reserved.'}
          </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/CareerTodayVn?locale=vi_VN"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://www.linkedin.com/company/career-today/home/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="https://www.tiktok.com/@careertodayy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                TikTok
              </a>
              <span aria-hidden="true" className="text-slate-700">
                |
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Đăng xuất Admin' : 'Admin Sign Out'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAdminLogin}
                  disabled={adminSigningIn}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Quản trị viên' : 'Admin'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== FLOATING QUICK-ACTION BUTTONS ==================== */}
      <div className="fixed bottom-5 right-5 z-40 hidden sm:flex flex-col items-end gap-2.5">
        <a
          href="https://www.facebook.com/CareerTodayVn?locale=vi_VN"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#1877F2] hover:bg-blue-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-transform hover:scale-105 text-xs font-bold whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Chat nhanh' : 'Quick Chat'}</span>
        </a>
        <a
          href="tel:+84877699759"
          className="flex items-center gap-2 bg-brandRed hover:bg-brandRedDark text-white px-4 py-3 rounded-full shadow-lg transition-transform hover:scale-105 text-xs font-extrabold whitespace-nowrap tabular-nums"
        >
          <Phone className="w-4 h-4" />
          <span>+84 877 699 759</span>
        </a>
      </div>

      {/* ==================== MODALS ==================== */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        jobs={jobs}
        news={news}
        lang={lang}
        onSelectJob={(job) => setActiveJob(job)}
        onSelectNews={(article) => setActiveArticle(article)}
      />

      <QuickUploadModal
        isOpen={quickUploadOpen}
        onClose={() => setQuickUploadOpen(false)}
        lang={lang}
        onNotify={showToast}
      />

      <JobDetailModal
        job={activeJob}
        onClose={() => setActiveJob(null)}
        lang={lang}
        onNotify={showToast}
        onDeleteJob={isAdmin ? handleDeleteJob : undefined}
      />

      <PostJobModal
        isOpen={isAdmin && postJobOpen}
        onClose={() => setPostJobOpen(false)}
        lang={lang}
        onAddJob={handleAddJob}
      />

      <NewsDetailModal
        article={activeArticle}
        lang={lang}
        onClose={() => setActiveArticle(null)}
        onDeleteArticle={isAdmin ? handleDeleteArticle : undefined}
      />

      <PostNewsModal
        isOpen={isAdmin && postNewsOpen}
        onClose={() => setPostNewsOpen(false)}
        lang={lang}
        onAddArticle={handleAddArticle}
      />

      <ManageAdminsModal
        isOpen={isAdmin && manageAdminsOpen}
        onClose={() => setManageAdminsOpen(false)}
        lang={lang}
        admins={admins}
        currentUserEmail={adminUser?.email ?? ''}
        onAddAdmin={handleAddCoAdmin}
        onRemoveAdmin={handleRemoveCoAdmin}
      />

      <AdminLoginModal
        isOpen={!isAdmin && adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        lang={lang}
        signingIn={adminSigningIn}
        onSignIn={handleAdminLogin}
      />

      {/* ==================== TOAST NOTIFICATIONS ==================== */}
      <div className="fixed top-24 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 pointer-events-auto"
          >
            <CheckCircle2 className="w-4 h-4 text-brandRed shrink-0" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
