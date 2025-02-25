document.addEventListener('DOMContentLoaded', function() {
    const world = document.getElementById('world');
    const inventory = document.getElementById('inventory');
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const healthBar = document.getElementById('health-bar');
    const hungerBar = document.getElementById('hunger-bar');
    const timeDisplay = document.getElementById('time');

    // Configuración del juego
    let worldSize = 20; // Tamaño del mundo
    let blockSize = 50; // Tamaño de cada bloque
    let blockMatrix = []; // Matriz para almacenar los bloques
    let selectedBlockType = 'grass'; // Bloque seleccionado por defecto
    let mode = 'place'; // Modo actual: 'place' o 'break'
    let health = 100; // Salud del jugador
    let hunger = 100; // Hambre del jugador
    let time = 12 * 60; // Tiempo en minutos (12:00)
    let weatherCondition = 'clear'; // Condición climática
    let inventoryItems = {}; // Inventario del jugador

    // Posición del jugador
    let playerX = 0;
    let playerY = 0;
    let playerZ = -5;
    let rotateX = 20;
    let rotateY = 0;

    // Gravedad y salto
    let velocityY = 0;
    const gravity = 0.5;
    const jumpStrength = 10;

    // Entidades (mobs y animales)
    let entities = [];
    const entityTypes = ['chicken', 'pig', 'zombie', 'skeleton'];

    // Iluminación basada en el tiempo
    let worldBrightness = 1.0;

    // Estado de teclas
    let keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false
    };

    // Tipos de bloques
    const blockTypes = [
        'grass', 'dirt', 'stone', 'wood', 'water', 'leaves', 'sand', 'snow',
        'coal_ore', 'iron_ore', 'gold_ore', 'crafting_table', 'glass', 'fire', 'bedrock'
    ];

    // Recetas de crafteo
    const craftingRecipes = [
        { result: 'crafting_table', ingredients: { 'wood': 4 } },
        { result: 'glass', ingredients: { 'sand': 2 } },
        { result: 'torch', ingredients: { 'wood': 1, 'coal_ore': 1 } }
    ];

    // Iniciar juego
    startBtn.addEventListener('click', initGame);

    function initGame() {
        startScreen.style.display = 'none';
        createInventory();
        createWorld();
        spawnEntities();
        setupEvents();
        gameLoop();
        startDayNightCycle();
        startWeatherSystem();
        startHungerSystem();
        
        // Dar algunos bloques al jugador para empezar
        updateInventoryCounter('grass', 10);
        updateInventoryCounter('wood', 5);
        updateInventoryCounter('stone', 5);
        updateInventoryCounter('apple', 2);
    }

    // Sistema de hambre
    function startHungerSystem() {
        setInterval(() => {
            hunger = Math.max(0, hunger - 1);
            updateHungerBar();

            if (hunger === 0 && health > 0) {
                health -= 5;
                updateHealthBar();

                if (health <= 0) {
                    gameOver();
                }
            }
        }, 10000); // Disminuye el hambre cada 10 segundos
    }

    // Sistema de clima
    function startWeatherSystem() {
        setInterval(() => {
            const random = Math.random();
            if (random < 0.3) {
                weatherCondition = 'rain';
                document.body.classList.add('rainy');
                document.body.classList.remove('clear', 'foggy');
                createRainEffect();
            } else if (random < 0.4) {
                weatherCondition = 'foggy';
                document.body.classList.add('foggy');
                document.body.classList.remove('clear', 'rainy');
                stopRainEffect();
            } else {
                weatherCondition = 'clear';
                document.body.classList.add('clear');
                document.body.classList.remove('rainy', 'foggy');
                stopRainEffect();
            }
        }, 60000); // Cambia el clima cada minuto
    }

    // Efectos de lluvia
    function createRainEffect() {
        stopRainEffect();

        const rainContainer = document.createElement('div');
        rainContainer.id = 'rain-container';
        document.body.appendChild(rainContainer);

        for (let i = 0; i < 100; i++) {
            const raindrop = document.createElement('div');
            raindrop.className = 'raindrop';
            raindrop.style.left = `${Math.random() * 100}%`;
            raindrop.style.animationDuration = `${0.5 + Math.random()}s`;
            raindrop.style.animationDelay = `${Math.random()}s`;
            rainContainer.appendChild(raindrop);
        }
    }

    function stopRainEffect() {
        const existingRain = document.getElementById('rain-container');
        if (existingRain) {
            existingRain.remove();
        }
    }

    // Actualizar la barra de salud
    function updateHealthBar() {
        healthBar.textContent = `Salud: ${health}%`;
        healthBar.style.color = health < 30 ? 'red' : 'white';
    }

    // Actualizar la barra de hambre
    function updateHungerBar() {
        hungerBar.textContent = `Hambre: ${hunger}%`;
        hungerBar.style.color = hunger < 30 ? 'orange' : 'white';
    }

    // Pantalla de Game Over
    function gameOver() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.innerHTML = `
            <h2>¡Has muerto!</h2>
            <p>Tu aventura ha terminado.</p>
            <button id="respawn-btn">Volver a intentar</button>
        `;
        document.body.appendChild(gameOverScreen);

        document.getElementById('respawn-btn').addEventListener('click', () => {
            gameOverScreen.remove();
            resetPlayer();
        });
    }

    // Reiniciar al jugador
    function resetPlayer() {
        health = 100;
        hunger = 100;
        playerX = 0;
        playerY = 0;
        playerZ = -5;
        updateHealthBar();
        updateHungerBar();
    }

    // Generar entidades (mobs y animales)
    function spawnEntities() {
        for (let i = 0; i < 10; i++) {
            const type = entityTypes[Math.floor(Math.random() * entityTypes.length)];
            const x = Math.floor(Math.random() * worldSize);
            const z = Math.floor(Math.random() * worldSize);
            let y = 0;

            while (y < worldSize - 1 && blockMatrix[x] && blockMatrix[x][z] && blockMatrix[x][z][y]) {
                y++;
            }

            createEntity(x, y, z, type);
        }
    }

    // Crear una entidad
    function createEntity(x, y, z, type) {
        const entity = document.createElement('div');
        entity.className = `entity ${type}`;
        entity.style.transform = `translate3d(${(x - worldSize / 2) * blockSize}px, ${-(y + 0.5) * blockSize}px, ${(z - worldSize / 2) * blockSize}px)`;

        world.appendChild(entity);
        entities.push({
            element: entity,
            x: x,
            y: y,
            z: z,
            type: type,
            health: type.includes('zombie') || type.includes('skeleton') ? 50 : 20,
            hostile: type.includes('zombie') || type.includes('skeleton'),
            moveTimer: 0
        });
    }

    // Actualizar entidades
    function updateEntities() {
        entities.forEach(entity => {
            entity.moveTimer++;

            if (entity.moveTimer > 180) {
                entity.moveTimer = 0;

                const moveX = Math.floor(Math.random() * 3) - 1;
                const moveZ = Math.floor(Math.random() * 3) - 1;

                const newX = entity.x + moveX;
                const newZ = entity.z + moveZ;

                if (newX >= 0 && newX < worldSize && newZ >= 0 && newZ < worldSize) {
                    entity.x = newX;
                    entity.z = newZ;
                    entity.element.style.transform = `translate3d(${(entity.x - worldSize / 2) * blockSize}px, ${-(entity.y + 0.5) * blockSize}px, ${(entity.z - worldSize / 2) * blockSize}px)`;
                }
            }

            if (entity.hostile) {
                const distX = Math.abs(entity.x - (playerX / blockSize + worldSize / 2));
                const distZ = Math.abs(entity.z - (playerZ / blockSize + worldSize / 2));

                if (distX < 3 && distZ < 3) {
                    if (entity.moveTimer % 120 === 0) {
                        takeDamage(10);
                    }
                }
            }
        });
    }

    // Recibir daño
    function takeDamage(amount) {
        health = Math.max(0, health - amount);
        updateHealthBar();

        document.body.classList.add('damage-effect');
        setTimeout(() => {
            document.body.classList.remove('damage-effect');
        }, 300);

        if (health <= 0) {
            gameOver();
        }
    }

    // Crear el inventario
    function createInventory() {
        blockTypes.forEach((type, index) => {
            const item = document.createElement('div');
            item.className = 'inventory-item';
            if (index === 0) item.classList.add('selected');

            const inner = document.createElement('div');
            inner.className = `inventory-item-inner ${type}`;
            inner.style.backgroundColor = getBlockColor(type);

            const counter = document.createElement('div');
            counter.className = 'item-counter';
            counter.textContent = '0';

            item.appendChild(inner);
            item.appendChild(counter);
            inventory.appendChild(item);

            inventoryItems[type] = 0;

            item.addEventListener('click', () => {
                document.querySelectorAll('.inventory-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
                selectedBlockType = type;
            });
        });
        
        // Añadir comida al inventario
        const appleItem = document.createElement('div');
        appleItem.className = 'inventory-item';
        
        const appleInner = document.createElement('div');
        appleInner.className = 'inventory-item-inner apple';
        appleInner.style.backgroundColor = 'red';
        
        const appleCounter = document.createElement('div');
        appleCounter.className = 'item-counter';
        appleCounter.textContent = '0';
        
        appleItem.appendChild(appleInner);
        appleItem.appendChild(appleCounter);
        inventory.appendChild(appleItem);
        
        inventoryItems['apple'] = 0;
        
        appleItem.addEventListener('click', () => {
            eatFood();
        });
    }

    // Actualizar contadores de inventario
    function updateInventoryCounter(type, amount) {
        inventoryItems[type] = (inventoryItems[type] || 0) + amount;
        if (inventoryItems[type] < 0) inventoryItems[type] = 0;

        const itemElement = document.querySelector(`.inventory-item-inner.${type}`);
        if (itemElement) {
            const counter = itemElement.parentNode.querySelector('.item-counter');
            counter.textContent = inventoryItems[type];
        }

        checkCraftingRecipes();
    }

    // Verificar recetas de crafteo
    function checkCraftingRecipes() {
        craftingRecipes.forEach(recipe => {
            let canCraft = true;

            for (const [material, amount] of Object.entries(recipe.ingredients)) {
                if ((inventoryItems[material] || 0) < amount) {
                    canCraft = false;
                    break;
                }
            }

            if (canCraft) {
                showCraftingNotification(recipe);
            }
        });
    }

    // Mostrar notificación de crafteo
    function showCraftingNotification(recipe) {
        const existingNotification = document.querySelector('.crafting-notification');
        if (existingNotification) return;

        const notification = document.createElement('div');
        notification.className = 'crafting-notification';
        notification.innerHTML = `
            <p>¡Puedes craftear ${recipe.result}!</p>
            <button class="craft-btn">Craftear</button>
        `;

        document.body.appendChild(notification);

        notification.querySelector('.craft-btn').addEventListener('click', () => {
            for (const [material, amount] of Object.entries(recipe.ingredients)) {
                updateInventoryCounter(material, -amount);
            }

            updateInventoryCounter(recipe.result, 1);
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Obtener el color de un bloque
    function getBlockColor(type) {
        switch (type) {
            case 'grass': return '#7CFC00';
            case 'dirt': return '#8B4513';
            case 'stone': return '#808080';
            case 'wood': return '#A0522D';
            case 'water': return 'rgba(0, 0, 255, 0.5)';
            case 'leaves': return '#228B22';
            case 'sand': return '#F4A460';
            case 'snow': return '#FFFFFF';
            case 'coal_ore': return '#36454F';
            case 'iron_ore': return '#CDC1C0';
            case 'gold_ore': return '#FFD700';
            case 'crafting_table': return '#DEB887';
            case 'glass': return 'rgba(200, 200, 255, 0.5)';
            case 'fire': return '#FF4500';
            case 'bedrock': return '#000000';
            case 'apple': return '#FF0000';
            default: return '#FFFFFF';
        }
    }

    // Crear el mundo
    function createWorld() {
        // Inicializar la matriz de bloques
        for (let x = 0; x < worldSize; x++) {
            blockMatrix[x] = [];
            for (let z = 0; z < worldSize; z++) {
                blockMatrix[x][z] = [];
                
                // Crear terreno con variación
                const terrainHeight = Math.floor(Math.sin(x / 5) * 2 + Math.cos(z / 5) * 2) + 5;
                
                for (let y = 0; y < worldSize; y++) {
                    let blockType = null;
                    
                    if (y < terrainHeight - 4) {
                        blockType = 'bedrock';
                    } else if (y < terrainHeight - 1) {
                        // Generar vetas de minerales
                        const random = Math.random();
                        if (random < 0.05) {
                            blockType = 'coal_ore';
                        } else if (random < 0.08) {
                            blockType = 'iron_ore';
                        } else if (random < 0.09) {
                            blockType = 'gold_ore';
                        } else {
                            blockType = 'stone';
                        }
                    } else if (y < terrainHeight) {
                        blockType = 'dirt';
                    } else if (y === terrainHeight) {
                        // Variar la superficie según la altura
                        if (terrainHeight > 10) {
                            blockType = 'snow';
                        } else if (terrainHeight < 4) {
                            blockType = 'sand';
                        } else {
                            blockType = 'grass';
                        }
                    } else if (y === terrainHeight + 1 && Math.random() < 0.1) {
                        // Generar árboles aleatoriamente
                        createTree(x, terrainHeight, z);
                    } else if (y === terrainHeight + 1 && Math.random() < 0.05) {
                        // Generar agua
                        createWaterPool(x, terrainHeight, z);
                    }
                    
                    if (blockType) {
                        createBlock(x, y, z, blockType);
                    }
                }
            }
        }
        
        // Centrar la vista
        updateWorldView();
    }
    
    // Crear un árbol
    function createTree(x, y, z) {
        if (x < 2 || x > worldSize - 3 || z < 2 || z > worldSize - 3) return;
        
        // Tronco
        for (let h = 1; h <= 4; h++) {
            createBlock(x, y + h, z, 'wood');
        }
        
        // Hojas
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 4; dy <= 6; dy++) {
                    // Solo crear hojas si no es el tronco y está dentro del mundo
                    if ((dx !== 0 || dz !== 0 || dy > 4) && 
                        x + dx >= 0 && x + dx < worldSize && 
                        z + dz >= 0 && z + dz < worldSize) {
                        // Hacer las hojas redondeadas
                        const distance = Math.sqrt(dx * dx + dz * dz + (dy - 5) * (dy - 5));
                        if (distance <= 2.5) {
                            createBlock(x + dx, y + dy, z + dz, 'leaves');
                        }
                    }
                }
            }
        }
        
        // 25% de probabilidad de generar una manzana
        if (Math.random() < 0.25) {
            createApple(x, y + 4, z);
        }
    }
    
    // Crear una manzana
    function createApple(x, y, z) {
        const apple = document.createElement('div');
        apple.className = 'block apple';
        apple.style.transform = `translate3d(${(x - worldSize / 2) * blockSize}px, ${-y * blockSize}px, ${(z - worldSize / 2) * blockSize}px)`;
        
        world.appendChild(apple);
        
        apple.addEventListener('click', () => {
            updateInventoryCounter('apple', 1);
            apple.remove();
        });
    }
    
    // Crear un charco de agua
    function createWaterPool(centerX, y, centerZ) {
        const poolSize = 2 + Math.floor(Math.random() * 3);
        const poolDepth = 1 + Math.floor(Math.random() * 2);
        
        for (let dx = -poolSize; dx <= poolSize; dx++) {
            for (let dz = -poolSize; dz <= poolSize; dz++) {
                const x = centerX + dx;
                const z = centerZ + dz;
                
                if (x >= 0 && x < worldSize && z >= 0 && z < worldSize) {
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    if (distance <= poolSize) {
                        // Eliminar bloques existentes en el área
                        for (let dy = 0; dy <= poolDepth; dy++) {
                            const blockY = y - dy;
                            if (blockMatrix[x] && blockMatrix[x][z] && blockMatrix[x][z][blockY]) {
                                const block = blockMatrix[x][z][blockY].element;
                                if (block) block.remove();
                                blockMatrix[x][z][blockY] = null;
                            }
                        }
                        
                        // Crear agua en el nivel superior
                        createBlock(x, y - poolDepth, z, 'water');
                        
                        // Crear arena en el fondo
                        if (poolDepth > 1) {
                            createBlock(x, y - poolDepth - 1, z, 'sand');
                        }
                    }
                }
            }
        }
    }
    
    // Crear un bloque
    function createBlock(x, y, z, type) {
        const block = document.createElement('div');
        block.className = `block ${type}`;
        block.style.transform = `translate3d(${(x - worldSize / 2) * blockSize}px, ${-y * blockSize}px, ${(z - worldSize / 2) * blockSize}px)`;
        block.style.backgroundColor = getBlockColor(type);
        
        // Añadir transparencia a bloques como agua y vidrio
        if (type === 'water' || type === 'glass') {
            block.style.opacity = type === 'glass' ? 0.8 : 0.7;
        }
        
        world.appendChild(block);
        
        // Almacenar el bloque en la matriz
        if (!blockMatrix[x]) blockMatrix[x] = [];
        if (!blockMatrix[x][z]) blockMatrix[x][z] = [];
        
        blockMatrix[x][z][y] = {
            element: block,
            type: type
        };
        
        // Añadir eventos de clic
        block.addEventListener('click', (event) => {
            if (mode === 'break') {
                // Romper el bloque
                block.remove();
                updateInventoryCounter(type, 1);
                blockMatrix[x][z][y] = null;
                
                // Si es una manzana, aumentar la comida
                if (type === 'apple') {
                    hunger = Math.min(100, hunger + 20);
                    updateHungerBar();
                }
            } else if (mode === 'place' && inventoryItems[selectedBlockType] > 0) {
                // Colocar un bloque adyacente
                const face = identifyClickedFace(block, event);
                if (face) {
                    let newX = x, newY = y, newZ = z;
                    
                    switch(face) {
                        case 'front': newZ += 1; break;
                        case 'back': newZ -= 1; break;
                        case 'left': newX -= 1; break;
                        case 'right': newX += 1; break;
                        case 'top': newY += 1; break;
                        case 'bottom': newY -= 1; break;
                    }
                    
                    // Verificar límites del mundo
                    if (newX >= 0 && newX < worldSize && 
                        newY >= 0 && newY < worldSize && 
                        newZ >= 0 && newZ < worldSize && 
                        (!blockMatrix[newX] || !blockMatrix[newX][newZ] || !blockMatrix[newX][newZ][newY])) {
                        
                        createBlock(newX, newY, newZ, selectedBlockType);
                        updateInventoryCounter(selectedBlockType, -1);
                    }
                }
            }
        });
        
        return block;
    }
    
    // Identificar la cara del bloque en la que se hizo clic
    function identifyClickedFace(block, event) {
        const rect = block.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const relX = x / rect.width;
        const relY = y / rect.height;
        
        // Determinar la cara según la posición relativa del clic
        if (relX < 0.3) return 'left';
        if (relX > 0.7) return 'right';
        if (relY < 0.3) return 'top';
        if (relY > 0.7) return 'bottom';
        
        // Para determinar entre frente y atrás, usamos la rotación actual
        const frontFacing = Math.abs(rotateY % 360) < 90 || Math.abs(rotateY % 360) > 270;
        return frontFacing ? 'front' : 'back';
    }
    
    // Sistema del día y la noche
    function startDayNightCycle() {
        setInterval(() => {
            time += 1; // Aumentar 1 minuto
            if (time >= 24 * 60) time = 0;
            
            const hour = Math.floor(time / 60);
            const minute = time % 60;
            timeDisplay.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Actualizar la iluminación
            updateWorldLighting();
        }, 1000); // 1 segundo = 1 minuto en el juego
    }
    
    // Actualizar iluminación según la hora
    function updateWorldLighting() {
        const hour = Math.floor(time / 60);
        
        // Calcular brillo (1.0 al mediodía, 0.2 en la noche)
        if (hour >= 6 && hour < 18) {
            // Durante el día
            const dayProgress = (hour - 6) / 12; // 0 al amanecer, 1 al atardecer
            worldBrightness = dayProgress < 0.5 ? 
                0.7 + 0.3 * (dayProgress * 2) : // Aumentar hasta el mediodía
                0.7 + 0.3 * (2 - dayProgress * 2); // Disminuir después del mediodía
        } else {
            // Durante la noche
            const nightProgress = hour < 6 ? 
                (hour + 6) / 12 : // Desde medianoche hasta amanecer
                (hour - 18) / 12; // Desde atardecer hasta medianoche
            worldBrightness = 0.2 + 0.5 * nightProgress;
        }
        
        // Aplicar iluminación
        document.body.style.backgroundColor = `rgba(0, 0, 0, ${1 - worldBrightness})`;
        world.style.filter = `brightness(${worldBrightness * 100}%)`;
    }
    
    // Comer comida
    function eatFood() {
        if (inventoryItems['apple'] > 0) {
            updateInventoryCounter('apple', -1);
            hunger = Math.min(100, hunger + 30);
            health = Math.min(100, health + 10);
            updateHungerBar();
            updateHealthBar();
        }
    }
    
    // Actualizar la vista del mundo
    function updateWorldView() {
        world.style.transform = `translateZ(${playerZ}px) translateX(${playerX}px) translateY(${playerY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
    
    // Configurar eventos
    function setupEvents() {
        // Eventos de teclado
        document.addEventListener('keydown', (event) => {
            switch(event.key.toLowerCase()) {
                case 'w': keys.w = true; break;
                case 'a': keys.a = true; break;
                case 's': keys.s = true; break;
                case 'd': keys.d = true; break;
                case ' ': keys.space = true; break;
                case 'e': toggleMode(); break;
                case 'f': interactWithWorld(); break;
                case '1': case '2': case '3': case '4': case '5': 
                case '6': case '7': case '8': case '9':
                    const index = parseInt(event.key) - 1;
                    if (index < blockTypes.length) {
                        document.querySelectorAll('.inventory-item')[index].click();
                    }
                    break;
            }
        });
    
        document.addEventListener('keyup', (event) => {
            switch(event.key.toLowerCase()) {
                case 'w': keys.w = false; break;
                case 'a': keys.a = false; break;
                case 's': keys.s = false; break;
                case 'd': keys.d = false; break;
                case ' ': keys.space = false; break;
            }
        });
    
        // Eventos del ratón para la rotación
        let lastMouseX = 0;
        let lastMouseY = 0;
        let mouseDown = false;
    
        document.addEventListener('mousedown', (event) => {
            mouseDown = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        });
    
        document.addEventListener('mouseup', () => {
            mouseDown = false;
        });
    
        document.addEventListener('mousemove', (event) => {
            if (mouseDown) {
                const deltaX = event.clientX - lastMouseX;
                const deltaY = event.clientY - lastMouseY;
                
                rotateY += deltaX * 0.5;
                rotateX = Math.max(-60, Math.min(60, rotateX + deltaY * 0.5));
                
                updateWorldView();
                
                lastMouseX = event.clientX;
                lastMouseY = event.clientY;
            }
        });
    
        // Evento para cambiar modo (construir/romper)
        document.getElementById('mode-btn').addEventListener('click', toggleMode);
    }
    
    // Cambiar entre modos de construir y romper
    function toggleMode() {
        mode = mode === 'place' ? 'break' : 'place';
        document.getElementById('mode-btn').textContent = mode === 'place' ? 'Modo: Construir' : 'Modo: Romper';
    }
    
    // Interactuar con el mundo (usar objetos, abrir cofres, etc.)
    function interactWithWorld() {
        // Detectar el bloque frente al jugador
        const playerBlockX = Math.floor((playerX / blockSize) + (worldSize / 2));
        const playerBlockZ = Math.floor((playerZ / blockSize) + (worldSize / 2));
        const playerBlockY = Math.floor((-playerY / blockSize));
        
        // Dirección basada en la rotación
        const angle = (rotateY % 360) * Math.PI / 180;
        const dirX = Math.round(Math.sin(angle));
        const dirZ = Math.round(-Math.cos(angle));
        
        const targetX = playerBlockX + dirX;
        const targetZ = playerBlockZ + dirZ;
        
        // Revisar si hay un bloque interactivo
        if (targetX >= 0 && targetX < worldSize && targetZ >= 0 && targetZ < worldSize) {
            for (let y = playerBlockY - 1; y <= playerBlockY + 1; y++) {
                if (y >= 0 && y < worldSize && 
                    blockMatrix[targetX] && 
                    blockMatrix[targetX][targetZ] && 
                    blockMatrix[targetX][targetZ][y]) {
                    
                    const block = blockMatrix[targetX][targetZ][y];
                    
                    // Interactuar según el tipo de bloque
                    if (block.type === 'crafting_table') {
                        openCraftingTable();
                    }
                }
            }
        }
    }
    
    // Abrir mesa de crafteo
    function openCraftingTable() {
        const craftingMenu = document.createElement('div');
        craftingMenu.className = 'crafting-menu';
        craftingMenu.innerHTML = `
            <h3>Mesa de Crafteo</h3>
            <div class="crafting-grid">
                <div class="grid-row">
                    <div class="grid-cell" data-index="0"></div>
                    <div class="grid-cell" data-index="1"></div>
                    <div class="grid-cell" data-index="2"></div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell" data-index="3"></div>
                    <div class="grid-cell" data-index="4"></div>
                    <div class="grid-cell" data-index="5"></div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell" data-index="6"></div>
                    <div class="grid-cell" data-index="7"></div>
                    <div class="grid-cell" data-index="8"></div>
                </div>
            </div>
            <div class="crafting-result"></div>
            <button id="craft-btn" disabled>Craftear</button>
            <button id="close-crafting">Cerrar</button>
        `;
        
        document.body.appendChild(craftingMenu);
        
        document.getElementById('close-crafting').addEventListener('click', () => {
            craftingMenu.remove();
        });
    }
    
    // Bucle principal del juego
    function gameLoop() {
        // Física y movimiento
        handlePlayerMovement();
        
        // Actualizar entidades
        updateEntities();
        
        requestAnimationFrame(gameLoop);
    }
    
    // Manejar el movimiento del jugador
    function handlePlayerMovement() {
        // Aplicar gravedad
        velocityY -= gravity;
        playerY += velocityY;
        
        // Verificar colisión con el suelo
        const playerBlockX = Math.floor((playerX / blockSize) + (worldSize / 2));
        const playerBlockZ = Math.floor((playerZ / blockSize) + (worldSize / 2));
        const footY = Math.floor((-playerY / blockSize) - 1);
        
        let onGround = false;
        
        if (playerBlockX >= 0 && playerBlockX < worldSize && 
            playerBlockZ >= 0 && playerBlockZ < worldSize && 
            footY >= 0 && footY < worldSize) {
            
            if (blockMatrix[playerBlockX] && 
                blockMatrix[playerBlockX][playerBlockZ] && 
                blockMatrix[playerBlockX][playerBlockZ][footY]) {
                
                playerY = -footY * blockSize;
                velocityY = 0;
                onGround = true;
            }
        }
        
        // Movimiento con teclas
        const moveSpeed = 5;
        const angle = (rotateY % 360) * Math.PI / 180;
        
        if (keys.w) {
            playerX -= Math.sin(angle) * moveSpeed;
            playerZ += Math.cos(angle) * moveSpeed;
        }
        if (keys.s) {
            playerX += Math.sin(angle) * moveSpeed;
            playerZ -= Math.cos(angle) * moveSpeed;
        }
        if (keys.a) {
            playerX -= Math.cos(angle) * moveSpeed;
            playerZ -= Math.sin(angle) * moveSpeed;
        }
        if (keys.d) {
            playerX += Math.cos(angle) * moveSpeed;
            playerZ += Math.sin(angle) * moveSpeed;
        }
        if (keys.space && onGround) {
            velocityY = jumpStrength;
        }
        
        // Actualizar la vista
        updateWorldView();
    }
    });