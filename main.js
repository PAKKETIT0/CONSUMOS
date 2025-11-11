// Sistema de InventariPro - Versión Corregida
class InventorySystem {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('inventoryProducts')) || [];
        this.movements = JSON.parse(localStorage.getItem('inventoryMovements')) || [];
        this.alerts = [];
        this.currentSection = 'inventory';
        this.currentUser = 'Usuario Actual';
        
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
        
        // Show selected section
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
        
        if (location === 'Primer Piso') {
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
    }
    
    handleLocationChange(e) {
        const specificLocationContainer = document.getElementById('specificLocationContainer');
        const extruderContainer = document.getElementById('extruderContainer');
        
        // Ocultar todos los contenedores primero
        specificLocationContainer.classList.add('hidden');
        extruderContainer.classList.add('hidden');
        
        if (e.target.value === 'Primer Piso') {
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
                <td class="px-4 py-3 text-sm text-gray-900">${movement.timestamp}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.description}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.batch}</td>
                <td class="px-4 py-3">${typeBadge}</td>
                <td class="px-4 py-3 text-sm font-semibold ${quantityClass}">${movement.quantity.toFixed(2)} kg</td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${movement.type === 'transferencia' ? `${movement.origin} → ${movement.destination}` : movement.destination}
                    ${movement.specificDestination ? `<br><span class="text-xs text-gray-500">${movement.specificDestination}</span>` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.responsible}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.reason || '-'}</td>
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
    
    filterMovements() {
        const dateFilter = document.getElementById('movementDateFilter').value;
        const productFilter = document.getElementById('movementProductFilter').value;
        
        let filteredMovements = [...this.movements];
        
        if (dateFilter) {
            filteredMovements = filteredMovements.filter(m => m.date.split('T')[0] === dateFilter);
        }
        
        if (productFilter) {
            filteredMovements = filteredMovements.filter(m => m.description === productFilter);
        }
        
        this.renderFilteredMovements(filteredMovements);
    }
    
    renderFilteredMovements(movements) {
        const tbody = document.getElementById('movementTableBody');
        tbody.innerHTML = '';
        
        movements.reverse().forEach(movement => {
            const row = document.createElement('tr');
            row.className = 'table-row';
            
            const typeBadge = this.getMovementTypeBadge(movement.type);
            const quantityClass = movement.type === 'consumo' ? 'text-red-600' : 
                                movement.type === 'registro_inicial' ? 'text-blue-600' : 'text-green-600';
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${movement.timestamp}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.description}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.batch}</td>
                <td class="px-4 py-3">${typeBadge}</td>
                <td class="px-4 py-3 text-sm font-semibold ${quantityClass}">${movement.quantity.toFixed(2)} kg</td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${movement.type === 'transferencia' ? `${movement.origin} → ${movement.destination}` : movement.destination}
                    ${movement.specificDestination ? `<br><span class="text-xs text-gray-500">${movement.specificDestination}</span>` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.responsible}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${movement.reason || '-'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    clearMovementFilters() {
        document.getElementById('movementDateFilter').value = '';
        document.getElementById('movementProductFilter').value = '';
        this.updateMovementHistory();
    }
    
    deleteProduct(id) {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            const product = this.products.find(p => p.id === id);
            this.products = this.products.filter(p => p.id !== id);
            this.saveData();
            this.loadInventory();
            this.updateAlerts();
            
            // Registrar movimiento de eliminación
            this.addMovementRecord({
                productId: id,
                idh: product.idh,
                description: product.description,
                batch: product.batch,
                type: 'eliminacion',
                quantity: product.quantity,
                origin: product.location,
                destination: 'Eliminado',
                responsible: this.currentUser,
                reason: 'Producto eliminado del sistema',
                date: new Date().toISOString(),
                timestamp: new Date().toLocaleString()
            });
            
            this.showNotification('Producto eliminado exitosamente', 'success');
        }
    }
    
    filterProducts() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const location = document.getElementById('filterLocation').value;
        const status = document.getElementById('filterStatus').value;
        
        let filtered = this.products;
        
        if (search) {
            filtered = filtered.filter(p => 
                p.idh.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search) ||
                p.batch.toLowerCase().includes(search)
            );
        }
        
        if (location) {
            filtered = filtered.filter(p => p.location === location);
        }
        
        if (status) {
            filtered = filtered.filter(p => {
                switch(status) {
                    case 'vigente':
                        return p.status === 'vigente';
                    case 'proximo':
                        return p.status === 'proximo';
                    case 'vencido':
                        return p.status === 'vencido';
                    case 'stock-bajo':
                        return p.quantity < 10;
                    default:
                        return true;
                }
            });
        }
        
        this.renderProductsTable(filtered);
    }
    
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterLocation').value = '';
        document.getElementById('filterStatus').value = '';
        this.loadInventory();
    }
    
    loadInventory() {
        this.updateProductStatus();
        this.renderProductsTable(this.products);
        this.updateTotalInventory();
        this.updateMovementHistory();
    }
    
    updateTotalInventory() {
        const totalQuantity = this.products.reduce((sum, product) => {
            return sum + product.quantity;
        }, 0);
        
        document.getElementById('totalInventoryQuantity').textContent = `${totalQuantity.toFixed(2)} kg`;
    }
    
    downloadFullInventory() {
        const inventoryData = this.products.map(product => ({
            'IDH': product.idh,
            'Descripción': product.description,
            'Lote': product.batch,
            'Cantidad (kg)': product.quantity,
            'Fecha Caducidad': product.expiryDate,
            'Ubicación': product.location,
            'Ubicación Específica': product.specificLocation || '',
            'Estado Calidad': this.getQualityStatusText(product.qualityStatus),
            'Notas': product.notes || '',
            'Estado': this.getStatusText(product.status),
            'Última Modificación': new Date(product.lastModified).toLocaleString()
        }));
        
        const csvContent = this.generateInventoryCSV(inventoryData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `inventario_completo_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        this.showNotification('Inventario completo descargado exitosamente', 'success');
    }
    
    generateInventoryCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
    
    getQualityStatusText(status) {
        const statusMap = {
            'aprobado': 'Aprobado',
            'bloqueado': 'Bloqueado - No pasa calidad',
            'cuarentena': 'En Cuarentena',
            'rechazado': 'Rechazado'
        };
        return statusMap[status] || status;
    }
    
    getStatusText(status) {
        const statusMap = {
            'vigente': 'Vigente',
            'proximo': 'Próximo a vencer',
            'vencido': 'Vencido'
        };
        return statusMap[status] || status;
    }
    
    updateProductStatus() {
        const today = new Date();
        const warningDays = 7;
        
        this.products.forEach(product => {
            const expiryDate = new Date(product.expiryDate);
            const daysDiff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysDiff < 0) {
                product.status = 'vencido';
            } else if (daysDiff <= warningDays) {
                product.status = 'proximo';
            } else {
                product.status = 'vigente';
            }
        });
    }
    
    renderProductsTable(products) {
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'table-row';
            
            const statusBadge = this.getStatusBadge(product.status);
            const qualityBadge = this.getQualityBadge(product.qualityStatus);
            const expiryDate = new Date(product.expiryDate).toLocaleDateString();
            const locationText = product.specificLocation ? 
                `${product.location} (${product.specificLocation})` : product.location;
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${product.idh}</td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${product.description}
                    ${product.notes ? `<div class="text-xs text-gray-500 mt-1">${product.notes}</div>` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.batch}</td>
                <td class="px-4 py-3 text-sm font-semibold ${product.quantity < 10 ? 'text-red-600' : 'text-gray-900'}">${product.quantity.toFixed(2)} kg</td>
                <td class="px-4 py-3 text-sm text-gray-900">${expiryDate}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${locationText}</td>
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3">${qualityBadge}</td>
                <td class="px-4 py-3 text-sm font-medium">
                    <button onclick="inventory.editProduct(${product.id})" class="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                    <button onclick="inventory.deleteProduct(${product.id})" class="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                            <p class="text-lg font-medium">No se encontraron productos</p>
                            <p class="text-sm">Agrega un nuevo producto para comenzar</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    getStatusBadge(status) {
        const badges = {
            'vigente': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Vigente</span>',
            'proximo': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Próximo</span>',
            'vencido': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>'
        };
        
        return badges[status] || badges['vigente'];
    }
    
    getQualityBadge(status) {
        const badges = {
            'aprobado': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aprobado</span>',
            'bloqueado': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Bloqueado</span>',
            'cuarentena': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Cuarentena</span>',
            'rechazado': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Rechazado</span>'
        };
        
        return badges[status] || badges['aprobado'];
    }
    
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
            card.className = 'bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover-lift';
            
            card.innerHTML = `
                <h4 class="font-semibold text-gray-800 mb-2 truncate">${description}</h4>
                <div class="text-sm text-gray-600 mb-2">Total: <span class="font-bold">${totalQuantity.toFixed(2)} kg</span></div>
                <div class="flex flex-wrap gap-1">
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
    
    initCharts() {
        // Inicializar gráficos
        this.locationChart = echarts.init(document.getElementById('locationChart'));
        this.consumptionTrendChart = echarts.init(document.getElementById('consumptionTrendChart'));
        this.rotationChart = echarts.init(document.getElementById('rotationChart'));
        this.expiryChart = echarts.init(document.getElementById('expiryChart'));
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
    
    loadReports() {
        // Actualizar gráficos de reportes
        const rotationOption = {
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'category',
                data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
            },
            yAxis: {
                type: 'value',
                name: 'kg'
            },
            series: [{
                data: [120, 200, 150, 80, 70, 110],
                type: 'bar',
                itemStyle: {
                    color: '#1e3a8a'
                }
            }]
        };
        
        this.rotationChart.setOption(rotationOption);
        
        const expiryOption = {
            tooltip: {
                trigger: 'item'
            },
            series: [{
                name: 'Estados',
                type: 'pie',
                radius: ['40%', '70%'],
                data: [
                    { value: this.products.filter(p => p.status === 'vigente').length, name: 'Vigente' },
                    { value: this.products.filter(p => p.status === 'proximo').length, name: 'Próximo' },
                    { value: this.products.filter(p => p.status === 'vencido').length, name: 'Vencido' }
                ],
                itemStyle: {
                    color: function(params) {
                        const colors = ['#059669', '#d97706', '#dc2626'];
                        return colors[params.dataIndex];
                    }
                }
            }]
        };
        
        this.expiryChart.setOption(expiryOption);
    }
    
    exportData() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        this.showNotification('Datos exportados exitosamente', 'success');
    }
    
    generateCSV() {
        const headers = ['IDH', 'Descripción', 'Lote', 'Cantidad (kg)', 'Fecha Caducidad', 'Ubicación', 'Estado'];
        const rows = this.products.map(product => [
            product.idh,
            product.description,
            product.batch,
            product.quantity,
            product.expiryDate,
            product.location,
            product.status
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    clearForm() {
        document.getElementById('productForm').reset();
        document.getElementById('specificLocationContainer').classList.add('hidden');
        document.getElementById('extruderContainer').classList.add('hidden');
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
    
    saveData() {
        localStorage.setItem('inventoryProducts', JSON.stringify(this.products));
        localStorage.setItem('inventoryMovements', JSON.stringify(this.movements));
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    animateElements() {
        // Animar elementos de la tabla
        const tableRows = document.querySelectorAll('.table-row');
        tableRows.forEach((row, index) => {
            anime({
                targets: row,
                translateX: [-20, 0],
                opacity: [0, 1],
                duration: 400,
                delay: index * 50,
                easing: 'easeOutCubic'
            });
        });
    }
    
    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            // Llenar formulario con datos del producto
            document.getElementById('idhInput').value = product.idh;
            document.getElementById('descriptionInput').value = product.description;
            document.getElementById('batchInput').value = product.batch;
            document.getElementById('quantityInput').value = product.quantity;
            document.getElementById('expiryInput').value = product.expiryDate;
            document.getElementById('locationInput').value = product.location;
            document.getElementById('notesInput').value = product.notes || '';
            document.getElementById('qualityStatusInput').value = product.qualityStatus;
            
            // Mostrar campos específicos según la ubicación
            if (product.location === 'Primer Piso' && product.specificLocation) {
                document.getElementById('specificLocationContainer').classList.remove('hidden');
                document.getElementById('specificLocationInput').value = product.specificLocation;
            } else if (product.location === 'Producción' && product.specificLocation) {
                document.getElementById('extruderContainer').classList.remove('hidden');
                document.getElementById('extruderInput').value = product.specificLocation;
            }
            
            // Eliminar el producto temporalmente para evitar duplicados
            this.products = this.products.filter(p => p.id !== id);
            this.saveData();
            this.loadInventory();
            
            this.showNotification('Producto cargado para edición', 'info');
        }
    }
    
    updateAlerts() {
        this.alerts = [];
        
        this.products.forEach(product => {
            if (product.status === 'proximo') {
                this.alerts.push({
                    type: 'warning',
                    message: `El producto ${product.description} (Lote: ${product.batch}) está próximo a vencer`,
                    date: product.expiryDate
                });
            }
            
            if (product.quantity < 10) {
                this.alerts.push({
                    type: 'danger',
                    message: `Stock bajo: ${product.description} (Lote: ${product.batch}) - ${product.quantity}kg restantes`,
                    date: new Date().toISOString()
                });
            }
        });
    }
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
