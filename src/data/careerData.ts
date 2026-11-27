export type Lang = 'vi' | 'en';

export interface JobItem {
  id: number;
  title: string;
  titleEn?: string;
  industry: string;
  level: string;
  location: string;
  salary: string;
  salaryEn?: string;
  hot: boolean;
  posted: string;
  postedEn?: string;
  desc: string;
  descEn?: string;
}

export interface NewsItem {
  id: number;
  category: string;
  date: string;
  title: string;
  titleEn?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  img: string;
  summary: string;
  summaryEn?: string;
  content: string;
  contentEn?: string;
}

export interface ServiceMenuItem {
  id: string;
  orderValue: string;
  orderValueEn: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
}

export const industryLabels: Record<string, { vi: string; en: string }> = {
  'FMCG/Manufacturing': {
    vi: 'Hàng tiêu dùng / Sản xuất',
    en: 'FMCG / Manufacturing',
  },
  'IT/Tech': {
    vi: 'Công nghệ thông tin',
    en: 'IT / Tech',
  },
  'Finance/Banking': {
    vi: 'Tài chính / Ngân hàng',
    en: 'Finance / Banking',
  },
  Logistics: {
    vi: 'Logistics / Chuỗi cung ứng',
    en: 'Logistics & Supply Chain',
  },
  'Retail/F&B': {
    vi: 'Bán lẻ / Ẩm thực (F&B)',
    en: 'Retail / F&B',
  },
  Pharmaceutical: {
    vi: 'Dược phẩm',
    en: 'Pharmaceutical',
  },
};

export const levelLabels: Record<string, { vi: string; en: string }> = {
  'Senior/Manager': {
    vi: 'Quản lý / Cấp cao',
    en: 'Senior / Manager',
  },
  'Specialist/Engineer': {
    vi: 'Chuyên viên / Kỹ sư',
    en: 'Specialist / Engineer',
  },
  'Intern/Fresher': {
    vi: 'Thực tập sinh / Mới tốt nghiệp',
    en: 'Intern / Fresher',
  },
};

export const locationLabels: Record<string, { vi: string; en: string }> = {
  'TP.HCM': {
    vi: 'TP. Hồ Chí Minh',
    en: 'Ho Chi Minh City',
  },
  'Hà Nội': {
    vi: 'Hà Nội',
    en: 'Hanoi',
  },
  'Bình Dương': {
    vi: 'Bình Dương',
    en: 'Binh Duong',
  },
  'Dubai/UAE': {
    vi: 'Dubai / UAE',
    en: 'Dubai / UAE',
  },
  Remote: {
    vi: 'Làm việc từ xa',
    en: 'Remote',
  },
};

export const newsCategoryLabels: Record<string, { vi: string; en: string }> = {
  'Thị trường lao động': {
    vi: 'Thị trường lao động',
    en: 'Labor Market',
  },
  'Quản trị nhân sự': {
    vi: 'Quản trị nhân sự',
    en: 'HR Management',
  },
  'Bí quyết phỏng vấn': {
    vi: 'Bí quyết phỏng vấn',
    en: 'Interview Tips',
  },
  'Sự kiện CareerToday': {
    vi: 'Sự kiện CareerToday',
    en: 'CareerToday Events',
  },
};

export const getIndustryLabel = (key: string, lang: Lang) =>
  industryLabels[key]?.[lang] ?? key;

export const getLevelLabel = (key: string, lang: Lang) =>
  levelLabels[key]?.[lang] ?? key;

export const getLocationLabel = (key: string, lang: Lang) =>
  locationLabels[key]?.[lang] ?? key;

export const getNewsCategoryLabel = (key: string, lang: Lang) =>
  newsCategoryLabels[key]?.[lang] ?? key;

export const getJobLocalized = (job: JobItem, lang: Lang) => ({
  title: lang === 'en' && job.titleEn ? job.titleEn : job.title,
  salary: lang === 'en' && job.salaryEn ? job.salaryEn : job.salary,
  posted: lang === 'en' && job.postedEn ? job.postedEn : job.posted,
  desc: lang === 'en' && job.descEn ? job.descEn : job.desc,
  industry: getIndustryLabel(job.industry, lang),
  level: getLevelLabel(job.level, lang),
  location: getLocationLabel(job.location, lang),
});

export const getNewsLocalized = (article: NewsItem, lang: Lang) => ({
  category: getNewsCategoryLabel(article.category, lang),
  title: lang === 'en' && article.titleEn ? article.titleEn : article.title,
  summary:
    lang === 'en' && article.summaryEn ? article.summaryEn : article.summary,
  content:
    lang === 'en' && article.contentEn ? article.contentEn : article.content,
  metaTitle: article.metaTitle ?? '',
  metaDescription: article.metaDescription ?? '',
  metaKeywords: article.metaKeywords ?? '',
});

export const HERO_IMAGE = '/src/assets/images/hero_executive_team_1795659372100.jpg';
export const ABOUT_TEAM_IMAGE = '/src/assets/images/news_corporate_event_1795659373138.jpg';
export const VISION_IMAGE = '/src/assets/images/vision_global_hands_1795665555199.jpg';
export const MISSION_IMAGE = '/src/assets/images/mission_puzzle_hands_1795665554905.jpg';
export const SERVICE_ESS_IMAGE = '/src/assets/images/service_executive_search_1795665554592.jpg';
export const SERVICE_ONLINE_IMAGE = '/src/assets/images/service_online_recruitment_1795665554653.jpg';
export const SERVICE_CONSULTING_IMAGE = '/src/assets/images/news_raci_process_1795659372853.jpg';
export const DEFAULT_NEWS_IMAGE = '/src/assets/images/news_corporate_event_1795659373138.jpg';

export interface ServiceDetailItem extends ServiceMenuItem {
  img: string;
}

export const serviceMenuItems: ServiceDetailItem[] = [
  {
    id: 'ess',
    orderValue: 'Tuyển dụng nhân sự cấp cao',
    orderValueEn: 'Executive Search and Selection',
    titleVi: 'Tuyển dụng Nhân sự Cấp cao',
    titleEn: 'Executive Search and Selection',
    descVi:
      'Là đơn vị tiên phong trong lĩnh vực tuyển dụng nhân sự cấp cao, CareerToday am hiểu sâu sắc đội ngũ nhân tài từ các vị trí điều hành (CEO, CFO, COO, CIO) đến chuyên gia chuyên môn tại Việt Nam và quốc tế. Với đội ngũ tư vấn giàu kinh nghiệm cùng quy trình đánh giá chuyên sâu, chúng tôi tìm kiếm chính xác nhân sự phù hợp nhất với từng doanh nghiệp.',
    descEn:
      'As a leading Executive Search firm, CareerToday understands the talents from executive placements (CEO, CFO, COO, CIO) to specialized roles in Vietnam and internationally that fit your organization. With our experienced recruitment consultants and structured evaluation process, we know where to look for the suitable talents to meet each client’s unique needs.',
    img: SERVICE_ESS_IMAGE,
  },
  {
    id: 'online',
    orderValue: 'Dịch vụ tuyển dụng trực tuyến',
    orderValueEn: 'Online Recruitment Services',
    titleVi: 'Dịch vụ Tuyển dụng Trực tuyến',
    titleEn: 'Online Recruitment Services',
    descVi:
      'Sở hữu kho dữ liệu lớn với hơn 70.000 ứng viên tiềm năng đa ngành nghề, CareerToday ứng dụng công nghệ kết nối và sàng lọc hiện đại giúp nhà tuyển dụng nhanh chóng tìm kiếm đúng ứng viên, đúng tiêu chí tuyển dụng và đúng thời điểm.',
    descEn:
      'With a large database of over 70,000 potential candidates from many different industries, CareerToday applies modern matching technology to help recruiters easily find the right candidate according to the right recruitment criteria at the right time.',
    img: SERVICE_ONLINE_IMAGE,
  },
  {
    id: 'consulting',
    orderValue: 'Tư vấn nhân sự toàn diện',
    orderValueEn: 'HR Consulting Services',
    titleVi: 'Tư vấn Nhân sự Toàn diện',
    titleEn: 'HR Consulting',
    descVi:
      'Dịch vụ Tư vấn Nhân sự của CareerToday bao quát đa dạng lĩnh vực quản trị nhân lực nhằm hỗ trợ tổ chức phát triển bền vững và gia tăng giá trị doanh nghiệp. Chúng tôi cung cấp giải pháp toàn diện gồm huấn luyện lãnh đạo, đánh giá năng lực, tư vấn hệ thống lương thưởng 3P, hỗ trợ điều phối nhân sự quốc tế và đào tạo phát triển đội ngũ.',
    descEn:
      'HR Consulting Services from CareerToday encompass a broad spectrum of HR disciplines designed to provide HR expertise that supports the success of your organization and drives value to your business. We provide full-range HR consulting services including executive coaching, assessment, 3P compensation consulting, overseas assignment & visa support, and learning & development.',
    img: SERVICE_CONSULTING_IMAGE,
  },
];

export const initialJobsData: JobItem[] = [];

export const initialNewsData: NewsItem[] = [];

export const i18nDict: Record<Lang, Record<string, string>> = {
  vi: {
    nav_home: 'Trang chủ',
    nav_about: 'Giới thiệu',
    nav_jobs: 'Cơ hội nghề nghiệp',
    nav_services: 'Dịch vụ',
    nav_news: 'Blog',
    nav_contact: 'Liên hệ',
    nav_submit_cv: 'Gửi hồ sơ',
    hero_badge: 'CÔNG TY TNHH CAREERTODAY',
    hero_title: 'Đối tác Tuyển dụng Nhân sự Cấp cao & Tư vấn Nhân lực Hàng đầu',
    hero_sub:
      'Đồng hành cùng doanh nghiệp với giải pháp tuyển dụng linh hoạt từ các vị trí điều hành cấp cao (CEO, CFO, COO, CIO) đến chuyên gia trong nước và quốc tế với hơn 70.000 hồ sơ ứng viên.',
    hero_cta_jobs: 'Tìm việc làm ngay',
    hero_cta_order: 'Gửi yêu cầu tuyển dụng',
    quick_search_title: 'Tìm công việc phù hợp với bạn',
    quick_search_btn: 'Tìm việc làm',
    stat_1: 'Hồ sơ ứng viên',
    stat_2: 'Khách hàng doanh nghiệp',
    srv_title: 'Dịch vụ của chúng tôi',
    srv_sub:
      'Giải pháp tuyển dụng & tư vấn nhân sự chuyên sâu chuẩn quốc tế từ CareerToday.',
    srv_cta: 'Đặt hàng dịch vụ',
    jobs_title: 'Tuyển dụng nổi bật',
    jobs_tab_hot: 'Việc làm nổi bật',
    jobs_tab_all: 'Tất cả vị trí',
    btn_post_job: 'Đăng tin tuyển dụng',
    who_title: 'Chúng tôi là ai?',
    who_p1:
      'CareerToday cung cấp các giải pháp tuyển dụng linh hoạt được thiết kế riêng để đáp ứng nhu cầu cụ thể của từng doanh nghiệp. Dịch vụ của chúng tôi bao phủ đa dạng ngành nghề và cấp bậc công việc — từ các vị trí điều hành cấp cao như CEO, CFO, COO và CIO, đến các chuyên gia trong nước và quốc tế, nhân sự chuyên môn cao, kỹ sư và lao động kỹ thuật lành nghề.',
    who_p2:
      'Bên cạnh đó, chúng tôi hợp tác cùng các đối tác uy tín trong nước và quốc tế để cung ứng và điều phối nhân sự làm việc ở nước ngoài, mang đến cơ hội phát triển sự nghiệp toàn diện cho người lao động cũng như nguồn nhân lực chất lượng cao cho doanh nghiệp.',
    who_p3:
      'Chúng tôi cam kết đồng hành cùng khách hàng trên hành trình tìm kiếm và tuyển dụng những ứng viên đạo đức, tài năng và phù hợp nhất để đóng góp vào sự phát triển bền vững của tổ chức.',
    numbers_title: 'CareerToday qua những con số',
    num_1_lbl: 'Hồ sơ ứng viên',
    num_2_lbl: 'Khách hàng',
    num_3_lbl: 'Cam kết bảo hành',
    num_4_lbl: 'Ngành nghề chuyên sâu',
    vision_label: 'Tầm nhìn của chúng tôi',
    vision_brand_lead: 'CareerToday — Luôn đồng hành bên bạn.',
    vision_text:
      'Khát vọng của chúng tôi là trở thành công ty số 1 trong lĩnh vực tuyển dụng và tư vấn chuyên nghiệp — không chỉ am hiểu sâu sắc thị trường nhân lực Việt Nam mà còn trở thành đối tác cung ứng giải pháp nhân tài toàn cầu.',
    mission_label: 'Sứ mệnh của chúng tôi',
    mission_text:
      'Với CareerToday, xây dựng một cộng đồng nghề nghiệp chuẩn mực đạo đức và thịnh vượng luôn là ưu tiên hàng đầu. Chúng tôi mang lại nhân tài tốt nhất cho doanh nghiệp, khai phá tiềm năng ứng viên, xây dựng văn hóa chuyên nghiệp và tạo sự gắn kết giữ chân nhân sự bền vững.',
    cv_1: 'Thấu hiểu nhu cầu thực tế và đặt trải nghiệm khách hàng làm trọng tâm.',
    cv_2: 'Trung thực, minh bạch, tôn trọng lời nói và mọi cam kết.',
    cv_3: 'Không ngừng học hỏi từ thực tiễn và đổi mới để dẫn đầu.',
    news_title: 'Blog & Kiến thức nhân sự',
    btn_post_news: 'Đăng bài viết mới',
    jo_title: 'Đăng Ký Tư Vấn / Gửi Yêu Cầu Tuyển Dụng',
    jo_desc:
      'Dành riêng cho Quý doanh nghiệp có nhu cầu tuyển dụng nhân sự cấp cao hoặc tìm kiếm nhân sự kế thừa tiềm năng.',
    jo_company: 'Tên doanh nghiệp *',
    jo_person: 'Người liên hệ & Chức vụ *',
    jo_phone: 'Số điện thoại *',
    jo_service: 'Dịch vụ tuyển dụng *',
    jo_pos: 'Vị trí & Số lượng cần tuyển *',
    jo_notes: 'Ghi chú yêu cầu (Ngân sách lương, thời gian dự kiến...)',
    jo_submit: 'Gửi yêu cầu tuyển dụng',
    contact_title: 'Liên hệ CareerToday Group',
    lbl_addr: 'Địa chỉ văn phòng:',
    lbl_platforms: 'Các nền tảng mạng xã hội:',
  },
  en: {
    nav_home: 'Home',
    nav_about: 'About us',
    nav_jobs: 'Job opportunities',
    nav_services: 'Our service',
    nav_news: 'Blog',
    nav_contact: 'Contact',
    nav_submit_cv: 'Submit CV',
    hero_badge: 'CAREERTODAY COMPANY LIMITED',
    hero_title: 'Premier Executive Search & Human Capital Consulting Partner',
    hero_sub:
      'Be your hand, by your side — Flexible recruitment solutions from C-Level executives (CEO, CFO, COO, CIO) to domestic and international experts backed by 70,000+ candidate profiles.',
    hero_cta_jobs: 'Explore Jobs',
    hero_cta_order: 'Submit Job Order',
    quick_search_title: 'Find the right job for you',
    quick_search_btn: 'Search Jobs',
    stat_1: 'Candidate Profiles',
    stat_2: 'Corporate Clients',
    srv_title: 'Our Services',
    srv_sub:
      'Comprehensive executive search, online recruitment, and HR consulting solutions from CareerToday.',
    srv_cta: 'Request Service',
    jobs_title: 'Featured Opportunities',
    jobs_tab_hot: 'Featured Jobs',
    jobs_tab_all: 'All Positions',
    btn_post_job: 'Post a New Job',
    who_title: 'Who we are?',
    who_p1:
      'CareerToday provides flexible recruitment solutions tailored to meet the specific needs of each business. Our services cover a wide range of industries and job levels — from executive positions such as CEO, CFO, COO, and CIO, to domestic and international experts, as well as high-level professionals, engineers, and skilled technical workers.',
    who_p2:
      'In addition, we collaborate with reputable local and international partners to supply and dispatch personnel for overseas assignments, offering comprehensive career development opportunities for workers and a source of high-quality human resources for enterprises.',
    who_p3:
      'We are committed to accompanying our clients in the journey to find and recruit ethical, talented, and best-fit candidates who will contribute to the sustainable growth of their organizations.',
    numbers_title: 'CareerToday in Numbers',
    num_1_lbl: 'Candidates',
    num_2_lbl: 'Clients',
    num_3_lbl: 'Placement Guarantee',
    num_4_lbl: 'Industries',
    vision_label: 'Our vision',
    vision_brand_lead: 'CareerToday — Be your hand, by your side.',
    vision_text:
      "Our aspiration is to become the No.1 recruitment and professional consulting firm—not only deeply understanding Vietnam's human resource market but also becoming the trusted partner for providing talent solutions globally.",
    mission_label: 'Our mission',
    mission_text:
      'For CareerToday, building an ethical and prosperous community is the top priority. We deliver the best talent to businesses, unlock candidate potential, build a professional culture, and foster long-term engagement and retention.',
    cv_1: 'Deeply understand pain points and place customer experience at the center.',
    cv_2: 'Be transparent, honest, and honor every word and commitment.',
    cv_3: 'Continuously learn from real practice and innovate to lead.',
    news_title: 'Blog & HR Insights',
    btn_post_news: 'Publish New Post',
    jo_title: 'Register Consultation / Submit Job Order',
    jo_desc:
      'Exclusively for corporate clients seeking Executive Search Service (ESS) or high-potential succession talent.',
    jo_company: 'Company Name *',
    jo_person: 'Contact Person & Title *',
    jo_phone: 'Phone Number *',
    jo_service: 'Recruitment Service *',
    jo_pos: 'Position & Headcount *',
    jo_notes: 'Additional Notes (Salary budget, expected timeline...)',
    jo_submit: 'Submit Job Order',
    contact_title: 'Contact CareerToday Group',
    lbl_addr: 'Office Address:',
    lbl_platforms: 'Official Social Channels:',
  },
};
