"use client";

import { useState } from "react";
import { addFeed } from "./actions";

const PRESET_FEEDS = [
  { label: "Skift (travel news)", url: "https://skift.com/feed/" },
  { label: "Hospitality Net (global news)", url: "https://www.hospitalitynet.org/news/global.xml" },
  { label: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { label: "Altro (URL personalizzato)", url: "" },
];

export default function AddFeedForm() {
  const [url, setUrl] = useState("");

  return (
    <form action={addFeed} className="flex flex-wrap gap-2">
      <select
        aria-label="Fonte predefinita"
        defaultValue=""
        onChange={(e) => setUrl(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      >
        <option value="" disabled>
          Scegli una fonte predefinita…
        </option>
        {PRESET_FEEDS.map((preset) => (
          <option key={preset.label} value={preset.url}>
            {preset.label}
          </option>
        ))}
      </select>
      <input
        type="url"
        name="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://esempio.com/feed.xml"
        className="block min-w-[16rem] flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Aggiungi feed
      </button>
    </form>
  );
}
