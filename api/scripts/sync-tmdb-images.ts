import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';
import { PrismaClient } from '../generated/prisma/client';

// TMDB allows 40 requests / 10s (4 req/s).
// CONCURRENCY=5 chunks + CHUNK_DELAY_MS=2000 → 5 req / 2s = 2.5 req/s — safely under the limit.
const CONCURRENCY = 5;
const CHUNK_DELAY_MS = 2000;

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Only strips a year when it appears in parentheses at the end: "Code 8 (2019)" → query="Code 8", year=2019
// Titles like "Reply 1994" are left untouched: query="Reply 1994", year=null
function parseTitle(raw: string): { query: string; year: number | null } {
    const match = raw.match(/^(.*?)\s*\(((?:19|20)\d{2})\)\s*$/);
    if (match) {
        return { query: match[1].trim(), year: parseInt(match[2], 10) };
    }
    return { query: raw.trim(), year: null };
}

async function getTmdbImage(title: string, type: 'movie' | 'tv'): Promise<{ poster: string | null; backdrop: string | null }> {
    const { query, year } = parseTitle(title);
    const dateField = type === 'movie' ? 'release_date' : 'first_air_date';

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/${type}`, {
            params: { api_key: TMDB_API_KEY, query, language: 'es-ES', page: 1 },
        });

        const results: any[] = response.data.results ?? [];
        if (results.length === 0) return { poster: null, backdrop: null };

        const result = year
            ? (results.find(r => new Date(r[dateField]).getFullYear() === year) ?? results[0])
            : results[0];

        return {
            poster: result.poster_path ? `${TMDB_IMAGE_BASE_URL}${result.poster_path}` : null,
            backdrop: result.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${result.backdrop_path}` : null,
        };
    } catch (error) {
        console.error(`Error buscando "${query}" en TMDB:`, error.message);
        return { poster: null, backdrop: null };
    }
}

async function processInChunks<T>(
    items: T[],
    handler: (item: T, index: number, total: number) => Promise<void>,
): Promise<void> {
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        const chunk = items.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            chunk.map((item, j) => handler(item, i + j, items.length)),
        );
        results.forEach((r) => {
            if (r.status === 'rejected') console.error('   ❌ Error en chunk:', r.reason?.message ?? r.reason);
        });
        if (i + CONCURRENCY < items.length) {
            await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
        }
    }
}

async function main() {
    if (!TMDB_API_KEY) {
        console.error('❌ Error: TMDB_API_KEY no está definida en las variables de entorno.');
        process.exit(1);
    }

    console.log('🎬 Iniciando sincronización de imágenes...');

    // 1. Películas
    console.log('\n🍿 Procesando Películas...');
    const movies = await prisma.movie.findMany({ where: { assets: { none: {} } } });
    console.log(`   ${movies.length} películas sin imágenes (chunks de ${CONCURRENCY})`);

    await processInChunks(movies, async (movie, i, total) => {
        console.log(`[${i + 1}/${total}] Buscando: "${movie.title}"...`);
        const images = await getTmdbImage(movie.title, 'movie');

        if (!images.poster && !images.backdrop) {
            console.log(`   ⚠️  Sin resultados para: "${movie.title}"`);
            return;
        }

        console.log(`   ✅ Encontrado — poster: ${!!images.poster}, backdrop: ${!!images.backdrop}`);
        if (images.poster) {
            await prisma.asset.create({
                data: { image_type: 'POSTER', url: images.poster, movie_id: movie.id, created_date: new Date(), modified_date: new Date() },
            });
        }
        if (images.backdrop) {
            await prisma.asset.create({
                data: { image_type: 'BACKDROP', url: images.backdrop, movie_id: movie.id, created_date: new Date(), modified_date: new Date() },
            });
        }
    });

    // 2. Series
    console.log('\n📺 Procesando Series (TV Shows)...');
    const tvShows = await prisma.tv_show.findMany({ where: { assets: { none: {} } } });
    console.log(`   ${tvShows.length} series sin imágenes (chunks de ${CONCURRENCY})`);

    await processInChunks(tvShows, async (show, i, total) => {
        console.log(`[${i + 1}/${total}] Buscando: "${show.title}"...`);
        const images = await getTmdbImage(show.title, 'tv');

        if (!images.poster && !images.backdrop) {
            console.log(`   ⚠️  Sin resultados para: "${show.title}"`);
            return;
        }

        console.log(`   ✅ Encontrado — poster: ${!!images.poster}, backdrop: ${!!images.backdrop}`);
        if (images.poster) {
            await prisma.asset.create({
                data: { image_type: 'POSTER', url: images.poster, tv_show_id: show.id, created_date: new Date(), modified_date: new Date() },
            });
        }
        if (images.backdrop) {
            await prisma.asset.create({
                data: { image_type: 'BACKDROP', url: images.backdrop, tv_show_id: show.id, created_date: new Date(), modified_date: new Date() },
            });
        }
    });

    console.log('\n✨ ¡Proceso completado!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
