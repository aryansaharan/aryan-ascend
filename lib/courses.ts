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
];
