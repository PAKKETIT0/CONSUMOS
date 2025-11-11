// Sistema de InventariPro - Versión Mejorada con Trazabilidad
class InventorySystem {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('inventoryProducts')) || [];
        this.movements = JSON.parse(localStorage.getItem('inventoryMovements')) || [];
        this.alerts = [];
        this.currentSection = 'inventory';
        this.currentUser = 'Usuario Actual'; // En un sistema real, esto vendría de autenticación
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadDashboard();
        this.loadInventory();
        this.updateAlerts();
        this.initCharts();
        this.animateElements();
    }
    
    bindEvents() {
        // Navigation
        document.getElementById('dashboardBtn').addEventListener('click', () => this.showSection('dashboard'));
        document.getElementById('inventoryBtn').addEventListener('click', () => this.showSection('inventory'));
        document.getElementById('reportsBtn').addEventListener('click', () => this.showSection('reports'));
        
        // Form events
        document.getElementById('productForm').addEventListener('submit', (e) => this.addProduct(e));
        document.getElementById('clearForm').addEventListener('click', () => this.clearForm());
        
        // Location handling
        document.getElementById('locationInput').addEventListener('change', (e) => this.handleLocationChange(e));
        
        // Stock movement
        document.getElementById('transferStock').addEventListener('click', () => this.transferStock());
        document.getElementById('consumeStock').addEventListener('click', () => this.consumeStock());
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => this.filterProducts());
        document.getElementById('filterLocation').addEventListener('change', () => this.filterProducts());
        document.getElementById('filterStatus').addEventListener('change', () => this.filterProducts());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        
        // Movement filters
        document.getElementById('movementDateFilter').addEventListener('change', () => this.filterMovements());
        document.getElementById('movementProductFilter').addEventListener('change', () => this.filterMovements());
        document.getElementById('clearMovementFilters').addEventListener('click', () => this.clearMovementFilters());
        
        // Export
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('downloadFullInventory').addEventListener('click', () => this.downloadFullInventory());
    }
    
    showSection(section) {
        // Hide all sections
        document.getElementById('dashboardSection').classList.add('hidden');
        document.getElementById('inventorySection').classList.add('hidden');
        document.getElementById('reportsSection').classList.add('hidden');
        
        // Remove active states
        document.getElementById('dashboardBtn').classList.remove('bg-blue-600', 'text-white');
        document.getElementById('inventoryBtn').classList.remove('bg-blue-600', 'text-white');
        document.getElementById('reportsBtn').classList.remove('bg-blue-600', 'text-white');
        
        document.getElementById('dashboardBtn').classList.add('text-gray-600');
        document.getElementById('inventoryBtn').classList.add('text-gray-600');
        document.getElementById('reportsBtn').classList.add('text-gray-600');
        
        // Show selected section and reload data
        switch(section) {
            case 'dashboard':
                document.getElementById('dashboardSection').classList.remove('hidden');
                document.getElementById('dashboardBtn').classList.add('bg-blue-600', 'text-white');
                document.getElementById('dashboardBtn').classList.remove('text-gray-600');
                this.loadDashboard();
                break;
            case 'inventory':
                document.getElementById('inventorySection').classList.remove('hidden');
                document.getElementById('inventoryBtn').classList.add('bg-blue-600', 'text-white');
                document.getElementById('inventoryBtn').classList.remove('text-gray-600');
                this.loadInventory();
                break;
            case 'reports':
                document.getElementById('reportsSection').classList.remove('hidden');
                document.getElementById('reportsBtn').classList.add('bg-blue-600', 'text-white');
                document.getElementById('reportsBtn').classList.remove('text-gray-600');
                this.loadReports();
                break;
        }
        
        this.currentSection = section;
        this.animateElements();
    }
    
    addProduct(e) {
        e.preventDefault();
        
        const idh = document.getElementById('idhInput').value;
        const batch = document.getElementById('batchInput').value;
        
        // Validar que no exista producto con mismo IDH y mismo lote
        const existingProduct = this.products.find(p => p.idh === idh && p.batch === batch);
        if (existingProduct) {
            this.showNotification('Error: Ya existe un producto con el mismo IDH y lote', 'error');
            return;
        }
        
        let location = document.getElementById('locationInput').value;
        let specificLocation = '';
        
        if (location === 'custom') {
            location = document.getElementById('customLocationInput').value;
        } else if (location === 'Primer Piso') {
            specificLocation = document.getElementById('specificLocationInput').value;
        } else if (location === 'Producción') {
            specificLocation = document.getElementById('extruderInput').value;
        }
        
        const product = {
            id: Date.now(),
            idh: idh,
            description: document.getElementById('descriptionInput').value,
            batch: batch,
            quantity: parseFloat(document.getElementById('quantityInput').value),
            expiryDate: document.getElementById('expiryInput').value,
            location: location,
            specificLocation: specificLocation,
            notes: document.getElementById('notesInput').value,
            qualityStatus: document.getElementById('qualityStatusInput').value,
            dateAdded: new Date().toISOString(),
            status: 'vigente',
            lastModified: new Date().toISOString()
        };
        
        this.products.push(product);
        this.saveData();
        this.loadInventory();
        
        // Registrar movimiento inicial
        this.addMovementRecord({
            productId: product.id,
            idh: product.idh,
            description: product.description,
            batch: product.batch,
            type: 'registro_inicial',
            quantity: product.quantity,
            origin: 'N/A',
            destination: product.location,
            specificDestination: product.specificLocation,
            responsible: this.currentUser,
            reason: 'Registro inicial de producto',
            date: new Date().toISOString(),
            timestamp: new Date().toLocaleString()
        });
        
        this.clearForm();
        this.updateAlerts();
        this.showNotification('Producto agregado exitosamente', 'success');
        this.animateElements();
    }
    
    handleLocationChange(e) {
        const customInput = document.getElementById('customLocationInput');
        const specificLocationContainer = document.getElementById('specificLocationContainer');
        const extruderContainer = document.getElementById('extruderContainer');
        
        // Ocultar todos los contenedores primero
        customInput.classList.add('hidden');
        specificLocationContainer.classList.add('hidden');
        extruderContainer.classList.add('hidden');
        
        if (e.target.value === 'custom') {
            customInput.classList.remove('hidden');
            customInput.required = true;
        } else if (e.target.value === 'Primer Piso') {
            specificLocationContainer.classList.remove('hidden');
        } else if (e.target.value === 'Producción') {
            extruderContainer.classList.remove('hidden');
        }
    }
    
    transferStock() {
        this.processMovement('transferencia');
    }
    
    consumeStock() {
        this.processMovement('consumo');
    }
    
    processMovement(type) {
        const idh = document.getElementById('adjustIdh').value;
        const batch = document.getElementById('adjustBatch').value;
        const quantity = parseFloat(document.getElementById('adjustQuantity').value);
        const origin = document.getElementById('originLocation').value;
        const destination = document.getElementById('destinationLocation').value;
        const responsible = document.getElementById('movementResponsible').value;
        const reason = document.getElementById('movementReason').value;
        
        if (!idh || !batch || isNaN(quantity) || !origin || !destination || !responsible) {
            this.showNotification('Por favor completa todos los campos obligatorios', 'error');
            return;
        }
        
        if (quantity <= 0) {
            this.showNotification('La cantidad debe ser mayor a 0', 'error');
            return;
        }
        
        const product = this.products.find(p => p.idh === idh && p.batch === batch);
        
        if (!product) {
            this.showNotification('Producto no encontrado', 'error');
            return;
        }
        
        // Para transferencias, verificar que el origen coincida con la ubicación actual
        if (type === 'transferencia' && product.location !== origin) {
            this.showNotification(`El producto no se encuentra en ${origin}. Ubicación actual: ${product.location}`, 'error');
            return;
        }
        
        // Para consumos, verificar stock suficiente
        if (type === 'consumo' && product.quantity < quantity) {
            this.showNotification(`Stock insuficiente. Disponible: ${product.quantity}kg`, 'error');
            return;
        }
        
        // Actualizar producto
        if (type === 'transferencia') {
            product.location = destination;
            // Si es Primer Piso o Producción, actualizar ubicación específica
            if (destination === 'Primer Piso') {
                product.specificLocation = document.getElementById('specificLocationInput').value || '';
            } else if (destination === 'Producción') {
                product.specificLocation = document.getElementById('extruderInput').value || '';
            } else {
                product.specificLocation = '';
            }
        } else if (type === 'consumo') {
            product.quantity -= quantity;
        }
        
        product.lastModified = new Date().toISOString();
        
        // Registrar movimiento
        this.addMovementRecord({
            productId: product.id,
            idh: product.idh,
            description: product.description,
            batch: product.batch,
            type: type,
            quantity: quantity,
            origin: origin,
            destination: destination,
            specificDestination: product.specificLocation,
            responsible: responsible,
            reason: reason,
            date: new Date().toISOString(),
            timestamp: new Date().toLocaleString()
        });
        
        this.saveData();
        this.loadInventory();
        this.updateAlerts();
        
        // Limpiar campos de movimiento
        this.clearMovementForm();
        
        this.showNotification(`${type === 'transferencia' ? 'Transferencia' : 'Consumo'} registrado exitosamente`, 'success');
    }
    
    addMovementRecord(movement) {
        movement.id = Date.now();
        this.movements.push(movement);
        localStorage.setItem('inventoryMovements', JSON.stringify(this.movements));
        this.updateMovementHistory();
    }
    
    updateMovementHistory() {
        const tbody = document.getElementById('movementTableBody');
        tbody.innerHTML = '';
        
        // Actualizar opciones del filtro de productos
        const productFilter = document.getElementById('movementProductFilter');
        productFilter.innerHTML = '<option value="">Todos los productos</option>';
        
        const uniqueProducts = [...new Set(this.movements.map(m => m.description))];
        uniqueProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productFilter.appendChild(option);
        });
        
        // Mostrar movimientos
        this.movements.reverse().forEach(movement => {
            const row = document.createElement('tr');
            row.className = 'table-row';
            
            const typeBadge = this.getMovementTypeBadge(movement.type);
            const quantityClass = movement.type === 'consumo' ? 'text-red-600' : 
                                movement.type === 'registro_inicial' ? 'text-blue-600' : 'text-green-600';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.timestamp}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.batch}</td>
                <td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${quantityClass}">${movement.quantity.toFixed(2)} kg</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${movement.type === 'transferencia' ? `${movement.origin} → ${movement.destination}` : movement.destination}
                    ${movement.specificDestination ? `<br><span class="text-xs text-gray-500">${movement.specificDestination}</span>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.responsible}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.reason || '-'}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        if (this.movements.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            <p class="text-lg font-medium">No hay movimientos registrados</p>
                            <p class="text-sm">Los movimientos aparecerán aquí cuando realices transacciones</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    getMovementTypeBadge(type) {
        const badges = {
            'transferencia': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Transferencia</span>',
            'consumo': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Consumo</span>',
            'registro_inicial': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Registro Inicial</span>'
        };
        
        return badges[type] || '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Movimiento</span>';
    }
    
    // ... (otros métodos como filterMovements, deleteProduct, filterProducts se mantienen similares pero actualizados)
    
    loadDashboard() {
        this.updateProductStatus();
        this.updateDashboardStats();
        this.updateArticlesByStatus();
        this.updateCharts();
    }
    
    updateDashboardStats() {
        const totalProducts = this.products.length;
        const expiringSoon = this.products.filter(p => p.status === 'proximo').length;
        const lowStock = this.products.filter(p => p.quantity < 10).length;
        
        // Calcular consumos del mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyConsumption = this.movements
            .filter(m => m.type === 'consumo' && 
                        new Date(m.date).getMonth() === currentMonth && 
                        new Date(m.date).getFullYear() === currentYear)
            .reduce((sum, m) => sum + m.quantity, 0);
        
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('expiringSoon').textContent = expiringSoon;
        document.getElementById('lowStock').textContent = lowStock;
        document.getElementById('monthlyConsumption').textContent = `${monthlyConsumption.toFixed(2)} kg`;
        
        // Actualizar contador de alertas
        const alertCount = expiringSoon + lowStock;
        const alertElement = document.getElementById('alertCount');
        if (alertCount > 0) {
            alertElement.textContent = alertCount;
            alertElement.classList.remove('hidden');
        } else {
            alertElement.classList.add('hidden');
        }
    }
    
    updateArticlesByStatus() {
        const container = document.getElementById('articlesByStatus');
        container.innerHTML = '';
        
        // Agrupar productos por descripción
        const productsByDescription = {};
        this.products.forEach(product => {
            if (!productsByDescription[product.description]) {
                productsByDescription[product.description] = [];
            }
            productsByDescription[product.description].push(product);
        });
        
        // Crear tarjetas para cada artículo
        Object.entries(productsByDescription).forEach(([description, products]) => {
            const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
            const statusCounts = {
                vigente: products.filter(p => p.status === 'vigente').length,
                proximo: products.filter(p => p.status === 'proximo').length,
                vencido: products.filter(p => p.status === 'vencido').length
            };
            
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg p-4 shadow-sm border border-gray-200';
            
            card.innerHTML = `
                <h4 class="font-semibold text-gray-800 mb-2">${description}</h4>
                <div class="text-sm text-gray-600 mb-2">Total: ${totalQuantity.toFixed(2)} kg</div>
                <div class="flex space-x-2">
                    <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">${statusCounts.vigente} Vigentes</span>
                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">${statusCounts.proximo} Próx.</span>
                    <span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">${statusCounts.vencido} Venc.</span>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        if (Object.keys(productsByDescription).length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    <p>No hay artículos registrados</p>
                </div>
            `;
        }
    }
    
    updateCharts() {
        // Gráfico de distribución por ubicación
        const locationData = {};
        this.products.forEach(product => {
            locationData[product.location] = (locationData[product.location] || 0) + product.quantity;
        });
        
        const locationOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c}kg ({d}%)'
            },
            color: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
            series: [{
                name: 'Stock por Ubicación',
                type: 'pie',
                radius: '70%',
                data: Object.entries(locationData).map(([name, value]) => ({ name, value })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.locationChart.setOption(locationOption);
        
        // Gráfico de tendencias de consumo (últimos 6 meses)
        const monthlyConsumption = this.calculateMonthlyConsumption();
        const months = Object.keys(monthlyConsumption);
        const consumptionData = Object.values(monthlyConsumption);
        
        const consumptionOption = {
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'category',
                data: months
            },
            yAxis: {
                type: 'value',
                name: 'kg'
            },
            series: [{
                data: consumptionData,
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#1e3a8a'
                },
                areaStyle: {
                    color: 'rgba(30, 58, 138, 0.1)'
                }
            }]
        };
        
        this.consumptionTrendChart.setOption(consumptionOption);
    }
    
    calculateMonthlyConsumption() {
        const monthlyData = {};
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Inicializar últimos 6 meses
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            monthlyData[key] = 0;
        }
        
        // Calcular consumos por mes
        this.movements
            .filter(m => m.type === 'consumo')
            .forEach(movement => {
                const date = new Date(movement.date);
                const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                if (monthlyData[key] !== undefined) {
                    monthlyData[key] += movement.quantity;
                }
            });
        
        return monthlyData;
    }
    
    initCharts() {
        this.locationChart = echarts.init(document.getElementById('locationChart'));
        this.consumptionTrendChart = echarts.init(document.getElementById('consumptionTrendChart'));
        this.rotationChart = echarts.init(document.getElementById('rotationChart'));
        this.expiryChart = echarts.init(document.getElementById('expiryChart'));
    }
    
    clearMovementForm() {
        document.getElementById('adjustIdh').value = '';
        document.getElementById('adjustBatch').value = '';
        document.getElementById('adjustQuantity').value = '';
        document.getElementById('originLocation').value = '';
        document.getElementById('destinationLocation').value = '';
        document.getElementById('movementResponsible').value = '';
        document.getElementById('movementReason').value = '';
    }
    
    // ... (otros métodos se mantienen similares pero adaptados)
}

// Inicializar el sistema cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    window.inventory = new InventorySystem();
});

// Manejar redimensionamiento de ventana para gráficos
window.addEventListener('resize', () => {
    if (window.inventory && window.inventory.locationChart) {
        window.inventory.locationChart.resize();
        window.inventory.consumptionTrendChart.resize();
        window.inventory.rotationChart.resize();
        window.inventory.expiryChart.resize();
    }
});
