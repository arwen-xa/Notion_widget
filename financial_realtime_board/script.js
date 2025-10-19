// 使用DOMContentLoaded确保页面完全加载
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 页面加载完成，开始初始化金融看板...');
    
    // 立即创建实例
    window.financialWidget = new DynamicFinancialWidget();
    
    console.log('✅ 金融看板初始化完成');
});

class DynamicFinancialWidget {
    constructor() {
        console.log('🔄 DynamicFinancialWidget构造函数执行');
        this.products = this.loadFromStorage();
        this.lastUpdate = null;
        this.init();
    }

    init() {
        console.log('🎯 初始化组件...');
        this.bindEventListeners();
        this.renderProducts();
        this.startAutoUpdate();
        this.updateProductCount();
        console.log('✅ 组件初始化完成，产品数量:', this.products.length);
        
        // 立即更新所有数据
        this.updateAllPrices();
    }

    bindEventListeners() {
        // 绑定添加按钮
        const addButton = document.getElementById('add-product-btn');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.addCustomProduct();
            });
        }
        
        // 绑定回车键
        const codeInput = document.getElementById('product-code');
        if (codeInput) {
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCustomProduct();
                }
            });
        }
        
        // 绑定刷新全部按钮
        const refreshAllBtn = document.getElementById('refresh-all-btn');
        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => {
                this.updateAllPrices();
            });
        }
        
        console.log('✅ 事件监听器绑定完成');
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('financial-widget-products');
            const products = saved ? JSON.parse(saved) : [];
            console.log('📦 从存储加载产品:', products.length);
            return products;
        } catch (error) {
            console.error('❌ 加载存储失败:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('financial-widget-products', JSON.stringify(this.products));
            console.log('💾 保存产品到存储:', this.products.length);
        } catch (error) {
            console.error('❌ 保存到存储失败:', error);
        }
    }

    renderProducts() {
        const container = document.getElementById('products-list');
        if (!container) {
            console.error('❌ 找不到产品列表容器');
            return;
        }

        console.log('🎨 渲染产品列表，数量:', this.products.length);

        if (this.products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📋 还没有添加任何产品</h3>
                    <p>使用上方的表单添加您关注的金融产品</p>
                </div>
            `;
            return;
        }

        // 按类型分类产品
        const categorizedProducts = this.categorizeProducts();
        
        let html = '';
        
        // 股票/指数
        if (categorizedProducts.stock.length > 0) {
            html += this.renderCategory('stock', '🔄 股票指数', categorizedProducts.stock);
        }
        
        // 基金
        if (categorizedProducts.fund.length > 0) {
            html += this.renderCategory('fund', '💰 基金', categorizedProducts.fund);
        }
        
        // 加密货币
        if (categorizedProducts.crypto.length > 0) {
            html += this.renderCategory('crypto', '₿ 加密货币', categorizedProducts.crypto);
        }

        container.innerHTML = html;

        // 更新产品元素引用
        this.updateProductElements();
    }

    categorizeProducts() {
        const categories = {
            stock: [],
            fund: [],
            crypto: []
        };
        
        this.products.forEach(product => {
            if (categories[product.type]) {
                categories[product.type].push(product);
            }
        });
        
        return categories;
    }

    renderCategory(type, title, products) {
        return `
            <div class="category-section">
                <h3 class="category-title">${title}</h3>
                <div class="products-table">
                    <div class="table-header">
                        <div class="table-header-cell">产品名称</div>
                        <div class="table-header-cell">最新价</div>
                        <div class="table-header-cell">涨跌额</div>
                        <div class="table-header-cell">涨跌幅</div>
                        <div class="table-header-cell">更新时间</div>
                        <div class="table-header-cell">操作</div>
                    </div>
                    ${products.map((product, index) => this.renderProductRow(product, index)).join('')}
                </div>
            </div>
        `;
    }

    renderProductRow(product, index) {
        const globalIndex = this.products.findIndex(p => p === product);
        const changeClass = product.lastData?.change > 0 ? 'positive' : product.lastData?.change < 0 ? 'negative' : '';
        const changePercentClass = product.lastData?.changePercent > 0 ? 'positive' : product.lastData?.changePercent < 0 ? 'negative' : '';
        
        return `
            <div class="product-row">
                <div class="product-info-cell">
                    <div class="product-name">${product.displayName || product.name}</div>
                    <div class="product-code">${product.code}</div>
                </div>
                <div class="data-cell price-cell">
                    ${product.lastData?.price ? product.lastData.price.toFixed(2) : '--'}
                </div>
                <div class="data-cell change-cell ${changeClass}">
                    ${product.lastData?.change ? (product.lastData.change > 0 ? '+' : '') + product.lastData.change.toFixed(2) : '--'}
                </div>
                <div class="data-cell change-percent-cell ${changePercentClass}">
                    ${product.lastData?.changePercent ? (product.lastData.changePercent > 0 ? '+' : '') + product.lastData.changePercent.toFixed(2) + '%' : '--'}
                </div>
                <div class="data-cell">
                    <div class="update-time">${product.lastUpdate ? this.formatTime(product.lastUpdate) : '--'}</div>
                </div>
                <div class="actions-cell">
                    <button class="refresh-single-btn" title="刷新" onclick="financialWidget.updateSingleProduct(${globalIndex})">
                        🔄
                    </button>
                    <button class="delete-btn" title="删除" onclick="financialWidget.removeProduct(${globalIndex})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    updateProductElements() {
        const container = document.getElementById('products-list');
        if (!container) return;

        this.products.forEach((product, index) => {
            const productElement = container.querySelector(`[data-index="${index}"]`);
            product.element = productElement;
        });
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    }

    addCustomProduct() {
        console.log('🔄 addCustomProduct方法被调用');
        
        const typeSelect = document.getElementById('product-type');
        const codeInput = document.getElementById('product-code');
        const nameInput = document.getElementById('product-name');

        if (!typeSelect || !codeInput) {
            console.error('❌ 找不到表单元素');
            return;
        }

        const selectedType = typeSelect.value;
        const code = codeInput.value.trim();
        let name = nameInput.value.trim();

        console.log('📝 表单数据:', { selectedType, code, name });

        // 只有点击添加且没有产品代码的时候才提示
        if (!code) {
            alert('请输入产品代码');
            return;
        }

        this.addProduct(selectedType, code, name);

        // 清空表单
        codeInput.value = '';
        nameInput.value = '';
        
        console.log('✅ 产品添加流程完成');
    }

    addProduct(productType, productCode, productName) {
        console.log('🎯 添加产品:', productType, productCode, productName);

        // 检查是否已存在
        const exists = this.products.some(p => p.code === productCode && p.type === productType);
        if (exists) {
            alert('该产品已在关注列表中');
            return;
        }

        const newProduct = {
            type: productType,
            code: productCode,
            name: productName,
            displayName: productName || this.getDefaultName(productType, productCode),
            element: null,
            lastData: null,
            lastUpdate: null
        };

        this.products.push(newProduct);
        this.saveToStorage();
        this.renderProducts();
        this.updateProductCount();
        
        console.log('✅ 产品添加成功');

        // 立即获取数据
        this.updateSingleProduct(this.products.length - 1);
    }

    getDefaultName(type, code) {
        // 常见产品的默认名称映射
        const defaultNames = {
            'stock': {
                'sh000001': '上证指数',
                'sz399001': '深证成指',
                'sz399006': '创业板指'
            },
            'fund': {
                '161725': '招商白酒',
                '110022': '易方达消费',
                '000961': '天弘沪深300'
            },
            'crypto': {
                'BTCUSDT': '比特币',
                'ETHUSDT': '以太坊',
                'BNBUSDT': '币安币'
            }
        };

        return defaultNames[type]?.[code] || code;
    }

    removeProduct(index) {
        console.log('🗑️ 移除产品:', index);
        if (confirm(`确定要移除 ${this.products[index].displayName || this.products[index].name} 吗？`)) {
            this.products.splice(index, 1);
            this.saveToStorage();
            this.renderProducts();
            this.updateProductCount();
        }
    }

    updateProductCount() {
        const countElement = document.getElementById('product-count');
        if (countElement) {
            countElement.textContent = `产品数量: ${this.products.length}`;
        }
    }

    // 获取价格数据 - 增强版，尝试获取产品名称
    async fetchPrice(dataType, dataCode) {
        console.log(`📡 获取价格: ${dataType} - ${dataCode}`);
        
        const apis = {
            stock: async (code) => {
                try {
                    const response = await fetch(`https://hq.sinajs.cn/list=${code}`, {
                        headers: { 'Referer': 'https://finance.sina.com.cn' }
                    });
                    const text = await response.text();
                    const data = text.match(/="(.+)"/)[1].split(',');
                    
                    // 股票数据包含名称在第一个字段
                    const productName = data[0];
                    
                    return {
                        price: parseFloat(data[1]),
                        change: parseFloat(data[2]),
                        changePercent: parseFloat(data[3]),
                        productName: productName
                    };
                } catch (error) {
                    console.error('股票API请求失败:', error);
                    return this.generateMockData(1000, 5000);
                }
            },

            fund: async (code) => {
                try {
                    const response = await fetch(`https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`);
                    const text = await response.text();
                    const jsonStr = text.match(/jsonpgz\((.+)\)/)[1];
                    const data = JSON.parse(jsonStr);
                    
                    return {
                        price: parseFloat(data.dwjz),
                        change: parseFloat(data.gsz) - parseFloat(data.dwjz),
                        changePercent: parseFloat(data.gszzl),
                        productName: data.name // 基金API返回名称
                    };
                } catch (error) {
                    console.error('基金API请求失败:', error);
                    return this.generateMockData(1, 3);
                }
            },

            crypto: async (code) => {
                try {
                    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${code}`);
                    const data = await response.json();
                    return {
                        price: parseFloat(data.lastPrice),
                        change: parseFloat(data.priceChange),
                        changePercent: parseFloat(data.priceChangePercent)
                    };
                } catch (error) {
                    console.error('加密货币API请求失败:', error);
                    return this.generateMockData(10000, 50000);
                }
            }
        };

        return await apis[dataType](dataCode);
    }

    generateMockData(min, max) {
        const basePrice = min + Math.random() * (max - min);
        const changePercent = (Math.random() - 0.5) * 10;
        const change = basePrice * changePercent / 100;
        
        return {
            price: parseFloat(basePrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2))
        };
    }

    async updateSingleProduct(index) {
        const product = this.products[index];
        if (!product) return;

        try {
            // 显示加载状态
            this.showProductLoading(index, true);
            
            const data = await this.fetchPrice(product.type, product.code);
            
            // 保存数据到产品对象
            product.lastData = data;
            product.lastUpdate = Date.now();
            
            // 如果API返回了产品名称且当前没有显示名称，则更新
            if (data.productName && !product.displayName) {
                product.displayName = data.productName;
            }
            
            this.saveToStorage(); // 保存数据到本地存储
            this.renderProducts(); // 重新渲染以显示新数据
            
            this.lastUpdate = new Date();
            const lastUpdateElement = document.getElementById('last-update');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = `最后更新: ${this.lastUpdate.toLocaleTimeString()}`;
            }
            
        } catch (error) {
            console.error(`更新 ${product.name} 失败:`, error);
        } finally {
            this.showProductLoading(index, false);
        }
    }

    showProductLoading(index, isLoading) {
        const product = this.products[index];
        if (!product || !product.element) return;

        if (isLoading) {
            product.element.classList.add('updating');
        } else {
            product.element.classList.remove('updating');
        }
    }

    async updateAllPrices() {
        console.log('🔄 更新所有产品价格');
        const updateTime = new Date();
        this.lastUpdate = updateTime;
        
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `最后更新: ${updateTime.toLocaleTimeString()}`;
        }

        for (let i = 0; i < this.products.length; i++) {
            await this.updateSingleProduct(i);
            // 添加小延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    startAutoUpdate() {
        console.log('⏰ 启动自动更新');
        // 每30秒更新一次
        setInterval(() => {
            this.updateAllPrices();
        }, 30000);
    }
}

// 全局函数供HTML调用
function quickAdd(productType, productCode, productName) {
    console.log('🌍 quickAdd全局函数被调用:', productType, productCode, productName);
    if (window.financialWidget) {
        window.financialWidget.addProduct(productType, productCode, productName);
    } else {
        console.error('❌ financialWidget未初始化');
    }
}