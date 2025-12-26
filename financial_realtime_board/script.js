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
        this.sortState = this.loadSortState();

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
        this.updateAllPrices(true);
    }

    isTrading(type, dataTime, code) {
        const time = new Date(dataTime);

        const istradingtime = {
            stock: (time, code) => {
                const day = time.getDay(); // 0=周日, 1=周一, ..., 6=周六
                const totalMinutes = time.getHours() * 60 + time.getMinutes();

                // 周末休市
                if (day === 0 || day === 6) return false;

                if (code.startsWith('hk')) {
                    // 香港 交易时间: 9:30-12:00, 13:00-16:00
                    const isMorning = totalMinutes >= (9 * 60 + 30) && totalMinutes < (12 * 60);
                    const isAfternoon = totalMinutes >= (13 * 60) && totalMinutes < (16 * 60);
                    return isMorning || isAfternoon;

                } else if (code.startsWith('us')) {
                    // 纽约 交易时间: 纽约 9:30-16:00
                    const isMorning = totalMinutes >= (9 * 60 + 30) && totalMinutes < (16 * 60);
                    return isMorning;

                } else if (code.startsWith('sh') || code.startsWith('sz')) {
                    // 大陆 交易时间: 9:30-11:30， 13:00-15:00
                    const isMorning = totalMinutes >= (9 * 60 + 30) && totalMinutes < (11 * 60 + 30);
                    const isAfternoon = totalMinutes >= (13 * 60) && totalMinutes < (15 * 60);
                    return isMorning || isAfternoon;

                } else {
                    // 若未匹配到交易市场，默认交易中
                    return true;
                }
            },
            fund: (time, code) => {
                const day = time.getDay();
                const totalMinutes = time.getHours() * 60 + time.getMinutes();

                // 周末休市
                if (day === 0 || day === 6) return false;

                // 基金估算时间: 9:00-15:00（包含9:00，不包含15:00）
                return totalMinutes >= (9 * 60) && totalMinutes < (15 * 60);
            },
            crypto: (time, code) => {
                // 加密货币24h交易
                return true;
            }
        }

        // 检查类型是否支持
        if (!istradingtime[type]) {
            console.warn(`未知的产品类型: ${type}，默认返回交易中`);
            return true;
        }

        const result = istradingtime[type](time, code);
        return result;
    }


    // ========== 从缓存加载 & 添加到缓存： 产品数据和排序状态 ==========
    // 加载产品
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('financial-widget-products');
            const products = saved ? JSON.parse(saved) : [];

            // 确保每个产品都有 pinned 和 pinTime 属性
            products.forEach(product => {
                if (product.pinned === undefined) {
                    product.pinned = false;
                }
                if (product.pinned && product.pinTime === undefined) {
                    // 对于已置顶但没有时间戳的产品，设置一个默认时间戳
                    product.pinTime = Date.now();
                }
            });

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

    // 加载排序状态
    loadSortState() {
        try {
            const saved = localStorage.getItem('financial-widget-sort-state');
            return saved ? JSON.parse(saved) : {
                stock: { field: null, direction: null },
                fund: { field: null, direction: null },
                crypto: { field: null, direction: null }
            };
        } catch (error) {
            console.error('❌ 加载排序状态失败:', error);
            return {
                stock: { field: null, direction: null },
                fund: { field: null, direction: null },
                crypto: { field: null, direction: null }
            };
        }
    }

    // 保存排序状态
    saveSortState() {
        try {
            localStorage.setItem('financial-widget-sort-state', JSON.stringify(this.sortState));
        } catch (error) {
            console.error('❌ 保存排序状态失败:', error);
        }
    }


    // ========== 绑定各功能按钮 ==========
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

        // 绑定面板展开/折叠事件
        this.bindPanelToggleEvents();

        // 绑定排序事件
        this.bindSortEvents();

        // 绑定提取产品列表按钮
        const extractBtn = document.getElementById('extract-products-btn');
        if (extractBtn) {
            extractBtn.addEventListener('click', () => {
                this.extractProductsList();
            });
        }

        console.log('✅ 事件监听器绑定完成');
    }

    // ========== 添加面板展开/折叠功能 ==========
    // 绑定面板切换事件
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

    // 切换面板展开/折叠
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

    // 程序化展开面板（在需要时调用）
    expandPanel() {
        if (!this.isPanelExpanded) {
            this.togglePanel();
        }
    }

    // 程序化折叠面板
    collapsePanel() {
        if (this.isPanelExpanded) {
            this.togglePanel();
        }
    }

    // ========= 提取产品列表功能 ==========
    // 提取当前产品列表
    extractProductsList() {
        console.log('📋 提取当前产品列表');

        if (this.products.length === 0) {
            this.showExtractResult('暂无产品');
            // alert('当前没有产品可提取');
            return;
        }

        try {
            // 按类型分类产品
            const categorizedProducts = {
                stock: [],
                fund: [],
                crypto: []
            };

            // 按产品类型分类，保持产品在全局数组中的原始顺序
            this.products.forEach(product => {
                if (categorizedProducts[product.type]) {
                    categorizedProducts[product.type].push(product);
                }
            });

            // 构建输出字符串
            const outputParts = [];

            // 按照股票、基金、加密货币的顺序输出
            ['stock', 'fund', 'crypto'].forEach(type => {
                const products = categorizedProducts[type];
                if (products.length > 0) {
                    products.forEach(product => {
                        const displayName = product.displayName || product.name || '';
                        // 确保显示名称没有逗号和分号
                        const safeDisplayName = displayName.replace(/[,;]/g, '');
                        outputParts.push(`${type}, ${product.code}, ${safeDisplayName}`);
                    });
                }
            });

            // 用分号连接所有产品
            const outputText = outputParts.join('; ');

            // 显示在文本框中
            this.showExtractResult(outputText);

            // 复制到剪贴板
            this.copyToClipboard(outputText);

            console.log('✅ 产品列表已提取:', outputText);

        } catch (error) {
            console.error('❌ 提取产品列表失败:', error);
            this.showExtractResult('提取失败，请重试');
        }
    }

    // 显示提取结果
    showExtractResult(text) {
        const outputElement = document.getElementById('products-output');
        if (outputElement) {
            outputElement.value = text;
            // 自动选中文本以便复制
            outputElement.select();
            outputElement.setSelectionRange(0, text.length);
        }
    }

    // 复制到剪贴板
    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log('📋 已复制到剪贴板');

                // 显示成功提示（可选）
                const extractBtn = document.getElementById('extract-products-btn');
                if (extractBtn) {
                    const originalText = extractBtn.textContent;
                    extractBtn.textContent = '✓ 已复制';
                    extractBtn.style.background = '#52c41a';

                    // 2秒后恢复原状
                    setTimeout(() => {
                        extractBtn.textContent = originalText;
                        extractBtn.style.background = '';
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('❌ 复制到剪贴板失败:', err);
                // 降级方案：使用旧的execCommand方法
                this.fallbackCopyToClipboard(text);
            });
    }

    // 复制到剪贴板的降级方案
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('📋 使用降级方案复制成功');
            } else {
                console.error('❌ 降级方案复制失败');
                // alert('复制失败，请手动复制文本框中的内容');
            }
        } catch (err) {
            console.error('❌ 降级方案复制出错:', err);
            // alert('复制失败，请手动复制文本框中的内容');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    // ========= 产品置顶功能 ==========
    // 切换置顶状态
    togglePin(index) {
        const product = this.products[index];
        if (!product) return;

        if (!product.pinned) {
            // 置顶操作：找到当前置顶产品的最新时间戳
            const pinnedProducts = this.products.filter(p => p.pinned);
            const maxPinTime = pinnedProducts.length > 0
                ? Math.max(...pinnedProducts.map(p => p.pinTime || 0))
                : 0;

            // 设置置顶时间戳（比当前最大的时间戳稍大）
            product.pinTime = maxPinTime + 1;
            product.pinned = true;
        } else {
            // 取消置顶
            product.pinned = false;
            product.pinTime = null;
        }

        this.saveToStorage();
        this.renderProducts();

        console.log(`📌 ${product.displayName || product.name} ${product.pinned ? '置顶' : '取消置顶'}`);
    }

    // ========= 手动排序功能 ==========
    // 移动产品位置（基于当前显示顺序）
    moveProduct(globalIndex, direction) {
        console.log(`🔄 尝试${direction === 'up' ? '上移' : '下移'}产品，全局索引: ${globalIndex}`);

        // 获取当前产品
        const product = this.products[globalIndex];
        if (!product) {
            console.error('无效的产品索引');
            return false;
        }

        const category = product.type;
        const sortState = this.sortState[category];

        // 1. 获取当前分类下所有产品（按当前显示顺序）
        let displayOrder = this.sortProducts(category, sortState.field, sortState.direction);

        // 2. 在当前显示顺序中找到该产品的索引
        const displayIndex = displayOrder.findIndex(p => p === product);
        if (displayIndex === -1) {
            console.error('在产品显示列表中找不到该产品');
            return false;
        }

        // 3. 检查边界
        if (direction === 'up' && displayIndex === 0) {
            console.log('已在最顶部，无法上移');
            return false;
        }

        if (direction === 'down' && displayIndex === displayOrder.length - 1) {
            console.log('已在最底部，无法下移');
            return false;
        }

        // 4. 确定要交换的产品
        const targetDisplayIndex = direction === 'up' ? displayIndex - 1 : displayIndex + 1;
        const targetProduct = displayOrder[targetDisplayIndex];

        console.log(`移动前: ${product.displayName} (显示位置: ${displayIndex}) ↔ ${targetProduct.displayName} (显示位置: ${targetDisplayIndex})`);

        // 5. 关键：基于当前显示顺序，重新构建全局数组顺序
        // 首先，从全局数组中移除当前分类的所有产品
        // const nonCategoryProducts = this.products.filter(p => p.type !== category);

        // 6. 在当前分类的显示顺序中交换两个产品的位置
        [displayOrder[displayIndex], displayOrder[targetDisplayIndex]] =
            [displayOrder[targetDisplayIndex], displayOrder[displayIndex]];

        // 7. 将交换后的分类产品与非分类产品合并，重建全局数组
        // 需要保持非分类产品的相对位置不变
        const newProducts = [];
        let categoryIndex = 0;

        // 按照原始全局数组的顺序，逐个重建
        for (const p of this.products) {
            if (p.type === category) {
                // 如果是当前分类的产品，使用交换后的顺序
                newProducts.push(displayOrder[categoryIndex]);
                categoryIndex++;
            } else {
                // 如果不是当前分类的产品，保持原位置
                newProducts.push(p);
            }
        }

        // 8. 更新全局数组
        this.products = newProducts;

        // 9. 重置所有排序和置顶状态
        this.resetAllSortAndPinStates();

        // 10. 保存并重新渲染
        this.saveToStorage();
        this.renderProducts();

        console.log(`📊 手动排序完成: ${product.displayName || product.name} ${direction === 'up' ? '上移' : '下移'}`);
        return true;
    }

    // 重置所有排序和置顶状态
    resetAllSortAndPinStates() {
        // 重置所有产品的置顶状态
        this.products.forEach(product => {
            product.pinned = false;
            product.pinTime = null;
        });

        // 重置排序状态
        this.sortState = {
            stock: { field: null, direction: null },
            fund: { field: null, direction: null },
            crypto: { field: null, direction: null }
        };

        // 保存排序状态
        this.saveSortState();

        console.log('🔄 已重置所有排序和置顶状态');
    }

    // ========= 产品排序功能 ==========
    // 绑定排序事件
    bindSortEvents() {
        // 使用事件委托处理表头点击
        document.addEventListener('click', (e) => {
            const sortableElement = e.target.closest('.sortable');
            if (sortableElement) {
                const category = sortableElement.dataset.category;
                const field = sortableElement.dataset.field;

                this.handleSort(category, field);
            }
        });
    }

    // 处理表头点击排序
    handleSort(category, field) {
        const currentState = this.sortState[category];

        // 循环：null -> asc -> desc -> null
        let newDirection = null;
        if (!currentState.field || currentState.field !== field) {
            // 点击新列，默认升序
            newDirection = 'asc';
        } else {
            // 点击同一列，循环切换
            if (!currentState.direction) {
                newDirection = 'asc';
            } else if (currentState.direction === 'asc') {
                newDirection = 'desc';
            } else {
                newDirection = null;
            }
        }

        // 更新排序状态
        this.sortState[category] = {
            field: newDirection ? field : null,
            direction: newDirection
        };

        this.saveSortState();
        this.renderProducts();

        console.log(`🔄 ${category} 排序: ${field} ${newDirection || '无排序'}`);
    }

    // 修改排序方法以支持置顶
    sortProducts(category, field, direction) {
        const products = this.products.filter(p => p.type === category);

        // 分离置顶产品和普通产品
        const pinnedProducts = products.filter(p => p.pinned);
        const normalProducts = products.filter(p => !p.pinned);

        if (!direction) {
            // 不排序，恢复原始顺序
            // 置顶产品按置顶时间倒序（新置顶在前），普通产品按添加顺序
            const sortedPinnedProducts = pinnedProducts.sort((a, b) => {
                const timeA = a.pinTime || 0;
                const timeB = b.pinTime || 0;
                return timeB - timeA; // 倒序：新置顶在前
            });
            return [...sortedPinnedProducts, ...normalProducts];
        }

        // 对普通产品进行排序
        const sortedNormalProducts = normalProducts.sort((a, b) => {
            let valueA, valueB;

            // 处理名称列的特殊情况
            if (field === 'displayName') {
                // 按显示名称排序，支持中文拼音
                valueA = a.displayName || a.name || a.code || '';
                valueB = b.displayName || b.name || b.code || '';

                // 使用 localeCompare 支持中文拼音排序
                return direction === 'asc' 
                    ? valueA.localeCompare(valueB, 'zh-CN')
                    : valueB.localeCompare(valueA, 'zh-CN');
            } else if (field === 'code') {
                // 按代码排序
                valueA = a.code || '';
                valueB = b.code || '';

                let result = 0;
                if (valueA < valueB) result = -1;
                if (valueA > valueB) result = 1;
                return direction === 'desc' ? -result : result;
            } else {
                // 其他数据列
                valueA = a.lastData ? a.lastData[field] : (field === 'price' ? 0 : -Infinity);
                valueB = b.lastData ? b.lastData[field] : (field === 'price' ? 0 : -Infinity);

                // 处理空值
                if (valueA == null) valueA = direction === 'asc' ? -Infinity : Infinity;
                if (valueB == null) valueB = direction === 'asc' ? -Infinity : Infinity;

                let result = 0;
                if (valueA < valueB) result = -1;
                if (valueA > valueB) result = 1;

                return direction === 'desc' ? -result : result;
            }
        });

        // 置顶产品按置顶时间倒序在前，排序后的普通产品在后
        const sortedPinnedProducts = pinnedProducts.sort((a, b) => {
            const timeA = a.pinTime || 0;
            const timeB = b.pinTime || 0;
            return timeB - timeA; // 倒序：新置顶在前
        });

        // 置顶产品在前，排序后的普通产品在后
        return [...pinnedProducts, ...sortedNormalProducts];
    }


    // ============== 添加和删除产品 ==============
    // 添加某个具体产品
    addProduct(productType, productCode, productName) {
        return new Promise((resolve, reject) => {
            console.log('🎯 添加产品:', productType, productCode, productName);

            let finalCode = productCode;

            // 股票类型进行代码转换
            if (productType === 'stock') {
                finalCode = this.convertStockCode(productCode);
                // console.log(`代码转换: ${productCode} -> ${finalCode}`);
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
                dataTime: null,
                pinned: false, // 默认未置顶
                pinTime: null, // 置顶时间
                isTrading: true // 是否在交易时间，每次更新价格后更新该属性，并用于显示
            };
            // console.log('DEBUG: displayName: ', newProduct.displayName);
            // console.log('DEBUG: name: ', newProduct.name);

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

    // 用户添加单个产品
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

    // 用户添加多个产品
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

    // 常见产品的默认名称映射
    getDefaultName(type, code) {
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

    // 股票代码转换为腾讯api标准格式
    convertStockCode(inputCode, type = 'stock') {
        if (type !== 'stock') {
            return inputCode; // 非股票类型直接返回原代码
        }

        const code = inputCode.trim().toUpperCase();

        // 完整的指数代码映射表
        const indexCodeMap = {
            // 上证指数系列
            '1A0001.SH': 'sh000001', 'SH000001': 'sh000001',
            '1A0002.SH': 'sh000002',
            '1A0003.SH': 'sh000003',
            '1A0008.SH': 'sh000008',
            '1A0009.SH': 'sh000009',
            '1A0010.SH': 'sh000010',
            '1A0011.SH': 'sh000011',
            '1A0012.SH': 'sh000012',
            '1A0016.SH': 'sh000016',
            '1A0017.SH': 'sh000017',
            '1A0030.SH': 'sh000030',
            '1A0085.SH': 'sh000085',
            '1A0300.SH': 'sh000300',
            '1A0905.SH': 'sh000905',

            // 深证指数系列
            '2A01.SZ': 'sz399001', 'SZ399001': 'sz399001',
            '2A02.SZ': 'sz399002',
            '2A03.SZ': 'sz399003',
            '2A04.SZ': 'sz399004',
            '2A05.SZ': 'sz399005',
            '2A06.SZ': 'sz399006',
            '2A07.SZ': 'sz399007',
            '2A08.SZ': 'sz399008',
            '2A09.SZ': 'sz399009',
            '2A10.SZ': 'sz399010',
            '2A11.SZ': 'sz399011',
            '2A12.SZ': 'sz399012',
            '2A13.SZ': 'sz399013',
            '2A15.SZ': 'sz399015',
            '2A16.SZ': 'sz399016',
            '2A17.SZ': 'sz399017',
            '2A18.SZ': 'sz399018',
            '2A19.SZ': 'sz399100',
            '2A20.SZ': 'sz399101',
            '2A21.SZ': 'sz399106',
            '2A22.SZ': 'sz399107',
            '2A23.SZ': 'sz399108',
            '2A24.SZ': 'sz399231',
            '2A25.SZ': 'sz399232',
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

    // 删除单个产品
    removeProduct(index) {
        console.log('🗑️ 移除产品:', index);
        this.products.splice(index, 1);
        this.saveToStorage();
        this.renderProducts();
        this.updateProductCount();
    }

    // 删除全部产品
    removeAllProduct() {
        if (this.products.length === 0) {
            alert('当前没有产品可删除');
            return;
        }
        console.log('🗑️ 移除全部产品:');
        this.products = [];
        this.saveToStorage();
        this.renderProducts();
        this.updateProductCount();
        console.log('🗑️ 已删除全部产品');
        alert(`已成功删除全部产品`);

    }

    // 更新产品数量
    updateProductCount() {
        const countElement = document.getElementById('product-count');
        if (countElement) {
            countElement.textContent = `产品数量: ${this.products.length}`;
        }
    }


    // ============== 更新产品实时价格 ==================
    // 启动产品自动更新功能
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

    // 请求间隔控制方法
    async waitForRequestInterval() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.requestInterval) {
            const waitTime = this.requestInterval - timeSinceLastRequest;
            // console.log(`⏳ 等待 ${waitTime}ms 避免请求过快`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    // 闭市判断方法
    shouldUpdateProduct(product) {
        let nowtime = new Date();
        if (product.code.startsWith('us')) {
            nowtime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
        }
        // console.log('now time:', nowtime);
        // for debug
        const time2 = new Date(nowtime);
        const day = time2.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const hour = time2.getHours();
        const minute = time2.getMinutes();
        const second = time2.getSeconds();
        // console.log('用来判断是否开市的时间:', day, ', ', hour, ',', minute);

        if (!product.dataTime) {
            return true; // 没有数据时间，继续更新
        }

        // const marketConfig = this.marketHours[product.type];
        // if (!marketConfig) {
        //     return true; // 没有配置的交易时间，继续更新
        // }

        // 检查是否在交易时间
        // const now_isTrading = marketConfig.isTrading(nowtime, product.code);
        // const lastdata_isTrading = marketConfig.isTrading(product.dataTime, product.code);
        const now_isTrading = this.isTrading(product.type, nowtime, product.code);
        const lastdata_isTrading = this.isTrading(product.type, product.dataTime, product.code);
        console.log(`${product.code} 交易状态:`, now_isTrading ? '交易中' : '已闭市');

        const isTrading = now_isTrading || (!now_isTrading && lastdata_isTrading)

        return isTrading;
    }

    // 获取特定产品的价格数据 - 严格模式，失败就抛出错误
    async fetchPrice(dataType, dataCode) {
        // console.log(`📡 获取 ${dataType} 数据: ${dataCode}`);
        
        const apis = {
            // 完全重写股票数据获取方法，不使用CORS代理
            stock: async (code) => {
                return new Promise((resolve, reject) => {
                    // console.log(`📡 获取股票数据: ${code}`);

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
                                            // console.log(`${code} return time:`,items[30],';length:',items[30].length)
                                            const timeStr = items[30];
                                            if (timeStr.length === 14) {
                                                // 大陆 20251020161412
                                                const year = timeStr.substring(0, 4);
                                                const month = timeStr.substring(4, 6);
                                                const day = timeStr.substring(6, 8);
                                                const hour = timeStr.substring(8, 10);
                                                const minute = timeStr.substring(10, 12);
                                                const second = timeStr.substring(12, 14);
                                                dataTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
                                            } else if (timeStr.length === 19) {
                                                // 港股 2025/10/24 18:31:15, 美股 2025-10-24 16:00:02
                                                dataTime = new Date(timeStr);
                                                // console.log('new date:', dataTime.toLocaleString());
                                            }
                                            
                                        }

                                        // console.log(`✅ ${code} 数据获取成功:`, {
                                        //     name: items[1],
                                        //     price: currentPrice,
                                        //     dataTime: dataTime.toLocaleString()
                                        // });
                                        // console.log('productname: items[1]:', items[1], 'code: ', `股票${code}`, '||: ', items[1] || `股票${code}`)

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
                        // console.log(`📄 ${code} Script加载完成，等待数据`);
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
                    // console.log(`📡 获取基金数据: ${code}`);

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
                        // console.log('基金数据:', data);

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
                                    // console.log(`基金估值时间: ${data.gztime}, 解析为:`, dataTime);
                                } catch (error) {
                                    console.error('解析基金估值时间失败:', error);
                                    // 解析失败时使用当前时间
                                }
                            }

                            resolve({
                                price: parseFloat(netValue.toFixed(4)),
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

    // 更新单个产品的实时价格
    async updateSingleProduct(index, skipMarketCheck = false) {
        return new Promise(async (resolve, reject) => {
            const product = this.products[index];
            if (!product) {
                reject(new Error('产品不存在'));
                return;
            }

            console.log(`UpdateSingleProduct: ${product.type} ${product.code}-${product.displayName}`);
            const is_open = this.shouldUpdateProduct(product);
            product.isTrading = is_open;
            // console.log('is_trading:', product.isTrading);

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

                product.lastData = data;
                product.lastUpdate = Date.now();
                product.dataTime = data.dataTime;
                product.lastError = null;

                if (data.productName && product.displayName === '') {
                    // console.log(`productname:`, data.productName);
                    product.displayName = data.productName;
                    console.log(`use product name as displayName:`, product.displayName);
                }

                console.log(`获取到 ${product.displayName} 的数据:`, data);

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

    // 批量产品更新方法，用于分类自动更新
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

    // 分类自动更新方法
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

    // 初始化/手动更新所有产品实时价格
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

    // 显示加载信息
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

    // 更新产品最新价格时间
    updateLastUpdateTime() {
        this.lastUpdate = new Date();
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `最后更新: ${this.lastUpdate.toLocaleTimeString()}`;
        }
    }


    // ========== 渲染产品列表 ==========
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

    // 渲染分类表格
    renderCategory(type, title, products) {
        const sortState = this.sortState[type];
        const sortedProducts = this.sortProducts(type, sortState.field, sortState.direction);

        return `
            <div class="category-section">
                <h3 class="category-title">${title}</h3>
                <div class="table-container">
                    <div class="products-table">
                        <div class="table-header">
                            <div class="table-header-cell name-header-cell">
                                <div class="name-header-content">
                                    <span class="name-sortable sortable" data-category="${type}" data-field="displayName">
                                        产品名称${this.getSortIndicator(type, 'displayName')}
                                    </span>
                                    <span class="code-sortable sortable" data-category="${type}" data-field="code">
                                        代码${this.getSortIndicator(type, 'code')}
                                    </span>
                                </div>
                            </div>
                            <div class="table-header-cell">状态</div>
                            <div class="table-header-cell sortable" data-category="${type}" data-field="price">
                                最新价${this.getSortIndicator(type, 'price')}
                            </div>
                            <div class="table-header-cell sortable" data-category="${type}" data-field="change">
                                涨跌额${this.getSortIndicator(type, 'change')}
                            </div>
                            <div class="table-header-cell sortable" data-category="${type}" data-field="changePercent">
                                涨跌幅${this.getSortIndicator(type, 'changePercent')}
                            </div>
                            <div class="table-header-cell">更新时间</div>
                            <div class="table-header-cell">操作</div>
                        </div>
                        ${sortedProducts.map((product, index) => {
            const globalIndex = this.products.findIndex(p => p === product);
            return this.renderProductRow(product, globalIndex);
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 获取排序指示器图标
    getSortIndicator(category, field) {
        const sortState = this.sortState[category];

        if (sortState.field !== field) {
            return '<span class="sort-indicator default">▲</span>';
        }

        if (sortState.direction === 'asc') {
            return '<span class="sort-indicator asc">▲</span>';
        }

        if (sortState.direction === 'desc') {
            return '<span class="sort-indicator desc">▼</span>';
        }

        return '<span class="sort-indicator default">▲</span>';
    }

    // 渲染每个产品行数据
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
        let errorDisplay = ''; // 错误信息显示
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
            // const isClosed = product.dataTime && !this.shouldUpdateProduct(product);
            const isClosed = product.dataTime && !product.isTrading;
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

        // 在 renderProductRow 方法内部，获取当前产品的显示位置信息
        const category = product.type;
        const sortState = this.sortState[category];
        const sortedProducts = this.sortProducts(category, sortState.field, sortState.direction);
        const displayIndex = sortedProducts.findIndex(p => p === product);

        return `
            <div class="product-row ${rowClass}">
                <div class="product-info-cell">
                    <button class="pin-btn ${product.pinned ? 'pinned' : ''}" 
                            onclick="financialWidget.togglePin(${globalIndex})"
                            title="${product.pinned ? '取消置顶' : '置顶'}">
                        📌
                    </button>
                    <div class="sort-buttons">
                        <button class="sort-up-btn"
                                onclick="financialWidget.moveProduct(${globalIndex}, 'up')"
                                title="上移"
                                ${displayIndex === 0 ? 'disabled' : ''}>
                            ▲
                        </button>
                        <button class="sort-down-btn" 
                                onclick="financialWidget.moveProduct(${globalIndex}, 'down')"
                                title="下移"
                                ${displayIndex === sortedProducts.length - 1 ? 'disabled' : ''}>
                            ▼
                        </button>
                    </div>
                    <div class="product-name">${product.displayName || product.name}</div>
                    <div class="product-code">${product.code}</div>
                </div>
                <!-- 其余列保持不变 -->
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
}

// 全局函数供HTML调用
function quickAdd(productType, productCode, productName) {
    console.log('🌍 quickAdd全局函数被调用:', productType, productCode, productName);
    if (window.financialWidget) {
        window.financialWidget.addProduct(productType, productCode, productName)
            .then(() => {
                // 添加成功后，确保渲染正确
                window.financialWidget.renderProducts();
            })
            .catch(error => {
                console.error('快速添加失败:', error);
            });
    } else {
        console.error('❌ financialWidget未初始化');
    }
}