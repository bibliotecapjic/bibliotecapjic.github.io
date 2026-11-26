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

/** @type {boolean} Indica si el mapa se está cargando para evitar peticiones simultáneas */
let isMapLoading = false;

let mapLoadId = 0;
const routeAnimationFrames = new Set();

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
                img: "images/mapa-medellin.svg",
                staticLocations: {
                    "REVISTA": {
                        svgTarget: "rect28", svgRoute: "path17",
                        x: 0.0815, y: 0.8564, width: 0.1046, height: 0.0799,
                        message: "Colección de Revistas - Hemeroteca",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=232&sr=3.07,-1.17"
                    },
                    "FOLLETO": {
                        svgTarget: "rect124", svgRoute: "path15",
                        x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                        message: "Colección de Folletos. Consultar en Circulación y Préstamo",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                    },
                    "TRABAJO DE GRADO": [
                        {
                            svgTarget: "rect124", svgRoute: "path15",
                            x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                            message: "Los Trabajos de grado en CDs se encuentran en el primer piso - Circulación y préstamo.",
                            url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                        },
                        {
                            svgTarget: "rect4-82", svgRoute: "path16", svgPerson: "path18",
                            x: 0.8167, y: 0.4356, width: 0.1694, height: 0.2643,
                            message: "Los Trabajos de grado en formato físico se encuentran en el piso 2 de la Biblioteca.",
                            url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=32&sr=-.09,-.08"
                        }
                    ],
                    "NORMAS": {
                        svgTarget: "rect124", svgRoute: "path15",
                        x: 0.08167, y: 0.2153, width: 0.1046, height: 0.2088,
                        message: "Colección de Normas Técnicas. Consultar en Circulación y Préstamo",
                        url3D: "https://my.matterport.com/show/?m=mraFoSrUZfY&ss=261&sr=-2.89,-1.43"
                    },
                    "MULTIMEDIA": {
                        svgTarget: "rect124", svgRoute: "path15",
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
                img: "mapa-medellin-piso-1.png",
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
                img: "images/mapa-oriente.png",
                staticLocations: {
                    "REVISTA": {
							x: 0.1319, y: 0.1531, width: 0.0355, height: 0.3369,
							message: "Colección de Revistas - Hemeroteca.",
							url3D: ""
						},
						"TRABAJO DE GRADO": [
							{
								x: 0.1319, y: 0.5712, width: 0.0327, height: 0.3369,
								message: "La Colección de Trabajos de Grado Físico se encuentra al fondo de la Biblioteca.",
								url3D: ""
							},
							{
								x: 0.0281, y: 0.6085, width: 0.0337, height: 0.2210,
								message: "La Colección Trabajos de Grado en CD se encuentra al fondo de la Biblioteca.",
								url3D: ""
							}
						],
						"MULTIMEDIA": {
							x: 0.0271, y: 0.3209, width: 0.0327, height: 0.2210,
							message: "Colección Multimedia - CDs, DVDs.",
							url3D: ""
                    }
                },
                stacks: [
					{ id: "1.1.Izquierdo", start: "000.0", end: "300.0", x: 0.5828, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.1.Derecho", start: "300.01", end: "339.0", x: 0.5482, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.2.Izquierdo", start: "339.01", end: "400.0", x: 0.4771, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
                    { id: "1.2.Derecho", start: "400.01", end: "519.5", x: 0.4434, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.3.Izquierdo", start: "519.501", end: "547.5", x: 0.3789, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.3.Derecho", start: "574.01", end: "620.1", x: 0.3433, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.4.Izquierdo", start: "620.101", end: "628.1", x: 0.2732, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.4.Derecho", start: "628.101", end: "636.1", x: 0.2385, y: 0.5712, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.5.Derecho", start: "636.101", end: "657.4", x: 0.2376, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.5.Izquierdo", start: "657.401", end: "658.1", x: 0.2722, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					
					
					{ id: "1.6.Derecho", start: "658.101", end: "658.4", x: 0.3452, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.6.Izquierdo", start: "657.401", end: "658.5", x: 0.3789, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.7.Derecho", start: "658.501", end: "664.9", x: 0.4425, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.7.Izquierdo", start: "664.901", end: "796.0", x: 0.4752, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					
					{ id: "1.8.Derecho", start: "796.01", end: "809.0", x: 0.5491, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" },
					{ id: "1.8.Izquierdo", start: "809.01", end: "999.9", x: 0.5837, y: 0.1534, height: 0.3342, width: 0.0387, url3D: "" }
					
					]
            }
        }
    },
    "CENTRO REGIONAL URABÁ": {
        name: "Biblioteca Centro Regional Urabá",
        floors: {
            1: {
                img: "images/mapa-uraba.png",
                staticLocations: {
                    "REVISTA": {
                        x: 0.5776, y: 0.6847, width: 0.222, height: 0.0624,
                        message: "Colección de Revistas - Hemeroteca.",
                        url3D: ""
                    },
                    "FOLLETO": {
                        x: 0.4795, y: 0.6863, width: 0.1001, height: 0.0624,
                        message: "Colección de Folletos.",
                        url3D: ""
                    },
                    "TRABAJO DE GRADO": [
                        {
                            x: 0.7988, y: 0.6863, width: 0.1011, height: 0.0624,
                            message: "La Colección de Trabajos de Grado Físico se encuentra en el estante 3 junto a las revistas.",
                            url3D: ""
                        },
						{
                            x: 0.4765, y: 0.1029, width: 0.1582, height: 0.0725,
                            message: "La Colección de Colección Trabajos de Grado en CD se encuentra al lado de los uquipos de consulta.",
                            url3D: ""
                        }
                    ],
                    "NORMAS": {
                        x: 0.4795, y: 0.6863, width: 0.1001, height: 0.0624,
                        message: "Colección de Normas Técnicas.",
                        url3D: "Colección de normas"
                    },
                    "MULTIMEDIA": {
                        x: 0.6316, y: 0.1029, width: 0.1572, height: 0.0725,
                        message: "Colección Multimedia - CDs, DVDs.",
                        url3D: ""
                    }
                },
                stacks: [
					{ id: "1.1.Izquierdo", start: "000.0", end: "348.0", x: 0.4775, y: 0.2428, height: 0.0607, width: 0.4214, url3D: "" },
					{ id: "1.1.Derecho", start: "348.01", end: "612.015", x: 0.4775, y: 0.3035, height: 0.0607, width: 0.4214, url3D: "" },
					 { id: "1.2.Izquierdo", start: "612.016", end: "658.0", x: 0.4775, y: 0.43, height: 0.0607, width: 0.4214, url3D: "" },
                    { id: "1.2.Derecho", start: "658.01", end: "796.0", x: 0.4775, y: 0.4958, height: 0.0607, width: 0.4214, url3D: "" },
					{ id: "1.3.Izquierdo", start: "796.01", end: "999.9", x: 0.4775, y: 0.6239, height: 0.0607, width: 0.4214, url3D: "" }
					]
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
 *   1. Si location_code = NORMA o TES, se usa esta entrada.
 *   2. Si no, se usa material_type (THESIS, BOOK, ISSUE, CDROM, PAMPHLET).
 */
const externalToMapKey = {
    // material_type (prioridad principal)
    'THESIS':   { buttonId: 'tesis',   mapKey: 'TRABAJO DE GRADO', display: 'TRABAJO DE GRADO' },
    'BOOK':     { buttonId: null,      mapKey: null,               display: 'LIBRO' },
    'ISSUE':    { buttonId: 'revista', mapKey: 'REVISTA',          display: 'REVISTA' },
    'CDROM':    { buttonId: 'cd',      mapKey: 'MULTIMEDIA',       display: 'CD' },
    'PAMPHLET': { buttonId: 'folleto', mapKey: 'FOLLETO',          display: 'FOLLETO' },
    // location_code (NORMA y TES tienen prioridad)
    'NORMA':    { buttonId: 'norma',   mapKey: 'NORMAS',           display: 'NORMA' },
    'TES':      { buttonId: 'tesis',  mapKey: 'TRABAJO DE GRADO', display: 'TRABAJO DE GRADO' }
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
    const match = callNumber.toString().trim().match(/^[A-Z]*(\d+(?:[.,]\d+)?)/i);
    if (!match) return null;
    return { original: callNumber, numericPart: parseFloat(match[1].replace(',', '.')) };
}

/**
 * Valida que la signatura solo contenga caracteres seguros (letras, números, puntos, espacios, guiones).
 * @param {string} s - Signatura a validar.
 * @returns {boolean} true si es válida.
 */
function validateSignature(s) {
    return /^[0-9A-Za-z.,\s-]+$/.test(s) && s.length <= 50 &&
        /^[A-Za-z]*\d{3,}(?=[.,\sA-Za-z-]|$)/.test(s);
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
                    svgTarget: loc.svgTarget,
                    svgRoute: loc.svgRoute,
                    svgPerson: loc.svgPerson,
                    isMultiple: false
                };
            }
        }
    }
    return null;
}

// ------------------------------- FUNCIONES DEL MAPA ---------------------------

/**
 * Carga el mapa de la biblioteca seleccionada.
 * @param {string} libraryKey - Clave de la biblioteca en mapData (ej: 'MEDELLÍN').
 */
async function loadLibraryMap(libraryKey) {
    const loadId = ++mapLoadId;
    isMapLoading = true;
    const libData = mapData[libraryKey];
    if (!libData) {
        showNoMapAvailable("No hay datos");
        return;
    }
    currentLibraryData = libData;
    const mapContainer = document.getElementById('map-container');
    document.getElementById('map-floor-controls').hidden = true;
    mapContainer.classList.remove('svg-map');
    mapContainer.innerHTML = `<div class="loading-state"><div><div class="loading-spinner"></div><p>Cargando mapa de ${libData.name}...</p></div></div>`;
    const imgPath = libData.floors[1].img;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        let mapElement;
        if (libraryKey === 'MEDELLÍN') {
            const response = await fetch(imgPath, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const documentSvg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
            if (documentSvg.querySelector('parsererror') || documentSvg.documentElement.localName !== 'svg') {
                throw new Error('SVG no válido');
            }
            mapElement = document.importNode(documentSvg.documentElement, true);
            mapElement.removeAttribute('width');
            mapElement.removeAttribute('height');
            mapElement.querySelectorAll('#layer4 > path').forEach(path => path.style.display = 'none');
            mapElement.setAttribute('role', 'group');
            mapElement.setAttribute('aria-label', 'Mapa de la Biblioteca Medellín, pisos 1 y 2');
        } else {
            mapElement = new Image();
            await new Promise((resolve, reject) => {
                controller.signal.addEventListener('abort', () => reject(new Error('Tiempo de espera agotado')), { once: true });
                mapElement.onload = resolve;
                mapElement.onerror = () => reject(new Error('No se pudo cargar la imagen'));
                mapElement.src = imgPath;
            });
        }
        if (loadId !== mapLoadId) return;
        mapElement.id = 'map-image';
        if (libraryKey === 'MEDELLÍN') {
            mapContainer.classList.add('svg-map');
        } else {
            mapElement.style.width = '100%';
            mapElement.style.height = '100%';
            mapElement.style.objectFit = 'contain';
        }
        mapContainer.innerHTML = '';
        mapContainer.appendChild(mapElement);
        if (libraryKey === 'MEDELLÍN') {
            document.getElementById('map-floor-controls').hidden = false;
            setSvgFloor('1');
        }
        isMapLoading = false;
        if (selectedMaterial) findAndDisplayLocationForMaterial(selectedMaterial);
        else if (document.getElementById('signature').value.trim()) findAndDisplayLocation();
    } catch (error) {
        if (loadId === mapLoadId) {
            console.error('Error al cargar el mapa:', error);
            showNoMapAvailable('No se pudo cargar el mapa. Intente de nuevo.');
        }
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Muestra un mensaje de error en el contenedor del mapa cuando no se puede cargar.
 * @param {string} msg - Mensaje a mostrar.
 */
function showNoMapAvailable(msg) {
    const mapContainer = document.getElementById('map-container');
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
    if (!signature) {
        clearMapMarkers();
        document.getElementById('location-info-panel').classList.remove('active');
        document.getElementById('legend-panel').classList.remove('active');
        return;
    }
    const libKey = libraryMap[selectedLibrary];
    const libData = mapData[libKey];
    if (!libData) return;
    const mapImage = document.getElementById('map-image');
    if (isMapLoading) return;
    if (!mapImage && !isMapLoading) {
        document.getElementById('location-info-text').textContent = `Espere a que cargue el mapa...`;
        document.getElementById('location-info-panel').classList.add('active');
        return;
    }
    if (!validateSignature(signature)) {
        showLocationInfo("Ingrese una signatura válida con al menos tres cifras antes del separador decimal, por ejemplo 005.131 o 541.");
        clearMapMarkers();
        return;
    }
    const location = searchInStacks(libData, signature);
    let message = "";
    if (location) {
        const parts = location.stackInfo.split('.');
        const estante = parts[1];
        const lado = parts[2];
        message = `Este material puede encontrarse en el piso ${location.floor} de ${libData.name}, estante ${estante} lado ${lado}. Haz clic en el marcador 📍 para ver la ubicación en 3D.`;
    } else {
        message = `Material disponible en ${libData.name} (Colección General). Consulte al personal.`;
    }
    if (location) {
        if (!drawLocation(location)) message += ' No se pudo mostrar la ruta en el mapa.';
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
    clearTimeout(searchTimeout);
    clearMapMarkers();
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
    clearTimeout(searchTimeout);
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
    const mapImage = document.getElementById('map-image');
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
    if (location) {
        if (!drawLocation(location)) message += ' No se pudo mostrar la ruta en el mapa.';
        if (selectedLibrary === 'medellin' && matId === 'tesis') {
            message += ' La ruta del piso 2 comienza en las escaleras.';
        }
    } else clearMapMarkers();
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
    if (!loc) return false;
    const svg = document.querySelector('#map-container svg#map-image');
    if (svg) return drawSvgLocation(svg, loc);
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
    return true;
}

/**
 * Usa las rutas y las secciones de estante incluidas en el SVG de Medellín.
 * La ruta del segundo piso comienza en las escaleras del propio plano.
 */
function drawSvgLocation(svg, loc) {
    const ink = 'http://www.inkscape.org/namespaces/inkscape';
    const ns = 'http://www.w3.org/2000/svg';
    const destinations = loc.isMultiple ? loc.locations : [loc];
    let complete = true;
    setSvgFloor(destinations.length > 1 ? 'all' : destinations[0].svgPerson === 'path18' ? '2' : '1');

    destinations.forEach(destination => {
        let target;
        let route;
        if (destination.stackInfo) {
            const shelf = destination.stackInfo.split('.')[1];
            target = Array.from(svg.querySelectorAll('#layer7 rect')).find(
                element => element.getAttributeNS(ink, 'label') === `ESTANTE ${shelf}`
            );
            route = Array.from(svg.querySelectorAll('#layer4 path')).find(
                element => element.id !== 'path15' && element.getAttributeNS(ink, 'label') === `Ruta estante ${shelf}`
            );
        } else {
            target = svg.querySelector(`#${destination.svgTarget}`);
            route = svg.querySelector(`#${destination.svgRoute}`);
        }
        const person = svg.querySelector(`#${destination.svgPerson || 'path238'}`);
        if (!target || !route || !person) {
            console.error('Faltan elementos de la ruta SVG:', destination);
            complete = false;
            return;
        }

        let markerPosition;
        if (destination.stackInfo) {
            const sections = Array.from(target.parentElement.querySelectorAll('rect'));
            const bounds = sections.map(section => {
                const box = section.getBBox();
                const matrix = svg.getCTM().inverse().multiply(section.getCTM());
                return [
                    new DOMPoint(box.x, box.y).matrixTransform(matrix),
                    new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix)
                ];
            }).flat();
            markerPosition = {
                x: (Math.min(...bounds.map(point => point.x)) + Math.max(...bounds.map(point => point.x))) / 2,
                y: (Math.min(...bounds.map(point => point.y)) + Math.max(...bounds.map(point => point.y))) / 2 + 8
            };
            sections.forEach(section => section.classList.add('svg-shelf-destination'));
        } else {
            target.classList.add('svg-destination');
        }
        route.style.display = 'inline';
        route.classList.add('svg-route');
        const length = route.getTotalLength();
        const end = route.getPointAtLength(length);
        markerPosition = markerPosition || end;
        const marker = document.createElementNS(ns, 'g');
        marker.classList.add('svg-location-marker');
        marker.setAttribute('transform', `translate(${markerPosition.x} ${markerPosition.y})`);
        marker.setAttribute('role', 'button');
        marker.setAttribute('tabindex', '0');
        marker.setAttribute('aria-label', `Abrir vista 3D: ${destination.message || destination.stackInfo}`);
        const title = document.createElementNS(ns, 'title');
        title.textContent = `Abrir vista 3D: ${destination.message || destination.stackInfo}`;
        marker.appendChild(title);
        const pulse = document.createElementNS(ns, 'circle');
        pulse.setAttribute('cy', '-8');
        pulse.setAttribute('r', '8');
        pulse.classList.add('svg-marker-pulse');
        marker.appendChild(pulse);
        const hitArea = document.createElementNS(ns, 'circle');
        hitArea.setAttribute('r', '10');
        hitArea.setAttribute('cy', '-5');
        hitArea.classList.add('svg-marker-hit');
        marker.appendChild(hitArea);
        const pin = document.createElementNS(ns, 'path');
        pin.setAttribute('d', 'M 0 0 C -2 -3 -5 -5 -5 -8 A 5 5 0 1 1 5 -8 C 5 -5 2 -3 0 0 Z');
        pin.classList.add('svg-marker-pin');
        marker.appendChild(pin);
        const center = document.createElementNS(ns, 'circle');
        center.setAttribute('cy', '-8');
        center.setAttribute('r', '1.7');
        center.classList.add('svg-marker-center');
        marker.appendChild(center);
        const open = () => open3DMap(destination.url3D);
        marker.addEventListener('click', open);
        marker.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
        const link = document.createElement('a');
        link.className = 'location-3d-link';
        link.href = destination.url3D;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `📍 Ver en 3D: ${destination.stackInfo ? `estante ${destination.stackInfo.split('.')[1]}` : destination.message}`;
        document.getElementById('location-3d-links').appendChild(link);
        const walker = document.createElementNS(ns, 'g');
        walker.classList.add('svg-walker');
        walker.setAttribute('aria-hidden', 'true');
        const figure = person.cloneNode(true);
        figure.removeAttribute('id');
        figure.classList.add('svg-walker-figure');
        figure.style.display = 'inline';
        walker.appendChild(figure);
        svg.appendChild(walker);
        const box = figure.getBBox();
        svg.appendChild(marker);
        const anchorX = box.x + box.width / 2;
        const anchorY = box.y + box.height;
        const duration = Math.max(1000, Math.min(8000, length * 20));
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let started;
        function walk(now) {
            if (started === undefined) started = now;
            const progress = reducedMotion ? 1 : Math.min((now - started) / duration, 1);
            const point = route.getPointAtLength(length * progress);
            walker.setAttribute('transform', `translate(${point.x - anchorX} ${point.y - anchorY})`);
            if (progress === 1) {
                figure.style.animation = 'none';
            } else {
                const frame = requestAnimationFrame(time => {
                    routeAnimationFrames.delete(frame);
                    walk(time);
                });
                routeAnimationFrames.add(frame);
            }
        }
        walk(performance.now());
    });
    return complete;
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
    routeAnimationFrames.forEach(cancelAnimationFrame);
    routeAnimationFrames.clear();
    document.querySelectorAll('#map-container .map-marker').forEach(m => m.remove());
    document.querySelectorAll('#map-container .svg-location-marker, #map-container .svg-walker').forEach(element => element.remove());
    document.querySelectorAll('#map-container .svg-destination').forEach(element => element.classList.remove('svg-destination'));
    document.querySelectorAll('#map-container .svg-shelf-destination').forEach(element => element.classList.remove('svg-shelf-destination'));
    document.querySelectorAll('#map-container .svg-route').forEach(route => {
        route.style.display = 'none';
        route.classList.remove('svg-route');
    });
    document.getElementById('location-3d-links').replaceChildren();
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

function setSvgFloor(floor) {
    const svg = document.querySelector('#map-container svg#map-image');
    if (!svg) return;
    const views = {
        '1': '0 0 338 285.75',
        '2': '332 0 176 215',
        'all': '0 0 508 285.75'
    };
    svg.setAttribute('viewBox', views[floor]);
    document.querySelectorAll('#map-floor-controls button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.floor === floor));
    });
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
    document.querySelectorAll('#map-floor-controls button').forEach(button => {
        button.addEventListener('click', () => setSvgFloor(button.dataset.floor));
    });
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
        clearMapMarkers();
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

        // 1. Excepciones: NORMA y TES tienen prioridad sobre material_type
        const upperLocationCode = locationCode ? locationCode.toUpperCase() : '';
        if (upperLocationCode === 'NORMA' || upperLocationCode === 'TES') {
            const mapping = externalToMapKey[upperLocationCode];
            if (mapping && mapping.buttonId) {
                console.log(`URL: location_code=${upperLocationCode} → seleccionar material ${mapping.buttonId}`);
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
