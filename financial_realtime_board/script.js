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
                <div class="table-container">
                    <div class="products-table">
                        <div class="table-header">
                            <div class="table-header-cell">产品名称</div>
                            <div class="table-header-cell">状态</div>
                            <div class="table-header-cell">最新价</div>
                            <div class="table-header-cell">涨跌额</div>
                            <div class="table-header-cell">涨跌幅</div>
                            <div class="table-header-cell">更新时间</div>
                            <div class="table-header-cell">操作</div>
                        </div>
                        ${products.map((product, index) => this.renderProductRow(product, index)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderProductRow(product, index) {
        const globalIndex = this.products.findIndex(p => p === product);

        // 检查状态
        const isLoading = product.element?.classList.contains('updating');
        const hasError = !!product.lastError;
        const hasData = product.lastData && product.lastData.price;

        let statusDisplay = '';
        let statusClass = '';
        let priceDisplay = '--';
        let changeDisplay = '--';
        let changePercentDisplay = '--';
        let timeDisplay = '--';
        let rowClass = '';

        // 状态列逻辑
        if (isLoading) {
            statusDisplay = '🔄';
            statusClass = 'status-loading';
        } else if (hasError) {
            statusDisplay = '❌';
            statusClass = 'status-failure';
        } else if (hasData && product.lastUpdate) {
            statusDisplay = '✅';
            statusClass = 'status-success';
        } else {
            statusDisplay = '❌';
            statusClass = 'status-failure';
        }

        // 数据列逻辑
        if (hasData) {
            const data = product.lastData;
            const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : '';
            const changePercentClass = data.changePercent > 0 ? 'positive' : data.changePercent < 0 ? 'negative' : '';

            priceDisplay = data.price.toFixed(2);
            changeDisplay = (data.change > 0 ? '+' : '') + data.change.toFixed(2);
            changePercentDisplay = (data.changePercent > 0 ? '+' : '') + data.changePercent.toFixed(2) + '%';

            // 时间显示逻辑：如果有更新时间就格式化显示
            if (product.lastUpdate) {
                timeDisplay = this.formatTime(product.lastUpdate);
            } else {
                timeDisplay = '数据待更新';
            }

            rowClass = `${changeClass} ${changePercentClass}`;
        } else {
            // 完全没有数据时显示 --
            priceDisplay = '--';
            changeDisplay = '--';
            changePercentDisplay = '--';
            timeDisplay = '--';
        }

        // 如果有错误，添加错误行样式
        if (hasError) {
            rowClass += ' error-row';
            // 如果是错误状态但有旧数据，在时间后面添加错误标识
            if (hasData && product.lastUpdate) {
                timeDisplay += ' (更新失败)';
            }
        }
        
        return `
            <div class="product-row ${rowClass}">
                <div class="product-info-cell">
                    <div class="product-name">${product.displayName || product.name}</div>
                    <div class="product-code">${product.code}</div>
                </div>
                <div class="status-cell ${statusClass}">
                    ${statusDisplay}
                </div>
                <div class="data-cell price-cell">
                    ${priceDisplay}
                </div>
                <div class="data-cell change-cell">
                    ${changeDisplay}
                </div>
                <div class="data-cell change-percent-cell">
                    ${changePercentDisplay}
                </div>
                <div class="data-cell">
                    <div class="update-time ${hasError ? 'error-time' : ''}">
                        ${timeDisplay}
                    </div>
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
        const now = new Date();

        // 转换为北京时间 (UTC+8)
        const beijingDate = new Date(date.getTime());
        const beijingNow = new Date(now.getTime());

        // 判断是否是今天（北京时间）
        const isToday = beijingDate.getDate() === beijingNow.getDate() &&
            beijingDate.getMonth() === beijingNow.getMonth() &&
            beijingDate.getFullYear() === beijingNow.getFullYear();

        if (isToday) {
            // 今天的数据：显示时分秒
            return `${beijingDate.getHours().toString().padStart(2, '0')}:${beijingDate.getMinutes().toString().padStart(2, '0')}:${beijingDate.getSeconds().toString().padStart(2, '0')}`;
        } else {
            // 不是今天的数据：显示年月日 时分秒
            return `${beijingDate.getFullYear()}-${(beijingDate.getMonth() + 1).toString().padStart(2, '0')}-${beijingDate.getDate().toString().padStart(2, '0')} ${beijingDate.getHours().toString().padStart(2, '0')}:${beijingDate.getMinutes().toString().padStart(2, '0')}:${beijingDate.getSeconds().toString().padStart(2, '0')}`;
        }
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

        // 如果名称为空，使用代码作为名称
        if (!name) {
            name = code;
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
            lastData: null,        // 最后一次成功数据
            lastError: null,       // 当前错误状态（null表示没有错误）
            lastUpdate: null       // 最后一次成功更新时间（null表示从未成功过）
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
                '000961': '天弘沪深300',
                '003864': '招商招旺纯债C'
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

    // 获取价格数据 - 严格模式，失败就抛出错误
    async fetchPrice(dataType, dataCode) {
        console.log(`📡 获取 ${dataType} 数据: ${dataCode}`);
        
        const apis = {
            stock: async (code) => {
                return new Promise((resolve, reject) => {
                    // 使用更稳定的JSONP实现
                    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).substr(2)}`;
                    const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error('获取失败'));
                    }, 8000);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        delete window[callbackName];
                        if (script.parentNode) {
                            script.parentNode.removeChild(script);
                        }
                    };

                    // 设置回调函数 - 处理不同的数据格式
                    window[callbackName] = (data) => {
                        cleanup();
                        console.log('JSONP回调收到数据:', data);

                        if (typeof data === 'string') {
                // 处理字符串格式的数据
                            try {
                                // 尝试解析腾讯财经格式
                                if (data.includes('~')) {
                                    const items = data.split('~');
                                    if (items.length >= 6) {
                                        resolve({
                                            price: parseFloat(items[3]) || 0,
                                            change: parseFloat(items[4]) || 0,
                                            changePercent: parseFloat(items[5]) || 0,
                                            productName: items[1] || `股票${code}`
                                        });
                                        return;
                                    }
                                }

                                // 尝试解析新浪财经格式
                                if (data.includes(',')) {
                                    const items = data.split(',');
                                    if (items.length >= 4) {
                                        resolve({
                                            price: parseFloat(items[1]) || 0,
                                            change: parseFloat(items[2]) || 0,
                                            changePercent: parseFloat(items[3]) || 0,
                                            productName: items[0] || `股票${code}`
                                        });
                                        return;
                                    }
                                }
                            } catch (e) {
                                console.log('数据解析失败:', e);
                            }
                        }

                        reject(new Error('数据格式错误'));
                    };

                    const script = document.createElement('script');

                    // 使用HTTPS源，避免混合内容问题
                    const sources = [
                        `https://proxy.cors.sh/http://qt.gtimg.cn/q=${code}&callback=${callbackName}`,
                        `https://qt.gtimg.cn/q=${code}?callback=${callbackName}`,
                        `https://hq.sinajs.cn/list=${code}&callback=${callbackName}`
                    ];

                    let currentSource = 0;

                    const tryNextSource = () => {
                        if (currentSource >= sources.length) {
                            cleanup();
                            reject(new Error('获取失败'));
                            return;
                        }

                        script.src = sources[currentSource];
                        console.log(`尝试JSONP源 ${currentSource + 1}:`, script.src);

                        script.onload = () => {
                            // 如果onload触发但没有回调，说明格式不对
                            setTimeout(() => {
                                if (window[callbackName]) {
                                    currentSource++;
                                    tryNextSource();
                                }
                            }, 1000);
                        };

                        script.onerror = () => {
                            console.log(`JSONP源 ${currentSource + 1} 加载失败`);
                            currentSource++;
                            tryNextSource();
                        };

                        document.head.appendChild(script);
                    };

                    tryNextSource();
                });
            },

            fund: async (code) => {
                const proxies = [
                    'https://api.allorigins.win/raw?url=',
                    'https://cors-proxy.htmldriven.com/?url=',
                    'https://cors.bridged.cc/'
                ];

                for (let proxy of proxies) {
                    try {
                        const targetUrl = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
                        console.log(`尝试基金代理: ${proxy}`);

                        const response = await fetch(proxy + encodeURIComponent(targetUrl));

                        if (!response.ok) {
                            console.log(`基金代理响应状态: ${response.status}`);
                            continue;
                        }

                        const text = await response.text();
                        console.log('基金API响应:', text.substring(0, 100));

                        const match = text.match(/jsonpgz\((.+)\)/);
                        if (!match) {
                            console.log('基金JSONP格式不匹配');
                            continue;
                        }

                        const data = JSON.parse(match[1]);
                        console.log('解析后的基金数据:', data);

                        if (!data.dwjz || !data.gsz) {
                            throw new Error('基金数据不完整');
                        }

                        return {
                            price: parseFloat(data.dwjz),
                            change: parseFloat(data.gsz) - parseFloat(data.dwjz),
                            changePercent: parseFloat(data.gszzl),
                            productName: data.name
                        };

                    } catch (error) {
                        console.log(`基金代理失败:`, error.message);
                        continue;
                    }
                }

                throw new Error('获取失败');
            },

            crypto: async (code) => {
                try {
                    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${code}`);
                    if (!response.ok) {
                        throw new Error(`API响应状态: ${response.status}`);
                    }
                    const data = await response.json();

                    if (!data.lastPrice) {
                        throw new Error('加密货币数据不完整');
                    }

                    return {
                        price: parseFloat(data.lastPrice),
                        change: parseFloat(data.priceChange),
                        changePercent: parseFloat(data.priceChangePercent)
                    };
                } catch (error) {
                    throw new Error(`加密货币API失败: ${error.message}`);
                }
            }
        };

        const result = await apis[dataType](dataCode);
        if (!result) {
            throw new Error(`无法获取 ${dataType} 数据`);
        }
        return result;
    }

    // 通用的代理请求方法
    async fetchWithProxies(url, parser, headers = {}) {
        const proxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/'
        ];

        for (let proxy of proxies) {
            try {
                console.log(`尝试代理: ${proxy}`);
                const response = await fetch(proxy + encodeURIComponent(url), { headers });

                if (!response.ok) {
                    console.log(`代理响应状态: ${response.status}`);
                    continue;
                }

                const text = await response.text();
                const data = parser(text);

                if (data) {
                    console.log('成功获取数据');
                    return data;
                }

            } catch (error) {
                console.log(`代理失败:`, error.message);
                continue;
            }
        }

        return null;
    }

    // 在 updateSingleProduct 方法中修改错误处理逻辑
    async updateSingleProduct(index) {
        const product = this.products[index];
        if (!product) return;

        try {
            this.showProductLoading(index, true);
            
            const data = await this.fetchPrice(product.type, product.code);
            console.log(`获取到 ${product.name} 的数据:`, data);
            
            // 保存成功的数据，并更新时间
            product.lastData = data;
            product.lastUpdate = Date.now();
            product.lastError = null; // 清除错误状态

            if (data.productName && !product.displayName) {
                product.displayName = data.productName;
            }
            
            this.saveToStorage();
            this.renderProducts();
            
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error(`更新 ${product.name} 失败:`, error);

            // 关键修改：只保存错误信息，不修改已有的成功数据
            // 如果之前有成功数据，就保留；如果没有，就保持null
            product.lastError = error.message || '获取失败';

            // 重要：不修改 lastData 和 lastUpdate，保留上次成功的数据
            // 只有在从未成功过的情况下，才保持null状态

            this.saveToStorage();
            this.renderProducts();

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

        // 立即重新渲染以显示加载状态
        this.renderProducts();
    }

    showProductError(index, errorMessage) {
        const product = this.products[index];
        if (!product.element) return;

        // 在价格位置显示错误信息
        const priceElement = product.element.querySelector('.price-cell');
        if (priceElement) {
            priceElement.textContent = '获取失败';
            priceElement.style.color = '#ff4d4f';
        }

        // 在其他数据位置显示错误状态
        const changeElement = product.element.querySelector('.change-cell');
        const changePercentElement = product.element.querySelector('.change-percent-cell');

        if (changeElement) changeElement.textContent = '--';
        if (changePercentElement) changePercentElement.textContent = '--';
    }

    updateLastUpdateTime() {
        this.lastUpdate = new Date();
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `最后更新: ${this.lastUpdate.toLocaleTimeString()}`;
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

    // 分类更新方法
    updateStocks() {
        console.log('🔄 自动更新股票数据');
        const stockProducts = this.products.filter(p => p.type === 'stock');
        if (stockProducts.length > 0) {
            console.log(`更新 ${stockProducts.length} 个股票产品`);
            this.updateProducts(stockProducts);
        }
    }

    updateFunds() {
        console.log('🔄 自动更新基金数据');
        const fundProducts = this.products.filter(p => p.type === 'fund');
        if (fundProducts.length > 0) {
            console.log(`更新 ${fundProducts.length} 个基金产品`);
            this.updateProducts(fundProducts);
        }
    }

    updateCryptos() {
        console.log('🔄 自动更新加密货币数据');
        const cryptoProducts = this.products.filter(p => p.type === 'crypto');
        if (cryptoProducts.length > 0) {
            console.log(`更新 ${cryptoProducts.length} 个加密货币产品`);
            this.updateProducts(cryptoProducts);
        }
    }

    // 通用产品更新方法
    async updateProducts(products) {
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const index = this.products.findIndex(p => p === product);
            if (index !== -1) {
                await this.updateSingleProduct(index);
                // 添加小延迟避免请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 更新最后更新时间
        this.updateLastUpdateTime();
    }

    startAutoUpdate() {
        console.log('⏰ 启动自动更新');

        // 股票 - 波动大，10分钟更新一次 (10 * 60 * 1000 = 600000ms)
        setInterval(() => {
            this.updateStocks();
        }, 600000);

        // 加密货币 - 波动大，10分钟更新一次
        setInterval(() => {
            this.updateCryptos();
        }, 600000);

        // 基金 - 波动小，30分钟更新一次 (30 * 60 * 1000 = 1800000ms)
        setInterval(() => {
            this.updateFunds();
        }, 1800000);

        console.log('✅ 自动更新计划已设置: 股票/加密货币10分钟 | 基金30分钟');
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