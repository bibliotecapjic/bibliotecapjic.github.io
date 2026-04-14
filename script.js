/**
 * ============================================================================
 * SISTEMA DE MAPAS DE BIBLIOTECA CON VISUALIZACIÓN 3D (MATTERPORT)
 * ============================================================================
 * 
 * Este módulo permite:
 *  - Seleccionar una biblioteca (Medellín, Oriente, Urabá).
 *  - Buscar un libro por su signatura (clasificación Dewey) y mostrar su
 *    ubicación aproximada en un mapa 2D interactivo.
 *  - Seleccionar tipos de material (revistas, CDs, tesis, folletos, normas)
 *    y mostrar sus ubicaciones estáticas en el mapa.
 *  - Hacer clic sobre los marcadores 📍 para abrir una vista 3D (Matterport)
 *    en una nueva pestaña.
 *  - Leer parámetros de la URL (library_code, material_type, location_code,
 *    call_number) para integración con sistemas externos.
 * 
 * ============================================================================
 */

// ------------------------------- ESTADO GLOBAL ------------------------------

/** @type {string|null} Biblioteca seleccionada ('medellin', 'oriente', 'uraba') */
let selectedLibrary = null;

/** @type {string|null} Material seleccionado ('tesis', 'cd', 'revista', 'folleto', 'norma') */
let selectedMaterial = null;

/** @type {object|null} Datos de la biblioteca actual (cargados desde mapData) */
let currentLibraryData = null;

/** @type {number|null} Timeout para búsqueda mientras el usuario escribe */
let searchTimeout = null;

/** @type {number|null} Timeout para la carga de la imagen del mapa */
let currentImageLoadTimeout = null;

/** @type {boolean} Indica si el mapa se está cargando para evitar peticiones simultáneas */
let isMapLoading = false;

/** @type {object|null} Ubicación calculada que se mostrará cuando termine de cargar el mapa */
let pendingLocation = null;

// ------------------------------- DATOS DE MAPAS (CON URLs 3D) ----------------

/**
 * Contiene toda la información de cada biblioteca: nombre, pisos,
 * ubicaciones estáticas (revistas, tesis, etc.) y estanterías (stacks)
 * con sus rangos Dewey y coordenadas relativas.
 * 
 * Las coordenadas x, y, width, height son valores relativos al tamaño de la imagen
 * (entre 0 y 1). Se usan para dibujar los marcadores.
 * 
 * Cada stack y ubicación estática incluye una URL de Matterport para la vista 3D.
 */
const mapData = {
    "MEDELLÍN": {
        name: "Biblioteca Medellín",
        floors: {
            1: {
                img: "images/mapa-medellin-piso-1.png",
                staticLocations: {
                    "REVISTA": {
                        x: 0.0815, y: 0.8564, width: 0.1046, height: 0.0799,
                        message: "Colección de Revistas - Hemeroteca",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=232&sr=3.07,-1.17"
                    },
                    "FOLLETO": {
                        x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                        message: "Colección de Folletos. Consultar en Circulación y Préstamo",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                    },
                    "TRABAJO DE GRADO": [
                        {
                            x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                            message: "Los Trabajos de grado en CDs se encuentran en el primer piso - Circulación y préstamo.",
                            url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                        },
                        {
                            x: 0.8167, y: 0.4356, width: 0.1694, height: 0.2643,
                            message: "Los Trabajos de grado en formato físico se encuentran en el piso 2 de la Biblioteca.",
                            url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=13&sr=-.15,.02"
                        }
                    ],
                    "NORMAS": {
                        x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                        message: "Colección de Normas Técnicas. Consultar en Circulación y Préstamo",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                    },
                    "MULTIMEDIA": {
                        x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                        message: "Colección Multimedia - CDs, DVDs. Consultar en Circulación y Préstamo",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                    }
                },
                // Estanterías (stacks) con rangos Dewey. Cada stack tiene un ID, rango numérico,
                // coordenadas relativas y URL 3D correspondiente.
                stacks: [
                    { id: "1.1A1.Izquierdo", start: "000.0", end: "005.1", x: 0.6222, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=59&sr=-1.4,-1.33" },
                    { id: "1.1A2.Izquierdo", start: "005.101", end: "036.0", x: 0.6222, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=94&sr=-2.26,-1.48" },
                    { id: "1.1B2.Derecho", start: "036.01", end: "302.0", x: 0.5944, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=92&sr=-.53,-1.51" },
                    { id: "1.1B1.Derecho", start: "302.01", end: "330.01", x: 0.5944, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=61&sr=-.35,-.8" },
                    { id: "1.2A1.Izquierdo", start: "330.011", end: "338.5", x: 0.5602, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=61&sr=-3,-1.08" },
                    { id: "1.2A2.Izquierdo", start: "338.501", end: "373.2", x: 0.5602, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=92&sr=-3,-1.08" },
                    { id: "1.2B2.Derecho", start: "373.201", end: "512.1", x: 0.5324, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=90&sr=-.02,-1.09" },
                    { id: "1.2B1.Derecho", start: "512.101", end: "515.3", x: 0.5324, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=63&sr=-.18,-.4" },
                    { id: "1.3A1.Izquierdo", start: "515.301", end: "519.5", x: 0.4963, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=63&sr=-3.07,-.41" },
                    { id: "1.3A2.Izquierdo", start: "519.501", end: "537.0", x: 0.4936, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=90&sr=-2.97,-.52" },
                    { id: "1.3B2.Derecho", start: "537.01", end: "574.5", x: 0.4685, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=88&sr=-.33,-.7" },
                    { id: "1.3B1.Derecho", start: "574.501", end: "591.0", x: 0.4685, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=66&sr=-.21,-.94" },
                    { id: "1.4A1.Izquierdo", start: "591.01", end: "612.76", x: 0.4324, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=65&sr=-2.84,-1.28" },
                    { id: "1.4A2.Izquierdo", start: "612.7601", end: "612.27", x: 0.4333, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=217&sr=-2.7,-1.26" },
                    { id: "1.4B2.Derecho", start: "612.2701", end: "621.4", x: 0.4065, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=86&sr=-.23,-.81" },
                    { id: "1.4B1.Derecho", start: "621.401", end: "624.18", x: 0.4065, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=67&sr=-.06,-.81" },
                    { id: "1.5A1.Izquierdo", start: "624.1801", end: "629.8", x: 0.3713, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=67&sr=-2.97,-1.37" },
                    { id: "1.5A2.Izquierdo", start: "629.801", end: "634.0", x: 0.3704, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=87&sr=-3.01,-1.06" },
                    { id: "1.5B2.Derecho", start: "634.01", end: "657.0", x: 0.3435, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=84&sr=.03,-.97" },
                    { id: "1.5B1.Derecho", start: "657.01", end: "657.8", x: 0.3435, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=68&sr=-.02,-.9" },
                    { id: "1.6A1.Izquierdo", start: "657.801", end: "658.3", x: 0.3074, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=68&sr=-2.86,-1.08" },
                    { id: "1.6A2.Izquierdo", start: "658.301", end: "658.5", x: 0.3074, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=85&sr=-2.91,-1.1" },
                    { id: "1.6B2.Derecho", start: "658.501", end: "658.85", x: 0.2806, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=228&sr=-.2,-.61" },
                    { id: "1.6B1.Derecho", start: "658.8501", end: "690.2", x: 0.2806, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=251&sr=-.13,-.96" },
                    { id: "1.7A1.Izquierdo", start: "690.201", end: "790.2", x: 0.2444, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=250&sr=-3.13,-1.19" },
                    { id: "1.7A2.Izquierdo", start: "790.201", end: "799.1", x: 0.2444, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=83&sr=-2.69,-1.2" },
                    { id: "1.7B2.Derecho", start: "799.101", end: "899.9", x: 0.2185, y: 0.8254, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=229&sr=-.25,-1.13" },
                    { id: "1.7B1.Derecho", start: "900", end: "999.9", x: 0.2185, y: 0.6770, height: 0.1109, width: 0.0269, url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=254&sr=-.24,-.97" }
                ]
            },
            2: {
                img: "images/mapa-medellin-piso-2.png",
                staticLocations: {
                    "COLECCION ESTATICA": {
                        x: 0.0, y: 0.0, width: 0.0, height: 0.0,
                        message: "Colección - Piso 2",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY"
                    }
                },
                stacks: []
            }
        }
    },
    "CENTRO REGIONAL ORIENTE": {
        name: "Biblioteca Centro Regional Oriente",
        floors: {
            1: {
                img: "https://bibliotecapjic.github.io/images/mapa-oriente-piso-1.png",
                staticLocations: {
                    "REVISTA": {
                        x: 0.2, y: 0.3, width: 0.1, height: 0.1,
                        message: "Colección de Revistas - Oriente",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY"
                    },
                    "TRABAJO DE GRADO": {
                        x: 0.4, y: 0.5, width: 0.1, height: 0.1,
                        message: "Colección de Tesis - Oriente",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY"
                    }
                },
                stacks: []
            }
        }
    },
    "CENTRO REGIONAL URABÁ": {
        name: "Biblioteca Centro Regional Urabá",
        floors: {
            1: {
                img: "https://bibliotecapjic.github.io/images/mapa-uraba-piso-1.png",
                staticLocations: {
                    "REVISTA": {
                        x: 0.2, y: 0.3, width: 0.1, height: 0.1,
                        message: "Colección de Revistas - Urabá",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY"
                    }
                },
                stacks: []
            }
        }
    }
};

// ------------------------------- MAPEOS Y CONSTANTES -------------------------

/**
 * Convierte el identificador interno de la biblioteca (medellin, oriente, uraba)
 * a la clave usada en mapData.
 */
const libraryMap = {
    'medellin': 'MEDELLÍN',
    'oriente': 'CENTRO REGIONAL ORIENTE',
    'uraba': 'CENTRO REGIONAL URABÁ'
};

/**
 * Mapeo de parámetros externos (material_type o location_code) a la información
 * necesaria para la interfaz y la búsqueda en el mapa.
 * 
 * Cada entrada contiene:
 *   - buttonId: identificador del botón en la UI (tesis, cd, revista, folleto, norma)
 *   - mapKey:   clave que se busca en staticLocations (ej: 'TRABAJO DE GRADO')
 *   - display:  texto legible para mostrar al usuario.
 * 
 * La prioridad es:
 *   1. Si location_code = NORMA, se usa esta entrada.
 *   2. Si no, se usa material_type (THESIS, BOOK, ISSUE, CDROM, PAMPHLET).
 */
const externalToMapKey = {
    // material_type (prioridad principal)
    'THESIS':   { buttonId: 'tesis',   mapKey: 'TRABAJO DE GRADO', display: 'TRABAJO DE GRADO' },
    'BOOK':     { buttonId: null,      mapKey: null,               display: 'LIBRO' },
    'ISSUE':    { buttonId: 'revista', mapKey: 'REVISTA',          display: 'REVISTA' },
    'CDROM':    { buttonId: 'cd',      mapKey: 'MULTIMEDIA',       display: 'CD' },
    'PAMPHLET': { buttonId: 'folleto', mapKey: 'FOLLETO',          display: 'FOLLETO' },
    // location_code (solo NORMA tiene prioridad)
    'NORMA':    { buttonId: 'norma',   mapKey: 'NORMAS',           display: 'NORMA' }
};

/**
 * Genera dos objetos auxiliares para compatibilidad con el resto del código:
 *   - materialMap:       buttonId -> mapKey (para buscar en staticLocations)
 *   - materialDisplayNames: buttonId -> display (para mostrar en la UI)
 */
const materialMap = {};
const materialDisplayNames = {};
Object.values(externalToMapKey).forEach(item => {
    if (item.buttonId) {
        materialMap[item.buttonId] = item.mapKey;
        materialDisplayNames[item.buttonId] = item.display;
    }
});

// ------------------------------- FUNCIONES AUXILIARES -------------------------

/**
 * Habilita o deshabilita los controles de la interfaz (campo de signatura y botones de material).
 * @param {boolean} enabled - true para activar, false para desactivar.
 */
function toggleControls(enabled) {
    document.getElementById('signature').disabled = !enabled;
    document.querySelectorAll('.material-btn').forEach(btn => btn.disabled = !enabled);
    if (!enabled) {
        document.getElementById('signature').value = '';
        selectedMaterial = null;
        document.querySelectorAll('.material-btn').forEach(btn => btn.classList.remove('selected'));
    }
}

/**
 * Extrae la parte numérica de una signatura Dewey.
 * Ejemplo: "005.131 W251" -> { numericPart: 5.131 }
 * @param {string} callNumber - Signatura ingresada por el usuario.
 * @returns {object|null} Objeto con numericPart o null si no se encuentra número.
 */
function normalizeDewey(callNumber) {
    if (!callNumber) return null;
    const match = callNumber.toString().trim().match(/^[A-Z]*(\d+(?:\.\d+)?)/);
    if (!match) return null;
    return { original: callNumber, numericPart: parseFloat(match[1]) };
}

/**
 * Valida que la signatura solo contenga caracteres seguros (letras, números, puntos, espacios, guiones).
 * @param {string} s - Signatura a validar.
 * @returns {boolean} true si es válida.
 */
function validateSignature(s) {
    return /^[0-9A-Za-z.,\s-]+$/.test(s) && s.length <= 50;
}

/**
 * Busca en los estantes (stacks) de una biblioteca la ubicación correspondiente a una signatura.
 * @param {object} libData - Datos de la biblioteca (mapData[libraryKey]).
 * @param {string} callNumber - Signatura a buscar.
 * @returns {object|null} Objeto con la ubicación (x, y, width, height, url3D, etc.) o null si no se encuentra.
 */
function searchInStacks(libData, callNumber) {
    const norm = normalizeDewey(callNumber);
    if (!norm || isNaN(norm.numericPart)) return null;
    for (let floor in libData.floors) {
        const stacks = libData.floors[floor].stacks;
        if (!stacks) continue;
        for (let stack of stacks) {
            const start = normalizeDewey(stack.start);
            const end = normalizeDewey(stack.end);
            if (start && end && norm.numericPart >= start.numericPart && norm.numericPart <= end.numericPart) {
                return {
                    floor,
                    x: stack.x,
                    y: stack.y,
                    width: stack.width,
                    height: stack.height,
                    stackInfo: stack.id,
                    url3D: stack.url3D
                };
            }
        }
    }
    return null;
}

/**
 * Busca ubicaciones estáticas (revistas, tesis, normas, etc.) en una biblioteca.
 * @param {object} libData - Datos de la biblioteca.
 * @param {string} mapKey - Clave a buscar en staticLocations (ej: 'REVISTA').
 * @returns {object|null} Ubicación o lista de ubicaciones (si es múltiple).
 */
function searchInStaticLocations(libData, mapKey) {
    for (let floor in libData.floors) {
        const locs = libData.floors[floor].staticLocations;
        if (locs && locs[mapKey]) {
            const loc = locs[mapKey];
            if (Array.isArray(loc)) {
                return { floor, locations: loc, isMultiple: true };
            } else {
                return {
                    floor,
                    x: loc.x,
                    y: loc.y,
                    width: loc.width,
                    height: loc.height,
                    message: loc.message,
                    url3D: loc.url3D,
                    isMultiple: false
                };
            }
        }
    }
    return null;
}

// ------------------------------- FUNCIONES DEL MAPA ---------------------------

/**
 * Carga la imagen del mapa de la biblioteca seleccionada y la muestra en el contenedor.
 * Durante la carga, muestra un spinner. Si la imagen ya existe, la reemplaza.
 * @param {string} libraryKey - Clave de la biblioteca en mapData (ej: 'MEDELLÍN').
 * @returns {boolean} true si se inició la carga, false si ya se estaba cargando.
 */
function loadLibraryMap(libraryKey) {
    if (isMapLoading) return false;
    isMapLoading = true;
    if (currentImageLoadTimeout) clearTimeout(currentImageLoadTimeout);
    const libData = mapData[libraryKey];
    if (!libData) {
        showNoMapAvailable("No hay datos");
        isMapLoading = false;
        return false;
    }
    currentLibraryData = libData;
    const mapContainer = document.getElementById('map-container');
    mapContainer.innerHTML = `<div class="loading-state"><div><div class="loading-spinner"></div><p>Cargando mapa de ${libData.name}...</p></div></div>`;
    const imgPath = libData.floors[1].img;
    const img = new Image();
    currentImageLoadTimeout = setTimeout(() => {
        if (img && !img.complete) {
            img.onload = null;
            img.onerror = null;
            showNoMapAvailable(`Tiempo de espera agotado`);
        }
        currentImageLoadTimeout = null;
        isMapLoading = false;
    }, 8000);
    img.onload = () => {
        if (currentImageLoadTimeout) clearTimeout(currentImageLoadTimeout);
        const imgElement = document.createElement('img');
        imgElement.id = 'map-image';
        imgElement.src = imgPath;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        imgElement.style.objectFit = 'contain';
        mapContainer.innerHTML = '';
        mapContainer.appendChild(imgElement);
        clearMapMarkers();
        imgElement.onload = () => {
            isMapLoading = false;
            if (pendingLocation) {
                drawLocation(pendingLocation);
                showLocationInfo(pendingLocation.message || (pendingLocation.stackInfo ? `Ubicado en estante ${pendingLocation.stackInfo}` : "Ubicación encontrada. Haz clic en el marcador 📍 para ver en 3D."));
                pendingLocation = null;
            } else {
                const signature = document.getElementById('signature').value.trim();
                if (signature) findAndDisplayLocation();
            }
        };
        imgElement.onerror = () => {
            showNoMapAvailable(`Error al mostrar mapa`);
            isMapLoading = false;
        };
    };
    img.onerror = () => {
        showNoMapAvailable(`No se pudo cargar el mapa`);
        isMapLoading = false;
    };
    img.src = imgPath;
    return true;
}

/**
 * Muestra un mensaje de error en el contenedor del mapa cuando no se puede cargar.
 * @param {string} msg - Mensaje a mostrar.
 */
function showNoMapAvailable(msg) {
    const mapContainer = document.getElementById('map-container');
    if (currentImageLoadTimeout) clearTimeout(currentImageLoadTimeout);
    mapContainer.innerHTML = `<div class="no-map-state"><div><span>🚫</span><h3>Mapa no disponible</h3><p>${msg}</p></div></div>`;
    clearMapMarkers();
    document.getElementById('location-info-panel').classList.remove('active');
    document.getElementById('legend-panel').classList.remove('active');
    isMapLoading = false;
}

/**
 * Busca la ubicación de la signatura ingresada en el campo de texto y la muestra en el mapa.
 * Se activa al escribir o al presionar Enter.
 */
function findAndDisplayLocation() {
    if (!selectedLibrary) return;
    const signature = document.getElementById('signature').value.trim();
    if (!signature) return;
    const libKey = libraryMap[selectedLibrary];
    const libData = mapData[libKey];
    if (!libData) return;
    const mapImage = document.getElementById('map-container').querySelector('img#map-image');
    if (!mapImage && !isMapLoading) {
        document.getElementById('location-info-text').textContent = `Espere a que cargue el mapa...`;
        document.getElementById('location-info-panel').classList.add('active');
        return;
    }
    if (!validateSignature(signature)) {
        showLocationInfo("Signatura no válida.");
        clearMapMarkers();
        return;
    }
    const location = searchInStacks(libData, signature);
    let message = "";
    if (location) {
        const parts = location.stackInfo.split('.');
        const estante = parts[1];
        const lado = parts[2];
        message = `Este material puede encontrarse en el piso ${location.floor} de ${libData.name}, estante ${estante} lado ${lado}. Haz clic en el marcador 📍 para ver la ubicación exacta en 3D.`;
    } else {
        message = `Material disponible en ${libData.name} (Colección General). Consulte al personal.`;
    }
    if (location) {
        if (mapImage) drawLocation(location);
        else pendingLocation = { ...location, message };
        showLocationInfo(message);
    } else {
        clearMapMarkers();
        showLocationInfo(message);
    }
}

/**
 * Selecciona una biblioteca, actualiza la interfaz y carga su mapa.
 * @param {string} libId - Identificador interno ('medellin', 'oriente', 'uraba').
 */
function selectLibrary(libId) {
    if (selectedLibrary === libId) return;
    if (selectedLibrary) document.getElementById(`btn-${selectedLibrary}`).classList.remove('selected');
    if (selectedMaterial) {
        document.getElementById(`btn-${selectedMaterial}`).classList.remove('selected');
        selectedMaterial = null;
    }
    document.getElementById('signature').value = '';
    selectedLibrary = libId;
    document.getElementById(`btn-${libId}`).classList.add('selected');
    toggleControls(true);
    isMapLoading = false;
    pendingLocation = null;
    loadLibraryMap(libraryMap[libId]);
    updateUI();
    clearMapMarkers();
    document.getElementById('location-info-panel').classList.remove('active');
    document.getElementById('legend-panel').classList.remove('active');
}

/**
 * Selecciona un tipo de material (tesis, CD, revista, etc.) y muestra su ubicación estática.
 * @param {string} matId - Identificador interno ('tesis', 'cd', 'revista', 'folleto', 'norma').
 */
function selectMaterial(matId) {
    if (selectedMaterial === matId) return;
    if (selectedMaterial) document.getElementById(`btn-${selectedMaterial}`).classList.remove('selected');
    selectedMaterial = matId;
    document.getElementById(`btn-${matId}`).classList.add('selected');
    document.getElementById('signature').value = '';
    updateUI();
    if (selectedLibrary) findAndDisplayLocationForMaterial(matId);
}

/**
 * Busca y muestra la ubicación estática del material seleccionado.
 * @param {string} matId - Identificador del material.
 */
function findAndDisplayLocationForMaterial(matId) {
    if (!selectedLibrary) return;
    const libKey = libraryMap[selectedLibrary];
    const libData = mapData[libKey];
    if (!libData) return;
    const mapImage = document.getElementById('map-container').querySelector('img#map-image');
    if (!mapImage) return;
    const mapKey = materialMap[matId];
    if (!mapKey) {
        showLocationInfo(`No se encontró ubicación para este material.`);
        return;
    }
    const location = searchInStaticLocations(libData, mapKey);
    let message = "";
    if (location) {
        if (location.isMultiple) {
            message = location.locations.map(l => l.message).join(" ");
            message += " Haz clic en el marcador correspondiente 📍 para ver la ubicación en 3D.";
        } else {
            message = location.message + " Haz clic en el marcador 📍 para ver la ubicación en 3D.";
        }
    } else {
        message = `Material disponible en ${libData.name} (${materialDisplayNames[matId]}). Consulte al personal.`;
    }
    if (location) drawLocation(location);
    else clearMapMarkers();
    showLocationInfo(message);
}

/**
 * Abre la URL de Matterport en una nueva pestaña.
 * @param {string} url - URL de la vista 3D.
 */
function open3DMap(url) {
    if (url && url.trim() !== "") {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        console.warn("No hay URL 3D definida para esta ubicación");
        alert("No hay vista 3D disponible para esta ubicación.");
    }
}

/**
 * Dibuja uno o varios marcadores en el mapa a partir de una ubicación (o lista de ubicaciones).
 * @param {object} loc - Objeto devuelto por searchInStacks o searchInStaticLocations.
 */
function drawLocation(loc) {
    clearMapMarkers();
    if (!loc) return;
    if (loc.isMultiple && loc.locations) {
        loc.locations.forEach((l, idx) => {
            const marker = createMarker(l.x, l.y, l.width, l.height, idx, l.url3D);
            document.getElementById('map-container').appendChild(marker);
        });
    } else if (loc.x !== undefined) {
        const marker = createMarker(loc.x, loc.y, loc.width, loc.height, 0, loc.url3D);
        document.getElementById('map-container').appendChild(marker);
    }
    requestAnimationFrame(() => adjustMarkersPosition());
}

/**
 * Crea un elemento div que representa un marcador en el mapa.
 * El marcador es clickeable y abre la vista 3D asociada.
 * @param {number} x - Coordenada x relativa (0..1).
 * @param {number} y - Coordenada y relativa (0..1).
 * @param {number} w - Ancho relativo.
 * @param {number} h - Alto relativo.
 * @param {number} idx - Índice (para ajustar tamaño del ícono si hay múltiples).
 * @param {string|null} url3d - URL de Matterport.
 * @returns {HTMLDivElement} Marcador listo para insertar.
 */
function createMarker(x, y, w, h, idx = 0, url3d = null) {
    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.setAttribute('data-relative-x', x);
    marker.setAttribute('data-relative-y', y);
    marker.setAttribute('data-relative-width', w);
    marker.setAttribute('data-relative-height', h);
    if (url3d) marker.setAttribute('data-url3d', url3d);

    Object.assign(marker.style, {
        position: 'absolute',
        background: 'rgba(255,215,0,0.7)',
        border: '2px solid #e67e22',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
        borderRadius: '4px',
        boxShadow: '0 0 15px rgba(230,126,34,0.8)',
        zIndex: '10',
        display: 'none',
        cursor: 'pointer'
    });

    const icon = document.createElement('div');
    icon.textContent = '📍';
    Object.assign(icon.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: idx > 0 ? '20px' : '24px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
    });
    marker.appendChild(icon);

    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = marker.getAttribute('data-url3d');
        if (url) {
            open3DMap(url);
        } else {
            console.warn("Este marcador no tiene URL 3D asociada");
            alert("No hay vista 3D disponible para esta ubicación.");
        }
    });

    return marker;
}

/**
 * Ajusta la posición y tamaño de los marcadores según el tamaño actual de la imagen
 * y el contenedor, respetando el object-fit: contain.
 */
function adjustMarkersPosition() {
    const container = document.getElementById('map-container');
    const img = container.querySelector('img#map-image');
    const markers = container.querySelectorAll('.map-marker');
    if (!img || markers.length === 0) return;
    if (img.naturalWidth === 0) {
        requestAnimationFrame(() => adjustMarkersPosition());
        return;
    }
    const cw = container.clientWidth, ch = container.clientHeight;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const containerRatio = cw / ch, imageRatio = nw / nh;
    let dw, dh, ox, oy;
    if (containerRatio > imageRatio) {
        dh = ch;
        dw = nw * (ch / nh);
        ox = (cw - dw) / 2;
        oy = 0;
    } else {
        dw = cw;
        dh = nh * (cw / nw);
        ox = 0;
        oy = (ch - dh) / 2;
    }
    markers.forEach(m => {
        const rx = parseFloat(m.getAttribute('data-relative-x'));
        const ry = parseFloat(m.getAttribute('data-relative-y'));
        const rw = parseFloat(m.getAttribute('data-relative-width'));
        const rh = parseFloat(m.getAttribute('data-relative-height'));
        m.style.left = `${ox + rx * dw}px`;
        m.style.top = `${oy + ry * dh}px`;
        m.style.width = `${rw * dw}px`;
        m.style.height = `${rh * dh}px`;
        m.style.display = 'block';
    });
}

/**
 * Elimina todos los marcadores del mapa.
 */
function clearMapMarkers() {
    document.querySelectorAll('#map-container .map-marker').forEach(m => m.remove());
}

/**
 * Actualiza el panel de "Selección Actual" con la biblioteca, material o signatura elegidos.
 */
function updateUI() {
    const sig = document.getElementById('signature').value.trim();
    if (selectedLibrary || selectedMaterial || sig) {
        document.getElementById('selection-info').style.display = 'block';
        document.getElementById('current-library').textContent = selectedLibrary ? libraryMap[selectedLibrary] : '-';
        let materialText = '-';
        if (selectedMaterial) {
            materialText = materialDisplayNames[selectedMaterial] || selectedMaterial.toUpperCase();
        } else if (sig) {
            materialText = 'LIBRO';
        }
        document.getElementById('current-material').textContent = materialText;
        document.getElementById('current-signature').textContent = sig || '-';
    } else {
        document.getElementById('selection-info').style.display = 'none';
    }
}

/**
 * Muestra un mensaje en el panel de información de ubicación y activa la leyenda.
 * @param {string} msg - Mensaje a mostrar.
 */
function showLocationInfo(msg) {
    document.getElementById('location-info-text').textContent = msg;
    document.getElementById('location-info-panel').classList.add('active');
    document.getElementById('legend-panel').classList.add('active');
}

// ------------------------------- EVENTOS E INICIALIZACIÓN ---------------------

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (selectedLibrary) adjustMarkersPosition();
    }, 100);
});

/**
 * Inicializa la aplicación al cargar el DOM:
 *   - Asigna eventos a los botones de biblioteca y materiales.
 *   - Configura el campo de signatura con debounce.
 *   - Lee los parámetros de la URL y actúa en consecuencia.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Botones de bibliotecas
    document.getElementById('btn-medellin').addEventListener('click', () => selectLibrary('medellin'));
    document.getElementById('btn-oriente').addEventListener('click', () => selectLibrary('oriente'));
    document.getElementById('btn-uraba').addEventListener('click', () => selectLibrary('uraba'));

    // Botones de materiales
    document.getElementById('btn-tesis').addEventListener('click', () => selectMaterial('tesis'));
    document.getElementById('btn-cd').addEventListener('click', () => selectMaterial('cd'));
    document.getElementById('btn-revista').addEventListener('click', () => selectMaterial('revista'));
    document.getElementById('btn-folleto').addEventListener('click', () => selectMaterial('folleto'));
    document.getElementById('btn-norma').addEventListener('click', () => selectMaterial('norma'));

    // Input de signatura
    const sigInput = document.getElementById('signature');
    toggleControls(false);
    sigInput.addEventListener('input', () => {
        updateUI();
        if (selectedMaterial && sigInput.value.trim() !== '') {
            document.getElementById(`btn-${selectedMaterial}`).classList.remove('selected');
            selectedMaterial = null;
        }
        if (selectedLibrary) {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => findAndDisplayLocation(), 200);
        }
    });
    sigInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            if (selectedLibrary) findAndDisplayLocation();
        }
    });
    updateUI();

    // ------------------------------------------------------------------------
    // LECTURA DE PARÁMETROS DE URL (integración externa)
    // ------------------------------------------------------------------------
    const params = new URLSearchParams(window.location.search);
    const libCode = params.get('library_code');
    const materialType = params.get('material_type');
    const locationCode = params.get('location_code');
    const callNumber = params.get('call_number');

    const codeMap = { 'POBLA': 'medellin', 'RIONE': 'oriente', 'APART': 'uraba' };

    if (libCode && codeMap[libCode]) {
        const libId = codeMap[libCode];
        console.log(`URL: library_code=${libCode} → ${libId}`);
        selectLibrary(libId);

        // 1. Excepción: location_code NORMA tiene prioridad sobre cualquier material_type
        if (locationCode && locationCode.toUpperCase() === 'NORMA') {
            const mapping = externalToMapKey['NORMA'];
            if (mapping && mapping.buttonId) {
                console.log(`URL: location_code=NORMA → seleccionar material ${mapping.buttonId}`);
                setTimeout(() => selectMaterial(mapping.buttonId), 200);
            }
        }
        // 2. Si no, usar material_type como prioridad principal
        else if (materialType) {
            const upperType = materialType.toUpperCase();
            const mapping = externalToMapKey[upperType];
            if (mapping) {
                if (upperType === 'BOOK') {
                    // BOOK: solo usar call_number, sin seleccionar botón de material
                    if (callNumber) {
                        const decoded = callNumber.replace(/\+/g, ' ');
                        setTimeout(() => {
                            sigInput.value = decoded;
                            sigInput.dispatchEvent(new Event('input'));
                        }, 250);
                    }
                } else if (mapping.buttonId) {
                    console.log(`URL: material_type=${upperType} → seleccionar material ${mapping.buttonId}`);
                    setTimeout(() => selectMaterial(mapping.buttonId), 200);
                }
            } else {
                console.warn(`URL: material_type desconocido: ${upperType}`);
            }
        }
        // 3. Si no hay location_code NI material_type, pero hay call_number
        else if (callNumber) {
            console.log(`URL: solo call_number presente → asignar al campo de signatura`);
            const decoded = callNumber.replace(/\+/g, ' ');
            setTimeout(() => {
                sigInput.value = decoded;
                sigInput.dispatchEvent(new Event('input'));
            }, 250);
        }
    } else if (libCode) {
        console.warn(`URL: library_code desconocido: ${libCode}`);
    }
});
