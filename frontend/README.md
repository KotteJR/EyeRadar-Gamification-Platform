This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Asset Structure (GitHub-Optimized)

### Game Card Images
- **Location**: `public/game-assets/game-card-images/`
- **Contents**: Static PNG images for game cards (included in git)
- **Source**: `src/lib/game-assets.ts` references these via `/game-assets/game-card-images/`
- **Files included**: `backward_spell.png`, `category_comprehension.png`, `category_phonological.png`, etc.

### Generated Game Images (Not Tracked)
- **Location**: `public/game-images/` (**excluded from git**)
- **Contents**: Dynamic/generated images created at runtime
- **Why excluded**: Large, generated dynamically, not needed in repository
- **Git rule**: Added to `.gitignore` to prevent bloating the repository

### How It Works
1. Card images are **committed to git** and deployed with the app
2. Generated images are created locally/at runtime and **never pushed to GitHub**
3. All asset references use `/game-assets/game-card-images/` for tracked images

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
