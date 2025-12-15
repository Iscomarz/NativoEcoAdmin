/**
 * Helper para optimizar imágenes antes de subirlas
 * Reduce el tamaño del archivo sin perder calidad visual significativa
 */

export interface OpcionesOptimizacion {
    maxWidth?: number;        // Ancho máximo (default: 1920px)
    maxHeight?: number;       // Alto máximo (default: 1080px)
    quality?: number;         // Calidad JPEG/WebP 0-1 (default: 0.85)
    format?: 'image/jpeg' | 'image/webp' | 'image/png'; // Formato de salida
}

/**
 * Optimiza una imagen reduciendo su tamaño manteniendo calidad visual
 * @param file - Archivo de imagen original
 * @param opciones - Configuración de optimización
 * @returns Promise con el archivo optimizado
 */
export async function optimizarImagen(
    file: File,
    opciones: OpcionesOptimizacion = {}
): Promise<File> {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.85,
        format = 'image/jpeg'
    } = opciones;

    return new Promise((resolve, reject) => {
        // Crear un lector de archivos
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Calcular nuevas dimensiones manteniendo el aspect ratio
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const aspectRatio = width / height;

                    if (width > height) {
                        width = maxWidth;
                        height = width / aspectRatio;
                    } else {
                        height = maxHeight;
                        width = height * aspectRatio;
                    }
                }

                // Crear canvas para el redimensionamiento
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No se pudo obtener el contexto 2D del canvas'));
                    return;
                }

                // Aplicar suavizado para mejor calidad
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Dibujar la imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir canvas a Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('No se pudo crear el blob'));
                            return;
                        }

                        // Crear nuevo archivo con el blob optimizado
                        const extension = format.split('/')[1];
                        const nombreOriginal = file.name.split('.')[0];
                        const nuevoNombre = `${nombreOriginal}_optimizado.${extension}`;

                        const archivoOptimizado = new File([blob], nuevoNombre, {
                            type: format,
                            lastModified: Date.now()
                        });

                        console.log(`✅ Imagen optimizada: ${file.name}`);
                        console.log(`   Original: ${(file.size / 1024).toFixed(2)} KB`);
                        console.log(`   Optimizada: ${(archivoOptimizado.size / 1024).toFixed(2)} KB`);
                        console.log(`   Reducción: ${((1 - archivoOptimizado.size / file.size) * 100).toFixed(2)}%`);

                        resolve(archivoOptimizado);
                    },
                    format,
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Error al cargar la imagen'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Optimiza múltiples imágenes en paralelo
 * @param files - Array de archivos a optimizar
 * @param opciones - Configuración de optimización
 * @returns Promise con array de archivos optimizados
 */
export async function optimizarImagenes(
    files: File[],
    opciones: OpcionesOptimizacion = {}
): Promise<File[]> {
    console.log(`🔄 Optimizando ${files.length} imágenes...`);

    const promesas = files.map(file => optimizarImagen(file, opciones));
    const imagenesOptimizadas = await Promise.all(promesas);

    const tamanoOriginal = files.reduce((sum, file) => sum + file.size, 0);
    const tamanoOptimizado = imagenesOptimizadas.reduce((sum, file) => sum + file.size, 0);
    const reduccion = ((1 - tamanoOptimizado / tamanoOriginal) * 100).toFixed(2);

    console.log(`✅ Optimización completada:`);
    console.log(`   Total original: ${(tamanoOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total optimizado: ${(tamanoOptimizado / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Reducción total: ${reduccion}%`);

    return imagenesOptimizadas;
}

/**
 * Detecta el formato óptimo basado en el tipo de imagen
 * @param file - Archivo a analizar
 * @returns Formato recomendado
 */
export function detectarFormatoOptimo(file: File): 'image/jpeg' | 'image/webp' | 'image/png' {
    // Si es PNG con transparencia, mantener PNG
    if (file.type === 'image/png') {
        return 'image/png';
    }

    // Para todo lo demás, usar WebP si está soportado, sino JPEG
    const soportaWebP = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');

    return soportaWebP ? 'image/webp' : 'image/jpeg';
}
