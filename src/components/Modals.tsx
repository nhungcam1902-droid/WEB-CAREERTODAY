import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Search,
  Send,
  ShieldCheck,
  Strikethrough,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  getIndustryLabel,
  getJobLocalized,
  getLevelLabel,
  getLocationLabel,
  getNewsCategoryLabel,
  getNewsLocalized,
  JobItem,
  Lang,
  NewsItem,
} from '../data/careerData';
import { AdminEntry } from '../firebase';

const ALLOWED_RICHTEXT_TAGS = new Set([
  'P',
  'DIV',
  'BR',
  'H2',
  'H3',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'UL',
  'OL',
  'LI',
  'IMG',
]);

function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/src/') ||
    trimmed.startsWith('/assets/') ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  );
}

function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml.trim()) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<[^>]*>/g, '');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
      return null;
    }

    if (!ALLOWED_RICHTEXT_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      el.childNodes.forEach((child) => {
        const cleanChild = sanitizeNode(child);
        if (cleanChild) frag.appendChild(cleanChild);
      });
      return frag;
    }

    if (tag === 'IMG') {
      const src = el.getAttribute('src') ?? '';
      if (!isSafeImageSrc(src)) return null;
      const cleanImg = document.createElement('img');
      cleanImg.setAttribute('src', src);
      const alt = (el.getAttribute('alt') ?? '').slice(0, 140);
      if (alt) cleanImg.setAttribute('alt', alt);
      return cleanImg;
    }

    const cleanEl = document.createElement(tag.toLowerCase());
    el.childNodes.forEach((child) => {
      const cleanChild = sanitizeNode(child);
      if (cleanChild) cleanEl.appendChild(cleanChild);
    });
    return cleanEl;
  };

  const container = document.createElement('div');
  doc.body.childNodes.forEach((child) => {
    const cleanChild = sanitizeNode(child);
    if (cleanChild) container.appendChild(cleanChild);
  });
  return container.innerHTML;
}

function stripHtmlToPlainText(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function compressImageFileToDataUrl(
  file: File,
  maxWidth: number,
  maxCharLength: number
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = rawDataUrl;
  });

  let width = img.naturalWidth || maxWidth;
  let height = img.naturalHeight || maxWidth;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('CANVAS_UNAVAILABLE');
  }

  let currentWidth = width;
  let currentHeight = height;
  for (let pass = 0; pass < 4; pass++) {
    canvas.width = Math.max(1, currentWidth);
    canvas.height = Math.max(1, currentHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const qualities = [0.8, 0.65, 0.5];
    for (const q of qualities) {
      const output = canvas.toDataURL('image/jpeg', q);
      if (output.length <= maxCharLength) {
        return output;
      }
    }
    currentWidth = Math.round(currentWidth * 0.72);
    currentHeight = Math.round(currentHeight * 0.72);
  }

  throw new Error('IMAGE_TOO_LARGE');
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobItem[];
  news: NewsItem[];
  lang: Lang;
  onSelectJob: (job: JobItem) => void;
  onSelectNews: (article: NewsItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  jobs,
  news,
  lang,
  onSelectJob,
  onSelectNews,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const matchedJobs = q
    ? jobs.filter((j) => {
        const locJob = getJobLocalized(j, lang);
        return (
          j.title.toLowerCase().includes(q) ||
          (j.titleEn && j.titleEn.toLowerCase().includes(q)) ||
          locJob.location.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          locJob.industry.toLowerCase().includes(q) ||
          j.industry.toLowerCase().includes(q)
        );
      })
    : [];
  const matchedNews = q
    ? news.filter((n) => {
        const locNews = getNewsLocalized(n, lang);
        return (
          n.title.toLowerCase().includes(q) ||
          (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
          locNews.summary.toLowerCase().includes(q) ||
          locNews.category.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'vi' ? 'Tìm kiếm nhanh' : 'Quick Search'}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-brandBlue shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'vi'
                ? 'Tìm kiếm việc làm, dịch vụ, bài viết...'
                : 'Search jobs, services, insights...'
            }
            className="w-full text-sm sm:text-base focus:outline-none text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2 text-sm">
          {!q && (
            <p className="text-xs text-slate-400 text-center py-6">
              {lang === 'vi'
                ? 'Nhập từ khóa để tìm kiếm nhanh trong Việc làm và Blog...'
                : 'Enter keywords to search across Jobs and Blog...'}
            </p>
          )}

          {q && matchedJobs.length === 0 && matchedNews.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">
              {lang === 'vi'
                ? `Không tìm thấy kết quả phù hợp cho "${query}".`
                : `No results found for "${query}".`}
            </p>
          )}

          {matchedJobs.map((j) => {
            const locJob = getJobLocalized(j, lang);
            return (
              <button
                key={`job-${j.id}`}
                type="button"
                onClick={() => {
                  onClose();
                  onSelectJob(j);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-blue-50/70 border border-slate-100 cursor-pointer flex items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brandRed">
                    {lang === 'vi' ? 'Việc làm' : 'Job'} · {locJob.industry}
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {locJob.title}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {locJob.location} · {locJob.salary}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}

          {matchedNews.map((n) => {
            const locNews = getNewsLocalized(n, lang);
            return (
              <button
                key={`news-${n.id}`}
                type="button"
                onClick={() => {
                  onClose();
                  onSelectNews(n);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-blue-50/70 border border-slate-100 cursor-pointer flex items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brandBlue">
                    {lang === 'vi' ? 'Blog' : 'Blog'} · {locNews.category}
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {locNews.title}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  onNotify: (msg: string) => void;
}

export const QuickUploadModal: React.FC<QuickUploadModalProps> = ({
  isOpen,
  onClose,
  lang,
  onNotify,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('IT/Tech');
  const [position, setPosition] = useState('');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mailtoHref, setMailtoHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setMailtoHref(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneDigits = phone.replace(/\D/g, '');
    if (!emailOk) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập địa chỉ email hợp lệ.'
          : 'Please enter a valid email address.'
      );
      return;
    }
    if (phoneDigits.length < 8) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập số điện thoại hợp lệ.'
          : 'Please enter a valid phone number.'
      );
      return;
    }

    const localizedIndustry = getIndustryLabel(industry, lang);
    const subject = encodeURIComponent(
      lang === 'vi'
        ? `[Gửi Hồ Sơ] ${position.trim() || localizedIndustry} - ${name.trim()}`
        : `[Submit CV] ${position.trim() || localizedIndustry} - ${name.trim()}`
    );
    const body = encodeURIComponent(
      lang === 'vi'
        ? `Kính gửi Bộ phận Tuyển dụng CareerToday,\n\n` +
            `Tôi xin gửi hồ sơ ứng viên vào kho nhân tài CareerToday (>70.000 hồ sơ):\n` +
            `- Họ và tên: ${name.trim()}\n` +
            `- Số điện thoại: ${phone.trim()}\n` +
            `- Email: ${email.trim()}\n` +
            `- Ngành nghề: ${localizedIndustry}\n` +
            `- Vị trí mong muốn: ${position.trim() || 'Theo tư vấn phù hợp'}\n` +
            `- Tệp hồ sơ: ${fileName || 'Ho_So_Ung_Vien.pdf'}\n\n` +
            `Trân trọng!`
        : `Dear CareerToday Recruitment Team,\n\n` +
            `Please find my candidate profile for the CareerToday talent network (70,000+ profiles):\n` +
            `- Full Name: ${name.trim()}\n` +
            `- Phone: ${phone.trim()}\n` +
            `- Email: ${email.trim()}\n` +
            `- Industry: ${localizedIndustry}\n` +
            `- Target Position: ${position.trim() || 'Open to suitable advisory'}\n` +
            `- Attached CV: ${fileName || 'Candidate_CV.pdf'}\n\n` +
            `Best regards!`
    );

    const href = `mailto:hr@careertoday.com.vn?subject=${subject}&body=${body}`;
    setMailtoHref(href);
    onNotify(
      lang === 'vi'
        ? 'Đã tạo hồ sơ gửi tới hr@careertoday.com.vn!'
        : 'CV submission prepared for hr@careertoday.com.vn!'
    );
    window.location.href = href;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'vi' ? 'Gửi hồ sơ ứng viên' : 'Submit Your CV'}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-brandLight">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-brandRed" />
              <span>
                {lang === 'vi' ? 'Gửi Hồ Sơ Nhanh' : 'Submit Your CV'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'vi'
                ? 'Hồ sơ được gửi trực tiếp tới chuyên viên CareerToday (hr@careertoday.com.vn)'
                : 'Sent directly to CareerToday consultants (hr@careertoday.com.vn)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-brandRed">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Họ và tên *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Nguyen'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Số điện thoại *' : 'Phone *'}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={lang === 'vi' ? '0909 xxx xxx' : '+84 909 xxx xxx'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  lang === 'vi' ? 'ungvien@email.com' : 'candidate@email.com'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Lĩnh vực chuyên môn' : 'Industry'}
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              >
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
                <option value="Pharmaceutical">
                  {getIndustryLabel('Pharmaceutical', lang)}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'vi' ? 'Vị trí mong muốn' : 'Target Position'}
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'VD: Trưởng phòng Kinh doanh / Quản lý Nhân sự'
                  : 'e.g. Sales Manager / HRBP / Tech Lead'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'vi'
                ? 'Đính kèm hồ sơ (PDF / DOCX) *'
                : 'Attach CV (PDF / DOCX) *'}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              required
              onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brandBlue file:text-white hover:file:bg-brandBlueDark cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brandRed hover:bg-brandRedDark text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {lang === 'vi' ? 'Gửi hồ sơ ngay' : 'Submit CV Now'}
            </span>
          </button>

          {mailtoHref && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lang === 'vi'
                    ? 'Đã khởi tạo email gửi hồ sơ!'
                    : 'CV email draft created!'}
                </span>
              </p>
              <p className="mt-1">
                <a href={mailtoHref} className="underline font-bold text-brandBlue">
                  {lang === 'vi'
                    ? 'Nhấn vào đây nếu trình duyệt chưa mở Email'
                    : 'Click here if your email client did not open'}
                </a>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

interface JobDetailModalProps {
  job: JobItem | null;
  onClose: () => void;
  lang: Lang;
  onNotify: (msg: string) => void;
  onDeleteJob?: (id: number) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  onClose,
  lang,
  onNotify,
  onDeleteJob,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [fileName, setFileName] = useState('');
  const [note, setNote] = useState('');
  const [mailtoHref, setMailtoHref] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMailtoHref(null);
    setErrorMsg(null);
    setName('');
    setPhone('');
    setEmail('');
    setLinkedin('');
    setFileName('');
    setNote('');
  }, [job]);

  if (!job) return null;

  const locJob = getJobLocalized(job, lang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneDigits = phone.replace(/\D/g, '');
    if (!emailOk) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập địa chỉ email hợp lệ.'
          : 'Please enter a valid email address.'
      );
      return;
    }
    if (phoneDigits.length < 8) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng nhập số điện thoại hợp lệ (ít nhất 8 chữ số).'
          : 'Please enter a valid phone number (at least 8 digits).'
      );
      return;
    }

    const attachedFile =
      fileName || (lang === 'vi' ? 'Ho_So_Ung_Vien.pdf' : 'Candidate_CV.pdf');
    const subject = encodeURIComponent(
      lang === 'vi'
        ? `[Ứng tuyển] ${locJob.title} - ${name.trim()}`
        : `[Job Application] ${locJob.title} - ${name.trim()}`
    );
    const body = encodeURIComponent(
      lang === 'vi'
        ? `Kính gửi Bộ phận Tuyển dụng CareerToday,\n\n` +
            `Tôi xin gửi hồ sơ ứng tuyển cho vị trí: ${locJob.title}\n\n` +
            `THÔNG TIN ỨNG VIÊN:\n` +
            `- Họ và tên: ${name.trim()}\n` +
            `- Số điện thoại: ${phone.trim()}\n` +
            `- Email: ${email.trim()}\n` +
            `- LinkedIn / Hồ sơ trực tuyến: ${linkedin.trim() || 'Không cung cấp'}\n` +
            `- Tệp đính kèm: ${attachedFile}\n` +
            `- Giới thiệu ngắn gọn: ${note.trim() || 'Không có ghi chú thêm'}\n\n` +
            `Trân trọng cảm ơn!`
        : `Dear CareerToday Recruitment Team,\n\n` +
            `I am applying for the position: ${locJob.title}\n\n` +
            `CANDIDATE DETAILS:\n` +
            `- Full Name: ${name.trim()}\n` +
            `- Phone: ${phone.trim()}\n` +
            `- Email: ${email.trim()}\n` +
            `- LinkedIn / Portfolio: ${linkedin.trim() || 'Not provided'}\n` +
            `- Attached CV: ${attachedFile}\n` +
            `- Cover Note: ${note.trim() || 'None'}\n\n` +
            `Best regards!`
    );

    const href = `mailto:hr@careertoday.com.vn?subject=${subject}&body=${body}`;
    setMailtoHref(href);
    onNotify(
      lang === 'vi'
        ? 'Đã khởi tạo Email gửi hồ sơ tới hr@careertoday.com.vn!'
        : 'Prepared CV application email to hr@careertoday.com.vn!'
    );
    window.location.href = href;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={locJob.title}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-start gap-4 bg-brandLight">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5">
              <span className="text-brandBlue font-bold">{locJob.industry}</span>
              <span aria-hidden="true">·</span>
              <span>{locJob.level}</span>
              <span aria-hidden="true">·</span>
              <span className="text-brandRed font-bold">{locJob.location}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 text-balance">
              {locJob.title}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-brandBlue mt-1 tabular-nums">
              {lang === 'vi' ? 'Mức lương:' : 'Compensation:'} {locJob.salary} ·{' '}
              {lang === 'vi' ? 'Cập nhật:' : 'Posted:'} {locJob.posted}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDeleteJob && (
              <button
                type="button"
                onClick={() => onDeleteJob(job.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-red-200 text-brandRed hover:bg-brandRed hover:text-white text-xs font-bold transition-colors cursor-pointer"
                aria-label={
                  lang === 'vi' ? 'Xóa tin tuyển dụng' : 'Delete job posting'
                }
              >
                <Trash2 className="w-4 h-4" />
                <span>{lang === 'vi' ? 'Xóa tin' : 'Delete'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-2">
              {lang === 'vi'
                ? 'Mô tả công việc & Yêu cầu'
                : 'Job Description & Requirements'}
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">{locJob.desc}</p>
            <p className="text-xs text-slate-500 mt-2">
              {lang === 'vi'
                ? 'Quy trình phỏng vấn đánh giá chuyên sâu bởi chuyên viên CareerToday trước khi gặp trực tiếp doanh nghiệp.'
                : 'In-depth competency assessment conducted by CareerToday consultants prior to client interviews.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h4 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-brandRed shrink-0" />
              <span>
                {lang === 'vi'
                  ? 'Ứng tuyển vị trí này'
                  : 'Apply for This Position'}
              </span>
            </h4>
            <p className="text-xs text-slate-600 mb-4">
              {lang === 'vi'
                ? 'Hồ sơ của bạn sẽ được gửi trực tiếp đến bộ phận Tuyển dụng CareerToday (hr@careertoday.com.vn).'
                : 'Your application is routed directly to CareerToday Recruitment (hr@careertoday.com.vn).'}
            </p>

            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-brandRed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'vi' ? 'Họ và tên ứng viên *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'John Nguyen'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'vi' ? 'Số điện thoại *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={
                      lang === 'vi' ? '0909 xxx xxx' : '+84 909 xxx xxx'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'vi' ? 'Email ứng viên *' : 'Candidate Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      lang === 'vi' ? 'ungvien@email.com' : 'candidate@email.com'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'vi'
                      ? 'Liên kết LinkedIn / Hồ sơ năng lực'
                      : 'LinkedIn / Portfolio URL'}
                  </label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'vi'
                    ? 'Đính kèm hồ sơ (PDF / DOCX) *'
                    : 'Attach CV File (PDF / DOCX) *'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required
                  onChange={(e) =>
                    setFileName(e.target.files?.[0]?.name || '')
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brandBlue file:text-white hover:file:bg-brandBlueDark cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'vi'
                    ? 'Giới thiệu ngắn gọn'
                    : 'Brief Cover Note'}
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    lang === 'vi'
                      ? 'Tóm tắt số năm kinh nghiệm, mức lương mong muốn...'
                      : 'Years of experience, expected compensation...'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brandRed hover:bg-brandRedDark text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {lang === 'vi'
                    ? 'Nộp hồ sơ tới hr@careertoday.com.vn'
                    : 'Submit CV to hr@careertoday.com.vn'}
                </span>
              </button>
            </form>

            {mailtoHref && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lang === 'vi'
                      ? 'Đã tạo bản nháp Email ứng tuyển!'
                      : 'Application email draft created!'}
                  </span>
                </p>
                <p className="mt-1">
                  {lang === 'vi'
                    ? 'Vui lòng đính kèm tệp hồ sơ bạn vừa chọn vào cửa sổ Email và gửi tới hr@careertoday.com.vn, hoặc '
                    : 'Please attach your selected CV file in your email client and send to hr@careertoday.com.vn, or '}
                  <a
                    href={mailtoHref}
                    className="underline font-bold text-brandBlue"
                  >
                    {lang === 'vi' ? 'nhấn vào đây để mở lại Email' : 'click here to reopen email'}
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  onAddJob: (job: JobItem) => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  isOpen,
  onClose,
  lang,
  onAddJob,
}) => {
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('IT/Tech');
  const [level, setLevel] = useState('Senior/Manager');
  const [location, setLocation] = useState('TP.HCM');
  const [salary, setSalary] = useState('');
  const [desc, setDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddJob({
      id: Date.now(),
      title: title.trim(),
      industry,
      level,
      location,
      salary: salary.trim(),
      hot: true,
      posted: lang === 'vi' ? 'Vừa đăng' : 'Just posted',
      desc: desc.trim(),
    });
    setTitle('');
    setSalary('');
    setDesc('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-brandLight">
          <h3 className="text-lg font-extrabold text-slate-900">
            {lang === 'vi'
              ? 'Đăng Tin Tuyển Dụng Mới'
              : 'Post a New Job Opening'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'vi' ? 'Chức danh tuyển dụng *' : 'Job Title *'}
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'VD: Giám đốc Tài chính / Trưởng phòng Kinh doanh'
                  : 'e.g. Finance Director / Sales Manager'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Ngành nghề *' : 'Industry *'}
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              >
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Cấp bậc *' : 'Level *'}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              >
                <option value="Senior/Manager">
                  {getLevelLabel('Senior/Manager', lang)}
                </option>
                <option value="Specialist/Engineer">
                  {getLevelLabel('Specialist/Engineer', lang)}
                </option>
                <option value="Intern/Fresher">
                  {getLevelLabel('Intern/Fresher', lang)}
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Địa điểm làm việc *' : 'Location *'}
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              >
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'vi' ? 'Mức lương *' : 'Salary Range *'}
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder={
                  lang === 'vi' ? 'VD: 2.500 - 3.500 USD' : 'e.g. $2,500 - $3,500'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'vi'
                ? 'Mô tả công việc & Yêu cầu chính *'
                : 'Job Description & Key Requirements *'}
            </label>
            <textarea
              rows={3}
              required
              maxLength={5000}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'Nhập mô tả vị trí và yêu cầu kinh nghiệm...'
                  : 'Role responsibilities and experience requirements...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brandBlue hover:bg-brandBlueDark text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
          >
            {lang === 'vi'
              ? 'Đăng tin lên Cổng việc làm ngay'
              : 'Publish Job Opening'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface NewsDetailModalProps {
  article: NewsItem | null;
  lang: Lang;
  onClose: () => void;
  onDeleteArticle?: (id: number) => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  article,
  lang,
  onClose,
  onDeleteArticle,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [article]);

  if (!article) return null;

  const locArticle = getNewsLocalized(article, lang);
  const hasHtmlMarkup = /<[a-z][\s\S]*>/i.test(locArticle.content);
  const safeRichHtml = hasHtmlMarkup ? sanitizeRichHtml(locArticle.content) : '';
  const keywordTags = (locArticle.metaKeywords || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 bg-slate-100 shrink-0">
          {!imgError ? (
            <img
              src={article.img}
              alt={locArticle.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center text-brandBlue font-heading font-bold text-sm px-6 text-center">
              {locArticle.title}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="text-brandBlue font-bold">
                {locArticle.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{article.date}</span>
            </div>
            {onDeleteArticle && (
              <button
                type="button"
                onClick={() => onDeleteArticle(article.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-brandRed hover:bg-brandRed hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                aria-label={
                  lang === 'vi' ? 'Xóa bài viết' : 'Delete article'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Xóa bài' : 'Delete'}</span>
              </button>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug text-balance">
            {locArticle.title}
          </h3>
          {hasHtmlMarkup ? (
            <div
              className="text-sm text-slate-700 leading-relaxed space-y-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-3"
              dangerouslySetInnerHTML={{ __html: safeRichHtml }}
            />
          ) : (
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              {locArticle.content.split('\n\n').map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          )}

          {keywordTags.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              {keywordTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PostNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  onAddArticle: (article: NewsItem) => void;
}

export const PostNewsModal: React.FC<PostNewsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onAddArticle,
}) => {
  const [title, setTitle] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [category, setCategory] = useState('Thị trường lao động');
  const [blockFormat, setBlockFormat] = useState('p');
  const [coverImageData, setCoverImageData] = useState('');
  const [coverFileName, setCoverFileName] = useState('');
  const [inlineFileName, setInlineFileName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const inlineImgInputRef = useRef<HTMLInputElement>(null);
  const coverImgInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setMetaTitle('');
    setMetaDescription('');
    setMetaKeywords('');
    setCategory('Thị trường lao động');
    setBlockFormat('p');
    setCoverImageData('');
    setCoverFileName('');
    setInlineFileName('');
    setFormError(null);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    if (inlineImgInputRef.current) {
      inlineImgInputRef.current.value = '';
    }
    if (coverImgInputRef.current) {
      coverImgInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const execEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
  };

  const handleBlockFormatChange = (nextTag: string) => {
    setBlockFormat(nextTag);
    execEditorCommand('formatBlock', nextTag);
  };

  const handleInlineImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 760, 120000);
      setInlineFileName(file.name);
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertImage', false, dataUrl);
      }
    } catch {
      setFormError(
        lang === 'vi'
          ? 'Không thể xử lý ảnh chèn vào nội dung. Vui lòng chọn ảnh nhỏ hơn.'
          : 'Unable to process the inline image. Please choose a smaller image.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setUploadingImage(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 235000);
      setCoverImageData(dataUrl);
      setCoverFileName(file.name);
    } catch {
      setFormError(
        lang === 'vi'
          ? 'Không thể xử lý ảnh bìa. Vui lòng chọn tệp ảnh hợp lệ.'
          : 'Unable to process the cover image. Please choose a valid image file.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError(
        lang === 'vi' ? 'Vui lòng nhập tiêu đề bài viết.' : 'Please enter a blog title.'
      );
      return;
    }

    const rawHtml = editorRef.current?.innerHTML ?? '';
    const cleanHtml = sanitizeRichHtml(rawHtml).trim();
    const plainText = stripHtmlToPlainText(cleanHtml);
    const hasInlineImg = /<img\s/i.test(cleanHtml);

    if (!plainText && !hasInlineImg) {
      setFormError(
        lang === 'vi' ? 'Vui lòng nhập nội dung bài viết.' : 'Please enter blog content.'
      );
      return;
    }

    if (cleanHtml.length > 395000) {
      setFormError(
        lang === 'vi'
          ? 'Nội dung hoặc ảnh đính kèm quá lớn. Vui lòng giảm bớt dung lượng ảnh.'
          : 'Content or embedded images exceed maximum size. Please reduce image count or size.'
      );
      return;
    }

    if (!coverImageData) {
      setFormError(
        lang === 'vi' ? 'Vui lòng chọn ảnh bìa cho bài viết.' : 'Please upload a cover image.'
      );
      return;
    }

    const summarySource = metaDescription.trim() || plainText || trimmedTitle;
    const summaryText =
      summarySource.length > 160
        ? `${summarySource.slice(0, 160)}...`
        : summarySource;

    onAddArticle({
      id: Date.now(),
      category,
      date: new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US'),
      title: trimmedTitle,
      ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
      ...(metaDescription.trim()
        ? { metaDescription: metaDescription.trim() }
        : {}),
      ...(metaKeywords.trim() ? { metaKeywords: metaKeywords.trim() } : {}),
      img: coverImageData,
      summary: summaryText,
      content: cleanHtml,
    });

    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-extrabold text-slate-900">
            {lang === 'vi' ? 'Thêm bài viết' : 'Add Blog'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 overflow-y-auto flex-1"
        >
          {/* * Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              <span className="text-brandRed mr-1">*</span>
              {lang === 'vi' ? 'Tiêu đề' : 'Title'}
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'vi' ? 'Tiêu đề bài viết' : 'Blog Title'}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              {lang === 'vi' ? 'Chuyên mục' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            >
              <option value="Thị trường lao động">
                {getNewsCategoryLabel('Thị trường lao động', lang)}
              </option>
              <option value="Quản trị nhân sự">
                {getNewsCategoryLabel('Quản trị nhân sự', lang)}
              </option>
              <option value="Bí quyết phỏng vấn">
                {getNewsCategoryLabel('Bí quyết phỏng vấn', lang)}
              </option>
              <option value="Sự kiện CareerToday">
                {getNewsCategoryLabel('Sự kiện CareerToday', lang)}
              </option>
            </select>
          </div>

          {/* Meta Title (SEO) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Meta Title (SEO)
            </label>
            <input
              type="text"
              maxLength={200}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder={
                lang === 'vi' ? 'Meta Title (cho SEO)' : 'Meta Title (for SEO)'
              }
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            />
          </div>

          {/* Meta Description (SEO) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Meta Description (SEO)
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Meta Description"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            />
            <div className="text-right text-xs text-slate-400 mt-1 tabular-nums">
              {metaDescription.length} / 500
            </div>
          </div>

          {/* Meta Keywords (SEO) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Meta Keywords (SEO)
            </label>
            <input
              type="text"
              maxLength={500}
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brandBlue"
            />
          </div>

          {/* * Content Rich Editor */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              <span className="text-brandRed mr-1">*</span>
              {lang === 'vi' ? 'Nội dung' : 'Content'}
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              {/* Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-white">
                <select
                  value={blockFormat}
                  onChange={(e) => handleBlockFormatChange(e.target.value)}
                  aria-label="Block format"
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brandBlue"
                >
                  <option value="p">
                    {lang === 'vi' ? 'Đoạn văn' : 'Paragraph'}
                  </option>
                  <option value="h2">
                    {lang === 'vi' ? 'Tiêu đề 2' : 'Heading 2'}
                  </option>
                  <option value="h3">
                    {lang === 'vi' ? 'Tiêu đề 3' : 'Heading 3'}
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => execEditorCommand('bold')}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Bold"
                  aria-label="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('italic')}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Italic"
                  aria-label="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('strikeThrough')}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Strikethrough"
                  aria-label="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertUnorderedList')}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Bullet list"
                  aria-label="Bullet list"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertOrderedList')}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Numbered list"
                  aria-label="Numbered list"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <input
                  ref={inlineImgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInlineImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => inlineImgInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  title={lang === 'vi' ? 'Chèn hình ảnh' : 'Insert image'}
                  aria-label={lang === 'vi' ? 'Chèn hình ảnh' : 'Insert image'}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => inlineImgInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-xs text-slate-600 hover:text-slate-900 ml-1 truncate max-w-[240px] cursor-pointer text-left"
                >
                  <span className="font-semibold mr-1.5">
                    {lang === 'vi' ? 'Chọn tệp' : 'Choose file'}
                  </span>
                  <span className="text-slate-500">
                    {inlineFileName ||
                      (lang === 'vi'
                        ? 'Không có tệp nào được chọn'
                        : 'No file chosen')}
                  </span>
                </button>
              </div>

              {/* Editable Rich Body */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[180px] max-h-[300px] overflow-y-auto p-3.5 text-sm text-slate-800 focus:outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
              />
            </div>
          </div>

          {/* * Image Cover Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              <span className="text-brandRed mr-1">*</span>
              {lang === 'vi' ? 'Hình ảnh' : 'Image'}
            </label>
            <input
              ref={coverImgInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageSelect}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => coverImgInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {lang === 'vi' ? 'Chọn tệp' : 'Choose File'}
              </button>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {coverFileName ||
                  (lang === 'vi'
                    ? 'Không có tệp nào được chọn'
                    : 'No file chosen')}
              </span>
            </div>

            {coverImageData && (
              <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={coverImageData}
                  alt={coverFileName || 'Preview'}
                  className="h-24 w-40 object-cover"
                />
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs font-semibold text-brandRed">{formError}</p>
          )}

          {/* Cancel / Save Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {lang === 'vi' ? 'Lưu' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ManageAdminsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  admins: AdminEntry[];
  currentUserEmail: string;
  onAddAdmin: (email: string) => Promise<void>;
  onRemoveAdmin: (email: string) => Promise<void>;
}

export const ManageAdminsModal: React.FC<ManageAdminsModalProps> = ({
  isOpen,
  onClose,
  lang,
  admins,
  currentUserEmail,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmailInput('');
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleaned = emailInput.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      setFormError(
        lang === 'vi'
          ? 'Vui lòng nhập địa chỉ email Google hợp lệ.'
          : 'Please enter a valid Google email address.'
      );
      return;
    }
    if (admins.some((a) => a.email === cleaned)) {
      setFormError(
        lang === 'vi'
          ? 'Email này đã có quyền Quản trị viên.'
          : 'This email already has Administrator access.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onAddAdmin(cleaned);
      setEmailInput('');
    } catch {
      setFormError(
        lang === 'vi'
          ? 'Không thể thêm quản trị viên. Vui lòng thử lại.'
          : 'Unable to add administrator. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-brandLight">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brandBlue" />
            <h3 className="text-lg font-extrabold text-slate-900">
              {lang === 'vi'
                ? 'Quản lý Quản trị viên'
                : 'Manage Administrators'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              {lang === 'vi'
                ? 'Thêm email đồng quản trị viên (tài khoản Google)'
                : 'Add Co-Administrator Email (Google Account)'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                maxLength={254}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="example@careertoday.com.vn"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-brandGrey/80 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brandBlue focus:bg-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 bg-brandBlue hover:bg-brandBlueDark text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {lang === 'vi' ? 'Thêm Admin' : 'Add Admin'}
                </span>
              </button>
            </div>
            {formError && (
              <p className="text-xs font-semibold text-brandRed">{formError}</p>
            )}
          </form>

          <div className="space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {lang === 'vi'
                ? `Danh sách Quản trị viên (${admins.length})`
                : `Authorized Administrators (${admins.length})`}
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {admins.map((adm) => {
                const isSelf =
                  adm.email === currentUserEmail.trim().toLowerCase();
                return (
                  <div
                    key={adm.email}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {adm.email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {adm.isRoot
                          ? lang === 'vi'
                            ? 'Quản trị gốc (Mặc định)'
                            : 'Root Administrator'
                          : lang === 'vi'
                          ? `Đồng quản trị · Thêm bởi ${adm.addedByEmail}`
                          : `Co-Admin · Added by ${adm.addedByEmail}`}
                        {isSelf &&
                          (lang === 'vi' ? ' · Đang đăng nhập' : ' · Current session')}
                      </div>
                    </div>
                    {!adm.isRoot && !isSelf && (
                      <button
                        type="button"
                        onClick={() => onRemoveAdmin(adm.email)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-brandRed hover:bg-brandRed hover:text-white transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Gỡ bỏ' : 'Remove'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  signingIn: boolean;
  onSignIn: () => Promise<void>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  lang,
  signingIn,
  onSignIn,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-brandLight">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brandBlue" />
            <h3 className="text-lg font-extrabold text-slate-900">
              {lang === 'vi'
                ? 'Đăng nhập Quản trị viên'
                : 'Administrator Sign In'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <button
            type="button"
            onClick={() => void onSignIn()}
            disabled={signingIn}
            className="w-full bg-brandBlue hover:bg-brandBlueDark text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {signingIn
                ? lang === 'vi'
                  ? 'Đang xác thực...'
                  : 'Authenticating...'
                : lang === 'vi'
                ? 'Đăng nhập bằng tài khoản Google'
                : 'Sign in with Google Account'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
