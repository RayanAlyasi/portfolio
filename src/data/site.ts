// Single source of truth for profile details used in metadata and structured data.
export const site = {
  url: 'https://alyasi.tech',
  name: 'Rayan Alyasi',
  title: 'Rayan Alyasi · DevOps Engineer',
  // Search result snippet: kept under about 130 characters so Google shows it whole on phones too.
  description: 'Portfolio of Rayan Alyasi, a DevOps engineering intern at Tabby and Information Systems student at King Abdulaziz University.',
  shareTitle: 'Rayan Alyasi · Not Just a Student',
  shareDescription: 'DevOps engineering intern at Tabby, BCG Jeel Tamooh Fellow, 2× hackathon winner. Eight exhibits, twelve jurors, one verdict.',
  email: 'rayanalyasi@gmail.com',
  linkedin: 'https://www.linkedin.com/in/rayanalyasi',
  github: 'https://github.com/RayanAlyasi',
  x: 'https://x.com/rayan_alyasi',
  updated: '2026-10-11T00:00:00+03:00', // ISO 8601 date and time (Jeddah): Google rejects a bare date for dateModified
};

export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${site.url}/#person`,
      name: site.name,
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
    },
    { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name, inLanguage: 'en', author: { '@id': `${site.url}/#person` } },
    { '@type': 'ProfilePage', url: `${site.url}/`, name: site.title, mainEntity: { '@id': `${site.url}/#person` }, dateModified: site.updated },
  ],
};
