// Verified catalog for Ascend v0.2.
//
// Every entry was researched by one agent and re-checked by a second,
// adversarial one on 2026-10-20: the course page, the module names and hours,
// the price, the certificate, the free first step and any rating were copied
// from the pages listed in lib/course-sources.ts (kept out of this file so
// pages don't ship them; only the scripts read them). Per-entry research notes live outside
// the repo (ascend-notes/catalog-evidence.json). Re-run `npm run check:catalog`
// before each deploy; prices and outlines change.

import type { Course } from "./course-types";

export const COURSES: Course[] = [
  {
    "id": "aws-cloud-practitioner-essentials",
    "title": "AWS Cloud Practitioner Essentials",
    "provider": "AWS Skill Builder",
    "url": "https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Engineers new to cloud who want the core AWS services, pricing and security model before they deploy anything.",
    "modules": [
      {
        "name": "Module 1: Introduction to the Cloud",
        "hours": 0.98
      },
      {
        "name": "Module 2: Compute in the Cloud",
        "hours": 0.98
      },
      {
        "name": "Module 3: Exploring Compute Services",
        "hours": 0.98
      },
      {
        "name": "Module 4: Going Global",
        "hours": 0.98
      },
      {
        "name": "Module 5: Networking",
        "hours": 0.98
      },
      {
        "name": "Module 6: Storage",
        "hours": 0.98
      },
      {
        "name": "Module 7: Databases",
        "hours": 0.98
      },
      {
        "name": "Module 8: AI/ML and Data Analytics",
        "hours": 0.98
      },
      {
        "name": "Module 9: Security",
        "hours": 0.98
      },
      {
        "name": "Module 10: Monitoring, Compliance, and Governance in the AWS Cloud",
        "hours": 0.98
      },
      {
        "name": "Module 11: Pricing and Support",
        "hours": 0.98
      },
      {
        "name": "Module 12: Migrating to the AWS Cloud",
        "hours": 0.98
      }
    ],
    "beyond": {
      "label": "Module 13: Well-Architected Solutions",
      "hours": 0.99
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "free",
      "note": "Free with an AWS Skill Builder account."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Module 1: Introduction to the Cloud",
      "url": "https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7",
      "minutes": 59
    },
    "updatedYear": 2025,
    "roleHints": "cloud|aws|devops|infrastructure|sysadmin|support|backend",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "docker-build-and-share-an-app",
    "title": "Build and share a containerized application",
    "provider": "Docker",
    "url": "https://docs.docker.com/get-started/tutorials/run-an-app/",
    "kind": "docs",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You can install Docker Desktop and Git and run commands in a terminal.",
    "bestFor": "Engineers who want a first container in one sitting: run an app, start a multi container stack, build an image and share it on Docker Hub.",
    "modules": [
      {
        "name": "Build and share a containerized application",
        "hours": 0.25
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Needs Docker Desktop, Git and a free Docker account."
    },
    "certificate": "none",
    "freeStart": {
      "label": "The whole tutorial",
      "url": "https://docs.docker.com/get-started/tutorials/run-an-app/",
      "minutes": 15
    },
    "updatedYear": 2026,
    "roleHints": "docker|container|backend|developer|devops|full ?stack",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "ms-learn-github-actions-part-1",
    "title": "Automate your workflow with GitHub Actions Part 1 of 2",
    "provider": "Microsoft Learn",
    "url": "https://learn.microsoft.com/en-us/training/paths/github-actions/",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You have a GitHub account and can edit files in a repository.",
    "bestFor": "Engineers who want their code built, tested and deployed automatically by a GitHub Actions pipeline.",
    "modules": [
      {
        "name": "Automate development tasks by using GitHub Actions",
        "hours": 0.93
      },
      {
        "name": "Build continuous integration workflows by using GitHub Actions",
        "hours": 1.35
      },
      {
        "name": "Build and deploy applications to Azure by using GitHub Actions",
        "hours": 2.98
      },
      {
        "name": "Automate GitHub by using GitHub Script",
        "hours": 0.42
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "The Azure deploy module needs an Azure subscription; Azure offers a 30 day free trial."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Automate development tasks by using GitHub Actions",
      "url": "https://learn.microsoft.com/en-us/training/modules/github-actions-automate-tasks/",
      "minutes": 56
    },
    "updatedYear": 2026,
    "roleHints": "github|ci|cd|pipeline|devops|release|backend|developer",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "hashicorp-terraform-get-started-aws",
    "title": "Get Started - AWS",
    "provider": "HashiCorp Developer",
    "url": "https://developer.hashicorp.com/terraform/tutorials/aws-get-started",
    "kind": "docs",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You can use a terminal and can create an AWS account with access keys.",
    "bestFor": "Engineers who want a short first taste of infrastructure as code: create, change and destroy a real AWS server with Terraform.",
    "modules": [
      {
        "name": "What is Infrastructure as Code with Terraform?",
        "hours": 0.05
      },
      {
        "name": "Install Terraform",
        "hours": 0.12
      },
      {
        "name": "Create infrastructure",
        "hours": 0.23
      },
      {
        "name": "Manage infrastructure",
        "hours": 0.17
      },
      {
        "name": "Destroy infrastructure",
        "hours": 0.07
      },
      {
        "name": "Collaborate using HCP Terraform",
        "hours": 0.18
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Needs an AWS account. The tutorials use free tier resources; run the destroy step to avoid charges."
    },
    "certificate": "none",
    "freeStart": {
      "label": "What is Infrastructure as Code with Terraform?",
      "url": "https://developer.hashicorp.com/terraform/tutorials/aws-get-started/infrastructure-as-code",
      "minutes": 3
    },
    "updatedYear": 2025,
    "roleHints": "terraform|infrastructure|iac|devops|cloud|platform|sre",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "lf-introduction-to-kubernetes-lfs158",
    "title": "Introduction to Kubernetes (LFS158)",
    "provider": "The Linux Foundation",
    "url": "https://training.linuxfoundation.org/training/introduction-to-kubernetes/",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You can run commands in a terminal. Some Linux admin knowledge helps but is not required.",
    "bestFor": "Engineers who have run containers and want to deploy and expose apps on a local Kubernetes cluster with Minikube.",
    "modules": [
      {
        "name": "Chapter 1. Course Introduction",
        "hours": 1.03
      },
      {
        "name": "Chapter 2. From Monolith to Microservices",
        "hours": 1.03
      },
      {
        "name": "Chapter 3. Container Orchestration",
        "hours": 1.03
      },
      {
        "name": "Chapter 4. Kubernetes",
        "hours": 1.03
      },
      {
        "name": "Chapter 5. Kubernetes Architecture",
        "hours": 1.03
      },
      {
        "name": "Chapter 6. Installing Kubernetes",
        "hours": 1.03
      },
      {
        "name": "Chapter 7. Minikube: Installing Local Kubernetes Clusters",
        "hours": 1.03
      },
      {
        "name": "Chapter 8. Accessing Minikube",
        "hours": 1.03
      },
      {
        "name": "Chapter 9. Kubernetes Building Blocks",
        "hours": 1.03
      },
      {
        "name": "Chapter 10. Authentication, Authorization, Admission Control",
        "hours": 1.03
      },
      {
        "name": "Chapter 11. Services",
        "hours": 1.03
      },
      {
        "name": "Chapter 12. Deploying a Standalone Application",
        "hours": 1.03
      }
    ],
    "beyond": {
      "label": "Chapters 13 to 17",
      "hours": 5.14
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "free",
      "note": "Free, with 90 days of access after you enroll."
    },
    "certificate": "free",
    "freeStart": {
      "label": "Chapter 1. Course Introduction",
      "url": "https://training.linuxfoundation.org/training/introduction-to-kubernetes/",
      "minutes": 62
    },
    "updatedYear": 2025,
    "roleHints": "kubernetes|k8s|container|devops|platform|backend|sre",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "lf-kubernetes-fundamentals-lfs258",
    "title": "Kubernetes Fundamentals (LFS258)",
    "provider": "The Linux Foundation",
    "url": "https://training.linuxfoundation.org/training/kubernetes-fundamentals/",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You can work on the Linux command line, use a package manager, and use Git and GitHub.",
    "bestFor": "Engineers who run or will run Kubernetes in production and want cluster setup, security and troubleshooting at CKA depth.",
    "modules": [
      {
        "name": "Chapter 1. Course Introduction",
        "hours": 2.06
      },
      {
        "name": "Chapter 2. Basics of Kubernetes",
        "hours": 2.06
      },
      {
        "name": "Chapter 3. Installation and Configuration",
        "hours": 2.06
      },
      {
        "name": "Chapter 4. Kubernetes Architecture",
        "hours": 2.06
      },
      {
        "name": "Chapter 5. APIs and Access",
        "hours": 2.06
      },
      {
        "name": "Chapter 6. API Objects",
        "hours": 2.06
      },
      {
        "name": "Chapter 7. Managing State with Deployments",
        "hours": 2.06
      },
      {
        "name": "Chapter 8. Helm and Kustomize",
        "hours": 2.06
      },
      {
        "name": "Chapter 9. Volumes and Data",
        "hours": 2.06
      },
      {
        "name": "Chapter 10. Services",
        "hours": 2.06
      },
      {
        "name": "Chapter 11. Ingress",
        "hours": 2.06
      },
      {
        "name": "Chapter 12. Scheduling",
        "hours": 2.06
      }
    ],
    "beyond": {
      "label": "Chapters 13 to 17",
      "hours": 10.28
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 299,
      "currency": "USD",
      "note": "Course only, 12 months of access. A 625 USD bundle adds the CKA exam and a THRIVE-ONE annual subscription."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "roleHints": "kubernetes|k8s|platform|sre|devops|infrastructure|cloud",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "ibm-devops-software-engineering-certificate",
    "title": "IBM DevOps and Software Engineering Professional Certificate",
    "provider": "Coursera (IBM)",
    "url": "https://www.coursera.org/professional-certificates/devops-and-software-engineering",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Beginners with months to give who want one guided route through DevOps, Python, containers, CI/CD and monitoring.",
    "modules": [
      {
        "name": "Overview of DevOps",
        "hours": 2,
        "part": "Introduction to DevOps"
      },
      {
        "name": "Thinking DevOps",
        "hours": 2,
        "part": "Introduction to DevOps"
      },
      {
        "name": "Working DevOps",
        "hours": 2,
        "part": "Introduction to DevOps"
      },
      {
        "name": "Organizing for DevOps",
        "hours": 1,
        "part": "Introduction to DevOps"
      },
      {
        "name": "Measuring DevOps",
        "hours": 1,
        "part": "Introduction to DevOps"
      },
      {
        "name": "Case Studies and Final Exam",
        "hours": 2,
        "part": "Introduction to DevOps"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 15 of the certificate",
      "hours": 226
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price shown in India, with a 7 day free trial. Certificate needs the paid plan."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Module 1: Overview of DevOps (7 day free trial)",
      "url": "https://www.coursera.org/learn/intro-to-devops",
      "minutes": 120
    },
    "updatedYear": 2024,
    "rating": {
      "value": 4.6,
      "count": 65840,
      "source": "Coursera",
      "url": "https://www.coursera.org/professional-certificates/devops-and-software-engineering",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "devops|software engineer|developer|sre|cloud|platform",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "devops-handbook-2nd-edition",
    "title": "The DevOps Handbook, Second Edition",
    "provider": "IT Revolution",
    "url": "https://itrevolution.com/product/the-devops-handbook-second-edition/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "cloud",
        "role": "supporting",
        "baseline": 1
      }
    ],
    "assumes": "You have worked on a team that ships software and know roughly how a release reaches production.",
    "bestFor": "Engineers who want the reasoning behind deployment pipelines, telemetry and safe releases, with case studies to bring to their team.",
    "modules": [
      {
        "name": "Introduction",
        "hours": 0.57
      },
      {
        "name": "Part I: The Three Ways",
        "hours": 1.93
      },
      {
        "name": "Part II: Where to Start",
        "hours": 2.4
      },
      {
        "name": "Part III: The First Way: The Technical Practices of Flow",
        "hours": 3
      },
      {
        "name": "Part IV: The Second Way: The Technical Practices of Feedback",
        "hours": 2.67
      },
      {
        "name": "Part V: The Third Way: The Technical Practices of Continual Learning and Experimentation",
        "hours": 1.6
      },
      {
        "name": "Part VI: The Technological Practices of Integrating Information Security, Change Management, and Compliance",
        "hours": 1.6
      },
      {
        "name": "A Call to Action: Conclusion to The DevOps Handbook",
        "hours": 0.13
      },
      {
        "name": "Afterword to the Second Edition",
        "hours": 0.27
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 3649.9,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Free publisher excerpt: Introduction and Chapters 1 to 2",
      "url": "https://itrevolution.com/wp-content/uploads/2022/06/DOHB2_Excerpt.pdf",
      "minutes": 98
    },
    "updatedYear": 2021,
    "roleHints": "devops|release|platform|sre|tech lead|engineering manager|infrastructure",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-sre-book",
    "title": "Site Reliability Engineering",
    "provider": "Google (O'Reilly)",
    "url": "https://sre.google/sre-book/table-of-contents/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "cloud",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You run or support a service in production and know the basics of deploys and monitoring.",
    "bestFor": "Engineers running production who want SLOs, toil reduction, alerting and incident practice from Google's SRE team.",
    "modules": [
      {
        "name": "1. Introduction",
        "hours": 1.08
      },
      {
        "name": "2. The Production Environment at Google, from the Viewpoint of an SRE",
        "hours": 1.08
      },
      {
        "name": "3. Embracing Risk",
        "hours": 1.08
      },
      {
        "name": "4. Service Level Objectives",
        "hours": 1.08
      },
      {
        "name": "5. Eliminating Toil",
        "hours": 1.08
      },
      {
        "name": "6. Monitoring Distributed Systems",
        "hours": 1.08
      },
      {
        "name": "7. The Evolution of Automation at Google",
        "hours": 1.08
      },
      {
        "name": "8. Release Engineering",
        "hours": 1.08
      },
      {
        "name": "9. Simplicity",
        "hours": 1.08
      },
      {
        "name": "10. Practical Alerting",
        "hours": 1.08
      },
      {
        "name": "11. Being On-Call",
        "hours": 1.08
      },
      {
        "name": "12. Effective Troubleshooting",
        "hours": 1.08
      }
    ],
    "beyond": {
      "label": "Chapters 13 to 34",
      "hours": 23.71
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "free",
      "note": "Free to read online at sre.google. Google also sells a rewritten 2nd edition."
    },
    "certificate": "none",
    "freeStart": {
      "label": "1. Introduction",
      "url": "https://sre.google/sre-book/introduction/",
      "minutes": 65
    },
    "updatedYear": 2016,
    "roleHints": "sre|site reliability|devops|platform|infrastructure|on.?call|ops",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "anthropic-claude-platform-101",
    "title": "Claude Platform 101",
    "provider": "Anthropic",
    "url": "https://academy.claude.com/courses/claude-platform-101",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You can read and write code in one language and run a script from the command line. No LLM experience needed.",
    "bestFor": "Developers who have only used Claude in a chat window and want to make a first API call, then build a small agent with tools.",
    "modules": [
      {
        "name": "What is the Claude Platform?",
        "hours": 0.27
      },
      {
        "name": "Teaching your agent",
        "hours": 0.33
      },
      {
        "name": "Extending your agent",
        "hours": 0.4
      },
      {
        "name": "Managed Agents",
        "hours": 0.25
      },
      {
        "name": "Building with Claude Code",
        "hours": 0.08
      },
      {
        "name": "Claude Platform 101 quiz",
        "hours": 0.05
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Running the demos needs an API key; new Claude Console accounts get a small free credit."
    },
    "certificate": "free",
    "freeStart": {
      "label": "Lessons 1 and 2: What is the Claude Platform? and Your first API call",
      "url": "https://academy.claude.com/courses/claude-platform-101/what-is-the-claude-platform",
      "minutes": 11
    },
    "updatedYear": 2026,
    "roleHints": "software|developer|full ?stack|backend|web",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "deeplearning-ai-chatgpt-prompt-engineering",
    "title": "ChatGPT Prompt Engineering for Developers",
    "provider": "DeepLearning.AI",
    "url": "https://www.deeplearning.ai/courses/chatgpt-prompt-eng",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You can read and run basic Python.",
    "requires": [
      "python"
    ],
    "bestFor": "Developers who want a quick look at prompting an LLM from code with the OpenAI API, recorded in 2023, before they have ever called an API.",
    "modules": [
      {
        "name": "Introduction",
        "hours": 0.1
      },
      {
        "name": "Guidelines",
        "hours": 0.28
      },
      {
        "name": "Iterative",
        "hours": 0.22
      },
      {
        "name": "Summarizing",
        "hours": 0.12
      },
      {
        "name": "Inferring",
        "hours": 0.18
      },
      {
        "name": "Transforming",
        "hours": 0.2
      },
      {
        "name": "Expanding",
        "hours": 0.1
      },
      {
        "name": "Chatbot",
        "hours": 0.2
      },
      {
        "name": "Conclusion",
        "hours": 0.03
      },
      {
        "name": "Quiz",
        "hours": 0.17
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Lessons are free during the DeepLearning.AI platform beta; the graded quiz and accomplishment need Pro."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Lesson 1: Introduction",
      "url": "https://learn.deeplearning.ai/courses/chatgpt-prompt-eng/lesson/dfbds/introduction",
      "minutes": 6
    },
    "updatedYear": 2023,
    "roleHints": "python|backend|developer",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-ml-crash-course",
    "title": "Machine Learning Crash Course",
    "provider": "Google",
    "url": "https://developers.google.com/machine-learning/crash-course",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "supporting",
        "baseline": 0
      },
      {
        "move": "ai-pm",
        "role": "supporting",
        "baseline": 1
      }
    ],
    "assumes": "Some Python with NumPy and pandas, plus algebra, basic linear algebra and statistics.",
    "requires": [
      "python"
    ],
    "bestFor": "Engineers who want the machine learning basics behind LLMs, including embeddings and a short intro to how LLMs work.",
    "modules": [
      {
        "name": "Linear Regression",
        "hours": 1.33
      },
      {
        "name": "Logistic Regression",
        "hours": 0.58
      },
      {
        "name": "Classification",
        "hours": 1.17
      },
      {
        "name": "Working with Numerical Data",
        "hours": 1.42
      },
      {
        "name": "Working with Categorical Data",
        "hours": 0.83
      },
      {
        "name": "Datasets, Generalization, and Overfitting",
        "hours": 1.75
      },
      {
        "name": "Neural Networks",
        "hours": 1.25
      },
      {
        "name": "Embeddings",
        "hours": 0.75
      },
      {
        "name": "Intro to Large Language Models",
        "hours": 0.75
      },
      {
        "name": "Production ML Systems",
        "hours": 1.17
      },
      {
        "name": "AutoML",
        "hours": 0.5
      },
      {
        "name": "ML Fairness",
        "hours": 1.83
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Intro to Large Language Models module (modules are self-contained)",
      "url": "https://developers.google.com/machine-learning/crash-course/llm",
      "minutes": 45
    },
    "updatedYear": 2026,
    "roleHints": "data|analyst|scientist|ml",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "coursera-machine-learning-specialization",
    "title": "Machine Learning Specialization",
    "provider": "Coursera (DeepLearning.AI and Stanford Online)",
    "url": "https://www.coursera.org/specializations/machine-learning-introduction",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "supporting",
        "baseline": 0
      }
    ],
    "assumes": "Basic coding such as loops, functions and if statements, plus high school algebra.",
    "bestFor": "People who want classic machine learning foundations such as regression, neural networks and trees before or alongside LLM work.",
    "modules": [
      {
        "name": "Week 1: Introduction to Machine Learning",
        "hours": 7,
        "part": "Supervised Machine Learning: Regression and Classification"
      },
      {
        "name": "Week 2: Regression with multiple input variables",
        "hours": 10,
        "part": "Supervised Machine Learning: Regression and Classification"
      },
      {
        "name": "Week 3: Classification",
        "hours": 16,
        "part": "Supervised Machine Learning: Regression and Classification"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 3 of the certificate",
      "hours": 62
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 49,
      "currency": "USD",
      "period": "month",
      "note": "Free preview covers Week 1 of Course 1; full access and certificates need the subscription."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview of Course 1, Week 1: first three videos",
      "url": "https://www.coursera.org/learn/machine-learning",
      "minutes": 12
    },
    "updatedYear": 2022,
    "rating": {
      "value": 4.9,
      "count": 39419,
      "source": "Coursera",
      "url": "https://www.coursera.org/specializations/machine-learning-introduction",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "data|scientist|analyst|ml|machine learning",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "hugging-face-agents-course",
    "title": "AI Agents Course",
    "provider": "Hugging Face",
    "url": "https://huggingface.co/learn/agents-course/unit0/introduction",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "Basic Python and a rough idea of what an LLM is.",
    "requires": [
      "python"
    ],
    "bestFor": "Developers who have tried an LLM API and want to build agents with tools using smolagents, LlamaIndex and LangGraph, with a free certificate.",
    "modules": [
      {
        "name": "Unit 1. Introduction to Agents",
        "hours": 3.5
      },
      {
        "name": "Unit 2.1 The smolagents framework",
        "hours": 3.5
      },
      {
        "name": "Unit 2.2 The LlamaIndex framework",
        "hours": 3.5
      },
      {
        "name": "Unit 2.3 The LangGraph framework",
        "hours": 3.5
      },
      {
        "name": "Unit 3. Use Case for Agentic RAG",
        "hours": 3.5
      },
      {
        "name": "Unit 4. Final Project - Create, Test, and Certify Your Agent",
        "hours": 3.5
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Unit 1 introduction and What are Agents?",
      "url": "https://huggingface.co/learn/agents-course/unit1/introduction",
      "minutes": 15
    },
    "updatedYear": 2026,
    "roleHints": "python|ml|machine learning|data|backend",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "deeplearning-ai-agentic-ai",
    "title": "Agentic AI",
    "provider": "DeepLearning.AI",
    "url": "https://www.deeplearning.ai/courses/agentic-ai",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "Intermediate Python and a basic grasp of LLMs and APIs.",
    "requires": [
      "python"
    ],
    "bestFor": "Developers with a working demo who want to design agent workflows with reflection, tool use, planning and evals, taught by Andrew Ng.",
    "modules": [
      {
        "name": "Module 1: Introduction to Agentic Workflows",
        "hours": 2.05
      },
      {
        "name": "Module 2: Reflection Design Pattern",
        "hours": 2.05
      },
      {
        "name": "Module 3: Tool use",
        "hours": 2.1
      },
      {
        "name": "Module 4: Practical Tips for Building Agentic AI",
        "hours": 1.22
      },
      {
        "name": "Module 5: Patterns for Highly Autonomous Agents",
        "hours": 2.27
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 30,
      "currency": "USD",
      "period": "month",
      "note": "Pro is 30 USD a month, or 25 USD a month billed yearly. A free audit covers the videos and forum only, without quizzes, labs or the certificate."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Module 1 opening videos: the welcome and What is agentic AI?",
      "url": "https://learn.deeplearning.ai/courses/agentic-ai/lesson/pu5xbv/welcome!",
      "minutes": 6
    },
    "updatedYear": 2026,
    "roleHints": "python|backend|software|automation",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "deeplearning-ai-evaluating-ai-agents",
    "title": "Evaluating AI Agents",
    "provider": "DeepLearning.AI",
    "url": "https://www.deeplearning.ai/courses/evaluating-ai-agents",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "Basic Python. Prompting experience helps but is not required; it is most useful once you have an agent or LLM feature to test.",
    "requires": [
      "python"
    ],
    "bestFor": "Engineers with an LLM feature or agent who need tracing, LLM-as-a-judge and trajectory evals to see where it fails.",
    "modules": [
      {
        "name": "Introduction",
        "hours": 0.05
      },
      {
        "name": "Evaluation in the time of LLMs",
        "hours": 0.12
      },
      {
        "name": "Decomposing agents + Lab 1: Building your agent",
        "hours": 0.37
      },
      {
        "name": "Tracing agents + Lab 2: Tracing your agent",
        "hours": 0.33
      },
      {
        "name": "Adding router and skill evaluations + Lab 3: Adding router and skill evaluations",
        "hours": 0.48
      },
      {
        "name": "Adding trajectory evaluations + Lab 4: Adding trajectory evaluations",
        "hours": 0.23
      },
      {
        "name": "Adding structure to your evaluations + Lab 5: Adding structure to your evaluations",
        "hours": 0.37
      },
      {
        "name": "Improving your LLM-as-a-judge",
        "hours": 0.07
      },
      {
        "name": "Monitoring agents",
        "hours": 0.1
      },
      {
        "name": "Conclusion",
        "hours": 0.02
      },
      {
        "name": "Quiz",
        "hours": 0.17
      },
      {
        "name": "Appendix - Resources, Tips and Help",
        "hours": 0.17
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Lessons and labs are free during the DeepLearning.AI platform beta; the graded quiz and accomplishment need Pro."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Introduction and Evaluation in the time of LLMs",
      "url": "https://learn.deeplearning.ai/courses/evaluating-ai-agents/lesson/sqkza/introduction",
      "minutes": 10
    },
    "updatedYear": 2026,
    "roleHints": "qa|test|quality|sdet|reliability|python",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "chip-huyen-ai-engineering",
    "title": "AI Engineering: Building Applications with Foundation Models",
    "provider": "O'Reilly Media (Chip Huyen)",
    "url": "https://github.com/chiphuyen/aie-book",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 1
      },
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "Comfort with technical reading; it helps to have built a demo on an LLM API. It is not a tutorial and has few code snippets.",
    "bestFor": "Engineers moving an LLM demo toward production who want the full picture: evaluation, prompting, RAG, agents, finetuning, cost and latency.",
    "modules": [
      {
        "name": "Chapter 1. Introduction to Building AI Applications with Foundation Models",
        "hours": 3.2
      },
      {
        "name": "Chapter 2. Understanding Foundation Models",
        "hours": 4.27
      },
      {
        "name": "Chapter 3. Evaluation Methodology",
        "hours": 3.07
      },
      {
        "name": "Chapter 4. Evaluate AI Systems",
        "hours": 3.47
      },
      {
        "name": "Chapter 5. Prompt Engineering",
        "hours": 2.8
      },
      {
        "name": "Chapter 6. RAG and Agents",
        "hours": 3.6
      },
      {
        "name": "Chapter 7. Finetuning",
        "hours": 3.73
      },
      {
        "name": "Chapter 8. Dataset Engineering",
        "hours": 2.8
      },
      {
        "name": "Chapter 9. Inference Optimization",
        "hours": 2.93
      },
      {
        "name": "Chapter 10. AI Engineering Architecture and User Feedback",
        "hours": 3.07
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 2500,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Chapter summaries from the book, free on the author's GitHub",
      "url": "https://github.com/chiphuyen/aie-book/blob/main/chapter-summaries.md",
      "minutes": 25
    },
    "updatedYear": 2025,
    "roleHints": "ml|machine learning|data|platform|architect|lead|manager",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "maven-ai-evals",
    "title": "AI Evals For Engineers & PMs",
    "provider": "Maven (Hamel Husain and Shreya Shankar)",
    "url": "https://maven.com/parlance-labs/evals",
    "kind": "course",
    "format": "cohort",
    "moves": [
      {
        "move": "ai-build",
        "role": "core",
        "baseline": 2
      },
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "It helps to already be building an LLM feature; this is a deep dive, not an intro to LLMs or prompting.",
    "bestFor": "Engineers and PMs who own an AI feature and want a hands-on evals practice with live sessions, homework and office hours.",
    "modules": [
      {
        "name": "L1: Building Agents You Can Evaluate",
        "hours": 4
      },
      {
        "name": "L2: Building Agents, Synthetic Data & Scenarios",
        "hours": 4
      },
      {
        "name": "L3: Error Analysis, Finding Failures",
        "hours": 4
      },
      {
        "name": "L4: Error Analysis, Measuring with Evaluators",
        "hours": 4
      },
      {
        "name": "L5: CI/CD for Agents",
        "hours": 4
      },
      {
        "name": "L6: Safety & Adversarial Evaluation",
        "hours": 4
      },
      {
        "name": "L7: Improving Agents: Accuracy & Joint Optimization",
        "hours": 4
      },
      {
        "name": "L8: Improving Agents: Cost",
        "hours": 4
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 4200,
      "currency": "USD",
      "note": "Live cohort Oct 10 to Nov 21, 2026, the last of 2026, enrollment closing about Oct 23; includes lifetime access to recordings and future cohorts."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "rating": {
      "value": 4.7,
      "count": 1039,
      "source": "Maven",
      "url": "https://maven.com/parlance-labs/evals",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "lead|senior|staff|qa|test|product|ml",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-ml-problem-framing",
    "title": "Introduction to Machine Learning Problem Framing",
    "provider": "Google for Developers",
    "url": "https://developers.google.com/machine-learning/problem-framing",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You can describe a product problem and its goal in plain words. No ML background needed.",
    "bestFor": "PMs deciding whether an idea needs predictive ML, generative AI or no AI at all, and how to frame it and define success.",
    "modules": [
      {
        "name": "Overview",
        "hours": 0.25
      },
      {
        "name": "ML Problem Framing",
        "hours": 0.25
      },
      {
        "name": "Conclusion",
        "hours": 0.25
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Understand the problem, the first ML Problem Framing lesson",
      "url": "https://developers.google.com/machine-learning/problem-framing/problem",
      "minutes": 13
    },
    "updatedYear": 2025,
    "roleHints": "product|\\bpm\\b|product owner|analyst|founder",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "anthropic-ai-fluency-framework-foundations",
    "title": "AI Fluency: Framework & Foundations",
    "provider": "Anthropic Academy",
    "url": "https://anthropic.skilljar.com/ai-fluency-framework-foundations",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-pm",
        "role": "supporting",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "People who already use AI tools and want a clear way to delegate work to AI, describe tasks well and check what comes back.",
    "modules": [
      {
        "name": "Introduction to AI Fluency",
        "hours": 0.07
      },
      {
        "name": "The AI Fluency Framework",
        "hours": 0.25
      },
      {
        "name": "Deep Dive 1: What is Generative AI?",
        "hours": 0.22
      },
      {
        "name": "Delegation",
        "hours": 0.43
      },
      {
        "name": "Description",
        "hours": 0.17
      },
      {
        "name": "Deep Dive 2: Effective prompting techniques",
        "hours": 0.17
      },
      {
        "name": "Discernment",
        "hours": 0.08
      },
      {
        "name": "The Description-Discernment loop",
        "hours": 0.17
      },
      {
        "name": "Diligence",
        "hours": 0.33
      },
      {
        "name": "Conclusion & certificate",
        "hours": 1
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Introduction to AI Fluency and The AI Fluency Framework, the first two sections (free sign-up)",
      "url": "https://anthropic.skilljar.com/ai-fluency-framework-foundations",
      "minutes": 19
    },
    "updatedYear": 2026,
    "rating": {
      "value": 4.8,
      "count": 168,
      "source": "Coursera",
      "url": "https://www.coursera.org/learn/ai-fluency-framework-foundations",
      "checkedOn": "2026-10-20"
    },
    "lastVerified": "2026-10-20"
  },
  {
    "id": "nika-building-ai-powered-products",
    "title": "Building AI-Powered Products: The Essential Guide to AI and GenAI Product Management",
    "provider": "O'Reilly (Marily Nika)",
    "url": "https://www.amazon.in/dp/9355429355",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You know how a product team plans and ships features. No AI background needed.",
    "bestFor": "PMs who want one plain guide to the AI product lifecycle, the AI PM role, goals and success metrics, and AI agents.",
    "modules": [
      {
        "name": "1. The Role of AI Product Managers",
        "hours": 0.84
      },
      {
        "name": "2. The AI Product Development Lifecycle",
        "hours": 1.01
      },
      {
        "name": "3. Essential AI PM Knowledge",
        "hours": 1.52
      },
      {
        "name": "4. The AI PM’s Day-to-Day",
        "hours": 0.79
      },
      {
        "name": "5. Strategic Thinking in AI",
        "hours": 0.57
      },
      {
        "name": "6. Setting Goals and Measuring Success",
        "hours": 0.44
      },
      {
        "name": "7. AI Tools for Product Managers",
        "hours": 0.17
      },
      {
        "name": "8. Building AI Agents",
        "hours": 0.84
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 1150,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": null,
    "updatedYear": 2025,
    "roleHints": "product|\\bpm\\b|product owner|program manager",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "coursera-ibm-ai-product-manager",
    "title": "IBM AI Product Manager Professional Certificate",
    "provider": "Coursera (IBM)",
    "url": "https://www.coursera.org/professional-certificates/ibm-ai-product-manager",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "People new to product management who want PM basics and generative AI skills in one long certificate.",
    "modules": [
      {
        "name": "Product Manager Profession Overview",
        "hours": 3,
        "part": "Product Management: An Introduction"
      },
      {
        "name": "The Product Lifecycle and the Product Manager",
        "hours": 4,
        "part": "Product Management: An Introduction"
      },
      {
        "name": "Product Management Fundamentals",
        "hours": 3,
        "part": "Product Management: An Introduction"
      },
      {
        "name": "Product Management Opportunities and Certifications",
        "hours": 2,
        "part": "Product Management: An Introduction"
      },
      {
        "name": "Final Project, Assessment and Course Wrap-up",
        "hours": 2,
        "part": "Product Management: An Introduction"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 10 of the certificate",
      "hours": 111
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price shown for India. 7-day free trial on the monthly plan."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Module 1, Product Manager Profession Overview, inside the 7-day free trial (card needed)",
      "url": "https://www.coursera.org/learn/product-management-an-introduction",
      "minutes": 180
    },
    "updatedYear": 2024,
    "rating": {
      "value": 4.7,
      "count": 36654,
      "source": "Coursera",
      "url": "https://www.coursera.org/professional-certificates/ibm-ai-product-manager",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "product|\\bpm\\b|product owner|analyst",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-managing-ml-projects",
    "title": "Managing ML projects",
    "provider": "Google for Developers",
    "url": "https://developers.google.com/machine-learning/managing-ml-projects",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You know basic ML terms and have already checked that ML or generative AI fits your problem.",
    "bestFor": "PMs running an ML or generative AI project who need its phases, feasibility checks, success metrics and the path to production.",
    "modules": [
      {
        "name": "Introduction",
        "hours": 0.5
      },
      {
        "name": "Ideation and planning",
        "hours": 0.375
      },
      {
        "name": "Experiments to production",
        "hours": 0.375
      },
      {
        "name": "Global considerations and resources",
        "hours": 0.25
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Introduction section: overview, development phases, team and stakeholders",
      "url": "https://developers.google.com/machine-learning/managing-ml-projects",
      "minutes": 30
    },
    "updatedYear": 2025,
    "roleHints": "project|program manager|product|\\bpm\\b|delivery|manager",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "reforge-ai-evals",
    "title": "AI Evals",
    "provider": "Reforge",
    "url": "https://www.reforge.com/courses/ai-evals",
    "kind": "course",
    "format": "cohort",
    "moves": [
      {
        "move": "ai-pm",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You work as a PM and are building, or about to build, an AI feature or agent.",
    "bestFor": "PMs who need to write an AI PRD, set up golden datasets and eval rubrics, and read traces to judge AI quality.",
    "modules": [
      {
        "name": "The Evaluation Gap",
        "hours": 4
      },
      {
        "name": "AI PRDs & Eval-driven Roadmaps",
        "hours": 4
      },
      {
        "name": "Eval Lifecycle and Introduction to Trace Analysis",
        "hours": 4
      },
      {
        "name": "Automated Evaluation - Code-based & LLM-as-Judge",
        "hours": 4
      },
      {
        "name": "Evaluating Agent Architectures",
        "hours": 4
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "subscription",
      "amount": 1995,
      "currency": "USD",
      "period": "year",
      "note": "Reforge membership, plus tax. Live courses are included; the 14-day trial cannot join them."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "roleHints": "product|\\bpm\\b|product owner|lead|head|director",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "kaggle-intro-to-sql",
    "title": "Intro to SQL",
    "provider": "Kaggle",
    "url": "https://www.kaggle.com/learn/intro-to-sql",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Basic Python, which Kaggle lists as the course this builds on, because the queries run from Python notebooks. No SQL needed.",
    "requires": [
      "python"
    ],
    "bestFor": "Spreadsheet users with a little Python who want a free, short first run at SQL that ends with joins.",
    "modules": [
      {
        "name": "Getting Started With SQL and BigQuery",
        "hours": 0.5
      },
      {
        "name": "Select, From & Where",
        "hours": 0.5
      },
      {
        "name": "Group By, Having & Count",
        "hours": 0.5
      },
      {
        "name": "Order By",
        "hours": 0.5
      },
      {
        "name": "As & With",
        "hours": 0.5
      },
      {
        "name": "Joining Data",
        "hours": 0.5
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Lesson 1: Getting Started With SQL and BigQuery",
      "url": "https://www.kaggle.com/code/dansbecker/getting-started-with-sql-and-bigquery",
      "minutes": 30
    },
    "updatedYear": 2024,
    "roleHints": "analyst|mis|reporting|operations",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "microsoft-learn-power-bi-pl-300",
    "title": "Design and manage analytics solutions using Power BI",
    "provider": "Microsoft Learn",
    "url": "https://learn.microsoft.com/en-us/training/courses/pl-300t00",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You know what a report or dashboard metric means. No prior data tool experience needed.",
    "bestFor": "Spreadsheet users who want to build Power BI reports and dashboards, from loading data through DAX to sharing.",
    "modules": [
      {
        "name": "Explore the analytics process that turns data into insights",
        "hours": 0.3,
        "part": "Get started with Microsoft data analytics"
      },
      {
        "name": "Get started building with Power BI",
        "hours": 0.35,
        "part": "Get started with Microsoft data analytics"
      },
      {
        "name": "Introduction to end-to-end analytics using Microsoft Fabric",
        "hours": 0.37,
        "part": "Get started with Microsoft data analytics"
      },
      {
        "name": "Get started with Copilot in Power BI",
        "hours": 0.45,
        "part": "Get started with Microsoft data analytics"
      }
    ],
    "beyond": {
      "label": "Learning paths 2 to 5 of the course",
      "hours": 18.4
    },
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Self-paced study is free. The PL-300 certification exam costs $165 USD, and the price varies by country."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Module 1: Explore the analytics process that turns data into insights",
      "url": "https://learn.microsoft.com/en-us/training/modules/data-analytics-microsoft/",
      "minutes": 18
    },
    "updatedYear": 2026,
    "roleHints": "excel|mis|finance|accounts|operations|reporting|business analyst|bi",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-data-analytics",
    "title": "Google Data Analytics Professional Certificate",
    "provider": "Coursera (Google)",
    "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Career switchers who want one guided path through spreadsheets, SQL, Tableau and Python, with a portfolio case study.",
    "modules": [
      {
        "name": "Introducing data analytics and analytical thinking",
        "hours": 4,
        "part": "Foundations: Data, Data, Everywhere"
      },
      {
        "name": "The wonderful world of data",
        "hours": 3,
        "part": "Foundations: Data, Data, Everywhere"
      },
      {
        "name": "Set up your data analytics toolbox",
        "hours": 3,
        "part": "Foundations: Data, Data, Everywhere"
      },
      {
        "name": "Become a fair and impactful data professional",
        "hours": 3,
        "part": "Foundations: Data, Data, Everywhere"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 9 of the certificate",
      "hours": 139
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 1888,
      "currency": "INR",
      "period": "month",
      "note": "Price shown for India after a 7 day free trial. The certificate needs the subscription."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview of Course 1, Module 1: Introducing data analytics and analytical thinking",
      "url": "https://www.coursera.org/learn/foundations-data",
      "minutes": 240
    },
    "updatedYear": 2026,
    "rating": {
      "value": 4.8,
      "count": 182687,
      "source": "Coursera",
      "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "associate|executive|coordinator|operations|graduate|fresher",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "kaggle-advanced-sql",
    "title": "Advanced SQL",
    "provider": "Kaggle",
    "url": "https://www.kaggle.com/learn/advanced-sql",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You can write SELECT, GROUP BY and JOIN queries, as taught in Kaggle's Intro to SQL.",
    "requires": [
      "python"
    ],
    "bestFor": "Analysts who write basic SQL and want window functions, unions, nested data and faster queries.",
    "modules": [
      {
        "name": "JOINs and UNIONs",
        "hours": 1
      },
      {
        "name": "Analytic Functions",
        "hours": 1
      },
      {
        "name": "Nested and Repeated Data",
        "hours": 1
      },
      {
        "name": "Writing Efficient Queries",
        "hours": 1
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Lesson 1: JOINs and UNIONs",
      "url": "https://www.kaggle.com/code/alexisbcook/joins-and-unions",
      "minutes": 60
    },
    "updatedYear": 2023,
    "roleHints": "analyst|engineer|developer|scientist",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "trailhead-tableau-public-storytelling",
    "title": "Tell Stories with Data Using Tableau Public",
    "provider": "Trailhead (Salesforce)",
    "url": "https://trailhead.salesforce.com/content/learn/trails/tell-stories-with-data-using-tableau-public",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You are comfortable with spreadsheets and basic charts. The first unit walks you through setting up a free Tableau Public account.",
    "bestFor": "People who want to build a dashboard on a real dataset in free Tableau Public, right in the browser.",
    "modules": [
      {
        "name": "The Tableau Data Model",
        "hours": 0.58
      },
      {
        "name": "Metadata Management in Tableau",
        "hours": 0.83
      },
      {
        "name": "Detailed Data Analysis in Tableau",
        "hours": 1.42
      },
      {
        "name": "Data Presentation in Tableau",
        "hours": 1.5
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Needs free Trailhead and Tableau Public accounts."
    },
    "certificate": "free",
    "freeStart": {
      "label": "Module 1: The Tableau Data Model",
      "url": "https://trailhead.salesforce.com/content/learn/modules/the-tableau-data-model",
      "minutes": 35
    },
    "updatedYear": 2026,
    "roleHints": "analyst|marketing|sales|salesforce|tableau|consultant",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "datacamp-data-analyst-in-python",
    "title": "Data Analyst in Python",
    "provider": "DataCamp",
    "url": "https://www.datacamp.com/tracks/data-analyst-with-python",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "No coding needed. The track starts Python from the basics.",
    "bestFor": "Analysts who want Python for cleaning, joining, charting and basic statistics, with guided projects along the way.",
    "modules": [
      {
        "name": "Python Basics",
        "hours": 1,
        "part": "Introduction to Python"
      },
      {
        "name": "Python Lists",
        "hours": 1,
        "part": "Introduction to Python"
      },
      {
        "name": "Functions and Packages",
        "hours": 1,
        "part": "Introduction to Python"
      },
      {
        "name": "NumPy",
        "hours": 1,
        "part": "Introduction to Python"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 9 of the track, with its projects",
      "hours": 32
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "subscription",
      "amount": 7128,
      "currency": "INR",
      "period": "year",
      "note": "Premium shown as ₹594 a month billed annually, labelled Special Price on 2026-10-20."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Chapter 1 of Introduction to Python: Python Basics",
      "url": "https://www.datacamp.com/courses/intro-to-python-for-data-science",
      "minutes": 60
    },
    "updatedYear": 2026,
    "rating": {
      "value": 4.6,
      "count": 109,
      "source": "DataCamp",
      "url": "https://www.datacamp.com/tracks/data-analyst-with-python",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "analyst|scientist|researcher|python",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "kaggle-pandas",
    "title": "Pandas",
    "provider": "Kaggle",
    "url": "https://www.kaggle.com/learn/pandas",
    "kind": "practice",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "supporting",
        "baseline": 1
      }
    ],
    "assumes": "Basic Python, which Kaggle lists as the course this one builds on.",
    "requires": [
      "python"
    ],
    "bestFor": "Analysts with some Python who want short pandas drills for reading, cleaning, grouping and combining data.",
    "modules": [
      {
        "name": "Creating, Reading and Writing",
        "hours": 0.67
      },
      {
        "name": "Indexing, Selecting & Assigning",
        "hours": 0.67
      },
      {
        "name": "Summary Functions and Maps",
        "hours": 0.67
      },
      {
        "name": "Grouping and Sorting",
        "hours": 0.67
      },
      {
        "name": "Data Types and Missing Values",
        "hours": 0.66
      },
      {
        "name": "Renaming and Combining",
        "hours": 0.66
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Lesson 1: Creating, Reading and Writing",
      "url": "https://www.kaggle.com/code/residentmario/creating-reading-and-writing",
      "minutes": 40
    },
    "updatedYear": 2023,
    "roleHints": "python|developer|engineer|scientist|researcher",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "dbt-fundamentals",
    "title": "dbt Fundamentals (dbt Studio)",
    "provider": "dbt Labs",
    "url": "https://learn.getdbt.com/courses/dbt-fundamentals",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You write SQL selects and joins comfortably. No dbt experience needed.",
    "bestFor": "Analysts whose dashboards depend on SQL they maintain, who want tested and documented models instead of loose queries.",
    "modules": [
      {
        "name": "Welcome to dbt Fundamentals",
        "hours": 0.08
      },
      {
        "name": "Analytics Development Lifecycle",
        "hours": 0.5
      },
      {
        "name": "Set Up dbt",
        "hours": 1
      },
      {
        "name": "Models",
        "hours": 1
      },
      {
        "name": "Sources",
        "hours": 1
      },
      {
        "name": "Data Tests",
        "hours": 1
      },
      {
        "name": "Documentation",
        "hours": 0.67
      },
      {
        "name": "Deployment",
        "hours": 0.5
      },
      {
        "name": "Survey and Next Steps",
        "hours": 0.08
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Free with a dbt Learn account."
    },
    "certificate": "free",
    "freeStart": {
      "label": "First lessons: Welcome and Analytics Development Lifecycle (free sign up)",
      "url": "https://learn.getdbt.com/learn/course/dbt-fundamentals/welcome-to-dbt-fundamentals-5min/welcome",
      "minutes": 35
    },
    "updatedYear": 2025,
    "roleHints": "analytics engineer|data engineer|bi|dbt|analyst",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "storytelling-with-data",
    "title": "Storytelling with Data: A Data Visualization Guide for Business Professionals",
    "provider": "Wiley (Cole Nussbaumer Knaflic)",
    "url": "https://www.wiley.com/en-us/storytelling-with-data-a-data-visualization-guide-for-business-professionals-p-9781119002253",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "data",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You already make charts or dashboards in Excel, Tableau or Power BI.",
    "bestFor": "People whose charts and dashboards others rely on, who want each one to make one clear point.",
    "modules": [
      {
        "name": "Introduction",
        "hours": 0.6
      },
      {
        "name": "Chapter 1: The importance of context",
        "hours": 0.53
      },
      {
        "name": "Chapter 2: Choosing an effective visual",
        "hours": 1.2
      },
      {
        "name": "Chapter 3: Clutter is your enemy!",
        "hours": 0.93
      },
      {
        "name": "Chapter 4: Focus your audience's attention",
        "hours": 0.93
      },
      {
        "name": "Chapter 5: Think like a designer",
        "hours": 0.8
      },
      {
        "name": "Chapter 6: Dissecting model visuals",
        "hours": 0.47
      },
      {
        "name": "Chapter 7: Lessons in storytelling",
        "hours": 0.73
      },
      {
        "name": "Chapter 8: Pulling it all together",
        "hours": 0.67
      },
      {
        "name": "Chapter 9: Case studies",
        "hours": 1.13
      },
      {
        "name": "Chapter 10: Final thoughts",
        "hours": 0.53
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 3943.3,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Free sample from Wiley: Chapter 1, the importance of context",
      "url": "https://media.wiley.com/product_data/excerpt/57/11190022/1119002257-4.pdf",
      "minutes": 32
    },
    "updatedYear": 2015,
    "roleHints": "manager|consultant|marketing|strategy|finance|product",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "reforge-product-growth-foundations",
    "title": "Product Growth Foundations",
    "provider": "Reforge",
    "url": "https://www.reforge.com/courses/growth-series/details",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You work on a digital product and can read basic metrics like signups and active users.",
    "bestFor": "PMs and marketers new to growth who want one model of how their product acquires, retains and monetizes users.",
    "modules": [
      {
        "name": "Course Introduction",
        "hours": 2.77
      },
      {
        "name": "Retention",
        "hours": 1.08
      },
      {
        "name": "Acquisition",
        "hours": 1.07
      },
      {
        "name": "Monetization",
        "hours": 1.13
      },
      {
        "name": "Growth Models",
        "hours": 2.55
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 1995,
      "currency": "USD",
      "period": "year",
      "note": "Reforge Individual membership, plus tax. Covers all courses."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2023,
    "roleHints": "growth|product|pm|marketing",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "coursera-google-digital-marketing-ecommerce",
    "title": "Google Digital Marketing & E-commerce Professional Certificate",
    "provider": "Coursera (Google)",
    "url": "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "People with no marketing background who want the basics of funnels, search, social, email and marketing analytics.",
    "modules": [
      {
        "name": "Introduction to foundations of digital marketing and e-commerce",
        "hours": 3,
        "part": "Foundations of Digital Marketing and E-commerce"
      },
      {
        "name": "The customer journey and the marketing funnel",
        "hours": 3,
        "part": "Foundations of Digital Marketing and E-commerce"
      },
      {
        "name": "Digital marketing and e-commerce strategy",
        "hours": 3,
        "part": "Foundations of Digital Marketing and E-commerce"
      },
      {
        "name": "Measure performance success",
        "hours": 2,
        "part": "Foundations of Digital Marketing and E-commerce"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 8 of the certificate",
      "hours": 108
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 1888,
      "currency": "INR",
      "period": "month",
      "note": "Coursera price for India, the same as the other Google certificates, after a 7 day free trial. Certificate needs the paid plan."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview: Course 1, Module 1",
      "url": "https://www.coursera.org/learn/foundations-of-digital-marketing-and-e-commerce",
      "minutes": 180
    },
    "updatedYear": 2025,
    "rating": {
      "value": 4.8,
      "count": 51477,
      "source": "Coursera",
      "url": "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "marketing|digital|ecommerce|e-commerce|social|seo|campaign",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "hubspot-content-marketing",
    "title": "Content Marketing Certification Course: Grow Better with Content",
    "provider": "HubSpot Academy",
    "url": "https://academy.hubspot.com/courses/content-marketing",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "supporting",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Marketers who want a free, certified grounding in content strategy, SEO and measuring what content brings in.",
    "modules": [
      {
        "name": "Welcome to the Content Marketing Certification Course",
        "hours": 0.15
      },
      {
        "name": "The Power of Storytelling",
        "hours": 0.52
      },
      {
        "name": "Building a Content Creation Framework",
        "hours": 0.52
      },
      {
        "name": "Planning a Long-Term Content Strategy",
        "hours": 0.62
      },
      {
        "name": "Generating Content Ideas",
        "hours": 0.38
      },
      {
        "name": "Creating Quality Blog Content Your Audience Loves to Read and Share",
        "hours": 0.87
      },
      {
        "name": "How HubSpot Uses Blogging to Rank #1 on Google",
        "hours": 0.63
      },
      {
        "name": "Extending the Value of Your Content Through Repurposing",
        "hours": 0.73
      },
      {
        "name": "Creating Topic Clusters and Pillar Pages",
        "hours": 0.77
      },
      {
        "name": "How to Create a Successful Video Marketing Strategy",
        "hours": 0.55
      },
      {
        "name": "Building a Guest Blogging Strategy Powered by SEO",
        "hours": 0.73
      },
      {
        "name": "How to Effectively Promote Content",
        "hours": 0.93
      }
    ],
    "beyond": {
      "label": "Lessons 13 to 14 of the course",
      "hours": 0.98
    },
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Lesson 1: Welcome to the Content Marketing Certification Course",
      "url": "https://academy.hubspot.com/courses/content-marketing",
      "minutes": 9
    },
    "updatedYear": 2022,
    "roleHints": "content|marketing|seo|blog|writer|social",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "book-hacking-growth",
    "title": "Hacking Growth: How Today's Fastest-Growing Companies Drive Breakout Success",
    "provider": "Sean Ellis and Morgan Brown",
    "url": "https://www.penguinrandomhouse.com/books/545936/hacking-growth-by-sean-ellis-founder-of-growthhackerscom-and-morgan-brown/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You run or support at least one marketing channel or campaign.",
    "bestFor": "Marketers and PMs who want a repeatable experiment process across acquisition, activation, retention and monetization.",
    "modules": [
      {
        "name": "Building growth teams",
        "hours": 1.2
      },
      {
        "name": "Determining if your product is must-have",
        "hours": 1.2
      },
      {
        "name": "Identifying your growth levers",
        "hours": 1.2
      },
      {
        "name": "Testing at high tempo",
        "hours": 1.2
      },
      {
        "name": "Hacking acquisition",
        "hours": 1.2
      },
      {
        "name": "Hacking activation",
        "hours": 1.2
      },
      {
        "name": "Hacking retention",
        "hours": 1.2
      },
      {
        "name": "Hacking monetization",
        "hours": 1.2
      },
      {
        "name": "A virtuous growth cycle",
        "hours": 1.2
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 999,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": null,
    "updatedYear": 2017,
    "roleHints": "growth|marketing|founder|product|acquisition",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "book-trustworthy-online-controlled-experiments",
    "title": "Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing",
    "provider": "Ron Kohavi, Diane Tang and Ya Xu (Cambridge University Press)",
    "url": "https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/D97B26382EB0EB2DC2019A7A7B518F59",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You have run or analyzed A/B tests and are comfortable with basic statistics.",
    "bestFor": "People who own a growth number and need experiments the business can trust, from choosing metrics to spotting broken tests.",
    "modules": [
      {
        "name": "Chapter 1: Introduction and Motivation",
        "hours": 1.5
      },
      {
        "name": "Chapter 2: Running and Analyzing Experiments",
        "hours": 0.9
      },
      {
        "name": "Chapter 3: Twyman’s Law and Experimentation Trustworthiness",
        "hours": 1.3
      },
      {
        "name": "Chapter 4: Experimentation Platform and Culture",
        "hours": 1.4
      },
      {
        "name": "Chapters 5 to 9: Selected Topics for Everyone",
        "hours": 3.1
      },
      {
        "name": "Chapters 10 to 11: Complementary and Alternative Techniques to Controlled Experiments",
        "hours": 1.7
      },
      {
        "name": "Chapters 12 to 16: Advanced Topics for Building an Experimentation Platform",
        "hours": 2.1
      },
      {
        "name": "Chapters 17 to 23: Advanced Topics for Analyzing Experiments",
        "hours": 4.2
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 4095,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Chapter 1: Introduction and Motivation, free PDF from the authors",
      "url": "https://experimentguide.com/wp-content/uploads/TrustworthyOnlineControlledExperiments_PracticalGuideToABTesting_Chapter1.pdf",
      "minutes": 90
    },
    "updatedYear": 2020,
    "roleHints": "experiment|analyst|data|growth|product|optimization",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "udacity-ab-testing",
    "title": "A/B Testing",
    "provider": "Udacity",
    "url": "https://www.udacity.com/course/ab-testing--ud257",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "No technical background needed, though basic statistics like averages and significance helps.",
    "bestFor": "Marketers and PMs who want to design, size and read A/B tests properly, taught by Google practitioners.",
    "modules": [
      {
        "name": "Overview of A/B Testing",
        "hours": 4
      },
      {
        "name": "Policy and Ethics for Experiments",
        "hours": 1
      },
      {
        "name": "Choosing and Characterizing Metrics",
        "hours": 7
      },
      {
        "name": "Designing an Experiment",
        "hours": 2
      },
      {
        "name": "Analyzing Results",
        "hours": 7
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Lesson 1: Overview of A/B Testing",
      "url": "https://www.udacity.com/course/ab-testing--ud257",
      "minutes": 240
    },
    "updatedYear": 2025,
    "roleHints": "analyst|data|growth|product|marketing|experiment",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "maven-kohavi-ab-testing",
    "title": "Accelerating Innovation with A/B Testing",
    "provider": "Maven (Ronny Kohavi)",
    "url": "https://maven.com/kohavi/abtesting",
    "kind": "course",
    "format": "cohort",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You have run or reviewed A/B tests at work.",
    "bestFor": "People who own a growth number and want two weeks of live sessions on trustworthy A/B testing, taught by the co-author of Trustworthy Online Controlled Experiments.",
    "modules": [
      {
        "name": "Session 1: Introduction, interesting examples, organizational tenets",
        "hours": 2
      },
      {
        "name": "Session 2 - End-to-end example, metrics, and the OEC",
        "hours": 2
      },
      {
        "name": "Session 3: Statistics, E2E ex 2, Twyman's Law, Ideas, prioritization",
        "hours": 2
      },
      {
        "name": "Session 4: Cultural challenges, maturity, observational causal studies, pitfalls",
        "hours": 2
      },
      {
        "name": "Session 5: AI/ML, triggering, leakage/interference, scaling, requested topics",
        "hours": 2
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "one-time",
      "amount": 1999,
      "currency": "USD",
      "note": "Per cohort. Next cohort runs Nov 9 to 19, 2026."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "rating": {
      "value": 4.8,
      "count": 179,
      "source": "Maven",
      "url": "https://maven.com/kohavi/abtesting",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "experiment|data|analyst|growth|product|scientist",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "gopractice-product-growth-simulator",
    "title": "Product Growth Simulator",
    "provider": "GoPractice",
    "url": "https://gopractice.io/course/growth/",
    "kind": "practice",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You have worked in a product, analytics or marketing role and can read funnel and retention numbers.",
    "bestFor": "Marketers, PMs and analysts ready to build a growth model and strategy by working through a simulated product with real data.",
    "modules": [
      {
        "name": "Criteria for product/market fit",
        "hours": 3.5
      },
      {
        "name": "Criteria for product/channels fit",
        "hours": 3.5
      },
      {
        "name": "Determining the boundaries and size of the product’s target market",
        "hours": 3.5
      },
      {
        "name": "Growth is a function of product/market fit, product/channels fit, and market dynamics",
        "hours": 3.5
      },
      {
        "name": "The history of Facebook Messenger becoming a standalone app",
        "hours": 3.5
      },
      {
        "name": "North Star Metric. Breaking down the North Star Metric into its component parts",
        "hours": 3.5
      },
      {
        "name": "Using a growth model and data to determine the causes of growth slowdown",
        "hours": 3.5
      },
      {
        "name": "Qualitative and quantitative product growth models",
        "hours": 3.5
      },
      {
        "name": "JTBD in the context of product growth",
        "hours": 3.5
      },
      {
        "name": "Added value and its impact on key elements of the growth model",
        "hours": 3.5
      },
      {
        "name": "Fundamental principles of product growth, or why metrics are not enough",
        "hours": 3.5
      },
      {
        "name": "The levers and hidden risks of paid growth channels",
        "hours": 3.5
      }
    ],
    "beyond": {
      "label": "Chapters 13 to 17 of the simulator",
      "hours": 17.5
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 1690,
      "currency": "USD",
      "note": "Self-paced. Price may differ for team licenses."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2022,
    "roleHints": "product|pm|growth|analyst|marketing|analytics",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "amplitude-drive-growth-retention-engagement",
    "title": "Drive Product Growth With Retention and Engagement",
    "provider": "Amplitude Academy",
    "url": "https://academy.amplitude.com/path/retain-and-engage-your-users-for-long-term-growth-learning-path",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "growth",
        "role": "supporting",
        "baseline": 2
      }
    ],
    "assumes": "You can build and read charts in Amplitude Analytics.",
    "bestFor": "People who own a growth number and use Amplitude, and want a short, free way to measure and improve retention.",
    "modules": [
      {
        "name": "Understanding the Pillars of Product Growth",
        "hours": 0.17
      },
      {
        "name": "Understand the Importance of User Retention and Engagement",
        "hours": 0.17
      },
      {
        "name": "Measure Your Current Level of Retention",
        "hours": 0.25
      },
      {
        "name": "Measure Your Current Level of Engagement",
        "hours": 0.3
      },
      {
        "name": "Uncover Opportunities for Improving Your Retention and Engagement",
        "hours": 0.23
      },
      {
        "name": "Drive Product Growth With Retention and Engagement - Assessment",
        "hours": 0.38
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Understanding the Pillars of Product Growth",
      "url": "https://academy.amplitude.com/understanding-the-pillars-of-product-growth",
      "minutes": 10
    },
    "updatedYear": 2025,
    "roleHints": "product|growth|analytics|analyst|amplitude",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "michigan-leading-people-and-teams",
    "title": "Leading People and Teams Specialization",
    "provider": "Coursera (University of Michigan)",
    "url": "https://www.coursera.org/specializations/leading-teams",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "People about to lead a team who want a structured university course on vision, goals, motivation, hiring, influence and team building.",
    "modules": [
      {
        "name": "Becoming a Visionary Leader",
        "hours": 2,
        "part": "Inspiring and Motivating Individuals"
      },
      {
        "name": "Creating and Communicating Your Vision",
        "hours": 3,
        "part": "Inspiring and Motivating Individuals"
      },
      {
        "name": "Setting Effective Goals and Expectations",
        "hours": 4,
        "part": "Inspiring and Motivating Individuals"
      },
      {
        "name": "Understanding Human Needs and Drivers of Performance Across Cultures",
        "hours": 3,
        "part": "Inspiring and Motivating Individuals"
      },
      {
        "name": "Aligning Rewards and Behavior",
        "hours": 5,
        "part": "Inspiring and Motivating Individuals"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 5 of the certificate",
      "hours": 39
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price in India, which includes this program."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview of Module 1: Becoming a Visionary Leader",
      "url": "https://www.coursera.org/learn/motivate-people-teams",
      "minutes": 120
    },
    "updatedYear": 2015,
    "rating": {
      "value": 4.7,
      "count": 12008,
      "source": "Coursera",
      "url": "https://www.coursera.org/specializations/leading-teams",
      "checkedOn": "2026-10-20"
    },
    "lastVerified": "2026-10-20"
  },
  {
    "id": "making-of-a-manager",
    "title": "The Making of a Manager",
    "provider": "Portfolio (Penguin Random House)",
    "url": "https://www.juliezhuo.com/book/manager.html",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "First time managers who want a plain guide to the first year: trust, feedback, meetings, hiring and getting things done.",
    "modules": [
      {
        "name": "What is Management?",
        "hours": 1.12
      },
      {
        "name": "Your First Three Months",
        "hours": 1.12
      },
      {
        "name": "Leading a Small Team",
        "hours": 1.12
      },
      {
        "name": "The Art of Feedback",
        "hours": 1.12
      },
      {
        "name": "Managing Yourself",
        "hours": 1.12
      },
      {
        "name": "Amazing Meetings",
        "hours": 1.12
      },
      {
        "name": "Hiring Well",
        "hours": 1.12
      },
      {
        "name": "Making Things Happen",
        "hours": 1.12
      },
      {
        "name": "Leading a Growing Team",
        "hours": 1.12
      },
      {
        "name": "Nurturing Culture",
        "hours": 1.12
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 799,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Google Books preview of the revised edition (selected pages)",
      "url": "https://books.google.com/books?vid=ISBN9780593852781",
      "minutes": 15
    },
    "updatedYear": 2025,
    "rating": {
      "value": 4.19,
      "count": 22877,
      "source": "Goodreads",
      "url": "https://www.goodreads.com/book/show/38821039-the-making-of-a-manager",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "product|design|startup",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "openlearn-leadership-and-followership",
    "title": "Leadership and followership",
    "provider": "OpenLearn (The Open University)",
    "url": "https://www.open.edu/openlearn/education-development/learning/leadership-and-followership",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "People who have not managed yet and want a free, paced start on leadership styles, common challenges and their own habits as a leader.",
    "modules": [
      {
        "name": "Week 1: Where are you starting from?",
        "hours": 3
      },
      {
        "name": "Week 2: What kind of leader could you be?",
        "hours": 3
      },
      {
        "name": "Week 3: What makes a good leader?",
        "hours": 3
      },
      {
        "name": "Week 4: When leadership goes wrong",
        "hours": 3
      },
      {
        "name": "Week 5: Why is followership important?",
        "hours": 3
      },
      {
        "name": "Week 6: Challenges for every leader",
        "hours": 3
      },
      {
        "name": "Week 7: The future of leadership",
        "hours": 3
      },
      {
        "name": "Week 8: Developing yourself as a leader",
        "hours": 3
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Week 1: Where are you starting from?",
      "url": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=143829",
      "minutes": 180
    },
    "updatedYear": 2024,
    "rating": {
      "value": 4.6,
      "count": 107,
      "source": "OpenLearn",
      "url": "https://www.open.edu/openlearn/education-development/learning/leadership-and-followership",
      "checkedOn": "2026-10-20"
    },
    "lastVerified": "2026-10-20"
  },
  {
    "id": "openlearn-managing-and-managing-people",
    "title": "Managing and managing people",
    "provider": "OpenLearn (The Open University)",
    "url": "https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You have a job you can reflect on, ideally one where you lead some work or people.",
    "bestFor": "People leading projects who want a free, short look at what managers actually do, the move into management, and handling time and pressure.",
    "modules": [
      {
        "name": "What do managers actually do?",
        "hours": 0.89
      },
      {
        "name": "What is managerial effectiveness?",
        "hours": 0.89
      },
      {
        "name": "What does your effectiveness depend on?",
        "hours": 0.89
      },
      {
        "name": "Your job",
        "hours": 0.89
      },
      {
        "name": "The demands, constraints and choices of your job",
        "hours": 0.89
      },
      {
        "name": "Your management skills",
        "hours": 0.89
      },
      {
        "name": "Transition into management",
        "hours": 0.89
      },
      {
        "name": "Recognising pressure and avoiding stress",
        "hours": 0.89
      },
      {
        "name": "Managing your time",
        "hours": 0.89
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Section 1: What do managers actually do?",
      "url": "https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people/content-section-1",
      "minutes": 20
    },
    "updatedYear": 2019,
    "rating": {
      "value": 4.6,
      "count": 63,
      "source": "OpenLearn",
      "url": "https://www.open.edu/openlearn/money-business/leadership-management/managing-and-managing-people",
      "checkedOn": "2026-10-20"
    },
    "lastVerified": "2026-10-20"
  },
  {
    "id": "resilient-management",
    "title": "Resilient Management",
    "provider": "Lara Hogan",
    "url": "https://resilient-management.com/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You lead a team, run projects or mentor someone, or are about to.",
    "bestFor": "New leads and managers in tech who want short tools for getting to know a team, growing people, feedback and clear expectations.",
    "modules": [
      {
        "name": "Meet Your Team",
        "hours": 0.76
      },
      {
        "name": "Grow Your Teammates",
        "hours": 0.76
      },
      {
        "name": "Set Clear Expectations",
        "hours": 0.76
      },
      {
        "name": "Communicate Effectively",
        "hours": 0.76
      },
      {
        "name": "Build Resiliency",
        "hours": 0.76
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 4291,
      "currency": "INR",
      "note": "List price on Amazon.in for the imported paperback."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Free excerpt from Chapter 2, Grow Your Teammates (A List Apart)",
      "url": "https://alistapart.com/article/resilient-management-excerpt/",
      "minutes": 15
    },
    "updatedYear": 2019,
    "roleHints": "engineer|developer|design|tech",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "managers-path",
    "title": "The Manager's Path",
    "provider": "O'Reilly",
    "url": "https://www.oreilly.com/library/view/the-managers-path/9781491973882/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You work on or near a software engineering team.",
    "bestFor": "Engineers moving from mentor to tech lead to manager, with each stage of the path explained, including one to ones.",
    "modules": [
      {
        "name": "Management 101",
        "hours": 0.81
      },
      {
        "name": "Mentoring",
        "hours": 0.81
      },
      {
        "name": "Tech Lead",
        "hours": 0.81
      },
      {
        "name": "Managing People",
        "hours": 0.81
      },
      {
        "name": "Managing a Team",
        "hours": 0.81
      },
      {
        "name": "Managing Multiple Teams",
        "hours": 0.81
      },
      {
        "name": "Managing Managers",
        "hours": 0.81
      },
      {
        "name": "The Big Leagues",
        "hours": 0.81
      },
      {
        "name": "Bootstrapping Culture",
        "hours": 0.81
      },
      {
        "name": "Conclusion",
        "hours": 0.81
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 825,
      "currency": "INR",
      "note": "List price on Amazon.in for the Indian edition."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Free Chapter 3, Tech Lead (O'Reilly emails it after a short form)",
      "url": "https://ae.oreilly.com/The_Managers_Path_ch3",
      "minutes": 45
    },
    "updatedYear": 2017,
    "roleHints": "engineer|developer|tech lead|software|architect|sde",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "radical-candor-learn-from-the-expert",
    "title": "Learn from the expert",
    "provider": "Radical Candor",
    "url": "https://courses.radicalcandor.com/p/learn-from-the-expert",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You work with people you could give feedback to.",
    "bestFor": "Anyone who leads or mentors and wants a short video method for asking for, giving and gauging feedback, from Kim Scott.",
    "modules": [
      {
        "name": "What is Radical Candor?",
        "hours": 0.38
      },
      {
        "name": "How to practice Radical Candor",
        "hours": 0.5
      },
      {
        "name": "Assessment",
        "hours": 0.62
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "subscription",
      "amount": 149,
      "currency": "USD",
      "period": "year",
      "note": "One year of access per seat."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Welcome to Radical Candor 101 (free preview video)",
      "url": "https://courses.radicalcandor.com/courses/learn-from-the-expert/lectures/51979778",
      "minutes": 5
    },
    "updatedYear": 2024,
    "lastVerified": "2026-10-20"
  },
  {
    "id": "ucdavis-coaching-skills-for-managers",
    "title": "Coaching Skills for Managers Specialization",
    "provider": "Coursera (University of California, Davis)",
    "url": "https://www.coursera.org/specializations/coaching-skills-manager",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You manage at least one person, or will very soon.",
    "bestFor": "Current managers who want to coach their reports, set expectations and handle performance issues in real conversations.",
    "modules": [
      {
        "name": "Course Introduction & What is Coaching?",
        "hours": 2,
        "part": "Managing as a Coach"
      },
      {
        "name": "Why Managers Must Develop Basic Coaching Skills",
        "hours": 2,
        "part": "Managing as a Coach"
      },
      {
        "name": "Points of View of Leadership",
        "hours": 3,
        "part": "Managing as a Coach"
      },
      {
        "name": "Course Peer Review Assignment",
        "hours": 3,
        "part": "Managing as a Coach"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 4 of the certificate",
      "hours": 31
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price in India, which includes this program."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview of Module 1: Course Introduction & What is Coaching?",
      "url": "https://www.coursera.org/learn/managing-as-a-coach",
      "minutes": 120
    },
    "updatedYear": 2017,
    "rating": {
      "value": 4.8,
      "count": 3063,
      "source": "Coursera",
      "url": "https://www.coursera.org/specializations/coaching-skills-manager",
      "checkedOn": "2026-10-20"
    },
    "lastVerified": "2026-10-20"
  },
  {
    "id": "umn-hr-people-managers",
    "title": "Human Resource Management: HR for People Managers Specialization",
    "provider": "Coursera (University of Minnesota)",
    "url": "https://www.coursera.org/specializations/human-resource-management",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "lead",
        "role": "supporting",
        "baseline": 2
      }
    ],
    "assumes": "You manage people now or are about to; no HR background needed.",
    "bestFor": "Managers who want the HR side of the job: why people work, pay, hiring and performance systems.",
    "modules": [
      {
        "name": "Alternative Approaches to Managing Human Resources",
        "hours": 3,
        "part": "Preparing to Manage Human Resources"
      },
      {
        "name": "What Makes Employees Work? Money, Of Course!",
        "hours": 5,
        "part": "Preparing to Manage Human Resources"
      },
      {
        "name": "What Makes Employees Work Revisited...Non-Monetary Motivations",
        "hours": 6,
        "part": "Preparing to Manage Human Resources"
      },
      {
        "name": "The People Manager as Part of a Complex System",
        "hours": 5,
        "part": "Preparing to Manage Human Resources"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 5 of the certificate",
      "hours": 73
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price in India, which includes this program."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free preview of Module 1: Alternative Approaches to Managing Human Resources",
      "url": "https://www.coursera.org/learn/managing-human-resources",
      "minutes": 180
    },
    "updatedYear": 2016,
    "rating": {
      "value": 4.8,
      "count": 15698,
      "source": "Coursera",
      "url": "https://www.coursera.org/specializations/human-resource-management",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "\\bhr\\b|human resources|people|talent|recruit|operations",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "google-ux-design-certificate",
    "title": "Google UX Design Professional Certificate",
    "provider": "Coursera (Google)",
    "url": "https://www.coursera.org/professional-certificates/google-ux-design",
    "kind": "program",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Career switchers who want a full guided path from UX basics to three portfolio projects and a job search plan.",
    "modules": [
      {
        "name": "Introducing user experience design",
        "hours": 4,
        "part": "Foundations of User Experience (UX) Design"
      },
      {
        "name": "Thinking like a UX designer",
        "hours": 2,
        "part": "Foundations of User Experience (UX) Design"
      },
      {
        "name": "Joining design sprints",
        "hours": 4,
        "part": "Foundations of User Experience (UX) Design"
      },
      {
        "name": "Introduction to the portfolio project",
        "hours": 2,
        "part": "Foundations of User Experience (UX) Design"
      }
    ],
    "beyond": {
      "label": "Courses 2 to 8 of the certificate",
      "hours": 100
    },
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 1888,
      "currency": "INR",
      "period": "month",
      "note": "Coursera India price after a 7 day free trial. Certificate needs the paid plan."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Course 1, Module 1: Introducing user experience design, inside the 7 day free trial",
      "url": "https://www.coursera.org/learn/foundations-user-experience-design",
      "minutes": 240
    },
    "updatedYear": 2025,
    "rating": {
      "value": 4.8,
      "count": 100736,
      "source": "Coursera",
      "url": "https://www.coursera.org/professional-certificates/google-ux-design",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "graphic|visual|web|\\bui\\b|teacher|support",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "ixdf-user-experience-beginners-guide",
    "title": "User Experience: The Beginner's Guide",
    "provider": "Interaction Design Foundation (IxDF)",
    "url": "https://ixdf.org/courses/user-experience-the-beginner-s-guide",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "Nothing. This is a start.",
    "bestFor": "Beginners who want a broad tour of the UX process, from research to sketching, prototyping and usability testing, with small portfolio exercises.",
    "modules": [
      {
        "name": "Lesson 0: Welcome and Introduction",
        "hours": 1.53
      },
      {
        "name": "Lesson 1: What is User Experience Design?",
        "hours": 5
      },
      {
        "name": "Lesson 2: How to Think Like a UX Designer",
        "hours": 4.38
      },
      {
        "name": "Lesson 3: UX Methods and Tools, The Problem Space",
        "hours": 4.27
      },
      {
        "name": "Lesson 4: UX Methods and Tools, The Solution Space",
        "hours": 5.48
      },
      {
        "name": "Lesson 5: How to Design in the Real World",
        "hours": 2.82
      },
      {
        "name": "Lesson 6: IxDF Course Certificate and Course Wrap-up",
        "hours": 0.22
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 9600,
      "currency": "INR",
      "period": "year",
      "note": "Professional membership, shown as ₹800 a month billed annually. Covers all IxDF courses. Prices vary by country."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "lastVerified": "2026-10-20"
  },
  {
    "id": "openlearn-introduction-interaction-design",
    "title": "An introduction to interaction design",
    "provider": "OpenLearn (The Open University)",
    "url": "https://www.open.edu/openlearn/science-maths-technology/an-introduction-interaction-design",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "No design experience. You are comfortable reading university style course text.",
    "bestFor": "Newcomers who want a free, structured grounding in interaction design ideas, user needs and core design methods.",
    "modules": [
      {
        "name": "1 What is interaction design",
        "hours": 2.5
      },
      {
        "name": "2 Goals and principles of user-centred design",
        "hours": 2.5
      },
      {
        "name": "3 The 'who, where and what' of the design context",
        "hours": 2.5
      },
      {
        "name": "4 Interaction design activities and methods",
        "hours": 2.5
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free",
      "note": "Free statement of participation with a free account."
    },
    "certificate": "free",
    "freeStart": {
      "label": "Section 1: What is interaction design",
      "url": "https://www.open.edu/openlearn/science-maths-technology/an-introduction-interaction-design/content-section-1",
      "minutes": 150
    },
    "updatedYear": 2018,
    "lastVerified": "2026-10-20"
  },
  {
    "id": "figma-design-for-beginners",
    "title": "Figma Design for beginners",
    "provider": "Figma",
    "url": "https://help.figma.com/hc/en-us/sections/30880632542743-Figma-Design-for-beginners",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "supporting",
        "baseline": 0
      }
    ],
    "assumes": "Nothing beyond a computer and a free Figma account.",
    "bestFor": "People new to Figma who want to learn the tool by building a small portfolio site with a case study page and a clickable prototype.",
    "modules": [
      {
        "name": "Get started",
        "hours": 0.15
      },
      {
        "name": "Explore Figma Design",
        "hours": 0.15
      },
      {
        "name": "Layers and frames",
        "hours": 0.38
      },
      {
        "name": "Frame presets and constraints",
        "hours": 0.08
      },
      {
        "name": "Create the case study page",
        "hours": 0.3
      },
      {
        "name": "Auto layout and components",
        "hours": 0.67
      },
      {
        "name": "More auto layout and components",
        "hours": 0.23
      },
      {
        "name": "Vector editing",
        "hours": 0.38
      },
      {
        "name": "Instances",
        "hours": 0.2
      },
      {
        "name": "Prototyping",
        "hours": 0.4
      },
      {
        "name": "What's next?",
        "hours": 0.05
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Uses features on Figma's free Starter plan."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Course overview: Figma Design for beginners (2025)",
      "url": "https://help.figma.com/hc/en-us/articles/30848209492887-Course-overview-Figma-Design-for-beginners-2025",
      "minutes": 2
    },
    "updatedYear": 2025,
    "roleHints": "graphic|visual|frontend|developer|marketing",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "dont-make-me-think-revisited",
    "title": "Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability",
    "provider": "Steve Krug (New Riders)",
    "url": "https://www.peachpit.com/store/dont-make-me-think-revisited-a-common-sense-approach-9780321965516",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You have looked critically at a website or app you use or helped build.",
    "bestFor": "People doing some design work who want plain rules for clear screens and a cheap, simple way to run usability tests.",
    "modules": [
      {
        "name": "Read me first",
        "hours": 0.27
      },
      {
        "name": "Chapters 1 to 5: Guiding principles",
        "hours": 1.47
      },
      {
        "name": "Chapters 6 and 7: Things you need to get right",
        "hours": 1.6
      },
      {
        "name": "Chapters 8 and 9: Making sure you got them right",
        "hours": 1.33
      },
      {
        "name": "Chapters 10 to 13: Larger concerns and outside influences",
        "hours": 1.67
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 4365,
      "currency": "INR",
      "note": "List price on Amazon.in. Selling price was ₹545 on 2026-10-20."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Sample chapter on the publisher site: Chapter 4, Animal, Vegetable, or Mineral?",
      "url": "https://www.peachpit.com/articles/article.aspx?p=2170656",
      "minutes": 12
    },
    "updatedYear": 2014,
    "roleHints": "developer|frontend|web|product|marketing",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "content-design-london-fundamentals-self-study",
    "title": "Content design fundamentals: study in your own time",
    "provider": "Content Design London",
    "url": "https://contentdesign.london/shop/on-demand-foundation-in-content-design-course",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You write or edit content for users and are new to content design.",
    "bestFor": "Writers, editors and marketers moving into content design who want guided practice on one real piece of content.",
    "modules": [
      {
        "name": "What is content design",
        "hours": 1.67
      },
      {
        "name": "Discovery: how users speak",
        "hours": 1.67
      },
      {
        "name": "Discovery: how your users think",
        "hours": 1.67
      },
      {
        "name": "User journeys",
        "hours": 1.67
      },
      {
        "name": "User needs",
        "hours": 1.67
      },
      {
        "name": "Acceptance criteria for user needs",
        "hours": 1.67
      },
      {
        "name": "Content behaviour",
        "hours": 1.67
      },
      {
        "name": "Content formats",
        "hours": 1.67
      },
      {
        "name": "How we read",
        "hours": 1.67
      },
      {
        "name": "Voice and tone",
        "hours": 1.67
      },
      {
        "name": "Content accessibility",
        "hours": 1.67
      },
      {
        "name": "Reviewing content",
        "hours": 1.67
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 15500,
      "currency": "INR",
      "note": "Listed at £120 including VAT; the provider's store shows Rs. 15,500. Includes 12 months of access."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2025,
    "roleHints": "writer|content|editor|copywriter|marketing|communications|teacher",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "content-design-book-winters-edwards",
    "title": "Content Design, second edition",
    "provider": "Content Design London",
    "url": "https://contentdesign.london/shop/content-design-by-sarah-winters-and-rachel-edwards",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You write for users at work or on the side.",
    "bestFor": "People moving into content design who want the core method, from research and user needs to journey maps, pair writing and crits.",
    "modules": [
      {
        "name": "Chapter 1: Why content design matters",
        "hours": 0.77
      },
      {
        "name": "Chapter 2: The science of reading",
        "hours": 0.77
      },
      {
        "name": "Chapter 3: Content discovery and research",
        "hours": 0.77
      },
      {
        "name": "Chapter 4: User stories and job stories",
        "hours": 0.77
      },
      {
        "name": "Chapter 5: Journey mapping",
        "hours": 0.77
      },
      {
        "name": "Chapter 6: Bringing your organisation with you",
        "hours": 0.77
      },
      {
        "name": "Chapter 7: Designing content",
        "hours": 0.77
      },
      {
        "name": "Chapter 8: Writing content",
        "hours": 0.77
      },
      {
        "name": "Chapter 9: Pair writing",
        "hours": 0.77
      },
      {
        "name": "Chapter 10: Crits",
        "hours": 0.77
      },
      {
        "name": "Chapter 11: Finished pages",
        "hours": 0.77
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 3478,
      "currency": "INR",
      "note": "List price on Amazon.in. Selling price was ₹2,973 on 2026-10-20."
    },
    "certificate": "none",
    "freeStart": null,
    "updatedYear": 2024,
    "roleHints": "writer|content|editor|copywriter|marketing|communications|teacher",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "ixdf-conducting-usability-testing",
    "title": "Conducting Usability Testing",
    "provider": "Interaction Design Foundation (IxDF)",
    "url": "https://ixdf.org/courses/conducting-usability-testing",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You design screens or flows and can show them to real users.",
    "bestFor": "Designers who want a repeatable way to plan, run and report a usability test on their own work.",
    "modules": [
      {
        "name": "Lesson 0: Welcome and Introduction",
        "hours": 1.53
      },
      {
        "name": "Lesson 1: Introduction",
        "hours": 3.05
      },
      {
        "name": "Lesson 2: Developing Your Test Plan",
        "hours": 3.82
      },
      {
        "name": "Lesson 3: Reporting On Your Test",
        "hours": 2.07
      },
      {
        "name": "Lesson 4: IxDF Course Certificate and Course Wrap-up",
        "hours": 0.22
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 9600,
      "currency": "INR",
      "period": "year",
      "note": "Professional membership, shown as ₹800 a month billed annually. Covers all IxDF courses. Prices vary by country."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "roleHints": "designer|ux|\\bui\\b|product|research",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "figma-introduction-to-design-systems",
    "title": "Introduction to design systems",
    "provider": "Figma",
    "url": "https://help.figma.com/hc/en-us/sections/14548397990423-Introduction-to-design-systems",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "ux",
        "role": "supporting",
        "baseline": 2
      }
    ],
    "assumes": "You already use styles and components in Figma.",
    "bestFor": "Designers who work in Figma and want to plan, build and document a design system for their product team.",
    "modules": [
      {
        "name": "Overview: Introduction to design systems",
        "hours": 0.17
      },
      {
        "name": "Lesson 1: Welcome to design systems",
        "hours": 0.75
      },
      {
        "name": "Lesson 2: Define your design system",
        "hours": 0.67
      },
      {
        "name": "Lesson 3: Build your design system",
        "hours": 0.75
      },
      {
        "name": "Lesson 4: Document and manage your system",
        "hours": 0.5
      },
      {
        "name": "Update 1: Tokens, variables, and styles",
        "hours": 0.5
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free",
      "note": "Free to read. A few features it shows, such as branching, need a paid Figma plan."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Lesson 1: Welcome to design systems",
      "url": "https://help.figma.com/hc/en-us/articles/14552802134807-Lesson-1-Welcome-to-design-systems",
      "minutes": 45
    },
    "updatedYear": 2023,
    "roleHints": "designer|\\bui\\b|visual|product design|frontend",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "svpg-inspired-2nd-edition",
    "title": "INSPIRED: How to Create Tech Products Customers Love, 2nd Edition",
    "provider": "Silicon Valley Product Group",
    "url": "https://www.svpg.com/books/inspired-how-to-create-tech-products-customers-love-2nd-edition/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You know how a software team ships features, even if you have only watched from the outside.",
    "bestFor": "People who work near product teams and want the standard picture of how strong teams discover and deliver products.",
    "modules": [
      {
        "name": "Chapters 1 to 8: Lessons from Top Tech Companies",
        "hours": 1
      },
      {
        "name": "Chapters 9 to 21: The Right People",
        "hours": 2.5
      },
      {
        "name": "Chapters 22 to 32: The Right Product",
        "hours": 1.7
      },
      {
        "name": "Chapters 33 to 40: The Right Process (Product Discovery, Framing and Planning Techniques)",
        "hours": 1.6
      },
      {
        "name": "Chapters 41 to 49: Discovery Ideation and Prototyping Techniques",
        "hours": 1.1
      },
      {
        "name": "Chapters 50 to 57: Discovery Testing Techniques",
        "hours": 1.5
      },
      {
        "name": "Chapters 58 to 63: Transformation Techniques and Process @ Scale",
        "hours": 0.8
      },
      {
        "name": "Chapters 64 to 67: The Right Culture",
        "hours": 0.6
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 3074,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Chapter 1: Behind Every Great Product, free excerpt from the publisher, Wiley",
      "url": "https://media.wiley.com/product_data/excerpt/07/11193875/1119387507-35.pdf",
      "minutes": 5
    },
    "updatedYear": 2017,
    "roleHints": "engineer|developer|designer|founder|analyst",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "cracking-the-pm-career",
    "title": "Cracking the PM Career: The Skills, Frameworks, and Practices To Become a Great Product Manager",
    "provider": "CareerCup",
    "url": "https://www.crackingthepmcareer.com/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You are in a first PM role, or have owned features, and know what the job involves day to day.",
    "bestFor": "Early PMs who want a map of every PM skill, from user insight to strategy and leadership, and how PM careers progress.",
    "modules": [
      {
        "name": "Chapters 0 to 3: Foreword and The Product Manager Role",
        "hours": 1.1
      },
      {
        "name": "Chapters 4 to 9: Product Skills",
        "hours": 2.6
      },
      {
        "name": "Chapters 10 to 13: Execution Skills",
        "hours": 1.9
      },
      {
        "name": "Chapters 14 to 18: Strategic Skills",
        "hours": 1.6
      },
      {
        "name": "Chapters 19 to 26: Leadership Skills",
        "hours": 2.3
      },
      {
        "name": "Chapters 27 to 31: People Management Skills",
        "hours": 1.9
      },
      {
        "name": "Chapters 32 to 36: Careers",
        "hours": 2.5
      },
      {
        "name": "Chapters 37 to 47: Product Leader Q&A",
        "hours": 1.7
      },
      {
        "name": "Chapters 48 to 52: Additional Reading",
        "hours": 2
      },
      {
        "name": "Chapters 53 to 54: Appendix",
        "hours": 0.3
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 649,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": null,
    "updatedYear": 2021,
    "roleHints": "associate product|apm|product owner|product analyst|product manager",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "coursera-uva-digital-product-management",
    "title": "Digital Product Management: Modern Fundamentals",
    "provider": "Coursera (University of Virginia)",
    "url": "https://www.coursera.org/learn/uva-darden-digital-product-management",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You have worked on or near a digital product team.",
    "bestFor": "People near product, or new to a PM role, who want a short structured course on modern digital product management, with quizzes.",
    "modules": [
      {
        "name": "Achieving Focus and #Winning",
        "hours": 3
      },
      {
        "name": "Applying Today's Product Management Methods",
        "hours": 3
      },
      {
        "name": "Exploring a New Product Idea",
        "hours": 2
      },
      {
        "name": "Amplifying an Existing Product",
        "hours": 2
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "subscription",
      "amount": 2099,
      "currency": "INR",
      "period": "month",
      "note": "Coursera Plus price in India; 7-day free trial on the monthly plan."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Module 1: Achieving Focus and #Winning, free preview (Enroll for free on the course page)",
      "url": "https://www.coursera.org/learn/uva-darden-digital-product-management",
      "minutes": 180
    },
    "updatedYear": 2017,
    "rating": {
      "value": 4.7,
      "count": 5446,
      "source": "Coursera",
      "url": "https://www.coursera.org/learn/uva-darden-digital-product-management",
      "checkedOn": "2026-10-20"
    },
    "roleHints": "business analyst|analyst|consultant|marketing|operations|success",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "pendo-product-judgment",
    "title": "Product Judgment: making confident decisions without complete data",
    "provider": "Pendo Learning Lab",
    "url": "https://www.pendo.io/learninglab/course/product-judgement/",
    "kind": "course",
    "format": "self-paced",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 0
      }
    ],
    "assumes": "You can name one real request or decision from your current work.",
    "bestFor": "Anyone near product who wants one short, free course on turning stakeholder asks into the real problem and making the call.",
    "modules": [
      {
        "name": "Why Judgment Is the Only Part Still Yours",
        "hours": 0.18
      },
      {
        "name": "Habit 1: Capture the Signal",
        "hours": 0.27
      },
      {
        "name": "Habit 2: Find the Real Problem",
        "hours": 0.25
      },
      {
        "name": "Habit 3: Pick What Matters",
        "hours": 0.25
      },
      {
        "name": "Putting It All Together: Make the Call",
        "hours": 0.12
      },
      {
        "name": "Final Assessment",
        "hours": 0.12
      }
    ],
    "hoursSource": "provider",
    "cost": {
      "model": "free"
    },
    "certificate": "free",
    "freeStart": {
      "label": "Module 1: Why Judgment Is the Only Part Still Yours (free sign up)",
      "url": "https://www.pendo.io/learninglab/course/product-judgement/",
      "minutes": 11
    },
    "updatedYear": 2026,
    "roleHints": "success|support|sales|operations|account|engineer",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "continuous-discovery-habits",
    "title": "Continuous Discovery Habits: Discover Products that Create Customer Value and Business Value",
    "provider": "Product Talk (Teresa Torres)",
    "url": "https://www.producttalk.org/continuous-discovery-habits-book/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You work on a product team, or closely with one, and can get time with customers.",
    "bestFor": "People who own features and want a weekly habit of customer interviews, opportunity mapping and assumption tests.",
    "modules": [
      {
        "name": "Introduction and Chapter 1: The What and Why of Continuous Discovery",
        "hours": 0.54
      },
      {
        "name": "Chapter 2: A Common Framework for Continuous Discovery",
        "hours": 0.54
      },
      {
        "name": "Chapter 3: Focusing on Outcomes Over Outputs",
        "hours": 0.54
      },
      {
        "name": "Chapter 4: Visualizing What You Already Know",
        "hours": 0.54
      },
      {
        "name": "Chapter 5: Continuous Interviewing",
        "hours": 0.54
      },
      {
        "name": "Chapter 6: Mapping the Opportunity Space",
        "hours": 0.54
      },
      {
        "name": "Chapter 7: Prioritizing Opportunities, Not Solutions",
        "hours": 0.54
      },
      {
        "name": "Chapter 8: Supercharged Ideation",
        "hours": 0.54
      },
      {
        "name": "Chapter 9: Identifying Hidden Assumptions",
        "hours": 0.54
      },
      {
        "name": "Chapter 10: Testing Assumptions",
        "hours": 0.54
      }
    ],
    "beyond": {
      "label": "Chapters 11 to 15 of the book",
      "hours": 2.71
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 1699,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Free book club reading guide from the author for the Introduction and Chapters 1 to 2, with short videos and exercises",
      "url": "https://www.producttalk.org/lets-read-continuous-discovery-habits-together-january-2026/",
      "minutes": 5
    },
    "updatedYear": 2021,
    "roleHints": "designer|ux|research|product owner|product manager",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "basecamp-shape-up",
    "title": "Shape Up: Stop Running in Circles and Ship Work that Matters",
    "provider": "Basecamp (37signals)",
    "url": "https://basecamp.com/shapeup",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You have worked on features alongside designers or engineers.",
    "bestFor": "People who own features and want a concrete method for scoping work, writing pitches and shipping in fixed cycles.",
    "modules": [
      {
        "name": "Foreword and Chapter 1: Introduction",
        "hours": 0.5
      },
      {
        "name": "Chapter 2: Principles of Shaping",
        "hours": 0.3
      },
      {
        "name": "Chapter 3: Set Boundaries",
        "hours": 0.3
      },
      {
        "name": "Chapter 4: Find the Elements",
        "hours": 0.4
      },
      {
        "name": "Chapter 5: Risks and Rabbit Holes",
        "hours": 0.3
      },
      {
        "name": "Chapter 6: Write the Pitch",
        "hours": 0.4
      },
      {
        "name": "Chapters 7 to 9: Betting",
        "hours": 1.1
      },
      {
        "name": "Chapters 10 to 12: Building (Hand Over Responsibility, Get One Piece Done, Map the Scopes)",
        "hours": 1.1
      },
      {
        "name": "Chapters 13 to 15 and Conclusion: Building (Show Progress, Decide When to Stop, Move On)",
        "hours": 0.9
      },
      {
        "name": "Appendices: How to Implement Shape Up in Basecamp, Adjust to Your Size, How to Begin to Shape Up, Glossary",
        "hours": 0.6
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "free",
      "note": "Free to read online; the print edition is 30 USD."
    },
    "certificate": "none",
    "freeStart": {
      "label": "Chapter 1: Introduction",
      "url": "https://basecamp.com/shapeup/0.3-chapter-01",
      "minutes": 20
    },
    "updatedYear": 2020,
    "roleHints": "engineer|developer|designer|founder|lead",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "gopractice-product-management-simulator",
    "title": "Simulator for Learning Data-Driven Product Management",
    "provider": "GoPractice",
    "url": "https://gopractice.io/course/pm/",
    "kind": "practice",
    "format": "self-paced",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 1
      }
    ],
    "assumes": "You can work in a spreadsheet and reason about basic numbers.",
    "bestFor": "People who want hands-on practice making product decisions from real analytics data, metrics and experiments.",
    "modules": [
      {
        "name": "Job interview: key metrics and data concepts in product management",
        "hours": 4
      },
      {
        "name": "How new market leaders emerge",
        "hours": 4
      },
      {
        "name": "Removing key risks. Basic metrics",
        "hours": 4
      },
      {
        "name": "Analysis of the market and the competitors",
        "hours": 4
      },
      {
        "name": "Product launch",
        "hours": 4
      },
      {
        "name": "Retention",
        "hours": 4
      },
      {
        "name": "Product metrics and growth metrics",
        "hours": 4
      },
      {
        "name": "Cohort analysis: the basis of product analytics",
        "hours": 4
      },
      {
        "name": "Statistical significance",
        "hours": 4
      },
      {
        "name": "Prioritizing and assessing the potential of new functionality",
        "hours": 4
      },
      {
        "name": "Value hypothesis and product model",
        "hours": 4
      },
      {
        "name": "Experiments",
        "hours": 4
      }
    ],
    "beyond": {
      "label": "Chapters 13 to 25 of the simulator",
      "hours": 52
    },
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 1190,
      "currency": "USD",
      "note": "Personal Basic plan; money back within two weeks of starting."
    },
    "certificate": "paid",
    "freeStart": {
      "label": "Free Growth Skills Assessment Test, which the provider suggests to preview the simulator's topics",
      "url": "https://gopractice.io/sat/",
      "minutes": 45
    },
    "updatedYear": 2026,
    "roleHints": "analyst|data|growth|marketing|founder",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "reforge-mastering-product-management",
    "title": "Mastering Product Management",
    "provider": "Reforge",
    "url": "https://www.reforge.com/courses/mastering-product-management",
    "kind": "course",
    "format": "cohort",
    "moves": [
      {
        "move": "product",
        "role": "core",
        "baseline": 2
      }
    ],
    "assumes": "You have worked as a PM for a few years; Reforge recommends 3 or more.",
    "bestFor": "Working PMs who want sharper strategy, roadmaps, specs and OKR habits, with weekly live sessions and peers.",
    "modules": [
      {
        "name": "Week 1: Strategy & Vision",
        "hours": 5.5
      },
      {
        "name": "Week 2: Dashboards & User Insights",
        "hours": 5.5
      },
      {
        "name": "Week 3: 4D Roadmaps & Product Specs",
        "hours": 5.5
      },
      {
        "name": "Week 4: OKRs & Decision Making",
        "hours": 5.5
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "subscription",
      "amount": 1995,
      "currency": "USD",
      "period": "year",
      "note": "Individual membership plus tax; live courses need a membership."
    },
    "certificate": "paid",
    "freeStart": null,
    "updatedYear": 2026,
    "roleHints": "product manager|senior product|product owner|group product",
    "lastVerified": "2026-10-20"
  },
  {
    "id": "svpg-empowered",
    "title": "EMPOWERED: Ordinary People, Extraordinary Products",
    "provider": "Silicon Valley Product Group",
    "url": "https://www.svpg.com/books/empowered-ordinary-people-extraordinary-products/",
    "kind": "book",
    "format": "book",
    "moves": [
      {
        "move": "product",
        "role": "supporting",
        "baseline": 2
      }
    ],
    "assumes": "You have worked as a PM and are starting to lead or coach others.",
    "bestFor": "Experienced PMs moving toward product leadership who want to learn coaching, staffing, strategy and team objectives.",
    "modules": [
      {
        "name": "Chapters 1 to 6: Lessons from Top Tech Companies",
        "hours": 1
      },
      {
        "name": "Chapters 7 to 25: Coaching",
        "hours": 3.6
      },
      {
        "name": "Chapters 26 to 36: Staffing",
        "hours": 1.6
      },
      {
        "name": "Chapters 37 to 40: Product Vision and Principles",
        "hours": 0.7
      },
      {
        "name": "Chapters 41 to 47: Team Topology",
        "hours": 1.1
      },
      {
        "name": "Chapters 48 to 52: Product Strategy",
        "hours": 0.9
      },
      {
        "name": "Chapters 53 to 61: Team Objectives",
        "hours": 1.3
      },
      {
        "name": "Chapters 62 to 70: Case Study",
        "hours": 1.5
      },
      {
        "name": "Chapters 71 to 76: Business Collaboration",
        "hours": 0.7
      },
      {
        "name": "Chapters 77 to 81: Inspired, Empowered, and Transformed",
        "hours": 0.7
      }
    ],
    "hoursSource": "estimate",
    "cost": {
      "model": "one-time",
      "amount": 2259,
      "currency": "INR",
      "note": "List price on Amazon.in"
    },
    "certificate": "none",
    "freeStart": {
      "label": "Chapter 1: Behind Every Great Company, free excerpt from the publisher, Wiley",
      "url": "https://media.wiley.com/product_data/excerpt/9X/11196912/111969129X-20.pdf",
      "minutes": 15
    },
    "updatedYear": 2020,
    "roleHints": "lead|head|director|manager|founder",
    "lastVerified": "2026-10-20"
  }
];

/** The newest lastVerified date in the catalog. */
export const CATALOG_VERSION: string = COURSES.reduce(
  (max, c) => (c.lastVerified > max ? c.lastVerified : max),
  "",
);
