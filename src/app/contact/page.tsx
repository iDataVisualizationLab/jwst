// app/contact/page.tsx
import React from 'react'
import { contributors } from './contributors'

export default function Contact() {
    return (
        <main className="min-h-screen bg-white px-6 py-24 sm:py-32 lg:px-8">
            <div className="max-w-3xl mx-auto h-full text-center">
                <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">Contact & Credits</h1>

                <p className="mt-6 text-lg text-gray-600">
                    This project is open source and available on GitHub:
                </p>
                <div className="mt-4">
                    <a
                        href="https://github.com/iDataVisualizationLab/jwst"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 font-medium hover:underline"
                    >
                        View on GitHub →
                    </a>
                </div>

                {/* Scrollable Section */}
                <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-700 text-left space-y-4 overflow-y-auto max-h-[calc(100vh-16rem)] pr-2">
                    <p>
                        Developed by the{' '}
                        <a
                            href="https://idatavisualizationlab.github.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-medium"
                        >
                            iData Visualization Lab
                        </a>{' '}
                        at Texas Tech University.
                    </p>
                    <p>
                        Current version maintained by graduate Computer Science student under{' '}
                        <a
                            href="https://www.myweb.ttu.edu/tnhondan/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-medium"
                        >
                            Dr. Tommy Dang
                        </a>
                        .
                    </p>

                    <h2 className="mt-6 text-lg font-semibold text-gray-900">Version History</h2>
                    <ul className="list-disc ml-6 space-y-4 mt-2">
                        {contributors.map((versionGroup) => (
                            <li key={versionGroup.version}>
                                <span className="font-medium text-gray-800">
                                    {versionGroup.version} ({versionGroup.year})
                                </span>

                                {versionGroup.description && (
                                    <p className="mt-1 text-gray-600">{versionGroup.description}</p>
                                )}

                                {versionGroup.tools.length > 0 && (
                                    <p className="mt-1 text-sm text-gray-700">
                                        <strong>Tools:</strong> {versionGroup.tools.join(', ')}
                                    </p>
                                )}

                                {versionGroup.link && (
                                    <p className="mt-1">
                                        <a
                                            href={versionGroup.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-600 hover:underline"
                                        >
                                            View project →
                                        </a>
                                    </p>
                                )}

                                <ul className="ml-4 mt-3 text-sm text-gray-700 space-y-2">
                                    {versionGroup.people.map((person) => (
                                        <li key={person.email_school}>
                                            <strong>{person.name}</strong>
                                            <br />
                                            🎓{' '}
                                            <a href={`mailto:${person.email_school}`} className="text-indigo-600 hover:underline">
                                                {person.email_school}
                                            </a>
                                            <br />
                                            📧{' '}
                                            <a href={`mailto:${person.email_personal}`} className="text-indigo-600 hover:underline">
                                                {person.email_personal}
                                            </a>
                                            <br />
                                            🐙{' '}
                                            <a
                                                href={person.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline"
                                            >
                                                {person.github.replace('https://', '')}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    )
}

