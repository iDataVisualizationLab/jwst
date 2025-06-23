

export interface Contributor {
  name: string
  email_school: string
  email_personal: string
  github: string
}

export interface VersionGroup {
  version: string
  year: string
  tools: string[]
  link?: string
  description?: string
  people: Contributor[]
}

export const contributors: VersionGroup[] = [
  {
    version: 'v2.0',
    year: '2025',
    tools: ['React', 'Next.js', 'Tailwind CSS', 'Headless UI', 'TypeScript'],
    link: 'https://demo-2025.example.com',
    description: 'Modern rewrite using the App Router and server components.',
    people: [
      {
        name: 'Phornsawan Roemsri',
        email_school: 'phornsawan.roemsri@ttu.edu',
        email_personal: 'phornsawan.roemsri@hotmail.com',
        github: 'https://github.com/rinriko',
      },
    ],
  },
  {
    version: 'v1.0',
    year: '2023',
    tools: ['Dash', 'Plotly', 'Flask', 'Bootstrap'],
    link: 'https://demo-2022.example.com',
    description: 'Initial dashboard prototype using Python stack.',
    people: [
      {
        name: 'Phornsawan Roemsri',
        email_school: 'phornsawan.roemsri@ttu.edu',
        email_personal: 'phornsawan.roemsri@hotmail.com',
        github: 'https://github.com/rinriko',
      },
    ],
  },
]