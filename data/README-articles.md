# Biblioteca editorial

Los archivos `articles/*.json` contienen textos originales en español. La guía del proyecto se utilizó para elegir temas; sus afirmaciones se contrastaron con las referencias de cada artículo.

Cada capítulo declara `sourceIds` que deben existir en `sources`. Las referencias se presentan al final del relato, con un desglose opcional por capítulo, para no interrumpir la lectura. Las imágenes son opcionales y deben incluir página de procedencia, autor, licencia, descripción y texto alternativo. No se utilizan imágenes históricas generadas ni extractos copiados de Wikipedia.

`year` sitúa la historia en la línea del tiempo según su acontecimiento principal o el comienzo del proceso narrado; `period` muestra el alcance del relato. `tags` conserva nombres y alias útiles para buscar. Una historia que recorre varios años tiene una ubicación principal, sin insinuar que todos los hechos ocurrieron en una única fecha.

El estilo es relato histórico de no ficción: aperturas apoyadas en acontecimientos documentados, personas y decisiones concretas, detalles mecánicos o de archivo, y una progresión legible. No inventar escenas, diálogos, pensamientos, sonidos ni condiciones meteorológicas. Atribuir las anécdotas dudosas y resolver las etiquetas erróneas de la guía mediante las fuentes. La publicación evita conteos promocionales y numeración visible de relatos/capítulos.

Para agregar un artículo: crear un JSON siguiendo uno de los existentes, ejecutar `npm run build:articles` y `npm run verify:articles`, revisar afirmaciones y enlaces, y ejecutar la compilación. El índice generado se versiona para que las rutas y los metadatos no dependan de consultas externas.

Los tiempos de lectura se calculan a 200 palabras por minuto. Los enlaces al archivo ofrecen estadísticas y expedientes relacionados; no se fabrican puntuaciones del modelo para carreras anteriores a su cobertura.
