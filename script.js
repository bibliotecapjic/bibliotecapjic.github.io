<script>
    document.addEventListener('DOMContentLoaded', function() {
        const signatureInput = document.getElementById('signature');
        const clearBtn = document.getElementById('clear-btn');
        let selectedLibrary = null;
        let selectedMaterial = null;
        let searchTimeout;

        // --- INICIO DE NUEVA FUNCIONALIDAD: PARÁMETROS URL ---
        function procesarParametrosURL() {
            const urlParams = new URLSearchParams(window.location.search);
            
            const rawLibraryCode = urlParams.get('library_code');
            const rawCallNumber = urlParams.get('call_number');

            if (rawLibraryCode) {
                // Mapeo solicitado
                const mapping = {
                    'POBLA': 'MEDELLIN',
                    'RIONE': 'ORIENTE',
                    'APART': 'URABA'
                };
                
                const targetLibraryId = mapping[rawLibraryCode.toUpperCase()];
                if (targetLibraryId) {
                    const btn = document.getElementById(`btn-${targetLibraryId}`);
                    if (btn) btn.click(); // Simula el click para activar la lógica existente
                }
            }

            if (rawCallNumber) {
                // Limpiar el '+' y poner en el input
                const cleanCallNumber = rawCallNumber.replace(/\+/g, ' ');
                signatureInput.value = cleanCallNumber;
                
                // Ejecutar la búsqueda automáticamente si hay biblioteca seleccionada
                setTimeout(() => {
                    if (selectedLibrary) {
                        findAndDisplayLocation();
                    }
                }, 600); // Pequeño delay para asegurar que el click de la biblioteca procesó
            }
        }
        // --- FIN DE NUEVA FUNCIONALIDAD ---

        window.selectLibrary = function(libraryId) {
            document.querySelectorAll('.lib-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`btn-${libraryId}`).classList.add('active');
            selectedLibrary = libraryId;
            toggleControls(true);
            updateUI();
            
            if (signatureInput.value.trim() !== '') {
                findAndDisplayLocation();
            }
        };

        window.selectMaterial = function(materialType) {
            document.querySelectorAll('.material-btn').forEach(btn => btn.classList.remove('selected'));
            document.getElementById(`btn-${materialType}`).classList.add('selected');
            selectedMaterial = materialType;
            signatureInput.value = ''; 
            updateUI();
            findAndDisplayLocation();
        };

        function toggleControls(enabled) {
            const controls = document.getElementById('controls-area');
            if (enabled) {
                controls.classList.remove('disabled');
            } else {
                controls.classList.add('disabled');
            }
        }

        function updateUI() {
            const statusText = document.getElementById('status-text');
            const clearBtn = document.getElementById('clear-btn');
            
            if (!selectedLibrary) {
                statusText.textContent = 'Seleccione una biblioteca para comenzar';
            } else {
                let text = `Biblioteca: ${selectedLibrary}`;
                if (selectedMaterial) text += ` | Material: ${selectedMaterial}`;
                else if (signatureInput.value) text += ` | Buscando: ${signatureInput.value}`;
                statusText.textContent = text;
            }

            clearBtn.style.display = (selectedMaterial || signatureInput.value) ? 'flex' : 'none';
        }

        window.clearSearch = function() {
            selectedMaterial = null;
            signatureInput.value = '';
            document.querySelectorAll('.material-btn').forEach(btn => btn.classList.remove('selected'));
            updateUI();
            findAndDisplayLocation();
        };

        function findAndDisplayLocation() {
            const mapContainer = document.getElementById('map-container');
            
            if (!selectedLibrary) {
                mapContainer.innerHTML = '<div class="empty-state">Seleccione una biblioteca en el menú superior para ver el mapa</div>';
                return;
            }

            const searchTerm = selectedMaterial || signatureInput.value.trim().toUpperCase();
            
            if (!searchTerm) {
                mapContainer.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 40px; margin-bottom: 15px;">📍</div>
                        Biblioteca ${selectedLibrary} seleccionada.<br>
                        Ingrese una clasificación o seleccione un tipo de material.
                    </div>`;
                return;
            }

            const location = findLocation(selectedLibrary, searchTerm);
            renderMap(location, selectedLibrary);
        }

        // El resto de tus funciones (findLocation, renderMap, etc.) permanecen iguales
        // ... (Manten el código de renderización que ya tienes)

        // IMPORTANTE: Al final del DOMContentLoaded, llamar a la nueva función
        updateUI();
        procesarParametrosURL(); 
    });
</script>
