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
        this.lastRequestTime = 0;
        this.requestInterval = 1000;
        this.isPanelExpanded = false;

        // 市场交易时间配置（北京时间）
        this.marketHours = {
            // A股交易时间
            stock: {
                isTrading: function (dataTime) {
                    const time = new Date(dataTime);
                    const day = time.getDay(); // 0=周日, 1=周一, ..., 6=周六
                    const hour = time.getHours();
                    const minute = time.getMinutes();

                    // 周末休市
                    if (day === 0 || day === 6) return false;

                    // 上午交易时间: 9:30-11:30
                    const isMorning = (hour === 9 && minute >= 30) ||
                        (hour === 10) ||
                        (hour === 11 && minute <= 30);

                    // 下午交易时间: 13:00-15:00
                    const isAfternoon = (hour === 13) ||
                        (hour === 14) ||
                        (hour === 15 && minute === 0);

                    return isMorning || isAfternoon;
                },
                closeTime: '15:00:00'
            },

            // 基金交易时间（净值估算时间）
            fund: {
                isTrading: function (dataTime) {
                    const time = new Date(dataTime);
                    const day = time.getDay();
                    const totalMinutes = time.getHours() * 60 + time.getMinutes();

                    // 周末休市
                    if (day === 0 || day === 6) return false;

                    // 基金估算时间: 9:00-15:00（包含9:00，不包含15:00）
                    // 即 9:00:00 到 14:59:59 为交易时间
                    const startMinutes = 9 * 60;   // 9:00 = 540分钟
                    const endMinutes = 15 * 60;    // 15:00 = 900分钟

                    return totalMinutes >= startMinutes && totalMinutes < endMinutes;
                },
                closeTime: '15:00:00'
            },

            // 加密货币24小时交易
            crypto: {
                isTrading: function (dataTime) {
                    return true; // 24小时交易
                },
                closeTime: null
            }
        };

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

    // 新增：请求间隔控制方法
    async waitForRequestInterval() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.requestInterval) {
            const waitTime = this.requestInterval - timeSinceLastRequest;
            console.log(`⏳ 等待 ${waitTime}ms 避免请求过快`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
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

        // 绑定添加组合按钮
        const multiaddButton = document.getElementById('add-products-btn');
        if (multiaddButton) {
            multiaddButton.addEventListener('click', () => {
                this.addCustomProducts();
            });
        }

        // 绑定回车键
        const multicodeInput = document.getElementById('products-info');
        if (multicodeInput) {
            multicodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCustomProducts();
                }
            });
        }

        // 绑定刷新全部按钮
        const refreshAllBtn = document.getElementById('refresh-all-btn');
        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => {
                this.updateAllPrices(true); // true表示跳过闭市判断
            });
        }

        // 绑定删除全部按钮
        const deleteAllBtn = document.getElementById('delete-all-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.removeAllProduct(); // true表示跳过闭市判断
            });
        }

        // 新增：面板展开/折叠事件
        this.bindPanelToggleEvents();

        console.log('✅ 事件监听器绑定完成');
    }

    // 新增：绑定面板切换事件
    bindPanelToggleEvents() {
        const panelHeader = document.getElementById('control-panel-header');
        const toggleBtn = document.getElementById('toggle-panel-btn');
        const panelContent = document.getElementById('control-panel-content');

        if (panelHeader && toggleBtn && panelContent) {
            // 头部点击事件
            panelHeader.addEventListener('click', (e) => {
                // 防止按钮点击触发两次
                if (e.target !== toggleBtn) {
                    this.togglePanel();
                }
            });

            // 按钮点击事件
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                this.togglePanel();
            });
        }
    }

    // 新增：切换面板展开/折叠
    togglePanel() {
        const panelContent = document.getElementById('control-panel-content');
        const toggleBtn = document.getElementById('toggle-panel-btn');

        if (!panelContent || !toggleBtn) return;

        this.isPanelExpanded = !this.isPanelExpanded;

        if (this.isPanelExpanded) {
            // 展开面板
            panelContent.style.display = 'block';
            // 添加动画类
            panelContent.classList.add('show');
            toggleBtn.textContent = '折叠'; //折叠
            console.log('📂 展开添加面板');
        } else {
            // 折叠面板
            panelContent.style.display = 'none';
            panelContent.classList.remove('show');
            toggleBtn.textContent = '展开'; // 展开
            console.log('📁 折叠添加面板');
        }
    }

    // 新增：程序化展开面板（在需要时调用）
    expandPanel() {
        if (!this.isPanelExpanded) {
            this.togglePanel();
        }
    }

    // 新增：程序化折叠面板
    collapsePanel() {
        if (this.isPanelExpanded) {
            this.togglePanel();
        }
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
            html += this.renderCategory('stock', '💹 股票指数', categorizedProducts.stock);
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

    // 在 renderProductRow 方法中修改时间显示部分
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
        let errorDisplay = ''; // 新增：错误信息显示
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

        // 数据列逻辑 - 只要有数据就显示，不管当前是否出错
        if (hasData) {
            const data = product.lastData;
            const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : '';
            const changePercentClass = data.changePercent > 0 ? 'positive' : data.changePercent < 0 ? 'negative' : '';

            // 根据产品类型格式化显示
            if (product.type === 'fund') {
                // 基金：价格4位小数，涨跌幅2位小数
                priceDisplay = data.price.toFixed(4);
                changeDisplay = (data.change > 0 ? '+' : '') + data.change.toFixed(4);
                changePercentDisplay = (data.changePercent > 0 ? '+' : '') + data.changePercent.toFixed(2) + '%';
            } else {
            // 股票和加密货币：价格2位小数，涨跌幅2位小数
                priceDisplay = data.price.toFixed(2);
                changeDisplay = (data.change > 0 ? '+' : '') + data.change.toFixed(2);
                changePercentDisplay = (data.changePercent > 0 ? '+' : '') + data.changePercent.toFixed(2) + '%';
            }

            // 时间显示逻辑：如果有成功时间显示成功时间
            if (product.dataTime) {
                timeDisplay = this.formatTime(product.dataTime);
            } else if (product.lastUpdate) {
                timeDisplay = this.formatTime(product.lastUpdate);
            } else {
                timeDisplay = '--';
            }

            // 检查是否闭市（仅用于显示提示）
            const isClosed = product.dataTime && !this.shouldUpdateProduct(product);
            // 在时间显示部分添加闭市提示
            if (isClosed) {
                timeDisplay += '<div class="market-closed-hint">(已闭市)</div>';
            }

            rowClass = `${changeClass} ${changePercentClass}`;
        } else {
            // 完全没有数据时显示 --
            priceDisplay = '--';
            changeDisplay = '--';
            changePercentDisplay = '--';
            timeDisplay = '--';
        }

        // 错误信息显示逻辑
        if (hasError) {
            rowClass += ' error-row';
            // 如果有错误，在时间下方显示失败信息
            const errorTime = new Date().toLocaleTimeString('zh-CN', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            errorDisplay = `<div class="error-time">(${errorTime} 更新失败)</div>`;
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
                    <div class="update-time ${hasError ? 'has-error' : ''}">
                        ${timeDisplay}
                        ${errorDisplay}
                    </div>
                </div>
                <div class="actions-cell">
                    <button class="refresh-single-btn" title="刷新" onclick="financialWidget.updateSingleProduct(${globalIndex}, true)">
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
        // todo: 如果为空，先尝试调用api，获取其名称，如果无法获取该api，则用代码作为名称
        // if (!name) {
        //     name = code;
        // }

        this.addProduct(selectedType, code, name);

        // 清空表单
        codeInput.value = '';
        nameInput.value = '';
        
        console.log('✅ 产品添加流程完成');
    }

    async addCustomProducts() {
        console.log('🔄 addCustomProducts方法被调用，批量添加产品');

        const products_info = document.getElementById('products-info')
        if (!products_info) {
            console.error('❌ 找不到表单元素')
            return;
        }

        try {
            // 预处理：移除所有首尾空格，统一处理中英文标点
            const processedText = products_info.value
                .replace(/，/g, ',')  // 中文逗号转英文逗号
                .replace(/；/g, ';')  // 中文分号转英文分号
                .trim();

            // 按分号分割产品
            const productStrings = processedText.split(';').filter(item => item.trim());

            if (productStrings.length === 0) {
                alert('没有找到有效的产品信息');
                return;
            }

            const products = [];
            const errors = [];
            const addedProducts = [];

            productStrings.forEach((productStr, index) => {
                try {
                    // 按逗号分割属性，并移除每个属性的首尾空格
                    const attributes = productStr.split(',').map(attr => attr.trim());

                    // 验证属性数量
                    if (attributes.length < 2 || attributes.length > 3) {
                        errors.push(`第${index + 1}个产品: 属性数量错误 (需要2-3个属性)`);
                        return;
                    }

                    const type = attributes[0];
                    const code = attributes[1];
                    let name = attributes[2] || ''; // 第三项可能为空

                    // 进一步处理name：如果只有空格或为空，则设为空字符串
                    name = name.trim();
                    if (name === '') {
                        name = ''; // 使用空字符串，后续会用代码作为默认名称
                    }

                    // 验证必要属性
                    if (!type) {
                        errors.push(`第${index + 1}个产品: 类型不能为空`);
                        return;
                    }

                    if (!code) {
                        errors.push(`第${index + 1}个产品: 代码不能为空`);
                        return;
                    }

                    // 验证类型是否支持
                    const validTypes = ['stock', 'fund', 'crypto'];
                    if (!validTypes.includes(type)) {
                        errors.push(`第${index + 1}个产品: 不支持的类型 "${type}" (支持: ${validTypes.join(', ')})`);
                        return;
                    }

                    products.push({
                        type: type,
                        code: code,
                        name: name
                    });

                    console.log(`✅ 解析产品 ${index + 1}:`, { type, code, name: name || '(空)' });

                } catch (error) {
                    errors.push(`第${index + 1}个产品: 解析失败 - ${error.message}`);
                }
            });

            console.log('解析到的产品:', products);
            console.log('解析错误:', errors);

            if (products.length === 0 && errors.length > 0) {
                alert('所有产品解析失败:\n' + errors.join('\n'));
                return;
            }

            // 第二步：逐个添加产品并等待完成
            let successCount = 0;
            for (const product of products) {
                try {
                    console.log(`🔄 正在添加产品: ${product.type} ${product.code}`);

                    // 等待每个产品添加和数据获取完成
                    await this.addProduct(product.type, product.code, product.name);

                    successCount++;
                    addedProducts.push(`${product.type} ${product.code}`);

                    // 可以添加更短的间隔，因为addProduct已经等待数据获取了
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (error) {
                    errors.push(`${product.type} ${product.code} 添加失败: ${error.message}`);
                }
            }

            // 显示结果
            let message = `成功添加 ${successCount} 个产品`;
            if (addedProducts.length > 0) {
                message += `\n\n已添加产品:\n${addedProducts.slice(0, 10).join('\n')}`;
                if (addedProducts.length > 10) {
                    message += `\n... 还有 ${addedProducts.length - 10} 个产品`;
                }
            }
            if (errors.length > 0) {
                message += `\n\n失败/错误 (${errors.length} 个):\n` + errors.slice(0, 5).join('\n');
                if (errors.length > 5) {
                    message += `\n... 还有 ${errors.length - 5} 个错误`;
                }
            }

            alert(message);

        } catch (error) {
            console.error('批量添加解析失败:', error);
            alert('输入格式解析失败: ' + error.message);
        }

        // 清空表单
        products_info.value = '';

        console.log('✅ 产品批量添加流程完成');

    }

    // 修改 addProduct 方法，返回 Promise
    addProduct(productType, productCode, productName) {
        return new Promise((resolve, reject) => {
            console.log('🎯 添加产品:', productType, productCode, productName);

            let finalCode = productCode;

            // 股票类型进行代码转换
            if (productType === 'stock') {
                finalCode = this.convertStockCode(productCode);
                console.log(`代码转换: ${productCode} -> ${finalCode}`);
            }

            // 检查是否已存在
            const exists = this.products.some(p => p.code === finalCode && p.type === productType);
            if (exists) {
                reject(new Error('该产品已在关注列表中'));
                return;
            }

            const newProduct = {
                type: productType,
                code: finalCode,
                name: productName,
                displayName: productName || this.getDefaultName(productType, finalCode),
                element: null,
                lastData: null,
                lastError: null,
                lastUpdate: null,
                dataTime: null
            };
            console.log('DEBUG: displayName: ', newProduct.displayName);
            console.log('DEBUG: name: ', newProduct.name);

            this.products.push(newProduct);
            this.saveToStorage();
            // this.renderProducts();
            // this.updateProductCount();

            console.log('✅ 产品添加成功');

            // 立即获取数据
            this.updateSingleProduct(this.products.length - 1)
                .then((data) => {
                    // 如果 updateSingleProduct 成功完成（包括闭市静默处理）
                    resolve(newProduct);
                })
                .catch((error) => {
                    // 只有真正的网络错误等才会进入这里
                    console.warn(`产品 ${productCode} 添加成功但数据获取失败:`, error);
                    // 产品添加成功，数据获取失败不算错误，仍然 resolve
                    resolve(newProduct);
                });
            // this.renderProducts();
            this.updateProductCount();
        });
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

        return defaultNames[type]?.[code] || '';
    }

    // 在 DynamicFinancialWidget 类中添加代码转换方法
    convertStockCode(inputCode, type = 'stock') {
        if (type !== 'stock') {
            return inputCode; // 非股票类型直接返回原代码
        }

        const code = inputCode.trim().toUpperCase();

        // 完整的指数代码映射表
        const indexCodeMap = {
            // 上证指数系列
            '000001.SH': 'sh000001', '1A0001.SH': 'sh000001', 'SH000001': 'sh000001',
            '000002.SH': 'sh000002', '1A0002.SH': 'sh000002',
            '000003.SH': 'sh000003', '1A0003.SH': 'sh000003',
            '000008.SH': 'sh000008', '1A0008.SH': 'sh000008',
            '000009.SH': 'sh000009', '1A0009.SH': 'sh000009',
            '000010.SH': 'sh000010', '1A0010.SH': 'sh000010',
            '000011.SH': 'sh000011', '1A0011.SH': 'sh000011',
            '000012.SH': 'sh000012', '1A0012.SH': 'sh000012',
            '000016.SH': 'sh000016', '1A0016.SH': 'sh000016',
            '000017.SH': 'sh000017', '1A0017.SH': 'sh000017',
            '000030.SH': 'sh000030', '1A0030.SH': 'sh000030',
            '000085.SH': 'sh000085', '1A0085.SH': 'sh000085',
            '000300.SH': 'sh000300', '1A0300.SH': 'sh000300',
            '000905.SH': 'sh000905', '1A0905.SH': 'sh000905',

            // 深证指数系列
            '399001.SZ': 'sz399001', '2A01.SZ': 'sz399001', 'SZ399001': 'sz399001',
            '399002.SZ': 'sz399002', '2A02.SZ': 'sz399002',
            '399003.SZ': 'sz399003', '2A03.SZ': 'sz399003',
            '399004.SZ': 'sz399004', '2A04.SZ': 'sz399004',
            '399005.SZ': 'sz399005', '2A05.SZ': 'sz399005',
            '399006.SZ': 'sz399006', '2A06.SZ': 'sz399006',
            '399007.SZ': 'sz399007', '2A07.SZ': 'sz399007',
            '399008.SZ': 'sz399008', '2A08.SZ': 'sz399008',
            '399009.SZ': 'sz399009', '2A09.SZ': 'sz399009',
            '399010.SZ': 'sz399010', '2A10.SZ': 'sz399010',
            '399011.SZ': 'sz399011', '2A11.SZ': 'sz399011',
            '399012.SZ': 'sz399012', '2A12.SZ': 'sz399012',
            '399013.SZ': 'sz399013', '2A13.SZ': 'sz399013',
            '399015.SZ': 'sz399015', '2A15.SZ': 'sz399015',
            '399016.SZ': 'sz399016', '2A16.SZ': 'sz399016',
            '399017.SZ': 'sz399017', '2A17.SZ': 'sz399017',
            '399018.SZ': 'sz399018', '2A18.SZ': 'sz399018',
            '399100.SZ': 'sz399100', '2A19.SZ': 'sz399100',
            '399101.SZ': 'sz399101', '2A20.SZ': 'sz399101',
            '399106.SZ': 'sz399106', '2A21.SZ': 'sz399106',
            '399107.SZ': 'sz399107', '2A22.SZ': 'sz399107',
            '399108.SZ': 'sz399108', '2A23.SZ': 'sz399108',
            '399231.SZ': 'sz399231', '2A24.SZ': 'sz399231',
            '399232.SZ': 'sz399232', '2A25.SZ': 'sz399232',

            // 行业指数
            '399317.SZ': 'sz399317', '399396.SZ': 'sz399396',
            '399437.SZ': 'sz399437', '399967.SZ': 'sz399967',
            '399986.SZ': 'sz399986', '399393.SZ': 'sz399393',
            '399995.SZ': 'sz399995', '399417.SZ': 'sz399417',
            '399998.SZ': 'sz399998', '399440.SZ': 'sz399440',
            '399441.SZ': 'sz399441', '399442.SZ': 'sz399442',
            '399806.SZ': 'sz399806', '399807.SZ': 'sz399807',
            '399808.SZ': 'sz399808', '399809.SZ': 'sz399809',
            '399810.SZ': 'sz399810', '399811.SZ': 'sz399811',
            '399812.SZ': 'sz399812', '399813.SZ': 'sz399813',
        };

        // 首先检查是否是已知的指数代码
        if (indexCodeMap[code]) {
            console.log(`指数代码转换: ${code} -> ${indexCodeMap[code]}`);
            return indexCodeMap[code];
        }

        // A股代码转换
        if (code.endsWith('.SH') || code.endsWith('.SZ')) {
            // 标准交易所代码格式 -> 腾讯财经格式
            const exchange = code.endsWith('.SH') ? 'sh' : 'sz';
            const pureCode = code.replace(/\.(SH|SZ)$/, '');
            if (code.startsWith('1B') || code.startsWith('1b')) {
                const pureCode2 = code.replace(/^(1B|1b)/, '00').replace(/\.(SH|SZ)$/, '');
                // console.log(`startsWith('1B'): ${code} -> ${pureCode2}`);
                return exchange + pureCode2;
            } else {
                return exchange + pureCode;
            }

        }

        if (code.endsWith('.SS') || code.endsWith('.SZ')) {
            // 另一种交易所代码格式
            const exchange = code.endsWith('.SS') ? 'sh' : 'sz';
            const pureCode = code.replace(/\.(SS|SZ)$/, '');
            return exchange + pureCode;
        }

        // 北证
        if (code.endsWith('.BJ') || code.endsWith('.bj')) {
            // 另一种交易所代码格式
            const exchange = 'bj';
            const pureCode = code.replace(/\.(BJ|bj)$/, '');
            return exchange + pureCode;
        }

        // 美股代码转换
        if (code.endsWith('.O') || code.endsWith('.N') || code.endsWith('.A') || code.endsWith('.B') || code.endsWith('.USI')) {
            // 美股格式: TSLA.O, AAPL.O, BABA.N 等
            // 转换为新浪财经美股格式: gb_tsla
            // 转换为腾讯财经格式：usTSLA
            const pureCode = code.replace(/\.(O|N|A|B|USI)$/, '');
            return `us${pureCode}`;
        }

        // 港股代码转换
        if (code.endsWith('.HK')) {
            // 港股格式: 00700.HK -> rt_hk00700
            // 腾讯财经格式：hk00700
            const pureCode = code.replace(/\.HK$/, '');
            return `hk${pureCode}`;
        }

        if (code.startsWith('HK')) {
            // 港股另一种格式: HK00700 -> rt_hk00700
            const pureCode = code.replace(/^HK/, '');
            return `hk${pureCode}`;
        }

        // 纯数字代码自动判断
        if (/^\d{6}$/.test(code)) {
            // 6位数字代码，根据开头判断市场
            if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) {
                return 'sh' + code; // 上证
            } else if (code.startsWith('0') || code.startsWith('2') || code.startsWith('3')) {
                return 'sz' + code; // 深证
            }
        }

        // 已经是腾讯财经格式的直接返回
        if (code.startsWith('sh') || code.startsWith('sz') ||
            code.startsWith('us') || code.startsWith('hk')) {
            return code;
        }

        // 无法识别的格式原样返回
        console.warn(`无法识别的股票代码格式: ${inputCode}, 原样返回`);
        return inputCode;
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

    removeAllProduct() {
        if (this.products.length === 0) {
            alert('当前没有产品可删除');
            return;
        }
        console.log('🗑️ 移除全部产品:');
        if (confirm(`确定要移除全部产品吗？此操作不可逆`)) {
            this.products = [];
            this.saveToStorage();
            this.renderProducts();
            this.updateProductCount();

            console.log('🗑️ 已删除全部产品');
            alert(`已成功删除全部产品`);
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
            // 完全重写股票数据获取方法，不使用CORS代理
            stock: async (code) => {
                return new Promise((resolve, reject) => {
                    console.log(`📡 获取股票数据: ${code}`);

                    const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error('请求超时'));
                    }, 8000);

                    const globalVarName = `v_${code.replace('.', '_')}`;

                    const cleanup = () => {
                        clearTimeout(timeout);
                        delete window[globalVarName];
                        if (script.parentNode) {
                            script.parentNode.removeChild(script);
                        }
                    };

                    const checkData = () => {
                        const data = window[globalVarName];
                        if (data && typeof data === 'string') {
                            cleanup();

                            try {
                                const content = data.replace(/"/g, '');
                                const items = content.split('~');

                                if (items.length >= 6) {
                                    const currentPrice = parseFloat(items[3]);
                                    const prevClose = parseFloat(items[5]);

                                    if (!isNaN(currentPrice) && !isNaN(prevClose)) {
                                        const change = currentPrice - prevClose;
                                        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

                                        // 获取数据时间（从返回数据中解析，如果没有就使用当前时间）
                                        let dataTime = new Date();
                                        // 尝试从数据中解析时间（腾讯财经数据可能包含时间信息）
                                        if (items.length > 30 && items[30]) {
                                            // 腾讯财经时间格式: 20251020161412
                                            const timeStr = items[30];
                                            if (timeStr.length === 14) {
                                                const year = timeStr.substring(0, 4);
                                                const month = timeStr.substring(4, 6);
                                                const day = timeStr.substring(6, 8);
                                                const hour = timeStr.substring(8, 10);
                                                const minute = timeStr.substring(10, 12);
                                                const second = timeStr.substring(12, 14);
                                                dataTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
                                            }
                                        }

                                        console.log(`✅ ${code} 数据获取成功:`, {
                                            name: items[1],
                                            price: currentPrice,
                                            dataTime: dataTime.toLocaleString()
                                        });
                                        console.log('productname: items[1]:', items[1], 'code: ', `股票${code}`, '||: ', items[1] || `股票${code}`)

                                        resolve({
                                            price: parseFloat(currentPrice.toFixed(2)),
                                            change: parseFloat(change.toFixed(2)),
                                            changePercent: parseFloat(changePercent.toFixed(2)),
                                            productName: items[1] || `股票${code}`,
                                            dataTime: dataTime.getTime() // 保存数据对应的时间戳
                                        });
                                        return;
                                    }
                                }
                            } catch (error) {
                                console.error('数据解析错误:', error);
                            }

                            reject(new Error('数据格式错误'));
                        } else if (data) {
                            cleanup();
                            reject(new Error('数据格式不正确'));
                        } else {
                            setTimeout(checkData, 100);
                        }
                    };

                    const script = document.createElement('script');
                    script.src = `https://qt.gtimg.cn/q=${code}`;

                    script.onload = () => {
                        console.log(`📄 ${code} Script加载完成，等待数据`);
                        setTimeout(checkData, 500);
                    };

                    script.onerror = () => {
                        cleanup();
                        reject(new Error('脚本加载失败'));
                    };

                    document.head.appendChild(script);
                });
            },

            fund: async (code) => {
                return new Promise((resolve, reject) => {
                    console.log(`📡 获取基金数据: ${code}`);

                    const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error('请求超时'));
                    }, 8000);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        delete window.jsonpgz;
                        if (script.parentNode) {
                            script.parentNode.removeChild(script);
                        }
                    };

                    window.jsonpgz = function (data) {
                        cleanup();
                        console.log('基金数据:', data);

                        if (data && typeof data === 'object') {
                            const netValue = parseFloat(data.dwjz);
                            const estimateValue = parseFloat(data.gsz);
                            const estimateChangePercent = parseFloat(data.gszzl);
                            const estimateChange = estimateValue - netValue;

                            // === 修改：使用 gztime 作为基金数据时间 ===
                            let dataTime = new Date();
                            if (data.gztime) {
                                try {
                                    // gztime 格式: "2025-10-20 15:00"
                                    const [datePart, timePart] = data.gztime.split(' ');
                                    const [year, month, day] = datePart.split('-');
                                    const [hour, minute] = timePart.split(':');

                                    dataTime = new Date(
                                        parseInt(year),
                                        parseInt(month) - 1,
                                        parseInt(day),
                                        parseInt(hour),
                                        parseInt(minute),
                                        0, 0
                                    );
                                    console.log(`基金估值时间: ${data.gztime}, 解析为:`, dataTime);
                                } catch (error) {
                                    console.error('解析基金估值时间失败:', error);
                                    // 解析失败时使用当前时间
                                }
                            }

                            resolve({
                                price: parseFloat(estimateValue.toFixed(4)),
                                change: parseFloat(estimateChange.toFixed(4)),
                                changePercent: parseFloat(estimateChangePercent.toFixed(2)),
                                productName: data.name || `基金${code}`,
                                dataTime: dataTime.getTime() // 使用估值时间
                            });
                        } else {
                            reject(new Error('基金数据格式错误'));
                        }
                    };

                    const script = document.createElement('script');
                    script.src = `https://fundgz.1234567.com.cn/js/${code}.js`;

                    script.onerror = () => {
                        cleanup();
                        reject(new Error('基金脚本加载失败'));
                    };

                    document.head.appendChild(script);
                });
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
    // 修改 updateSingleProduct 方法返回 Promise
    async updateSingleProduct(index, skipMarketCheck = false) {
        return new Promise(async (resolve, reject) => {
            const product = this.products[index];
            if (!product) {
                reject(new Error('产品不存在'));
                return;
            }

            // 手动更新时跳过闭市判断，自动更新时检查
            if (!skipMarketCheck && !this.shouldUpdateProduct(product)) {
                console.log(`⏸️ ${product.name} 已闭市，跳过自动更新`);
                // 直接 resolve，不返回任何内容
                resolve();
                return;
            }

            try {
                this.showProductLoading(index, true);

                await this.waitForRequestInterval();

                const data = await this.fetchPrice(product.type, product.code);
                console.log(`获取到 ${product.name} 的数据:`, data);

                product.lastData = data;
                product.lastUpdate = Date.now();
                product.dataTime = data.dataTime;
                product.lastError = null;

                const emptystr = ''
                console.log(`test for emptystr:`, emptystr);
                console.log(`productname:`, data.productName);
                console.log(`displayName:`, product.displayName);
                console.log(`!displayName:`, product.displayName === '');

                if (data.productName && product.displayName === '') {
                    console.log(`productname:`, data.productName);
                    product.displayName = data.productName;
                    console.log(`displayName:`, data.displayName);
                }

                this.saveToStorage();
                this.renderProducts();
                this.updateLastUpdateTime();

                // 成功时返回数据
                resolve(data);

            } catch (error) {
                console.error(`更新 ${product.name} 失败:`, error);
                product.lastError = error.message || '获取失败';
                this.saveToStorage();
                this.renderProducts();

                // 真正的错误使用 reject
                reject(error);

            } finally {
                this.showProductLoading(index, false);
            }
        });
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

    async updateAllPrices(skipMarketCheck = false) {
        console.log('🔄 更新所有产品价格');
        const updateTime = new Date();
        this.lastUpdate = updateTime;
        
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `最后更新: ${updateTime.toLocaleTimeString()}`;
        }

        for (let i = 0; i < this.products.length; i++) {
            try {
                await this.updateSingleProduct(i, skipMarketCheck);
                // 即使闭市跳过也会正常继续
            } catch (error) {
                // 只有真正的错误才会进入这里
                console.error(`更新产品 ${i} 失败:`, error);
            }
            // 添加小延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // 分类更新方法
    updateStocks() {
        console.log('🔄 自动更新股票数据');
        const stockProducts = this.products.filter(p => p.type === 'stock' && this.shouldUpdateProduct(p));
        if (stockProducts.length > 0) {
            console.log(`更新 ${stockProducts.length} 个股票产品`);
            this.updateProducts(stockProducts);
        } else {
            console.log('所有股票产品已闭市，跳过自动更新');
        }
    }

    updateFunds() {
        console.log('🔄 自动更新基金数据');
        const fundProducts = this.products.filter(p => p.type === 'fund' && this.shouldUpdateProduct(p));
        if (fundProducts.length > 0) {
            console.log(`更新 ${fundProducts.length} 个基金产品`);
            this.updateProducts(fundProducts);
        } else {
            console.log('所有基金产品已闭市，跳过自动更新');
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

    // === 新增：闭市判断方法 ===
    shouldUpdateProduct(product) {
        const nowtime = new Date();

        if (!product.dataTime) {
            return true; // 没有数据时间，继续更新
        }

        const marketConfig = this.marketHours[product.type];
        if (!marketConfig) {
            return true; // 没有配置的交易时间，继续更新
        }

        // 检查是否在交易时间
        const now_isTrading = marketConfig.isTrading(nowtime);
        const lastdata_isTrading = marketConfig.isTrading(product.dataTime);
        console.log(`${product.name} 交易状态:`, now_isTrading ? '交易中' : '已闭市');

        const isTrading = now_isTrading || (!now_isTrading && lastdata_isTrading)

        return isTrading;
    }

    // === 新增：批量产品更新方法，用于自动更新 ===
    async updateProducts(products) {
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const index = this.products.findIndex(p => p === product);
            if (index !== -1) {
                await this.updateSingleProduct(index, false); // false表示应用闭市判断
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 更新最后更新时间
        this.updateLastUpdateTime();
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