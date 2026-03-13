"use client";

import Link from "next/link";
import {
    ArrowLeftIcon,
    ArrowSquareOutIcon,
    CheckCircleIcon,
    DownloadSimpleIcon,
    PlugIcon,
    WifiHighIcon,
} from "@phosphor-icons/react";

export default function AnkiConnectPage() {
    return (
        <div className="min-h-screen bg-[#F5F1E8] py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[#1E5A8E] hover:underline mb-8 text-sm font-medium"
                >
                    <ArrowLeftIcon size={16} weight="bold" />
                    Back to YouTube Ankify
                </Link>

                <header className="mb-10">
                    <h1 className="font-(family-name:--font-playfair) text-4xl font-bold text-[#1E3A5F] mb-3">
                        AnkiConnect
                    </h1>
                    <p className="text-[#4A5568] text-lg">
                        A free add-on that lets apps send flashcards directly
                        into Anki — no file importing needed.
                    </p>
                </header>

                <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="bg-white rounded-xl border-2 border-[#D4CFC4] p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-8 h-8 rounded-full bg-[#1E5A8E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                1
                            </span>
                            <h2 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                                <DownloadSimpleIcon
                                    size={20}
                                    className="text-[#1E5A8E]"
                                />
                                Install AnkiConnect
                            </h2>
                        </div>
                        <p className="text-[#4A5568] text-sm mb-4 ml-11">
                            Open Anki, then go to{" "}
                            <strong>Tools → Add-ons → Get Add-ons</strong> and
                            enter the code below.
                        </p>
                        <div className="ml-11 flex items-center gap-3">
                            <code className="bg-[#F5F1E8] border-2 border-[#D4CFC4] rounded-lg px-4 py-2 text-[#1E3A5F] font-mono text-xl font-bold tracking-widest">
                                2055492159
                            </code>
                            <a
                                href="https://ankiweb.net/shared/info/2055492159"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-[#1E5A8E] hover:underline font-medium"
                            >
                                View on AnkiWeb
                                <ArrowSquareOutIcon size={14} weight="bold" />
                            </a>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white rounded-xl border-2 border-[#D4CFC4] p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-8 h-8 rounded-full bg-[#1E5A8E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                2
                            </span>
                            <h2 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                                <ArrowLeftIcon
                                    size={20}
                                    className="text-[#1E5A8E] rotate-180"
                                />
                                Restart Anki
                            </h2>
                        </div>
                        <div className="ml-11">
                            <details className="group">
                                <summary className="cursor-pointer text-sm text-[#4A5568] list-none flex items-center gap-1.5 select-none">
                                    <span className="transition-transform group-open:rotate-90 inline-block text-[#1E5A8E]">
                                        ›
                                    </span>
                                    After installing, fully quit and reopen Anki
                                </summary>
                                <div className="mt-2 pl-4 border-l-2 border-[#D4CFC4] text-sm text-[#6B7280] italic">
                                    AnkiConnect runs a local server on port{" "}
                                    <code className="bg-[#F5F1E8] px-1.5 py-0.5 rounded text-[#1E3A5F] font-mono text-xs not-italic">
                                        8765
                                    </code>{" "}
                                    in the background whenever Anki is open.
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white rounded-xl border-2 border-[#D4CFC4] p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-8 h-8 rounded-full bg-[#1E5A8E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                3
                            </span>
                            <h2 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                                <WifiHighIcon
                                    size={20}
                                    className="text-[#1E5A8E]"
                                />
                                Allow CORS (first time only)
                            </h2>
                        </div>
                        <div className="text-[#4A5568] text-sm ml-11 space-y-2">
                            <p>
                                Go to{" "}
                                <strong>
                                    Tools → Add-ons → AnkiConnect → Config
                                </strong>{" "}
                                and add every origin that needs access to{" "}
                                <code className="bg-[#F5F1E8] px-1.5 py-0.5 rounded text-[#1E3A5F] font-mono text-xs">
                                    webCorsOriginList
                                </code>
                                . Then click OK and restart Anki.
                            </p>
                            <div className="bg-[#F5F1E8] border border-[#D4CFC4] rounded-lg p-3 font-mono text-xs text-[#1E3A5F] leading-relaxed">
                                {`"webCorsOriginList": [`}
                                <br />
                                &nbsp;&nbsp;{`"http://localhost:3000",`}
                                <br />
                                &nbsp;&nbsp;{`"https://your-deployed-site.com"`}
                                <br />
                                {`]`}
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-white rounded-xl border-2 border-[#D4CFC4] p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-8 h-8 rounded-full bg-[#1E5A8E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                4
                            </span>
                            <h2 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                                <PlugIcon
                                    size={20}
                                    className="text-[#1E5A8E]"
                                />
                                Use it
                            </h2>
                        </div>
                        <p className="text-[#4A5568] text-sm ml-11">
                            Come back here, generate your flashcards, and click{" "}
                            <strong>Send to Anki</strong>. Cards go straight
                            into the deck you choose — no file download or
                            manual import needed.
                        </p>
                    </div>

                    {/* Note about note types */}
                    <div className="bg-[#FFF8E6] rounded-xl border-2 border-[#E8C84A] p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircleIcon
                                size={20}
                                className="text-[#B7860B] shrink-0 mt-0.5"
                                weight="fill"
                            />
                            <div>
                                <p className="text-sm font-semibold text-[#7A5800] mb-1">
                                    Note type requirement
                                </p>
                                <p className="text-sm text-[#7A5800]">
                                    Your Anki profile must have note types named
                                    exactly <strong>Basic</strong> and{" "}
                                    <strong>Cloze</strong>. These are created by
                                    default in new Anki profiles — if you
                                    deleted them, recreate them via{" "}
                                    <strong>Tools → Manage Note Types</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/"
                        className="block w-full text-center bg-[#1E5A8E] text-white py-3 rounded-lg font-semibold hover:bg-[#1E3A5F] transition-colors"
                    >
                        Back to YouTube Ankify
                    </Link>
                </div>
            </div>
        </div>
    );
}
