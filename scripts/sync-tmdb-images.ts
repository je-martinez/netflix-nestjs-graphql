import { PrismaClient } from '../generated/prisma';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Asegúrate de tener tu API Key de TMDB en tu archivo .env
// TMDB_API_KEY=tu_api_key_aqui
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Puedes cambiar 'w500' por 'original' para mayor calidad

async function getTmdbImage(title: string, type: 'movie' | 'tv'): Promise<{ poster: string | null; backdrop: string | null }> {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/${type}`, {
            params: {
                api_key: TMDB_API_KEY,
                query: title,
                language: 'es-ES',
                page: 1,
            },
        });

        const results = response.data.results;
        if (results && results.length > 0) {
            const firstResult = results[0];
            return {
                poster: firstResult.poster_path ? `${TMDB_IMAGE_BASE_URL}${firstResult.poster_path}` : null,
                backdrop: firstResult.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${firstResult.backdrop_path}` : null,
            };
        }
        return { poster: null, backdrop: null };
    } catch (error) {
        console.error(`Error buscando ${title} en TMDB:`, error.message);
        return { poster: null, backdrop: null };
    }
}

async function main() {
    if (!TMDB_API_KEY) {
        console.error('❌ Error: TMDB_API_KEY no está definida en las variables de entorno.');
        process.exit(1);
    }

    console.log('🎬 Iniciando sincronización de imágenes...');

    // 1. Obtener Películas
    console.log('\n🍿 Procesando Películas...');
    const movies = await prisma.movie.findMany({
        where: {
            assets: {
                none: {}
            }
        }
    });

    for (const movie of movies) {
        console.log(`Buscando imágenes para la película: "${movie.title}"...`);
        const images = await getTmdbImage(movie.title, 'movie');

        if (images.poster || images.backdrop) {
            console.log(`✅ ¡Encontrado! Poster: ${images.poster !== null}`);

            if (images.poster) {
                await prisma.asset.create({
                    data: {
                        image_type: 'POSTER',
                        url: images.poster,
                        movie_id: movie.id,
                        created_date: new Date(),
                        modified_date: new Date(),
                    }
                });
            }

            if (images.backdrop) {
                await prisma.asset.create({
                    data: {
                        image_type: 'BACKDROP',
                        url: images.backdrop,
                        movie_id: movie.id,
                        created_date: new Date(),
                        modified_date: new Date(),
                    }
                });
            }
        } else {
            console.log(`⚠️ No se encontraron imágenes para: "${movie.title}"`);
        }

        // Esperar un poco para no saturar la API (Rate limiting)
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    // 2. Obtener Series (TV Shows)
    console.log('\n📺 Procesando Series (TV Shows)...');
    const tvShows = await prisma.tv_show.findMany({
        where: {
            assets: {
                none: {}
            }
        }
    });

    for (const show of tvShows) {
        console.log(`Buscando imágenes para la serie: "${show.title}"...`);
        const images = await getTmdbImage(show.title, 'tv');

        if (images.poster || images.backdrop) {
            console.log(`✅ ¡Encontrado! Poster: ${images.poster !== null}`);

            if (images.poster) {
                await prisma.asset.create({
                    data: {
                        image_type: 'POSTER',
                        url: images.poster,
                        tv_show_id: show.id,
                        created_date: new Date(),
                        modified_date: new Date(),
                    }
                });
            }

            if (images.backdrop) {
                await prisma.asset.create({
                    data: {
                        image_type: 'BACKDROP',
                        url: images.backdrop,
                        tv_show_id: show.id,
                        created_date: new Date(),
                        modified_date: new Date(),
                    }
                });
            }
        } else {
            console.log(`⚠️ No se encontraron imágenes para: "${show.title}"`);
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('\n✨ ¡Proceso completado! Images guardados en la base de datos.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
