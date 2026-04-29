/**
 * dummy.ts — 1000개 더미 저장소 + 점수 데이터
 *
 * ID 1~50  : 실제 유명 오픈소스 기반 (기존 유지)
 * ID 51~1000: 절차적 생성 (seeded RNG → 동일한 결과 보장)
 *
 * 활동 점수 분포 (현실적인 GitHub 생태계 반영):
 *   0~10  : 15% (150개) → 블랙홀 구역, 깔때기 최하단으로 빨려들어감
 *   10~30 : 25% (250개) → 쇠퇴 중, 깔때기 하단부
 *   30~55 : 35% (350개) → 보통, 깔때기 중간부
 *   55~85 : 20% (200개) → 활성, 깔때기 상단부
 *   85~100:  5% ( 50개) → 트렌딩, 깔때기 상단 가장자리
 */

import type { Repository, RepoScore } from '@/types/github'

// ── 시드 기반 결정적 RNG ────────────────────────────────────────────
function seededVal(id: number, salt = 0): number {
  const x = Math.sin(id * 127.1 + salt * 311.7 + 9301.7) * 43758.5453
  return x - Math.floor(x) // 0 ~ 1
}

// ── 활동 점수: 현실적 분포 ────────────────────────────────────────────
function genActivityScore(id: number): number {
  const r = seededVal(id, 1)
  if (r < 0.15) return Math.round(r / 0.15 * 10)
  if (r < 0.40) return Math.round(10 + (r - 0.15) / 0.25 * 20)
  if (r < 0.75) return Math.round(30 + (r - 0.40) / 0.35 * 25)
  if (r < 0.95) return Math.round(55 + (r - 0.75) / 0.20 * 30)
  return Math.round(85 + (r - 0.95) / 0.05 * 15)
}

function genHealthScore(id: number, activity: number): number {
  const noise = (seededVal(id, 2) * 30) - 15
  return Math.max(0, Math.min(100, Math.round(activity + noise)))
}

// ── 생성용 데이터 테이블 ────────────────────────────────────────────
const LANGS = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
  'Java', 'C++', 'Ruby', 'Swift', 'Kotlin',
  'PHP', 'C#', 'Scala', 'Haskell', 'Dart', 'Elixir',
]
const LANG_WEIGHTS = [18, 16, 20, 10, 8, 12, 6, 4, 3, 4, 5, 4, 2, 1, 2, 1]
const LANG_CUM = LANG_WEIGHTS.reduce<number[]>((acc, w) => {
  acc.push((acc[acc.length - 1] ?? 0) + w); return acc
}, [])
const LANG_TOTAL = LANG_CUM[LANG_CUM.length - 1]

function pickLang(id: number): string {
  const r = seededVal(id, 3) * LANG_TOTAL
  for (let i = 0; i < LANG_CUM.length; i++) {
    if (r < LANG_CUM[i]) return LANGS[i]
  }
  return LANGS[0]
}

const ORGS = [
  'meta', 'google', 'microsoft', 'apple', 'netflix', 'airbnb', 'stripe', 'shopify',
  'github', 'hashicorp', 'elastic', 'grafana', 'palantir', 'cloudflare', 'mongodb',
  'prisma', 'vercel', 'supabase', 'planetscale', 'railway', 'fly-io', 'render-com',
  'open-telemetry', 'cncf', 'apache', 'eclipse', 'mozilla', 'jetbrains', 'atlassian',
  'databricks', 'snowflake', 'confluent', 'redpanda', 'clickhouse', 'meilisearch',
  'ory', 'keycloak', 'auth0', 'okta', 'tailscale', 'cilium-io', 'istio',
  'knative', 'dapr-io', 'temporalio', 'nats-io', 'grpc', 'envoy-proxy',
  'openai', 'anthropic', 'huggingface', 'mistral-ai', 'cohere-ai', 'stability-ai',
  'lancedb', 'weaviate', 'qdrant', 'chroma-core', 'pinecone-io', 'llamaindex',
  'storybook-js', 'testing-library', 'cypress-io', 'playwright-community',
  'shadcn', 'radix-ui', 'chakra-ui', 'mantine-dev', 'ant-design', 'mui',
  'trpc', 'tanstack', 'jotai', 'zustand', 'redux-js', 'mobx', 'recoil',
  'drizzle-team', 'sequelize', 'typeorm', 'mikro-orm',
  'actix-web', 'axum-rs', 'hyper-rs', 'reqwest',
  'gin-gonic', 'go-chi', 'gofiber', 'echo-labstack',
  'spring-projects', 'quarkusio', 'micronaut-projects', 'helidon',
  'rails', 'sinatra-rb', 'hanami', 'sorbet-stripe',
]

const PROJECTS = [
  'core', 'engine', 'kit', 'hub', 'studio', 'forge', 'nexus', 'portal',
  'platform', 'runtime', 'sdk', 'cli', 'ui', 'api', 'server', 'client',
  'utils', 'tools', 'helpers', 'lib', 'framework', 'stack',
  'agent', 'worker', 'daemon', 'proxy', 'gateway', 'router', 'broker',
  'cache', 'store', 'db', 'queue', 'stream', 'pipeline',
  'auth', 'guard', 'shield', 'vault', 'crypto',
  'monitor', 'tracer', 'logger', 'metrics', 'profiler',
  'builder', 'bundler', 'compiler', 'parser', 'linter',
  'chart', 'graph', 'viz', 'canvas', 'renderer',
  'form', 'table', 'grid', 'calendar', 'carousel',
  'connector', 'adapter', 'bridge', 'transformer', 'converter',
]

const TOPIC_POOL: Record<string, string[]> = {
  TypeScript: ['typescript', 'javascript', 'frontend', 'backend', 'framework', 'react', 'nodejs'],
  JavaScript: ['javascript', 'frontend', 'nodejs', 'browser', 'esm', 'web'],
  Python:     ['python', 'ml', 'data-science', 'ai', 'backend', 'api', 'automation'],
  Go:         ['go', 'golang', 'backend', 'microservices', 'cloud', 'k8s', 'grpc'],
  Rust:       ['rust', 'systems', 'performance', 'wasm', 'cli', 'async'],
  Java:       ['java', 'spring', 'backend', 'jvm', 'enterprise', 'microservices'],
  'C++':      ['cpp', 'systems', 'performance', 'game-dev', 'compiler', 'embedded'],
  Ruby:       ['ruby', 'rails', 'web', 'backend', 'gem'],
  Swift:      ['swift', 'ios', 'macos', 'apple', 'mobile'],
  Kotlin:     ['kotlin', 'android', 'jvm', 'multiplatform', 'mobile'],
  PHP:        ['php', 'web', 'laravel', 'backend', 'cms'],
  'C#':       ['csharp', 'dotnet', 'microsoft', 'azure', 'unity'],
  Scala:      ['scala', 'functional', 'jvm', 'spark', 'big-data'],
  Haskell:    ['haskell', 'functional', 'types', 'category-theory'],
  Dart:       ['dart', 'flutter', 'mobile', 'cross-platform'],
  Elixir:     ['elixir', 'erlang', 'otp', 'phoenix', 'functional'],
}

const DESCS = [
  'A fast, lightweight library for building modern applications.',
  'Production-ready framework for distributed systems.',
  'Type-safe utilities for developers who care about correctness.',
  'Blazing-fast runtime with minimal footprint.',
  'Developer-first toolchain with batteries included.',
  'Enterprise-grade solution with battle-tested design.',
  'Open-source alternative to proprietary platforms.',
  'Cloud-native components built for scale.',
  'High-performance data processing pipeline.',
  'Composable building blocks for modern stacks.',
  'Real-time event streaming made simple.',
  'Minimal footprint, maximum throughput.',
  'Zero-config setup with smart defaults.',
  'Declarative API for complex workflows.',
  'Opinionated structure, flexible internals.',
  'Community-driven development platform.',
  'Cross-platform toolkit for system developers.',
  'Async-first, memory-safe implementation.',
  'From zero to production in minutes.',
  'Extensible plugin architecture for power users.',
  'Secure by default with progressive disclosure.',
  'ML-powered intelligence for modern apps.',
  'Observability-first design for distributed teams.',
  'Developer experience reimagined from scratch.',
  'Resilient, self-healing distributed system.',
]

// ── 절차적 저장소 생성 (ID 51~1000) ─────────────────────────────────
function generateRepo(id: number): Repository {
  const lang = pickLang(id)
  const orgIdx = Math.floor(seededVal(id, 4) * ORGS.length)
  const projIdx = Math.floor(seededVal(id, 5) * PROJECTS.length)
  const org = ORGS[orgIdx]
  const proj = PROJECTS[projIdx]
  const name = `${proj}-${(lang.toLowerCase().replace(/[^a-z]/g, ''))}`
             + (seededVal(id, 7) > 0.6 ? `-${id % 100}` : '')
  const fullName = `${org}/${name}`

  const activity = genActivityScore(id)
  const stars    = Math.floor(Math.pow(seededVal(id, 8), 2) * 50000 + activity * 200)
  const forks    = Math.floor(stars * (0.05 + seededVal(id, 9) * 0.3))
  const issues   = Math.floor(activity * (2 + seededVal(id, 10) * 5))

  const topicList = TOPIC_POOL[lang] ?? ['open-source']
  const t1 = topicList[Math.floor(seededVal(id, 11) * topicList.length)]
  const t2 = topicList[Math.floor(seededVal(id, 12) * topicList.length)]
  const desc = DESCS[Math.floor(seededVal(id, 13) * DESCS.length)]

  // 마지막 푸시: 활동 점수가 낮을수록 오래됨
  const daysAgo = Math.floor((100 - activity) * 3 + seededVal(id, 14) * 30)
  const pushedAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

  return {
    id,
    name,
    fullName,
    description: desc,
    language: lang,
    topics: [...new Set([t1, t2])],
    starCount: stars,
    forkCount: forks,
    openIssueCount: issues,
    pushedAt,
    htmlUrl: `https://github.com/${fullName}`,
  }
}

// ── 50개 기존 저장소 ──────────────────────────────────────────────────
const HAND_CRAFTED_REPOS: Repository[] = [
  // TypeScript
  { id: 1,  name: 'TypeScript',   fullName: 'microsoft/TypeScript',   description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.',                                       language: 'TypeScript',  topics: ['typescript','compiler','javascript'],    starCount: 99800,  forkCount: 12400, openIssueCount: 5300, pushedAt: '2024-07-02T12:00:00Z', htmlUrl: 'https://github.com/microsoft/TypeScript' },
  { id: 2,  name: 'next.js',      fullName: 'vercel/next.js',         description: 'The React Framework — App Router, Server Components, Streaming.',                                                          language: 'TypeScript',  topics: ['react','nextjs','ssr'],                  starCount: 124000, forkCount: 26500, openIssueCount: 2900, pushedAt: '2024-07-03T08:00:00Z', htmlUrl: 'https://github.com/vercel/next.js' },
  { id: 3,  name: 'vite',         fullName: 'vitejs/vite',            description: "Next generation frontend tooling. It's fast!",                                                                              language: 'TypeScript',  topics: ['bundler','frontend','vite'],             starCount: 67200,  forkCount: 6100,  openIssueCount: 450,  pushedAt: '2024-07-03T10:00:00Z', htmlUrl: 'https://github.com/vitejs/vite' },
  { id: 4,  name: 'angular',      fullName: 'angular/angular',        description: 'Deliver web apps with confidence.',                                                                                          language: 'TypeScript',  topics: ['angular','framework','frontend'],        starCount: 95200,  forkCount: 25200, openIssueCount: 1400, pushedAt: '2024-07-02T15:00:00Z', htmlUrl: 'https://github.com/angular/angular' },
  { id: 5,  name: 'nest',         fullName: 'nestjs/nest',            description: 'A progressive Node.js framework for building efficient and scalable server-side applications.',                              language: 'TypeScript',  topics: ['nodejs','typescript','backend'],         starCount: 67100,  forkCount: 7600,  openIssueCount: 310,  pushedAt: '2024-07-01T18:00:00Z', htmlUrl: 'https://github.com/nestjs/nest' },
  { id: 6,  name: 'vscode',       fullName: 'microsoft/vscode',       description: 'Visual Studio Code.',                                                                                                        language: 'TypeScript',  topics: ['editor','vscode','ide'],                starCount: 163000, forkCount: 28900, openIssueCount: 6800, pushedAt: '2024-07-03T06:00:00Z', htmlUrl: 'https://github.com/microsoft/vscode' },
  { id: 7,  name: 'prisma',       fullName: 'prisma/prisma',          description: 'Next-generation ORM for Node.js & TypeScript.',                                                                              language: 'TypeScript',  topics: ['orm','database','prisma'],              starCount: 38800,  forkCount: 1500,  openIssueCount: 2200, pushedAt: '2024-07-03T09:00:00Z', htmlUrl: 'https://github.com/prisma/prisma' },
  { id: 8,  name: 'trpc',         fullName: 'trpc/trpc',              description: 'End-to-end typesafe APIs made easy.',                                                                                         language: 'TypeScript',  topics: ['trpc','typescript','api'],              starCount: 34200,  forkCount: 1200,  openIssueCount: 180,  pushedAt: '2024-07-02T20:00:00Z', htmlUrl: 'https://github.com/trpc/trpc' },
  // JavaScript
  { id: 9,  name: 'react',        fullName: 'facebook/react',         description: 'The library for web and native user interfaces.',                                                                             language: 'JavaScript',  topics: ['javascript','library','ui'],            starCount: 227000, forkCount: 46500, openIssueCount: 820,  pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/facebook/react' },
  { id: 10, name: 'vue',          fullName: 'vuejs/vue',              description: 'The Progressive JavaScript Framework.',                                                                                        language: 'JavaScript',  topics: ['vue','frontend','javascript'],           starCount: 207000, forkCount: 33700, openIssueCount: 620,  pushedAt: '2024-06-28T12:00:00Z', htmlUrl: 'https://github.com/vuejs/vue' },
  { id: 11, name: 'express',      fullName: 'expressjs/express',      description: 'Fast, unopinionated, minimalist web framework for node.',                                                                     language: 'JavaScript',  topics: ['nodejs','javascript','backend'],         starCount: 64500,  forkCount: 13900, openIssueCount: 190,  pushedAt: '2024-06-30T00:00:00Z', htmlUrl: 'https://github.com/expressjs/express' },
  { id: 12, name: 'axios',        fullName: 'axios/axios',            description: 'Promise based HTTP client for the browser and node.js.',                                                                      language: 'JavaScript',  topics: ['http','javascript','nodejs'],            starCount: 105000, forkCount: 10800, openIssueCount: 390,  pushedAt: '2024-07-01T06:00:00Z', htmlUrl: 'https://github.com/axios/axios' },
  { id: 13, name: 'webpack',      fullName: 'webpack/webpack',        description: 'A bundler for javascript and friends.',                                                                                        language: 'JavaScript',  topics: ['bundler','javascript','build'],          starCount: 64800,  forkCount: 8900,  openIssueCount: 370,  pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/webpack/webpack' },
  { id: 14, name: 'lodash',       fullName: 'lodash/lodash',          description: 'A modern JavaScript utility library delivering modularity, performance, & extras.',                                           language: 'JavaScript',  topics: ['lodash','utility','javascript'],         starCount: 59500,  forkCount: 7000,  openIssueCount: 100,  pushedAt: '2024-05-10T00:00:00Z', htmlUrl: 'https://github.com/lodash/lodash' },
  { id: 15, name: 'svelte',       fullName: 'sveltejs/svelte',        description: 'Cybernetically enhanced web apps.',                                                                                            language: 'JavaScript',  topics: ['svelte','frontend','compiler'],          starCount: 77900,  forkCount: 4100,  openIssueCount: 780,  pushedAt: '2024-07-03T05:00:00Z', htmlUrl: 'https://github.com/sveltejs/svelte' },
  { id: 16, name: 'node',         fullName: 'nodejs/node',            description: 'Node.js JavaScript runtime.',                                                                                                  language: 'JavaScript',  topics: ['nodejs','javascript','runtime'],         starCount: 106000, forkCount: 29000, openIssueCount: 1500, pushedAt: '2024-07-03T04:00:00Z', htmlUrl: 'https://github.com/nodejs/node' },
  // Python
  { id: 17, name: 'pytorch',      fullName: 'pytorch/pytorch',        description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration.',                                                  language: 'Python',      topics: ['pytorch','deep-learning','ml'],          starCount: 82000,  forkCount: 22000, openIssueCount: 14000,pushedAt: '2024-07-03T00:00:00Z', htmlUrl: 'https://github.com/pytorch/pytorch' },
  { id: 18, name: 'tensorflow',   fullName: 'tensorflow/tensorflow',  description: 'An Open Source Machine Learning Framework for Everyone.',                                                                      language: 'Python',      topics: ['tensorflow','ml','deep-learning'],       starCount: 184000, forkCount: 74000, openIssueCount: 2200, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/tensorflow/tensorflow' },
  { id: 19, name: 'django',       fullName: 'django/django',          description: 'The Web framework for perfectionists with deadlines.',                                                                         language: 'Python',      topics: ['django','python','web'],                starCount: 78200,  forkCount: 31200, openIssueCount: 190,  pushedAt: '2024-07-02T08:00:00Z', htmlUrl: 'https://github.com/django/django' },
  { id: 20, name: 'fastapi',      fullName: 'tiangolo/fastapi',       description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.',                                      language: 'Python',      topics: ['fastapi','python','api'],               starCount: 75900,  forkCount: 6400,  openIssueCount: 240,  pushedAt: '2024-07-01T12:00:00Z', htmlUrl: 'https://github.com/tiangolo/fastapi' },
  { id: 21, name: 'transformers', fullName: 'huggingface/transformers',description: 'State-of-the-art Machine Learning for JAX, PyTorch and TensorFlow.',                                                          language: 'Python',      topics: ['nlp','transformers','llm'],             starCount: 131000, forkCount: 26000, openIssueCount: 1500, pushedAt: '2024-07-03T07:00:00Z', htmlUrl: 'https://github.com/huggingface/transformers' },
  { id: 22, name: 'langchain',    fullName: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications.',                                                                                  language: 'Python',      topics: ['langchain','llm','ai'],                 starCount: 88000,  forkCount: 14000, openIssueCount: 2800, pushedAt: '2024-07-03T11:00:00Z', htmlUrl: 'https://github.com/langchain-ai/langchain' },
  { id: 23, name: 'flask',        fullName: 'pallets/flask',          description: 'The Python micro framework for building web applications.',                                                                    language: 'Python',      topics: ['flask','python','web'],                 starCount: 67300,  forkCount: 16000, openIssueCount: 110,  pushedAt: '2024-06-25T00:00:00Z', htmlUrl: 'https://github.com/pallets/flask' },
  { id: 24, name: 'numpy',        fullName: 'numpy/numpy',            description: 'The fundamental package for scientific computing with Python.',                                                                language: 'Python',      topics: ['numpy','python','scientific'],           starCount: 27500,  forkCount: 9000,  openIssueCount: 2100, pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/numpy/numpy' },
  // Go
  { id: 25, name: 'go',           fullName: 'golang/go',              description: 'The Go programming language.',                                                                                                 language: 'Go',          topics: ['go','language','google'],               starCount: 123000, forkCount: 17500, openIssueCount: 8900, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/golang/go' },
  { id: 26, name: 'kubernetes',   fullName: 'kubernetes/kubernetes',  description: 'Production-Grade Container Scheduling and Management.',                                                                        language: 'Go',          topics: ['kubernetes','containers','cloud'],       starCount: 109000, forkCount: 39000, openIssueCount: 2300, pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/kubernetes/kubernetes' },
  { id: 27, name: 'moby',         fullName: 'moby/moby',              description: 'The Moby Project — a collaborative project for the container ecosystem.',                                                      language: 'Go',          topics: ['docker','containers','cloud'],           starCount: 68200,  forkCount: 18600, openIssueCount: 3600, pushedAt: '2024-07-01T06:00:00Z', htmlUrl: 'https://github.com/moby/moby' },
  { id: 28, name: 'gin',          fullName: 'gin-gonic/gin',          description: 'Gin is a HTTP web framework written in Go.',                                                                                   language: 'Go',          topics: ['gin','http','go','web'],                starCount: 78000,  forkCount: 8000,  openIssueCount: 430,  pushedAt: '2024-07-01T12:00:00Z', htmlUrl: 'https://github.com/gin-gonic/gin' },
  { id: 29, name: 'terraform',    fullName: 'hashicorp/terraform',    description: 'Terraform enables you to safely and predictably create, change, and improve infrastructure.',                                  language: 'Go',          topics: ['terraform','iac','infrastructure'],      starCount: 42800,  forkCount: 9600,  openIssueCount: 1800, pushedAt: '2024-07-02T08:00:00Z', htmlUrl: 'https://github.com/hashicorp/terraform' },
  { id: 30, name: 'fiber',        fullName: 'gofiber/fiber',          description: 'Express inspired web framework built on top of Fasthttp.',                                                                     language: 'Go',          topics: ['fiber','go','web','http'],               starCount: 33200,  forkCount: 1700,  openIssueCount: 120,  pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/gofiber/fiber' },
  // Rust
  { id: 31, name: 'rust',         fullName: 'rust-lang/rust',         description: 'Empowering everyone to build reliable and efficient software.',                                                                language: 'Rust',        topics: ['rust','systems','compiler'],            starCount: 96400,  forkCount: 12500, openIssueCount: 9200, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/rust-lang/rust' },
  { id: 32, name: 'tokio',        fullName: 'tokio-rs/tokio',         description: 'A runtime for writing reliable asynchronous applications with Rust.',                                                          language: 'Rust',        topics: ['tokio','async','rust'],                 starCount: 26600,  forkCount: 2400,  openIssueCount: 340,  pushedAt: '2024-07-01T12:00:00Z', htmlUrl: 'https://github.com/tokio-rs/tokio' },
  { id: 33, name: 'deno',         fullName: 'denoland/deno',          description: 'A modern runtime for JavaScript and TypeScript.',                                                                              language: 'Rust',        topics: ['deno','javascript','runtime'],           starCount: 94000,  forkCount: 5200,  openIssueCount: 1800, pushedAt: '2024-07-03T00:00:00Z', htmlUrl: 'https://github.com/denoland/deno' },
  { id: 34, name: 'tauri',        fullName: 'tauri-apps/tauri',       description: 'Build smaller, faster, and more secure desktop applications with a web frontend.',                                             language: 'Rust',        topics: ['tauri','rust','desktop'],               starCount: 82000,  forkCount: 2500,  openIssueCount: 900,  pushedAt: '2024-07-02T10:00:00Z', htmlUrl: 'https://github.com/tauri-apps/tauri' },
  { id: 35, name: 'bevy',         fullName: 'bevyengine/bevy',        description: 'A refreshingly simple data-driven game engine built in Rust.',                                                                 language: 'Rust',        topics: ['bevy','game-engine','rust'],            starCount: 35600,  forkCount: 3500,  openIssueCount: 2100, pushedAt: '2024-07-01T06:00:00Z', htmlUrl: 'https://github.com/bevyengine/bevy' },
  { id: 36, name: 'swc',          fullName: 'swc-project/swc',        description: 'Rust-based platform for the Web.',                                                                                             language: 'Rust',        topics: ['swc','compiler','rust'],                starCount: 31000,  forkCount: 1200,  openIssueCount: 1600, pushedAt: '2024-07-02T14:00:00Z', htmlUrl: 'https://github.com/swc-project/swc' },
  // Java
  { id: 37, name: 'spring-boot',  fullName: 'spring-projects/spring-boot', description: 'Spring Boot helps you to create Spring-powered, production-grade applications.',                                     language: 'Java',        topics: ['spring','java','framework'],            starCount: 74200,  forkCount: 40500, openIssueCount: 560,  pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/spring-projects/spring-boot' },
  { id: 38, name: 'elasticsearch',fullName: 'elastic/elasticsearch',  description: 'Free and Open, Distributed, RESTful Search Engine.',                                                                           language: 'Java',        topics: ['elasticsearch','search','distributed'],  starCount: 69700,  forkCount: 24700, openIssueCount: 4100, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/elastic/elasticsearch' },
  { id: 39, name: 'kafka',        fullName: 'apache/kafka',           description: 'Mirror of Apache Kafka.',                                                                                                      language: 'Java',        topics: ['kafka','streaming','messaging'],         starCount: 28400,  forkCount: 14300, openIssueCount: 390,  pushedAt: '2024-07-01T12:00:00Z', htmlUrl: 'https://github.com/apache/kafka' },
  { id: 40, name: 'RxJava',       fullName: 'ReactiveX/RxJava',       description: 'RxJava – Reactive Extensions for the JVM.',                                                                                   language: 'Java',        topics: ['rxjava','reactive','jvm'],              starCount: 47700,  forkCount: 7600,  openIssueCount: 25,   pushedAt: '2024-05-20T00:00:00Z', htmlUrl: 'https://github.com/ReactiveX/RxJava' },
  { id: 41, name: 'retrofit',     fullName: 'square/retrofit',        description: 'A type-safe HTTP client for Android and the JVM.',                                                                             language: 'Java',        topics: ['retrofit','http','android'],            starCount: 42900,  forkCount: 7300,  openIssueCount: 80,   pushedAt: '2024-06-15T00:00:00Z', htmlUrl: 'https://github.com/square/retrofit' },
  // C++
  { id: 42, name: 'opencv',       fullName: 'opencv/opencv',          description: 'Open Source Computer Vision Library.',                                                                                         language: 'C++',         topics: ['opencv','computer-vision','ml'],         starCount: 78000,  forkCount: 55000, openIssueCount: 2400, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/opencv/opencv' },
  { id: 43, name: 'terminal',     fullName: 'microsoft/terminal',     description: 'The new Windows Terminal.',                                                                                                    language: 'C++',         topics: ['terminal','windows','cpp'],             starCount: 95000,  forkCount: 8300,  openIssueCount: 1600, pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/microsoft/terminal' },
  { id: 44, name: 'llvm-project', fullName: 'llvm/llvm-project',      description: 'The LLVM Project is a collection of modular and reusable compiler and toolchain technologies.',                                language: 'C++',         topics: ['llvm','compiler','clang'],              starCount: 29500,  forkCount: 12100, openIssueCount: 1800, pushedAt: '2024-07-03T00:00:00Z', htmlUrl: 'https://github.com/llvm/llvm-project' },
  { id: 45, name: 'protobuf',     fullName: 'protocolbuffers/protobuf',description: "Protocol Buffers — Google's data interchange format.",                                                                       language: 'C++',         topics: ['protobuf','serialization','google'],     starCount: 65100,  forkCount: 15400, openIssueCount: 1300, pushedAt: '2024-07-01T06:00:00Z', htmlUrl: 'https://github.com/protocolbuffers/protobuf' },
  // Ruby
  { id: 46, name: 'rails',        fullName: 'rails/rails',            description: 'Ruby on Rails — A web-application framework.',                                                                                 language: 'Ruby',        topics: ['rails','ruby','web'],                   starCount: 55800,  forkCount: 21500, openIssueCount: 800,  pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/rails/rails' },
  { id: 47, name: 'brew',         fullName: 'Homebrew/brew',          description: 'The missing package manager for macOS (or Linux).',                                                                            language: 'Ruby',        topics: ['homebrew','package-manager','macos'],   starCount: 41000,  forkCount: 9800,  openIssueCount: 260,  pushedAt: '2024-07-03T00:00:00Z', htmlUrl: 'https://github.com/Homebrew/brew' },
  { id: 48, name: 'jekyll',       fullName: 'jekyll/jekyll',          description: 'Jekyll is a blog-aware static site generator in Ruby.',                                                                        language: 'Ruby',        topics: ['jekyll','ruby','static-site'],          starCount: 48400,  forkCount: 10000, openIssueCount: 130,  pushedAt: '2024-06-01T00:00:00Z', htmlUrl: 'https://github.com/jekyll/jekyll' },
  // Swift
  { id: 49, name: 'swift',        fullName: 'apple/swift',            description: 'The Swift Programming Language.',                                                                                              language: 'Swift',       topics: ['swift','apple','ios'],                  starCount: 67100,  forkCount: 10400, openIssueCount: 7900, pushedAt: '2024-07-02T00:00:00Z', htmlUrl: 'https://github.com/apple/swift' },
  { id: 50, name: 'Alamofire',    fullName: 'Alamofire/Alamofire',    description: 'Elegant HTTP Networking in Swift.',                                                                                            language: 'Swift',       topics: ['alamofire','swift','http'],             starCount: 40900,  forkCount: 7500,  openIssueCount: 40,   pushedAt: '2024-07-01T00:00:00Z', htmlUrl: 'https://github.com/Alamofire/Alamofire' },
]

// ── 생성된 저장소 951~1000개 합치기 ──────────────────────────────────
const GENERATED_REPOS: Repository[] = Array.from({ length: 950 }, (_, i) =>
  generateRepo(51 + i)
)

export const DUMMY_REPOSITORIES: Repository[] = [
  ...HAND_CRAFTED_REPOS,
  ...GENERATED_REPOS,
]

// ── 초기 점수 (50개 핸드크래프트 + 950개 생성) ────────────────────────
const HAND_CRAFTED_SCORES: RepoScore[] = [
  // TypeScript
  { repoId: 1,  activityScore: 75, healthScore: 85, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 2,  activityScore: 92, healthScore: 88, trendDelta: +12, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 3,  activityScore: 80, healthScore: 95, trendDelta: +8,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 4,  activityScore: 70, healthScore: 78, trendDelta: -2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 5,  activityScore: 78, healthScore: 90, trendDelta: +5,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 6,  activityScore: 90, healthScore: 88, trendDelta: +4,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 7,  activityScore: 72, healthScore: 82, trendDelta: +3,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 8,  activityScore: 65, healthScore: 88, trendDelta: +6,  updatedAt: '2024-07-03T00:00:00Z' },
  // JavaScript
  { repoId: 9,  activityScore: 88, healthScore: 90, trendDelta: +5,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 10, activityScore: 60, healthScore: 70, trendDelta: -4,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 11, activityScore: 55, healthScore: 72, trendDelta: -1,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 12, activityScore: 68, healthScore: 80, trendDelta: +1,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 13, activityScore: 62, healthScore: 75, trendDelta: -3,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 14, activityScore: 20, healthScore: 45, trendDelta: -12, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 15, activityScore: 82, healthScore: 88, trendDelta: +9,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 16, activityScore: 88, healthScore: 90, trendDelta: +6,  updatedAt: '2024-07-03T00:00:00Z' },
  // Python
  { repoId: 17, activityScore: 78, healthScore: 75, trendDelta: +15, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 18, activityScore: 72, healthScore: 72, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 19, activityScore: 68, healthScore: 85, trendDelta: +1,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 20, activityScore: 85, healthScore: 92, trendDelta: +18, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 21, activityScore: 95, healthScore: 90, trendDelta: +22, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 22, activityScore: 93, healthScore: 85, trendDelta: +20, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 23, activityScore: 52, healthScore: 80, trendDelta: -2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 24, activityScore: 65, healthScore: 82, trendDelta: +3,  updatedAt: '2024-07-03T00:00:00Z' },
  // Go
  { repoId: 25, activityScore: 82, healthScore: 88, trendDelta: +4,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 26, activityScore: 85, healthScore: 80, trendDelta: +1,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 27, activityScore: 70, healthScore: 78, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 28, activityScore: 74, healthScore: 85, trendDelta: +5,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 29, activityScore: 76, healthScore: 84, trendDelta: +3,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 30, activityScore: 69, healthScore: 88, trendDelta: +7,  updatedAt: '2024-07-03T00:00:00Z' },
  // Rust
  { repoId: 31, activityScore: 70, healthScore: 82, trendDelta: +3,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 32, activityScore: 74, healthScore: 88, trendDelta: +5,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 33, activityScore: 80, healthScore: 85, trendDelta: +8,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 34, activityScore: 86, healthScore: 90, trendDelta: +14, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 35, activityScore: 78, healthScore: 87, trendDelta: +10, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 36, activityScore: 72, healthScore: 80, trendDelta: +6,  updatedAt: '2024-07-03T00:00:00Z' },
  // Java
  { repoId: 37, activityScore: 65, healthScore: 78, trendDelta: -1,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 38, activityScore: 76, healthScore: 80, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 39, activityScore: 72, healthScore: 82, trendDelta: +3,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 40, activityScore: 8,  healthScore: 30, trendDelta: -18, updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 41, activityScore: 6,  healthScore: 28, trendDelta: -15, updatedAt: '2024-07-03T00:00:00Z' },
  // C++
  { repoId: 42, activityScore: 74, healthScore: 80, trendDelta: +4,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 43, activityScore: 70, healthScore: 82, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 44, activityScore: 82, healthScore: 85, trendDelta: +5,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 45, activityScore: 68, healthScore: 80, trendDelta: +1,  updatedAt: '2024-07-03T00:00:00Z' },
  // Ruby
  { repoId: 46, activityScore: 72, healthScore: 82, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 47, activityScore: 80, healthScore: 90, trendDelta: +6,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 48, activityScore: 5,  healthScore: 20, trendDelta: -20, updatedAt: '2024-07-03T00:00:00Z' },
  // Swift
  { repoId: 49, activityScore: 68, healthScore: 78, trendDelta: +2,  updatedAt: '2024-07-03T00:00:00Z' },
  { repoId: 50, activityScore: 45, healthScore: 72, trendDelta: -5,  updatedAt: '2024-07-03T00:00:00Z' },
]

const GENERATED_SCORES: RepoScore[] = Array.from({ length: 950 }, (_, i) => {
  const id = 51 + i
  const activity = genActivityScore(id)
  const health   = genHealthScore(id, activity)
  const trend    = Math.round((seededVal(id, 15) * 30 - 15))
  return { repoId: id, activityScore: activity, healthScore: health, trendDelta: trend, updatedAt: '2024-07-03T00:00:00Z' }
})

export const DUMMY_SCORES: RepoScore[] = [
  ...HAND_CRAFTED_SCORES,
  ...GENERATED_SCORES,
]
