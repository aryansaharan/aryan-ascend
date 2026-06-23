export type Course = {
  id: string;
  title: string;
  provider: string;
  durationHours: number;
  level: "beginner" | "intermediate" | "advanced";
  skills: string[];
  tracks: string[]; // career paths it serves
  url: string;
  summary: string;
};

// Curated corpus: enough breadth to cover the survey audience
// (early-career tech, 22-35, India). Not exhaustive; representative.
export const COURSES: Course[] = [
  // DevOps / Cloud
  {
    id: "aws-cloud-practitioner",
    title: "AWS Certified Cloud Practitioner",
    provider: "AWS Skill Builder",
    durationHours: 20,
    level: "beginner",
    skills: ["aws", "cloud", "infra"],
    tracks: ["devops", "backend", "cloud-engineer"],
    url: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    summary:
      "Foundational AWS certification. Covers core services, pricing, security model. Common first cert for engineers moving into infra.",
  },
  {
    id: "docker-deep-dive",
    title: "Docker Deep Dive",
    provider: "Pluralsight",
    durationHours: 8,
    level: "intermediate",
    skills: ["docker", "containers", "devops"],
    tracks: ["devops", "backend", "platform-engineer"],
    url: "https://www.pluralsight.com/courses/docker-deep-dive-update",
    summary:
      "Container fundamentals, Dockerfile mastery, multi-stage builds, image optimization. The standard intro for production-grade containerization.",
  },
  {
    id: "kubernetes-cka",
    title: "Certified Kubernetes Administrator (CKA)",
    provider: "Linux Foundation",
    durationHours: 60,
    level: "advanced",
    skills: ["kubernetes", "k8s", "containers", "devops"],
    tracks: ["devops", "platform-engineer", "sre"],
    url: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
    summary:
      "Hands-on Kubernetes operations. Lab-based exam. Heavy lift but the credential is recognized industry-wide.",
  },
  {
    id: "terraform-fundamentals",
    title: "HashiCorp Terraform Associate",
    provider: "HashiCorp Learn",
    durationHours: 16,
    level: "intermediate",
    skills: ["terraform", "iac", "devops"],
    tracks: ["devops", "platform-engineer"],
    url: "https://developer.hashicorp.com/terraform/tutorials/certification",
    summary:
      "Infrastructure-as-code with Terraform. Modules, state, providers. Becoming a soft requirement for platform/devops roles.",
  },

  // Data
  {
    id: "google-data-analytics",
    title: "Google Data Analytics Professional Certificate",
    provider: "Coursera (Google)",
    durationHours: 180,
    level: "beginner",
    skills: ["sql", "tableau", "spreadsheets", "analytics"],
    tracks: ["data-analyst", "pm-data", "business-analyst"],
    url: "https://www.coursera.org/professional-certificates/google-data-analytics",
    summary:
      "Long-form but career-changing for analytics. SQL, Tableau, R, the full toolkit. Recognized by hiring partners.",
  },
  {
    id: "sql-for-data-analysis",
    title: "SQL for Data Analysis",
    provider: "Mode Analytics",
    durationHours: 12,
    level: "beginner",
    skills: ["sql", "analytics", "queries"],
    tracks: ["data-analyst", "pm-data", "business-analyst"],
    url: "https://mode.com/sql-tutorial",
    summary:
      "Free, opinionated, fast. Builds real query intuition over canned exercises. Best ROI per hour for SQL-curious PMs and analysts.",
  },
  {
    id: "dbt-fundamentals",
    title: "dbt Fundamentals",
    provider: "dbt Learn",
    durationHours: 6,
    level: "intermediate",
    skills: ["dbt", "sql", "analytics-engineering"],
    tracks: ["analytics-engineer", "data-engineer"],
    url: "https://courses.getdbt.com/courses/fundamentals",
    summary:
      "Modern analytics engineering. Models, tests, documentation. Free and ships fast, most analysts pick it up in a week.",
  },
  {
    id: "python-data-camp",
    title: "Python for Data Analysis",
    provider: "DataCamp",
    durationHours: 24,
    level: "beginner",
    skills: ["python", "pandas", "numpy"],
    tracks: ["data-analyst", "data-scientist", "ml-engineer"],
    url: "https://www.datacamp.com/tracks/data-analyst-with-python",
    summary:
      "Pandas, NumPy, visualization. The standard ramp for non-CS folks getting into data. Lots of practice problems.",
  },

  // AI / ML
  {
    id: "deeplearning-llm-app",
    title: "ChatGPT Prompt Engineering for Developers",
    provider: "DeepLearning.AI",
    durationHours: 2,
    level: "beginner",
    skills: ["prompt-engineering", "llm", "openai"],
    tracks: ["ai-engineer", "pm-ai", "founder"],
    url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/",
    summary:
      "Free, 2 hours, taught by Andrew Ng + Isa Fulford. The single best first hour in AI engineering. Quick win.",
  },
  {
    id: "andrew-ng-ml",
    title: "Machine Learning Specialization",
    provider: "Coursera (DeepLearning.AI)",
    durationHours: 100,
    level: "intermediate",
    skills: ["ml", "supervised-learning", "neural-networks"],
    tracks: ["ml-engineer", "ai-engineer", "data-scientist"],
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    summary:
      "The reboot of Andrew Ng's classic course. Linear algebra to neural networks. Gold standard intro to ML fundamentals.",
  },
  {
    id: "build-llm-apps",
    title: "Building Applications with LLMs",
    provider: "Maven (Hamel Husain)",
    durationHours: 30,
    level: "intermediate",
    skills: ["llm", "rag", "evals", "ai-engineering"],
    tracks: ["ai-engineer", "ml-engineer", "founder"],
    url: "https://maven.com/parlance-labs/fine-tuning",
    summary:
      "Practitioner cohort course on shipping LLM systems. Evals, fine-tuning, deployment. Pricey but the network alone justifies.",
  },

  // Frontend
  {
    id: "react-official-tutorial",
    title: "Tic-Tac-Toe (React Official Tutorial)",
    provider: "React.dev",
    durationHours: 4,
    level: "beginner",
    skills: ["react", "frontend"],
    tracks: ["frontend", "fullstack"],
    url: "https://react.dev/learn/tutorial-tic-tac-toe",
    summary:
      "Free, official, fast. Get the React mental model without 40 hours of theory first. Build something on Day 1.",
  },
  {
    id: "fullstack-open",
    title: "Full Stack Open",
    provider: "University of Helsinki",
    durationHours: 130,
    level: "intermediate",
    skills: ["react", "node", "typescript", "graphql"],
    tracks: ["frontend", "fullstack", "backend"],
    url: "https://fullstackopen.com/en/",
    summary:
      "Free, university-rigorous, project-based. React + Node + TS + GraphQL. The most respected free fullstack course online.",
  },
  {
    id: "typescript-handbook",
    title: "TypeScript Handbook (Self-Study)",
    provider: "typescriptlang.org",
    durationHours: 10,
    level: "intermediate",
    skills: ["typescript", "frontend", "backend"],
    tracks: ["frontend", "fullstack", "backend"],
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    summary:
      "Free, official, definitive. If you write JS professionally and don't yet write TS, this is the next 10 hours.",
  },

  // Backend
  {
    id: "node-js-official",
    title: "Node.js Learning Path",
    provider: "nodejs.org",
    durationHours: 14,
    level: "beginner",
    skills: ["nodejs", "javascript", "backend"],
    tracks: ["backend", "fullstack"],
    url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
    summary:
      "Official Node.js learning. Async patterns, streams, modules. Quick path for JS devs moving to backend.",
  },
  {
    id: "designing-data-intensive",
    title: "Designing Data-Intensive Applications (Book + Discussion)",
    provider: "O'Reilly",
    durationHours: 40,
    level: "advanced",
    skills: ["system-design", "databases", "distributed-systems"],
    tracks: ["backend", "platform-engineer", "staff-engineer"],
    url: "https://dataintensive.net/",
    summary:
      "Not a course, a book. But pretending it isn't on your list is malpractice for backend engineers targeting senior+.",
  },

  // PM craft
  {
    id: "marty-cagan-empowered",
    title: "EMPOWERED (Book + Workshop)",
    provider: "SVPG",
    durationHours: 20,
    level: "intermediate",
    skills: ["product-management", "leadership", "product-discovery"],
    tracks: ["pm", "senior-pm", "founder"],
    url: "https://www.svpg.com/empowered/",
    summary:
      "Marty Cagan's playbook for product orgs that actually ship. Required for anyone serious about PM craft past 2 years.",
  },
  {
    id: "reforge-product-strategy",
    title: "Product Strategy",
    provider: "Reforge",
    durationHours: 40,
    level: "intermediate",
    skills: ["product-strategy", "positioning", "prioritization"],
    tracks: ["pm", "senior-pm", "founder"],
    url: "https://www.reforge.com/programs/product-strategy",
    summary:
      "Cohort-based, opinionated, expensive. Network is the value as much as the curriculum. Strong for mid-level PMs leveling up.",
  },
  {
    id: "lennys-newsletter",
    title: "Lenny's Newsletter (Premium)",
    provider: "Lenny Rachitsky",
    durationHours: 0,
    level: "intermediate",
    skills: ["product-management", "growth", "career"],
    tracks: ["pm", "senior-pm", "growth"],
    url: "https://www.lennysnewsletter.com/",
    summary:
      "Not a course, a continuous information diet. The top PM podcast/newsletter. Cheap relative to its compounding effect.",
  },

  // Design / UX (for tech-adjacent)
  {
    id: "design-of-everyday-things",
    title: "The Design of Everyday Things (Book)",
    provider: "Don Norman",
    durationHours: 12,
    level: "beginner",
    skills: ["design-thinking", "ux", "psychology"],
    tracks: ["pm", "designer", "frontend"],
    url: "https://www.nngroup.com/books/design-everyday-things-revised/",
    summary:
      "The foundational design book. PMs and engineers who read it argue better about UI for the rest of their careers.",
  },
  {
    id: "google-ux-design",
    title: "Google UX Design Certificate",
    provider: "Coursera (Google)",
    durationHours: 200,
    level: "beginner",
    skills: ["ux", "figma", "wireframing", "research"],
    tracks: ["designer", "pm", "researcher"],
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
    summary:
      "Long, complete, employer-recognized. Career-changing for design-adjacent folks who want to formally re-skill.",
  },

  // Leadership / Soft skills
  {
    id: "manager-tools-podcast",
    title: "Manager Tools (Basics + Premium)",
    provider: "Manager Tools",
    durationHours: 50,
    level: "intermediate",
    skills: ["management", "leadership", "1-on-1s"],
    tracks: ["em", "engineering-manager", "team-lead"],
    url: "https://www.manager-tools.com/manager-tools-basics",
    summary:
      "Audio-first management training. Specific, scriptable, repetitive on purpose. New EMs find their voice through it.",
  },
  {
    id: "staff-engineer-path",
    title: "The Staff Engineer's Path (Book)",
    provider: "O'Reilly",
    durationHours: 15,
    level: "advanced",
    skills: ["technical-leadership", "staff-engineer", "ic-track"],
    tracks: ["staff-engineer", "principal-engineer", "ic-track"],
    url: "https://noidea.dog/staff",
    summary:
      "The canonical text for ICs going past senior without going into management. Read it once for self-mapping, again before any role move.",
  },

  // Marketing
  {
    id: "hubspot-content-marketing",
    title: "Content Marketing Certification",
    provider: "HubSpot Academy",
    durationHours: 6,
    level: "beginner",
    skills: ["content-marketing", "seo", "marketing-fundamentals"],
    tracks: ["marketing", "growth", "founder"],
    url: "https://academy.hubspot.com/courses/content-marketing",
    summary:
      "Free, foundational, employer-recognized. Covers content strategy, SEO basics, storytelling. The default first cert for marketers.",
  },
  {
    id: "cxl-digital-psychology",
    title: "Digital Psychology and Persuasion",
    provider: "CXL Institute",
    durationHours: 14,
    level: "intermediate",
    skills: ["copywriting", "conversion", "marketing"],
    tracks: ["marketing", "growth", "pm"],
    url: "https://cxl.com/institute/online-course/digital-psychology-and-persuasion/",
    summary:
      "Behavioral science applied to landing pages and funnels. Among the most cited intermediate marketing courses.",
  },
  {
    id: "reforge-marketing-strategy",
    title: "Marketing Strategy",
    provider: "Reforge",
    durationHours: 40,
    level: "intermediate",
    skills: ["positioning", "marketing-strategy", "go-to-market"],
    tracks: ["marketing", "senior-pm", "founder"],
    url: "https://www.reforge.com/programs/marketing-strategy",
    summary:
      "Cohort-based, expensive, peer network as much as curriculum. The standard for senior marketers leveling up.",
  },
  {
    id: "demand-curve-growth",
    title: "Growth Program",
    provider: "The Demand Curve",
    durationHours: 25,
    level: "intermediate",
    skills: ["growth-marketing", "paid-acquisition", "marketing"],
    tracks: ["marketing", "growth", "founder"],
    url: "https://www.demandcurve.com/growth-program",
    summary:
      "Practical, channel-by-channel growth playbook. Built for early-stage operators. Less theory, more 'do this on Monday'.",
  },

  // Growth
  {
    id: "reforge-growth-series",
    title: "Growth Series",
    provider: "Reforge",
    durationHours: 50,
    level: "advanced",
    skills: ["growth-models", "retention", "growth-strategy"],
    tracks: ["growth", "senior-pm", "founder"],
    url: "https://www.reforge.com/programs/growth-series",
    summary:
      "Brian Balfour and Andrew Chen's flagship. Growth loops, retention math, models. Heavy lift; standard reference among growth leads.",
  },
  {
    id: "gopractice-simulator",
    title: "Product Manager Simulator",
    provider: "GoPractice",
    durationHours: 30,
    level: "intermediate",
    skills: ["product-analytics", "experimentation", "growth"],
    tracks: ["growth", "pm", "pm-data"],
    url: "https://gopractice.io/course/pm/",
    summary:
      "Live data-driven product decisions in a simulated startup. Strong on analytics intuition. Popular with growth-curious PMs.",
  },
  {
    id: "cxl-growth-marketing-mini",
    title: "Growth Marketing Mini Degree",
    provider: "CXL Institute",
    durationHours: 60,
    level: "intermediate",
    skills: ["growth-marketing", "experimentation", "analytics"],
    tracks: ["growth", "marketing", "pm"],
    url: "https://cxl.com/institute/mini-degree/growth-marketing/",
    summary:
      "Multi-instructor program. Experimentation, copy, analytics. Long but rigorous; commonly cited in growth hiring.",
  },

  // Sales
  {
    id: "hubspot-inbound-sales",
    title: "Inbound Sales Certification",
    provider: "HubSpot Academy",
    durationHours: 3,
    level: "beginner",
    skills: ["sales-fundamentals", "discovery", "qualification"],
    tracks: ["sales", "founder"],
    url: "https://academy.hubspot.com/courses/inbound-sales",
    summary:
      "Free, fast, foundational. Inbound qualification, discovery, closing basics. Strong starter cert for anyone selling.",
  },
  {
    id: "winning-by-design-saas-sales",
    title: "SaaS Sales Method",
    provider: "Winning by Design",
    durationHours: 25,
    level: "intermediate",
    skills: ["b2b-sales", "saas-sales", "enterprise-sales"],
    tracks: ["sales", "founder"],
    url: "https://winningbydesign.com/resources/blueprints/the-saas-sales-method/",
    summary:
      "Operating system for B2B SaaS sales teams. Bowtie funnel, customer-centric process. Widely adopted in Series A to C startups.",
  },
  {
    id: "jbarrows-filling-the-funnel",
    title: "Filling the Funnel",
    provider: "JBarrows Sales Training",
    durationHours: 8,
    level: "intermediate",
    skills: ["prospecting", "outbound", "b2b-sales"],
    tracks: ["sales"],
    url: "https://jbarrows.com/courses/filling-the-funnel/",
    summary:
      "Tactical prospecting and outbound. Heavy on email and call frameworks. Standard reference for SDRs and AEs.",
  },

  // Customer Success
  {
    id: "successhacker-csm-certification",
    title: "CSM Certification",
    provider: "SuccessCOACHING",
    durationHours: 20,
    level: "beginner",
    skills: ["customer-success", "csm-fundamentals", "retention"],
    tracks: ["customer-success"],
    url: "https://successcoaching.co/csm-certification",
    summary:
      "Default entry cert for CS roles. Onboarding, QBRs, escalation, expansion. Employer-recognized for early-career CSMs.",
  },
  {
    id: "gainsight-pulseplus",
    title: "Pulse+ Library",
    provider: "Gainsight",
    durationHours: 25,
    level: "intermediate",
    skills: ["customer-success", "retention", "expansion", "cs-leadership"],
    tracks: ["customer-success"],
    url: "https://www.gainsight.com/pulse-plus/",
    summary:
      "Practitioner sessions from Gainsight's Pulse conferences. Senior CS thinking on retention, expansion, ops. Free tier available.",
  },
  {
    id: "practical-csm-framework",
    title: "Practical CSM Framework",
    provider: "Practical CSM (Rick Adams)",
    durationHours: 15,
    level: "intermediate",
    skills: ["customer-success", "csm-framework", "outcomes", "cs-leadership"],
    tracks: ["customer-success"],
    url: "https://practicalcsm.com/courses/customer-success-foundations-the-practical-csm-framework/",
    summary:
      "Outcomes-driven CSM playbook. Clear stages, repeatable rituals. Used by CS leaders to standardize team operating cadence.",
  },
  // Finance & FinTech
  {
    id: "wharton-financial-accounting",
    title: "Introduction to Financial Accounting",
    provider: "Coursera (Wharton, University of Pennsylvania)",
    durationHours: 20,
    level: "beginner",
    skills: ["financial-accounting","financial-statements","balance-sheet"],
    tracks: ["finance","business-analyst"],
    url: "https://www.coursera.org/learn/wharton-accounting",
    summary:
      "The cleanest on-ramp to reading the three statements. Brian Bushee makes balance sheets and accruals click for non-accountants. Audit free, pay only for the cert.",
  },
  {
    id: "cfi-fmva-financial-modeling",
    title: "Financial Modeling & Valuation Analyst (FMVA) Certification",
    provider: "Corporate Finance Institute",
    durationHours: 120,
    level: "intermediate",
    skills: ["financial-modeling","valuation","excel","dcf"],
    tracks: ["finance"],
    url: "https://corporatefinanceinstitute.com/certifications/financial-modeling-valuation-analyst-fmva-program/",
    summary:
      "The practical credential for analysts and FP&A who need to build three-statement models and DCFs, not just talk about them. Self-paced, hands-on, recruiter-recognized.",
  },
  {
    id: "wall-street-prep-premium",
    title: "Financial & Valuation Modeling Certification (Premium Package)",
    provider: "Wall Street Prep",
    durationHours: 80,
    level: "advanced",
    skills: ["financial-modeling","lbo","m-and-a","comps"],
    tracks: ["finance"],
    url: "https://www.wallstreetprep.com/self-study-programs/premium-package/",
    summary:
      "The same case-based training banks run for new analysts. DCF, comps, M&A, and LBO built from real filings. For people targeting IB, PE, or equity research.",
  },
  {
    id: "afp-fpac-certification",
    title: "FPAC: Certified Corporate Financial Planning & Analysis Professional",
    provider: "Association for Financial Professionals (AFP)",
    durationHours: 150,
    level: "advanced",
    skills: ["fpa","forecasting","budgeting","performance-management"],
    tracks: ["finance"],
    url: "https://fpacert.financialprofessionals.org/",
    summary:
      "The senior credential for corporate FP&A. Two-part exam on forecasting, budgeting, and business partnering. For analysts ready to own the planning function, not just the model.",
  },
  {
    id: "cfa-program",
    title: "CFA Program (Chartered Financial Analyst)",
    provider: "CFA Institute",
    durationHours: 900,
    level: "advanced",
    skills: ["investment-analysis","portfolio-management","valuation","ethics"],
    tracks: ["finance"],
    url: "https://www.cfainstitute.org/programs/cfa-program",
    summary:
      "The heavyweight investment credential. Three levels, roughly 300 hours each, covering valuation, fixed income, and portfolio management. A multi-year commitment for buy-side and research careers.",
  },

  // People & HR
  {
    id: "umn-hr-people-managers",
    title: "Human Resource Management: HR for People Managers Specialization",
    provider: "Coursera (University of Minnesota)",
    durationHours: 100,
    level: "beginner",
    skills: ["hr-fundamentals","performance-management","compensation","hiring"],
    tracks: ["hr"],
    url: "https://www.coursera.org/specializations/human-resource-management",
    summary:
      "The cleanest on-ramp to HR fundamentals: hiring, performance, and rewards, taught for people who manage people. Best first step for aspiring generalists and new managers.",
  },
  {
    id: "hrci-hr-associate-cert",
    title: "HRCI Human Resource Associate Professional Certificate",
    provider: "Coursera (HRCI)",
    durationHours: 94,
    level: "beginner",
    skills: ["talent-acquisition","employee-relations","compliance","hr-operations"],
    tracks: ["hr"],
    url: "https://www.coursera.org/professional-certificates/hrci-human-resource-associate",
    summary:
      "Covers the full HR stack end to end and preps you for the aPHR exam, no prior experience required. The credential-backed entry point for breaking into people ops.",
  },
  {
    id: "wharton-people-analytics",
    title: "People Analytics",
    provider: "Coursera (Wharton, University of Pennsylvania)",
    durationHours: 11,
    level: "intermediate",
    skills: ["people-analytics","hr-metrics","talent-management"],
    tracks: ["hr","data-analyst"],
    url: "https://www.coursera.org/learn/wharton-people-analytics",
    summary:
      "Short and sharp intro to data-driven people decisions from three Wharton pioneers. For HRBPs and recruiters who want to argue with data, not gut.",
  },
  {
    id: "aihr-strategic-talent-acquisition",
    title: "Strategic Talent Acquisition Certificate Program",
    provider: "AIHR (Academy to Innovate HR)",
    durationHours: 39,
    level: "intermediate",
    skills: ["talent-acquisition","sourcing","employer-branding","recruitment-analytics"],
    tracks: ["hr"],
    url: "https://www.aihr.com/courses/talent-acquisition-certification/",
    summary:
      "Practical, end-to-end recruiting playbook: EVP, sourcing, AI tooling, and funnel analytics. Built for recruiters and TA leads who own the hire, not just screen for it.",
  },
  {
    id: "shrm-scp-senior",
    title: "SHRM Senior Certified Professional (SHRM-SCP)",
    provider: "SHRM",
    durationHours: 80,
    level: "advanced",
    skills: ["hr-strategy","people-leadership","hr-policy"],
    tracks: ["hr"],
    url: "https://www.shrm.org/credentials/certification/shrm-scp",
    summary:
      "The senior HR credential that hiring committees actually recognize, built around strategy and policy, not memorization. For HRBPs and people leaders moving into director and CHRO tracks.",
  },

  // Project Management
  {
    id: "google-project-management-certificate",
    title: "Google Project Management Professional Certificate",
    provider: "Coursera (Google)",
    durationHours: 140,
    level: "beginner",
    skills: ["project-management","agile","scrum","stakeholder-management"],
    tracks: ["project-management","pm"],
    url: "https://www.coursera.org/professional-certificates/google-project-management",
    summary:
      "The default on-ramp for people with zero PM background. Covers traditional, Agile, and Scrum basics plus real artifacts, and counts toward PMI CAPM education hours. Best ROI per hour for breaking into entry-level PM roles.",
  },
  {
    id: "scrum-org-psm-i",
    title: "Professional Scrum Master I (PSM I)",
    provider: "Scrum.org",
    durationHours: 20,
    level: "intermediate",
    skills: ["scrum","agile","scrum-master"],
    tracks: ["project-management","devops"],
    url: "https://www.scrum.org/assessments/professional-scrum-master-i-certification",
    summary:
      "The credential that actually proves you know the Scrum Guide, not just that you sat in a class. One exam, 85% to pass, lifetime validity, no renewal fees. The honest entry point for aspiring Scrum Masters.",
  },
  {
    id: "pmi-acp-agile-certified-practitioner",
    title: "PMI Agile Certified Practitioner (PMI-ACP)",
    provider: "PMI",
    durationHours: 35,
    level: "intermediate",
    skills: ["agile","scrum","kanban","lean"],
    tracks: ["project-management","pm"],
    url: "https://www.pmi.org/certifications/agile-acp",
    summary:
      "Framework-agnostic Agile cert spanning Scrum, Kanban, Lean, and XP, for people already running Agile teams. Pick this over a single-framework badge if your work crosses methods.",
  },
  {
    id: "pmi-pmp-certification",
    title: "Project Management Professional (PMP)",
    provider: "PMI",
    durationHours: 35,
    level: "advanced",
    skills: ["project-management","agile","stakeholder-management","delivery"],
    tracks: ["project-management","pm"],
    url: "https://www.pmi.org/certifications/project-management-pmp",
    summary:
      "The senior PM standard hiring managers and RFPs still ask for. Needs 36 months of leading projects to sit, and covers predictive, hybrid, and Agile delivery. Earn it when you want the salary bump and the title, not the fundamentals.",
  },

  // Consulting & Strategy
  {
    id: "mckinsey-forward-program",
    title: "McKinsey.org Forward",
    provider: "McKinsey.org",
    durationHours: 20,
    level: "beginner",
    skills: ["structured-problem-solving","communication","adaptability"],
    tracks: ["consulting","business-analyst"],
    url: "https://www.mckinsey.org/our-programs/forward/overview",
    summary:
      "Free, 10-week intro to how consultants actually think. Builds structured problem solving and communicating-for-impact, plus a McKinsey badge. Best low-cost on-ramp for anyone eyeing strategy or analyst roles.",
  },
  {
    id: "uva-darden-foundations-business-strategy",
    title: "Foundations of Business Strategy",
    provider: "Coursera (University of Virginia, Darden)",
    durationHours: 9,
    level: "beginner",
    skills: ["business-strategy","competitive-analysis","swot-five-forces"],
    tracks: ["consulting"],
    url: "https://www.coursera.org/learn/uva-darden-strategy101",
    summary:
      "The framework starter kit: SWOT, Five Forces, value chain, strategy maps. Short, well-taught, and exactly the vocabulary a junior strategy analyst needs to sound credible in week one.",
  },
  {
    id: "rocketblocks-consulting-case-prep",
    title: "RocketBlocks Consulting Interview Prep",
    provider: "RocketBlocks",
    durationHours: 40,
    level: "intermediate",
    skills: ["case-interview","mental-math","case-structuring"],
    tracks: ["consulting"],
    url: "https://www.rocketblocks.me/consulting.php",
    summary:
      "Drill-based case prep built by ex-McKinsey, BCG, and Bain managers. Math, charts, and structuring reps over passive reading. The fastest way to get interview-ready for MBB and beyond.",
  },
  {
    id: "cfi-corporate-business-strategy",
    title: "Corporate & Business Strategy",
    provider: "Corporate Finance Institute",
    durationHours: 8,
    level: "advanced",
    skills: ["corporate-strategy","swot-analysis","dcf-modeling"],
    tracks: ["consulting","business-analyst"],
    url: "https://corporatefinanceinstitute.com/course/corporate-business-strategy-course/",
    summary:
      "Hands-on strategy work on a real case: external and internal analysis, DCF, multi-criteria selection, then a board-ready strategy doc. For analysts who need to back strategy with numbers, not slides.",
  },
  {
    id: "uva-darden-advanced-business-strategy",
    title: "Advanced Business Strategy",
    provider: "Coursera (University of Virginia, Darden)",
    durationHours: 10,
    level: "advanced",
    skills: ["corporate-strategy","diversification-strategy","international-strategy"],
    tracks: ["consulting"],
    url: "https://www.coursera.org/learn/uva-darden-advanced-business-strategy",
    summary:
      "The senior follow-on: dynamic, international, diversification, and stakeholder strategy. For operators moving from single-market tactics to corporate-scope decisions across industries and geographies.",
  },

  // Content & Writing
  {
    id: "google-technical-writing",
    title: "Technical Writing Courses (Technical Writing One and Two)",
    provider: "Google for Developers",
    durationHours: 12,
    level: "beginner",
    skills: ["technical-writing","documentation","editing"],
    tracks: ["content-writing","devops"],
    url: "https://developers.google.com/tech-writing",
    summary:
      "Free, no-fluff foundation in clear technical prose, from grammar to doc structure to error messages. Best beginner entry point for engineers and writers moving into docs.",
  },
  {
    id: "cu-boulder-business-writing",
    title: "Business Writing",
    provider: "Coursera (University of Colorado Boulder)",
    durationHours: 14,
    level: "beginner",
    skills: ["business-writing","editing","communications"],
    tracks: ["content-writing","pm"],
    url: "https://www.coursera.org/learn/writing-for-business",
    summary:
      "Tightens everyday workplace writing, emails, briefs, reports, into something people actually read. Practical first credential for comms associates and anyone who writes to get work done.",
  },
  {
    id: "awai-seven-figure-copywriting",
    title: "The Accelerated Program for Seven-Figure Copywriting",
    provider: "AWAI (American Writers & Artists Institute)",
    durationHours: 60,
    level: "intermediate",
    skills: ["copywriting","direct-response","sales-copy"],
    tracks: ["content-writing","marketing"],
    url: "https://www.awai.com/copywriting/p/",
    summary:
      "The classic write-while-you-learn path into paid direct-response copywriting. Pricey, but the briefs are real client work, not exercises.",
  },
  {
    id: "copyhackers-copywriter-certification",
    title: "Copywriter Certification (Copy School)",
    provider: "Copyhackers",
    durationHours: 80,
    level: "advanced",
    skills: ["conversion-copywriting","copywriting","messaging"],
    tracks: ["content-writing","marketing"],
    url: "https://copyhackers.com/copywriter-certification/",
    summary:
      "Deep conversion-copywriting training with verifiable badges, SaaS, launch, and ecommerce tracks. For working copywriters who want to prove craft and command senior rates.",
  },

  // Cybersecurity
  {
    id: "isc2-certified-in-cybersecurity",
    title: "Certified in Cybersecurity (CC)",
    provider: "ISC2",
    durationHours: 30,
    level: "beginner",
    skills: ["security-principles","access-control","network-security","grc"],
    tracks: ["cybersecurity"],
    url: "https://www.isc2.org/certifications/cc",
    summary:
      "The cleanest no-experience entry credential from a name hiring managers respect. Covers security principles, access control, and network basics. Best first stamp before Security+.",
  },
  {
    id: "google-cybersecurity-certificate",
    title: "Google Cybersecurity Professional Certificate",
    provider: "Coursera (Google)",
    durationHours: 170,
    level: "beginner",
    skills: ["siem","linux","python","incident-response"],
    tracks: ["cybersecurity"],
    url: "https://www.coursera.org/professional-certificates/google-cybersecurity",
    summary:
      "Job-ready fundamentals with real SIEM, Linux, Python, and SQL practice, not just theory. Built for career switchers with zero background. Also preps you for the Security+ exam.",
  },
  {
    id: "comptia-security-plus",
    title: "CompTIA Security+ (SY0-701)",
    provider: "CompTIA",
    durationHours: 120,
    level: "intermediate",
    skills: ["threat-management","cryptography","risk-management","network-security"],
    tracks: ["cybersecurity"],
    url: "https://www.comptia.org/en-us/certifications/security/",
    summary:
      "The baseline cert most security job posts actually list, and DoD 8140 approved. Vendor-neutral coverage of threats, crypto, and risk. Pass it and you clear the first HR filter.",
  },
  {
    id: "tryhackme-soc-level-1",
    title: "SOC Level 1",
    provider: "TryHackMe",
    durationHours: 50,
    level: "intermediate",
    skills: ["soc-analysis","siem","threat-intelligence","incident-response"],
    tracks: ["cybersecurity"],
    url: "https://tryhackme.com/path/outline/soclevel1",
    summary:
      "Hands-on blue team path that mirrors a real junior SOC shift: triage alerts, investigate in a SIEM, escalate. Browser-based labs, no setup. Best practical bridge into a first analyst role.",
  },
  {
    id: "offsec-oscp-pen200",
    title: "PEN-200: Penetration Testing with Kali Linux (OSCP/OSCP+)",
    provider: "OffSec",
    durationHours: 321,
    level: "advanced",
    skills: ["penetration-testing","exploitation","active-directory","privilege-escalation"],
    tracks: ["cybersecurity"],
    url: "https://www.offsec.com/courses/pen-200/",
    summary:
      "The gold-standard offensive cert with a brutal 24-hour hands-on exam, no multiple choice. Enumeration, exploitation, AD, and privesc against live machines. For people committing to a pentest career.",
  },
];
