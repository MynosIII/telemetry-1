# Biblioteca editorial

Los archivos `articles/*.json` contienen textos originales en español. La guía del proyecto se utilizó para elegir temas; sus afirmaciones se contrastaron con las referencias de cada artículo.

Cada capítulo declara `sourceIds` que deben existir en `sources`. Las imágenes son opcionales y deben incluir página de procedencia, autor, licencia, descripción y texto alternativo. No se utilizan imágenes históricas generadas ni extractos copiados de Wikipedia.

Para agregar un artículo: crear un JSON siguiendo uno de los existentes, ejecutar `npm run build:articles` y `npm run verify:articles`, revisar afirmaciones y enlaces, y ejecutar la compilación. El índice generado se versiona para que las rutas y los metadatos no dependan de consultas externas.

Los tiempos de lectura se calculan a 200 palabras por minuto. Los enlaces al archivo ofrecen estadísticas y expedientes relacionados; no se fabrican puntuaciones del modelo para carreras anteriores a su cobertura.
