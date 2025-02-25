document.addEventListener('DOMContentLoaded', function() {
    const world = document.getElementById('world');
    const inventory = document.getElementById('inventory');
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    
    const forwardBtn = document.getElementById('forward-btn');
    const leftBtn = document.getElementById('left-btn');
    const backwardBtn = document.getElementById('backward-btn');
    const rightBtn = document.getElementById('right-btn');
    const placeBtn = document.getElementById('place-btn');
    const breakBtn = document.getElementById('break-btn');
    
    // Configuración del juego
    let worldSize = 10;
    let blockSize = 50;
    let blockMatrix = [];
    let selectedBlockType = 'grass';
    let mode = 'place'; // 'place' o 'break'
    
    // Posición del jugador y vista
    let playerX = 0;
    let playerZ = -5;
    let rotateX = 20;
    let rotateY = 0;
    
    // Control táctil
    let touchStartX = 0;
    let touchStartY = 0;
    
    // Estado de teclas
    let keys = {
        w: false,
        a: false,
        s: false,
        d: false
    };
    
    // Tipos de bloques disponibles
    const blockTypes = [
        'grass',
        'dirt',
        'stone',
        'wood',
        'water',
        'leaves'
    ];
    
    // Iniciar juego
    startBtn.addEventListener('click', initGame);
    
    function initGame() {
        startScreen.style.display = 'none';
        
        // Crear inventario
        createInventory();
        
        // Crear mundo
        createWorld();
        
        // Configurar eventos
        setupEvents();
        
        // Iniciar bucle de juego
        gameLoop();
    }
    
    function createInventory() {
        blockTypes.forEach((type, index) => {
            const item = document.createElement('div');
            item.className = 'inventory-item';
            if (index === 0) item.classList.add('selected');
            
            const inner = document.createElement('div');
            inner.className = `inventory-item-inner ${type}`;
            inner.style.backgroundColor = getBlockColor(type);
            
            item.appendChild(inner);
            inventory.appendChild(item);
            
            item.addEventListener('click', () => {
                // Deseleccionar todos
                document.querySelectorAll('.inventory-item').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Seleccionar este
                item.classList.add('selected');
                selectedBlockType = type;
            });
        });
    }
    
    function getBlockColor(type) {
        switch(type) {
            case 'grass': return '#7CFC00';
            case 'dirt': return '#8B4513';
            case 'stone': return '#808080';
            case 'wood': return '#A0522D';
            case 'water': return 'rgba(0, 0, 255, 0.5)';
            case 'leaves': return '#228B22';
            default: return '#FFFFFF';
        }
    }
    
    function createWorld() {
        // Inicializar matriz de bloques
        for (let x = 0; x < worldSize; x++) {
            blockMatrix[x] = [];
            for (let z = 0; z < worldSize; z++) {
                const height = Math.floor(Math.random() * 3);
                blockMatrix[x][z] = [];
                
                // Crear terreno
                for (let y = 0; y <= height; y++) {
                    let blockType;
                    if (y === height) {
                        blockType = 'grass';
                    } else {
                        blockType = 'dirt';
                    }
                    
                    // Añadir agua en zonas bajas
                    if (height === 0 && Math.random() > 0.7) {
                        blockType = 'water';
                    }
                    
                    createBlock(x, y, z, blockType);
                    blockMatrix[x][z][y] = blockType;
                }
                
                // Crear árboles aleatoriamente
                if (height > 0 && Math.random() > 0.9) {
                    createTree(x, height + 1, z);
                }
            }
        }
    }
    
    function createTree(x, y, z) {
        // Tronco
        for (let treeY = y; treeY < y + 3; treeY++) {
            if (!blockMatrix[x][z]) blockMatrix[x][z] = [];
            blockMatrix[x][z][treeY] = 'wood';
            createBlock(x, treeY, z, 'wood');
        }
        
        // Hojas
        for (let leafX = x - 1; leafX <= x + 1; leafX++) {
            for (let leafZ = z - 1; leafZ <= z + 1; leafZ++) {
                if (leafX >= 0 && leafX < worldSize && leafZ >= 0 && leafZ < worldSize) {
                    for (let leafY = y + 2; leafY < y + 4; leafY++) {
                        if (!blockMatrix[leafX][leafZ]) blockMatrix[leafX][leafZ] = [];
                        
                        // No sobreescribir el tronco
                        if (!(leafX === x && leafZ === z && leafY < y + 3)) {
                            blockMatrix[leafX][leafZ][leafY] = 'leaves';
                            createBlock(leafX, leafY, leafZ, 'leaves');
                        }
                    }
                }
            }
        }
        
        // Hoja superior
        if (!blockMatrix[x][z][y + 3]) {
            blockMatrix[x][z][y + 3] = 'leaves';
            createBlock(x, y + 3, z, 'leaves');
        }
    }
    
    function createBlock(x, y, z, type) {
        const block = document.createElement('div');
        block.className = `block ${type}`;
        block.dataset.x = x;
        block.dataset.y = y;
        block.dataset.z = z;
        block.dataset.type = type;
        
        // Posicionar el bloque en el mundo 3D
        block.style.transform = `translate3d(${(x - worldSize/2) * blockSize}px, ${-y * blockSize}px, ${(z - worldSize/2) * blockSize}px)`;
        
        // Crear caras del bloque
        const faces = ['top', 'bottom', 'front', 'back', 'left', 'right'];
        faces.forEach(face => {
            const faceElement = document.createElement('div');
            faceElement.className = `face ${face}`;
            
            // Distinguir entre lado superior y lateral para bloques de césped
            if (type === 'grass' && face !== 'top') {
                faceElement.classList.add('side');
            }
            
            block.appendChild(faceElement);
        });
        
        // Manejar clicks para interactuar con el bloque
        block.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const blockX = parseInt(this.dataset.x);
            const blockY = parseInt(this.dataset.y);
            const blockZ = parseInt(this.dataset.z);
            
            if (mode === 'break') {
                // Eliminar bloque
                removeBlock(blockX, blockY, blockZ);
            } else {
                // Colocar bloque
                placeBlock(blockX, blockY, blockZ);
            }
        });
        
        world.appendChild(block);
    }
    
    function removeBlock(x, y, z) {
        // Eliminar el bloque si existe
        if (blockMatrix[x] && blockMatrix[x][z] && blockMatrix[x][z][y]) {
            blockMatrix[x][z][y] = null;
            
            // Eliminar el elemento DOM
            const block = document.querySelector(`.block[data-x="${x}"][data-y="${y}"][data-z="${z}"]`);
            if (block) {
                block.remove();
            }
        }
    }
    
    function placeBlock(x, y, z) {
        // Encontrar la posición adyacente para colocar el nuevo bloque
        let newX = x;
        let newY = y + 1; // Por defecto, encima del bloque actual
        let newZ = z;
        
        // Verificar si ya existe un bloque en la posición deseada
        if (blockMatrix[newX] && blockMatrix[newX][newZ] && blockMatrix[newX][newZ][newY]) {
            return; // No se puede colocar un bloque donde ya existe otro
        }
        
        // Asegurarse de que la matriz está inicializada
        if (!blockMatrix[newX]) blockMatrix[newX] = [];
        if (!blockMatrix[newX][newZ]) blockMatrix[newX][newZ] = [];
        
        // Crear el nuevo bloque
        blockMatrix[newX][newZ][newY] = selectedBlockType;
        createBlock(newX, newY, newZ, selectedBlockType);
    }
    
    function setupEvents() {
        // Controles de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() in keys) {
                keys[e.key.toLowerCase()] = true;
            }
            
            // Cambio de modo
            if (e.key === 'b') mode = 'break';
            if (e.key === 'p') mode = 'place';
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() in keys) {
                keys[e.key.toLowerCase()] = false;
            }
        });
        
        // Controles de ratón para rotar la vista
        document.addEventListener('mousemove', (