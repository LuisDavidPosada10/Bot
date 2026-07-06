import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('recipeTool');

interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strYoutube?: string;
  [key: string]: unknown;
}

function extractIngredients(meal: Meal): { ingrediente: string; medida: string }[] {
  const list: { ingrediente: string; medida: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`] as string | undefined;
    const mea = meal[`strMeasure${i}`] as string | undefined;
    if (ing && ing.trim()) list.push({ ingrediente: ing.trim(), medida: (mea ?? '').trim() });
  }
  return list;
}

export const buscarRecetaTool = tool(
  async ({ nombre, categoria, aleatorio }: { nombre?: string; categoria?: string; aleatorio?: boolean }) => {
    logger.debug({ nombre, categoria, random: aleatorio }, 'Buscando receta');
    try {
      let url: string;
      if (aleatorio) {
        url = 'https://www.themealdb.com/api/json/v1/1/random.php';
      } else if (nombre) {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(nombre)}`;
      } else if (categoria) {
        const catUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(categoria)}`;
        const { data: catData } = await axios.get(catUrl, { timeout: 8000 });
        const meals: any[] = catData?.meals ?? [];
        if (!meals.length) {
          logger.warn({ categoria }, 'No se encontraron recetas para la categoría');
          return JSON.stringify({ error: 'No se encontraron recetas para esa categoría' });
        }
        const pick = meals[Math.floor(Math.random() * Math.min(meals.length, 5))];
        url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${pick.idMeal}`;
      } else {
        url = 'https://www.themealdb.com/api/json/v1/1/random.php';
      }
      const { data } = await axios.get(url, { timeout: 8000 });
      const meals: Meal[] = data?.meals ?? [];
      if (!meals.length) {
        logger.warn({ nombre, categoria }, 'No se encontró receta');
        return JSON.stringify({ error: 'No se encontró ninguna receta con ese criterio' });
      }
      const meal = meals[0];
      const ingredientes = extractIngredients(meal);
      const instrucciones = meal.strInstructions
        ? meal.strInstructions.replace(/\r\n/g, '\n').trim().slice(0, 1500)
        : '';
      logger.info({ mealName: meal.strMeal, category: meal.strCategory, ingredientCount: ingredientes.length }, 'Receta encontrada');
      return JSON.stringify({
        nombre: meal.strMeal,
        categoria: meal.strCategory,
        origen: meal.strArea,
        imagen: meal.strMealThumb,
        video: meal.strYoutube ?? null,
        ingredientes,
        instrucciones,
        pasos: instrucciones ? instrucciones.split('\n').filter((l: string) => l.trim()).length : 0,
      });
    } catch (err: any) {
      logger.error({ err, nombre, categoria }, 'Error al buscar receta');
      return JSON.stringify({ error: 'Error al buscar receta', detalles: err?.message });
    }
  },
  {
    name: 'buscar_receta',
    description:
      'Busca recetas de cocina por nombre, categoría o de forma aleatoria. ' +
      'Devuelve ingredientes exactos con medidas, instrucciones paso a paso, imagen y enlace a video. ' +
      'Categorías: Beef, Chicken, Dessert, Lamb, Pasta, Pork, Seafood, Vegetarian, etc.',
    schema: z.object({
      nombre: z.string().optional().describe('Nombre del plato o ingrediente principal, ej. "chicken", "pasta", "sushi"'),
      categoria: z.string().optional().describe('Categoría de comida: Beef, Chicken, Dessert, Pasta, Seafood, Vegetarian, etc.'),
      aleatorio: z.boolean().optional().describe('Si es true, devuelve una receta aleatoria'),
    }),
  }
);