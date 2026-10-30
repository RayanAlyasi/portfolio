// Single source of truth for profile details used in metadata and structured data.
export const site = {
  url: 'https://alyasi.tech',
  name: 'Rayan Alyasi',
  title: 'Rayan Alyasi · DevOps Engineer',
  // Search result snippet. It starts with the name because Google starts the snippet at the words searched for
  // (it dropped a leading "Portfolio of"), and it is about 150 characters so Google shows it whole without padding it with page text.
  description: "Rayan Alyasi's portfolio: DevOps engineering intern at Tabby, BCG Jeel Tamooh Fellow and Information Systems student at King Abdulaziz University.",
  shareTitle: 'Rayan Alyasi · Not Just a Student',
  shareDescription: 'DevOps engineering intern at Tabby, BCG Jeel Tamooh Fellow, 2× hackathon winner. Eight exhibits, twelve jurors, one verdict.',
  email: 'rayanalyasi@gmail.com',
  linkedin: 'https://www.linkedin.com/in/rayanalyasi',
  github: 'https://github.com/RayanAlyasi',
  x: 'https://x.com/rayan_alyasi',
  updated: '2026-10-30T00:00:00+03:00', // ISO 8601 date and time (Jeddah): Google rejects a bare date for dateModified
};

// Arabic searches need Arabic text to match, so these belong to the Arabic page (src/pages/ar.astro).
export const arabic = {
  path: '/ar',
  name: 'ريان الياسي',
  title: 'ريان الياسي · DevOps Engineer',
  // Starts with the name, for the same reason as site.description.
  description: 'ريان الياسي: معرض أعمال متدرب في هندسة DevOps لدى تابي، وزميل برنامج جيل طموح من BCG، وطالب نظم معلومات في جامعة الملك عبدالعزيز.',
};

const person = {
  '@type': 'Person',
  '@id': `${site.url}/#person`,
  name: site.name,
  alternateName: arabic.name,
  url: `${site.url}/`,
  image: `${site.url}/og-image.png`,
  jobTitle: 'DevOps Engineering Intern',
  worksFor: { '@type': 'Organization', name: 'Tabby', url: 'https://tabby.ai' },
  affiliation: [
    { '@type': 'CollegeOrUniversity', name: 'King Abdulaziz University' },
    { '@type': 'Organization', name: 'Boston Consulting Group · Jeel Tamooh Fellowship' },
  ],
  address: { '@type': 'PostalAddress', addressLocality: 'Jeddah', addressCountry: 'SA' },
  email: `mailto:${site.email}`,
  sameAs: [site.linkedin, site.github, site.x],
  knowsAbout: ['DevOps', 'Platform engineering', 'Cloud engineering', 'Kubernetes', 'Terraform', 'Google Cloud', 'Docker', 'Linux', 'GitOps', 'Site reliability engineering'],
  award: ['1st place, TCS Sustainathon Saudi Arabia 2026', '1st place, TechHub Innovation Startup Challenge 2026', 'BCG Jeel Tamooh Fellow'],
};

const website = { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name, inLanguage: 'en', author: { '@id': `${site.url}/#person` } };

export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    person,
    website,
    { '@type': 'ProfilePage', url: `${site.url}/`, name: site.title, mainEntity: { '@id': `${site.url}/#person` }, dateModified: site.updated },
  ],
};

export const arabicStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    person,
    website,
    { '@type': 'ProfilePage', url: `${site.url}${arabic.path}`, name: arabic.title, inLanguage: 'ar', mainEntity: { '@id': `${site.url}/#person` }, dateModified: site.updated },
  ],
};
