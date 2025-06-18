# Vinyl Vue - An Online Retro Vinyl Record Player

> Crafted by [ventuss](https://ventuss.xyz)

A web-based music player designed to simulate the experience of listening to vinyl records.

- **Live Preview:** [Vinyl Vue | Retro Vinyl Player](https://vinyl-vue.ventuss.xyz/)  
- **Alternative Preview (Li Zhi Tribute):** [我爱南京 - 李志黑胶唱机](https://ilovenanjing.ventuss.xyz/playing)

![Screenshot](https://r2.ventuss.xyz/blog/images/2025-06-18-2-original.png)

## Inspiration

As an avid music lover, I enjoy curating my own library. One of my favorite rock singers, Li Zhi, was unfortunately banned in China, so I spent time collecting all his works. My friends are also fans, but sharing my collection with them was difficult (cloud storage was too slow). This led me to a decision: I would build a music player so they could listen to his music anytime, anywhere.

I felt that Li Zhi's music deserved a beautiful vinyl player interface, an idea inspired by the [MD Vinyl app](https://apps.apple.com/us/app/md-vinyl-for-music-app/id1606306441).

My initial search for an open-source solution led me to [codrops/RecordPlayer](https://github.com/codrops/RecordPlayer). It was beautiful but hadn't been updated in years, and my attempts to modernize it were unsuccessful. So, I decided to build one from the ground up.

I had never used Vue before, but it always seemed cool, and the name "Vue" coincidentally paired well with "Vinyl"—plus, "Vinyl Vue" has a nice ring to it, almost like "Déjà Vu." With a stunning design reference from Joseph on the [Figma Community](https://www.figma.com/community/file/1205465845271811637), Vinyl Vue was born.

## Features

*   **Retro Aesthetics**: A skeuomorphic interface that brings back the nostalgic feel of a classic vinyl record player.
*   **Authentic Sound & Motion**: Features a gentle vinyl crackle sound on play/pause, a rotating record, and a tonearm that realistically tracks with the music's progress.
*   **Intuitive Controls**: Playback can be toggled by clicking the control button or the tonearm itself. When paused, the tonearm gracefully moves aside.
*   **Dot-Matrix Display**: Track information is displayed using a font reminiscent of vintage CD players.
*   **Album Browsing**: Click the album art to view the entire collection. The tracklist is intentionally hidden to better simulate a true vinyl experience.

Anyway, enjoy the music!

## How to Use

Follow these steps to get the project running on your local machine.

**1. Prerequisites**
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn)

**2. Clone the Repository**
```bash
git clone https://github.com/your-username/vinyl-vue.git
cd vinyl-vue
```

**3. Install Dependencies**
```bash
pnpm install
```

**4. Set Up Environment Variables**
Copy the example environment file and fill in your own credentials and URLs.
```bash
cp .env.example .env
```
You will need to update the `.env` file with your own keys for Cloudflare R2 (or another S3-compatible storage) and your application's URLs.

**5. Set up Your Music Library & Storage**

*   **a) Upload Your Files**: Upload your audio files (`.m4a`, `.mp3`, etc.) and cover images to your object storage bucket. The `scripts/upload-to-r2.js` script is provided as a utility to help you. Configure your R2 credentials in `.env` and run `node scripts/upload-to-r2.js` to use it.

*   **b) Update the Library JSON**: Edit `public/records/records-library.json` to reflect your album and track structure. The `coverSrc` and `src` paths should use the `${R2_PUBLIC_URL}` placeholder, which will be dynamically replaced by the `VITE_R2_PUBLIC_URL` from your `.env` file.

*   **c) Configure CORS**: To allow your web application to fetch resources from your bucket, you must configure Cross-Origin Resource Sharing (CORS).
    1.  In the `scripts/` directory, copy `cors-config.example.json` to `cors-config.json`.
    2.  Open your new `scripts/cors-config.json` and replace `"https://*.your-domain.com"` with your application's actual domain.
    3.  Apply these CORS rules to your R2 bucket via the `wrangler` CLI or by pasting the JSON into your Cloudflare dashboard.

**6. Run the Development Server**
```bash
pnpm run dev
```
The application should now be running on `http://localhost:5173`.

## Tech Stack

*   **Framework:** Vue 3 (using `<script setup>`)
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **State Management:** Pinia
*   **Routing:** Vue Router
*   **Styling:** Tailwind CSS
*   **Audio Playback:** HTML5 `<audio>` element
*   **File Storage:** Cloudflare R2 (or any other object storage)

## Project Structure
```
.
├── public/             # Static assets (like records.json, favicon, etc.)
├── src/                # Source code
│   ├── assets/         # Assets processed by Vite (images, fonts, etc.)
│   ├── layouts/        # Layout components (optional)
│   ├── router/         # Vue Router configuration (index.ts)
│   ├── services/       # Business logic, API calls (e.g., musicService.ts)
│   ├── store/          # Pinia state stores (libraryStore.ts, playerStore.ts)
│   ├── styles/         # Global styles or Tailwind base styles (style.css)
│   ├── types/          # TypeScript type definitions
│   ├── views/          # Page-level components (AlbumBrowse.vue, AlbumPlayer.vue)
│   ├── App.vue         # Root Vue component
│   └── main.ts         # Application entry point
├── index.html          # Main HTML file
├── package.json        # Project dependencies and scripts
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite configuration
```

## Acknowledgements

*   This project retains a small legacy from **[codrops/RecordPlayer](https://github.com/codrops/RecordPlayer)**: the gentle vinyl scratch sound you hear on play/pause.
*   Design inspiration from the [**Record Deck Illustration**](https://www.figma.com/community/file/1205465845271811637) by Joseph on the Figma Community.
*   This project was brought to life with significant help from AI tools like **Cursor**, **Claude**, and **Gemini**, which contributed to about 90% of the code. Thank you, AI.


